/**
 * scripts/ingest/generate-rationales.ts
 *
 * Generation scaffold: build LLM prompts for "member's stated reason" blurbs
 * and fill in vote_rationales.rationale_text for rows where matched press
 * releases exist but no rationale has been generated yet.
 *
 * Data source: congress-press by Derek Willis
 *   https://github.com/dwillis/congress-press
 *   MIT licensed — Copyright (c) 2026 Derek Willis
 *
 * CRITICAL: This scaffold is NOT run during development. The TODO-marked
 * model-call section is intentionally a stub. Run only via subscription
 * subagents after the ingest scaffold populates press_release_sources.
 *
 * Usage (when ready):
 *   DATABASE_URL=<neon> \
 *   ANTHROPIC_VOTER_API=<key> \
 *   npx tsx scripts/ingest/generate-rationales.ts [--dry-run] [--limit N]
 *
 * Flow:
 *   1. Query vote_rationales WHERE rationale_text IS NULL AND
 *      press_release_sources != '[]'::jsonb (rows with matched releases).
 *   2. For each row, fetch the press release URLs (stored in
 *      press_release_sources) — NOTE: the text was NOT persisted by the
 *      ingest step (we only stored URLs). For generation we need the actual
 *      text. Two options:
 *        (a) Re-fetch from the source URL at generation time. (*)
 *        (b) Extend the ingest to also store snippet text in the JSONB.
 *      (*) Option (a) is the default here — safer for copyright (we don't
 *          store the full text in our DB).
 *   3. Build the LLM prompt via buildRationalePrompt() — the prompt is the
 *      only exported function here that's fully implemented.
 *   4. [TODO] Call the LLM (model: claude-haiku or claude-haiku-4-5) and
 *      parse the response via parseRationaleResponse().
 *   5. Upsert rationale_text + label + model_version + generated_at.
 *
 * Attribution baked in:
 *   - The prompt itself asks the model to note that the rationale is derived
 *     from the member's press releases.
 *   - The stored row links back to the source URLs (press_release_sources).
 *   - The display layer (alignment.ts / VoteRationaleAttribution) renders the
 *     "congress-press by Derek Willis" credit alongside the blurb.
 */

// ---------------------------------------------------------------------------
// Prompt construction (fully implemented — model call is TODO)
// ---------------------------------------------------------------------------

export type RationalePromptInput = {
  /** Member's full name for the prompt context. */
  memberName: string;
  /** Bill title (plain text, no bill number prefix). */
  billTitle: string;
  /** How the member voted: "yea" | "nay" | "present" | "not_voting". */
  voteCast: string;
  /** ISO-8601 vote date. */
  voteDate: string;
  /**
   * Relevant excerpts from the member's press releases (already fetched,
   * truncated to ≤2000 chars each, HTML-stripped). The caller fetches these
   * from the stored press_release_sources URLs.
   */
  pressReleaseExcerpts: Array<{
    title: string;
    excerpt: string;
    url: string;
    publishedAt: string;
  }>;
};

/**
 * System prompt for the stated-reason generation.
 *
 * Identical across all rows in a run → eligible for Anthropic prompt caching.
 *
 * Key constraints encoded:
 *   - ≤3 sentences, plain language, labeled as stated/inferred
 *   - NEVER fabricate quotes; NEVER state as verified fact
 *   - NEVER editorialize
 *   - Coverage caveat: "may not reflect every consideration"
 */
export function buildSystemPrompt(): string {
  return `You are a nonpartisan legislative analyst writing brief, honest explanations of why a member of Congress voted a certain way, derived ONLY from their own public statements.

STRICT RULES:
1. Write AT MOST 3 sentences in plain language.
2. State this as the member's STATED OR INFERRED reasoning — never as verified fact.
   Begin with a phrase like: "According to their press release, ..." or "Based on their public statement, ..."
3. NEVER fabricate or paraphrase a direct quote. Only cite what is explicitly in the provided text.
4. NEVER editorialize or say whether the vote was good or bad.
5. If the press release does NOT directly address this vote, say: "The member did not publicly explain this specific vote, though their statement around the same time mentioned [brief topic]."
6. If there is no useful signal at all, respond with exactly: NO_RATIONALE

Respond with ONLY the rationale text — no preamble, no markdown, no JSON.`;
}

/**
 * Build the user message for a single vote rationale.
 *
 * The press release excerpts are the key input. The model must derive the
 * rationale ONLY from this text — no outside knowledge.
 */
