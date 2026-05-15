/**
 * Classify bills from a batch file using Claude API.
 * Usage: ANTHROPIC_VOTER_API=<key> npx tsx scripts/ingest/_classify-batch.ts <batch_input> <tags_output>
 * Example: ANTHROPIC_VOTER_API=sk-... npx tsx scripts/ingest/_classify-batch.ts /tmp/untagged-batch-40.json /tmp/tags-untagged-40.json
 */

import * as fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { CANONICAL_ISSUE_LABELS } from "../../src/lib/canonicalIssues";

interface BillRow {
  id: string;
  title: string;
  summary: string | null;
  jurisdiction: string;
}

interface TagInput {
  billId: string;
  canonicalIssue: string;
  stanceLens: "in_favor" | "opposed";
  confidence: number;
}

type RawTagEntry = {
  canonical_issue: unknown;
  stance_lens: unknown;
  confidence: unknown;
};

type ValidatedTag = {
  canonicalIssue: string;
  stanceLens: "in_favor" | "opposed";
  confidence: number;
};

const VALID_CANONICAL_ISSUES = new Set(Object.keys(CANONICAL_ISSUE_LABELS));
const VALID_STANCE_LENSES = new Set(["in_favor", "opposed"]);
const MAX_SUMMARY_CHARS = 4000;

function buildSystemPrompt(): string {
  const issueList = Object.entries(CANONICAL_ISSUE_LABELS)
    .map(([id, label]) => `  - ${id}: ${label}`)
    .join("\n");

  return `You are a nonpartisan legislative analyst. Your job is to classify bills by canonical policy issues.

CANONICAL ISSUE IDs AND LABELS:
${issueList}

For each bill you receive, return a JSON array of tag objects. Each object must have exactly these fields:
  - "canonical_issue": one of the canonical issue IDs above (exact string match required)
  - "stance_lens": "in_favor" or "opposed" — what voting YEA on this bill MEANS for that issue
    * "in_favor": a YEA vote supports / expands / funds this issue
    * "opposed": a YEA vote restricts / cuts / opposes this issue
  - "confidence": a number from 0.0 to 1.0 representing your certainty

Rules:
1. Only include issues that are genuinely and substantively addressed by the bill.
2. Return an EMPTY array [] if the bill is:
   - A procedural motion (motion to table, motion to proceed, quorum call)
   - A naming bill (naming a post office, courthouse, etc.)
   - An appointment or confirmation bill
   - Not substantively related to any canonical issue
   We prefer EMPTY tags over WRONG tags.
3. A bill may have multiple tags if it genuinely spans multiple issues.
4. Respond with ONLY a valid JSON array — no markdown, no commentary, no code fences.

Example valid response (two tags):
[{"canonical_issue":"healthcare_affordability","stance_lens":"in_favor","confidence":0.92},{"canonical_issue":"economy_jobs","stance_lens":"opposed","confidence":0.71}]

Example valid response (no match):
[]`;
}

function buildBillPrompt(bill: BillRow): string {
  const summary = bill.summary
    ? bill.summary.slice(0, MAX_SUMMARY_CHARS)
    : "(no summary available)";

  return `Classify this bill:

Title: ${bill.title}
Jurisdiction: ${bill.jurisdiction}
Summary: ${summary}`;
}

function parseAndValidateTags(rawJson: string, billId: string): ValidatedTag[] {
  const fenceMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/);
  const cleaned = fenceMatch ? fenceMatch[1].trim() : rawJson;

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error(`[classify] skip bill=${billId} reason=malformed_json`);
    return [];
  }

  if (!Array.isArray(parsed)) {
    console.error(`[classify] skip bill=${billId} reason=response_not_array`);
    return [];
  }

  const valid: ValidatedTag[] = [];

  for (const entry of parsed) {
    const raw = entry as RawTagEntry;
    const canonicalIssue = raw.canonical_issue;
    const stanceLens = raw.stance_lens;
    const confidence = raw.confidence;

    if (typeof canonicalIssue !== "string") {
      console.error(
        `[classify] drop bill=${billId} reason=non_string_canonical_issue`
      );
      continue;
    }
    if (!VALID_CANONICAL_ISSUES.has(canonicalIssue)) {
      console.error(
        `[classify] drop bill=${billId} canonical_issue=${canonicalIssue} reason=unknown_canonical_issue`
      );
      continue;
    }
    if (
      typeof stanceLens !== "string" ||
      !VALID_STANCE_LENSES.has(stanceLens)
    ) {
      console.error(
        `[classify] drop bill=${billId} stance_lens=${String(stanceLens)} reason=invalid_stance_lens`
      );
      continue;
    }
    if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
      if (typeof confidence === "number") {
        const clamped = Math.min(1, Math.max(0, confidence));
        console.error(
          `[classify] clamp bill=${billId} canonical_issue=${canonicalIssue} confidence=${confidence} -> ${clamped}`
        );
        valid.push({
          canonicalIssue,
          stanceLens: stanceLens as "in_favor" | "opposed",
          confidence: clamped,
        });
        continue;
      }
      console.error(
        `[classify] drop bill=${billId} canonical_issue=${canonicalIssue} reason=invalid_confidence`
      );
      continue;
    }

    valid.push({
      canonicalIssue,
      stanceLens: stanceLens as "in_favor" | "opposed",
      confidence,
    });
  }

  return valid;
}

async function classifyBill(
  bill: BillRow,
  client: Anthropic,
  systemPrompt: string
): Promise<ValidatedTag[]> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildBillPrompt(bill) }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const rawText =
    textBlock && textBlock.type === "text" ? textBlock.text.trim() : "[]";

  return parseAndValidateTags(rawText, bill.id);
}

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath || !outputPath) {
    console.error(
      "Usage: npx tsx _classify-batch.ts <input.json> <output.json>"
    );
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_VOTER_API;
  if (!apiKey) {
    console.error("ANTHROPIC_VOTER_API environment variable not set");
    process.exit(1);
  }

  const bills: BillRow[] = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  console.log(`[classify] loaded ${bills.length} bills from ${inputPath}`);

  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt();

  const allTags: TagInput[] = [];
  let billsProcessed = 0;
  let billsTagged = 0;
  let tagsTotal = 0;

  for (const bill of bills) {
    try {
      const tags = await classifyBill(bill, client, systemPrompt);
      billsProcessed++;

      if (tags.length > 0) {
        billsTagged++;
        tagsTotal += tags.length;
        tags.forEach((tag) => {
          allTags.push({
            billId: bill.id,
            canonicalIssue: tag.canonicalIssue,
            stanceLens: tag.stanceLens,
            confidence: Math.round(tag.confidence * 1000) / 1000,
          });
        });
        console.log(
          `[classify] bill=${bill.id} tags=${tags.length}`
        );
      } else {
        console.log(`[classify] bill=${bill.id} no_tags`);
      }
    } catch (e) {
      console.error(
        `[classify] error bill=${bill.id}:`,
        e instanceof Error ? e.message : String(e)
      );
    }

    // Rate limiting
    if (billsProcessed % 10 === 0) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(allTags, null, 2));
  console.log(
    `[classify] complete bills_processed=${billsProcessed} bills_tagged=${billsTagged} tags_total=${tagsTotal} output=${outputPath}`
  );
}

main().catch((e) => {
  console.error("[classify] fatal:", e.message);
  process.exit(1);
});
