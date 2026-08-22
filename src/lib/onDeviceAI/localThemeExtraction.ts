/**
 * Local (on-device WebLLM) counterpart to `src/lib/prompts/theme-extraction.ts`.
 *
 * Same job (turn a voter's free-text concern into theme JSON), same output
 * schema (`Theme` from `src/lib/prompts/types.ts`), same pole-vocabulary
 * anchor (`renderResolverPoleDirections`, embedded here via the live prompt's
 * own `CANONICAL_ISSUES_PROMPT_BLOCK` — no re-derivation), but written for a
 * much smaller instruction-following model. Small models follow strict,
 * example-driven instructions far better than the open-ended prose the live
 * (Claude) prompt gets away with, so this builder adds a directive
 * "JSON-only, here's exactly what one looks like" framing on top of the same
 * field/issue vocabulary — it does not change what a theme *means*.
 *
 * This module is client-only (it imports `webllmClient.ts`, which dynamically
 * imports `@mlc-ai/web-llm`), but has no top-level side effects, so it is
 * safe to import at Next.js build/SSR time.
 *
 * Spike scope (step 2/3): nothing here has a caller yet. Step 3 wires this
 * into a comparison UI/route alongside the live Claude path.
 */

import type { Theme } from "../prompts/types";
import type { ThemeExtractionInput } from "../prompts/theme-extraction";
import {
  THEME_FIELDS_PROMPT_BLOCK,
  CANONICAL_ISSUES_PROMPT_BLOCK,
} from "../prompts/theme-extraction";
import { isCanonicalIssueId } from "../canonicalIssues";
import { isValidSubIssueForParent } from "../alignment/subIssues";
import type { MLCEngine } from "./webllmClient";
import { runChatCompletion } from "./webllmClient";

/**
 * Thrown when the local model's response can't be parsed/validated into
 * `Theme[]`. Carries the raw model text (untruncated) so a comparison UI can
 * show the caller exactly what the small model produced instead of the
 * expected shape — this is a spike whose entire purpose is evaluating local
 * model output quality, so swallowing the raw text would defeat the point.
 *
 * Deliberately no retry/self-healing here (Simplicity First) — a clear
 * thrown error is sufficient for a comparison surface to display.
 */
export class LocalThemeExtractionParseError extends Error {
  readonly rawResponse: string;

  constructor(message: string, rawResponse: string) {
    super(message);
    this.name = "LocalThemeExtractionParseError";
    this.rawResponse = rawResponse;
  }
}

/**
 * One worked example, chosen to demonstrate the single highest-risk rule in
 * the schema for a weak model: a CONTESTED issue voiced value-only, with no
 * side picked, must OMIT "stance" rather than default to "in_favor". This is
 * exactly the failure mode `poleVocabulary.ts`'s shared anchor exists to
 * prevent, and exactly what an undirected small model tends to get wrong.
 */
const WORKED_EXAMPLE = `EXAMPLE

User message:
"I'm worried about my mom's insulin costs, and honestly guns are a big issue for me too."

Correct output (nothing else — no prose, no markdown fence):
[
  {
    "name": "Mom's insulin costs",
    "quotes": ["my mom's insulin costs"],
    "canonicalIssue": "healthcare_affordability",
    "stance": "in_favor"
  },
  {
    "name": "Gun policy concerns",
    "quotes": ["guns are a big issue for me"],
    "canonicalIssue": "gun_rights_safety"
  }
]

Notice the second theme has NO "stance" field. "guns are a big issue" names a
[contested] issue (gun_rights_safety) without picking a side, so stance is
left out entirely — never guess "in_favor" just because the field is
optional and could be omitted.`;

/**
 * Build the system prompt for the LOCAL model to extract themes from a
 * voter's free-text concern. Same field semantics and canonical-issue/pole
 * vocabulary as the live Claude prompt (`buildThemeExtractionPrompt`) — the
 * two shared blocks are imported verbatim, not re-derived — with an added
 * directive JSON-only framing and worked example a small model needs.
 */
export function buildLocalThemeExtractionPrompt(
  input: ThemeExtractionInput,
): string {
  return `You extract civic themes from a voter's own words.

You are a SMALL model. Follow these instructions exactly and literally.

OUTPUT FORMAT — read carefully:
  · Respond with ONLY a JSON array. Nothing else.
  · Your entire response must start with "[" and end with "]".
  · Do NOT wrap it in a markdown code fence (no \`\`\`).
  · Do NOT write any explanation, preamble, or text before or after the
    JSON array.
  · Return 1–5 theme objects, one per distinct concern.

Each theme object has these fields:

${THEME_FIELDS_PROMPT_BLOCK}

${CANONICAL_ISSUES_PROMPT_BLOCK}

${WORKED_EXAMPLE}

Rules:
  · Don't pad to a fixed count. One thing, one theme.
  · SPLIT distinct concerns joined by "and"/commas into a SEPARATE theme
    each — even one with no canonicalIssue (omit that field).
  · Only use a canonicalIssue id from the list above, verbatim, or omit the
    field. Never invent an id.
  · subIssue ids are also verbatim from the SUB-ISSUES list, and only when
    the parent matches canonicalIssue — otherwise omit.
  · If a field is optional and doesn't clearly apply, OMIT the field
    entirely. Do not write null, "", or "unknown".
  · No prose. Output JSON only, starting with "[" and ending with "]".

<user_message>
${input.userInput}
</user_message>`;
}