export function buildRationalePrompt(input: RationalePromptInput): string {
  const excerptBlock = input.pressReleaseExcerpts
    .map(
      (e, i) =>
        `--- Press Release ${i + 1} (${e.publishedAt}) ---
Title: ${e.title}
Source: ${e.url}
Excerpt:
${e.excerpt}`,
    )
    .join("\n\n");

  return `Member: ${input.memberName}
Vote: ${input.voteCast.toUpperCase()} on "${input.billTitle}"
Vote date: ${input.voteDate}

The following press release(s) were issued by this member around the time of the vote:

${excerptBlock}

Write a 1–3 sentence plain-language explanation of why this member voted ${input.voteCast.toUpperCase()}, derived ONLY from the above press release(s).`;
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

/** Sentinel the model returns when no rationale can be derived. */
const NO_RATIONALE_SENTINEL = "NO_RATIONALE";

/**
 * Clean and validate the model's raw response.
 *
 * Returns:
 *   - { rationale: string; label: "stated" | "inferred" } on success
 *   - null when the model returned the NO_RATIONALE sentinel or empty text
 */
export function parseRationaleResponse(
  raw: string,
): { rationale: string; label: "stated" | "inferred" } | null {
  const text = raw.trim();
  if (!text || text === NO_RATIONALE_SENTINEL) return null;

  // Strip any wrapping quotes the model may have added
  const cleaned = text
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;

  // Infer label: "stated" when the model used "According to" / "In a statement" style;
  // "inferred" when it's more indirect.
  const statedPattern =
    /^(according to|in (?:a|their|the) (?:press release|statement|release)|the member stated|rep\.|sen\.)/i;
  const label = statedPattern.test(cleaned) ? "stated" : "inferred";

  return { rationale: cleaned, label };
}

// ---------------------------------------------------------------------------
// Generation loop (scaffold — model call is TODO)
// ---------------------------------------------------------------------------

export type GenerationConfig = {
  limit: number;
  dryRun: boolean;
  /** Model id to use for generation. */
  modelId: string;
};

export type GenerationCounts = {
  rowsQueried: number;
  rationalesGenerated: number;
  rationalesSentinel: number;
  errors: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
};

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

/**
 * Main generation loop.
 *
 * TODO: Wire the actual model call. The structure (batch queries, per-row
 * prompt, upsert) is complete. Replace the TODO block below with a real
 * Anthropic client call (pattern: see scripts/ingest/summarize-bills.ts).
 *
 * Designed to run via subscription subagents (see docs/operations/voter-choice-backlog.md).
 * Do NOT run during development.
 */
export async function generateRationales({
  db,
  config,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any; // DbClient — typed loosely so this module can be imported without DB
  config: GenerationConfig;
}): Promise<GenerationCounts> {
  const counts: GenerationCounts = {
    rowsQueried: 0,
    rationalesGenerated: 0,
    rationalesSentinel: 0,
    errors: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
  };

  // TODO: import from db/schema once this is activated
  // import { voteRationales, votes, bills, candidates } from "../../db/schema";
  // import { sql, eq, isNull, ne } from "drizzle-orm";

  /*
   * TODO (activate when running):
   *
   * 1. Query rows to generate:
   *
   *    const rows = await db.select({ ... })
   *      .from(voteRationales)
   *      .innerJoin(votes, and(
   *        eq(voteRationales.candidateId, votes.candidateId),
   *        eq(voteRationales.billId, votes.billId),
   *      ))
   *      .innerJoin(bills, eq(votes.billId, bills.id))
   *      .innerJoin(candidates, eq(voteRationales.candidateId, candidates.id))
   *      .where(and(
   *        isNull(voteRationales.rationaleText),
   *        ne(voteRationales.pressReleaseSources, sql`'[]'::jsonb`),
   *      ))
   *      .limit(config.limit);
   *
   * 2. For each row:
   *    - Fetch press release text from press_release_sources URLs (HTTP GET).
   *    - Strip HTML tags from the fetched text.
   *    - Build the prompt: buildRationalePrompt({ memberName, billTitle, ... }).
   *    - Call the Anthropic SDK (same pattern as summarize-bills.ts):
   *
   *      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_VOTER_API });
   *      const response = await client.messages.create({
   *        model: config.modelId,
   *        max_tokens: 256,
   *        system: [{ type: "text", text: buildSystemPrompt(),
   *                   cache_control: { type: "ephemeral" } }],
   *        messages: [{ role: "user", content: prompt }],
   *      });
   *
   *    - Parse: parseRationaleResponse(response.content[0].text).
   *    - Upsert: update voteRationales WHERE candidateId + billId.
   *
   * 3. Log counts and return.
   */

  console.log(
    "[generate-rationales] SCAFFOLD — model call not wired. " +
      "See TODO comments in generate-rationales.ts to activate.",
  );
  counts.rowsQueried = 0;

  return counts;
}

// ---------------------------------------------------------------------------
// CLI entry point (scaffold — not run)
// ---------------------------------------------------------------------------

function isCliExecution(): boolean {
  const { resolve } = require("node:path");
  const { pathToFileURL } = require("node:url");
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  return import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

if (isCliExecution()) {
  const { requireDb } = require("../../db/client");
  const config: GenerationConfig = {
    limit: Number.parseInt(process.env.RATIONALE_LIMIT ?? "200", 10),
    dryRun:
      process.env.RATIONALE_DRY_RUN === "1" ||
      process.argv.includes("--dry-run"),
    modelId: process.env.RATIONALE_MODEL ?? DEFAULT_MODEL,
  };

  generateRationales({ db: requireDb(), config }).catch((err) => {
    console.error("[generate-rationales] fatal:", err);
    process.exitCode = 1;
  });
}
