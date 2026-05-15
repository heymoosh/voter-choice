/**
 * Classify bills from batch files and generate tags.
 */

import * as fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const CANONICAL_ISSUES = {
  healthcare_affordability: "Healthcare Affordability",
  border_security: "Border Security",
  economy_jobs: "Economy & Jobs",
  education_funding: "Education Funding",
  public_safety: "Public Safety",
  crime_public_safety: "Crime & Public Safety",
  property_taxes: "Property Taxes",
  water_infrastructure: "Water & Infrastructure",
  energy_grid: "Energy Grid",
  reproductive_rights: "Reproductive Rights",
  gun_rights_safety: "Gun Rights & Safety",
  environment_climate: "Environment & Climate",
  election_integrity: "Election Integrity",
  immigration: "Immigration",
  housing_affordability: "Housing Affordability",
};

type StanceLens = "in_favor" | "opposed";

interface TagInput {
  billId: string;
  canonicalIssue: string;
  stanceLens: StanceLens;
  confidence: number;
}

interface BillInput {
  id: string;
  title: string;
  summary?: string | null;
  jurisdiction: string;
}

function buildSystemPrompt(): string {
  const issueList = Object.entries(CANONICAL_ISSUES)
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
   - Not substantively related to any canonical issue
   We prefer EMPTY tags over WRONG tags.
3. A bill may have multiple tags if it genuinely spans multiple issues.
4. Respond with ONLY a valid JSON array — no markdown, no commentary, no code fences.

Example valid response (two tags):
[{"canonical_issue":"healthcare_affordability","stance_lens":"in_favor","confidence":0.92},{"canonical_issue":"economy_jobs","stance_lens":"opposed","confidence":0.71}]

Example valid response (no match):
[]`;
}

function buildBillPrompt(bill: BillInput): string {
  const summary = bill.summary
    ? bill.summary.slice(0, 4000)
    : "(no summary available)";

  return `Classify this bill:

Title: ${bill.title}
Jurisdiction: ${bill.jurisdiction}
Summary: ${summary}`;
}

function parseAndValidateTags(
  rawJson: string,
  billId: string,
): Array<{ canonical_issue: string; stance_lens: StanceLens; confidence: number }> {
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

  const validIssues = new Set(Object.keys(CANONICAL_ISSUES));
  const validStances = new Set(["in_favor", "opposed"]);
  const valid: Array<{ canonical_issue: string; stance_lens: StanceLens; confidence: number }> = [];

  for (const entry of parsed as any[]) {
    const canonicalIssue = entry.canonical_issue;
    const stanceLens = entry.stance_lens;
    const confidence = entry.confidence;

    if (typeof canonicalIssue !== "string" || !validIssues.has(canonicalIssue)) {
      console.error(
        `[classify] drop bill=${billId} canonical_issue=${canonicalIssue} reason=unknown_canonical_issue`,
      );
      continue;
    }

    if (typeof stanceLens !== "string" || !validStances.has(stanceLens)) {
      console.error(
        `[classify] drop bill=${billId} stance_lens=${stanceLens} reason=invalid_stance_lens`,
      );
      continue;
    }

    if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
      if (typeof confidence === "number") {
        const clamped = Math.min(1, Math.max(0, confidence));
        console.error(
          `[classify] clamp bill=${billId} canonical_issue=${canonicalIssue} confidence=${confidence} -> ${clamped}`,
        );
        valid.push({
          canonical_issue: canonicalIssue,
          stance_lens: stanceLens as StanceLens,
          confidence: clamped,
        });
        continue;
      }
      console.error(
        `[classify] drop bill=${billId} canonical_issue=${canonicalIssue} reason=invalid_confidence`,
      );
      continue;
    }

    valid.push({
      canonical_issue: canonicalIssue,
      stance_lens: stanceLens as StanceLens,
      confidence,
    });
  }

  return valid;
}

async function classifyBatch(batchNumber: number): Promise<number> {
  const inputFile = `/tmp/untagged-batch-${batchNumber}.json`;
  const outputFile = `/tmp/tags-untagged-${batchNumber}.json`;

  if (!fs.existsSync(inputFile)) {
    console.error(`[classify] file not found: ${inputFile}`);
    return 0;
  }

  const bills: BillInput[] = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
  console.log(`[classify] batch=${batchNumber} bills=${bills.length}`);

  const apiKey = process.env.ANTHROPIC_VOTER_API || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_VOTER_API or ANTHROPIC_API_KEY not set");
  }

  const anthropic = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt();

  const results: TagInput[] = [];
  let processed = 0;

  for (const bill of bills) {
    if (!bill.title?.trim()) {
      console.error(`[classify] skip bill=${bill.id} reason=missing_title`);
      continue;
    }

    try {
      const response = await anthropic.messages.create({
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
      const rawText = textBlock?.type === "text" ? textBlock.text.trim() : "[]";

      const tags = parseAndValidateTags(rawText, bill.id);

      for (const tag of tags) {
        results.push({
          billId: bill.id,
          canonicalIssue: tag.canonical_issue,
          stanceLens: tag.stance_lens,
          confidence: tag.confidence,
        });
      }

      processed++;
      if (processed % 50 === 0) {
        console.log(
          `[classify] batch=${batchNumber} processed=${processed}/${bills.length}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[classify] api_error bill=${bill.id} batch=${batchNumber} error=${message}`,
      );
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(
    `[classify] batch=${batchNumber} complete tags_generated=${results.length} file=${outputFile}`,
  );

  return results.length;
}

async function main() {
  const batchArg = process.argv[2];
  if (!batchArg) {
    console.error("Usage: npx tsx classify-bills.ts <batch-number>");
    process.exit(1);
  }

  const batchNumber = Number.parseInt(batchArg, 10);
  if (!Number.isInteger(batchNumber) || batchNumber < 0) {
    console.error("Invalid batch number");
    process.exit(1);
  }

  const total = await classifyBatch(batchNumber);
  console.log(`[classify] batch=${batchNumber} total_tags=${total}`);
}

main().catch((error) => {
  console.error("[classify] fatal:", error);
  process.exit(1);
});