/**
 * Run local theme extraction against a WebLLM engine: build the local
 * system prompt, call `runChatCompletion`, then parse/validate the response
 * into `Theme[]` (the same shape `parseThemeExtraction` produces for the
 * live path — see `src/lib/prompts/types.ts`).
 *
 * Unlike the live parser (`parseThemeExtraction`, which silently drops
 * malformed items/fields as a "degrade to no-data" choice appropriate for a
 * strong model), this throws `LocalThemeExtractionParseError` on ANY parse
 * or validation failure. That's deliberate here: this function's job is to
 * surface how well the small model followed the schema, so a malformed
 * response should be visible to the comparison UI, not silently cleaned up.
 */
export async function runLocalThemeExtraction(
  engine: MLCEngine,
  userConcernText: string,
): Promise<Theme[]> {
  const systemPrompt = buildLocalThemeExtractionPrompt({
    userInput: userConcernText,
  });
  const rawResponse = await runChatCompletion(
    engine,
    systemPrompt,
    userConcernText,
  );

  return parseLocalThemeExtraction(rawResponse);
}

/**
 * Parse + validate a local model's raw text response into `Theme[]`.
 * Exported separately from `runLocalThemeExtraction` so it can be unit
 * tested without a live WebLLM engine.
 */
export function parseLocalThemeExtraction(rawResponse: string): Theme[] {
  // Strip a leading UTF-8 BOM, same as the live parser (parseThemeExtraction)
  // — this is an encoding artifact, not a schema-following failure, so it
  // shouldn't unfairly fail a local model that would otherwise parse fine.
  const withoutBom = rawResponse.replace(/^﻿/, "");
  const cleaned = stripCodeFence(withoutBom.trim());

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new LocalThemeExtractionParseError(
      `Local model response is not valid JSON: ${(err as Error).message}`,
      rawResponse,
    );
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new LocalThemeExtractionParseError(
      "Local model response must be a non-empty JSON array of themes.",
      rawResponse,
    );
  }

  return parsed.map((item, index) =>
    validateThemeItem(item, index, rawResponse),
  );
}

/** Strip a ```json ... ``` or bare ``` ... ``` markdown fence, if present. */
function stripCodeFence(input: string): string {
  const fenced = input.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  return fenced ? fenced[1].trim() : input;
}

type Fail = (reason: string) => never;

function validateThemeItem(
  item: unknown,
  index: number,
  rawResponse: string,
): Theme {
  const fail: Fail = (reason) => {
    throw new LocalThemeExtractionParseError(
      `Theme at index ${index} is invalid: ${reason}`,
      rawResponse,
    );
  };

  if (typeof item !== "object" || item === null) {
    fail("expected an object.");
  }
  const record = item as Record<string, unknown>;

  const theme = validateRequiredFields(record, fail);
  applyOptionalCanonicalIssue(record, theme, fail);
  applyOptionalStance(record, theme, fail);
  applyOptionalSubIssue(record, theme, fail);
  return theme;
}

function validateRequiredFields(
  record: Record<string, unknown>,
  fail: Fail,
): Theme {
  if (typeof record.name !== "string" || record.name.trim() === "") {
    fail('"name" must be a non-empty string.');
  }
  if (
    !Array.isArray(record.quotes) ||
    !record.quotes.every((q) => typeof q === "string")
  ) {
    fail('"quotes" must be an array of strings.');
  }
  return {
    name: record.name as string,
    quotes: record.quotes as string[],
  };
}

function applyOptionalCanonicalIssue(
  record: Record<string, unknown>,
  theme: Theme,
  fail: Fail,
): void {
  if (record.canonicalIssue === undefined) return;
  if (
    typeof record.canonicalIssue !== "string" ||
    !isCanonicalIssueId(record.canonicalIssue)
  ) {
    fail(
      `"canonicalIssue" must be a known canonical issue id, got ${JSON.stringify(record.canonicalIssue)}.`,
    );
  }
  theme.canonicalIssue = record.canonicalIssue as string;
}

function applyOptionalStance(
  record: Record<string, unknown>,
  theme: Theme,
  fail: Fail,
): void {
  if (record.stance === undefined) return;
  if (record.stance !== "in_favor" && record.stance !== "opposed") {
    fail(
      `"stance" must be "in_favor" or "opposed", got ${JSON.stringify(record.stance)}.`,
    );
  }
  theme.stance = record.stance as "in_favor" | "opposed";
}

function applyOptionalSubIssue(
  record: Record<string, unknown>,
  theme: Theme,
  fail: Fail,
): void {
  if (record.subIssue === undefined) return;
  if (
    typeof record.subIssue !== "string" ||
    theme.canonicalIssue === undefined ||
    !isValidSubIssueForParent(record.subIssue, theme.canonicalIssue)
  ) {
    fail(
      `"subIssue" (${JSON.stringify(record.subIssue)}) is not a valid sub-issue of canonicalIssue (${JSON.stringify(theme.canonicalIssue)}).`,
    );
  }
  theme.subIssue = record.subIssue as string;
}
