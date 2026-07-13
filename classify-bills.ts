import fs from "fs";
import { Anthropic } from "@anthropic-ai/sdk";

const client = new Anthropic();

const CANONICAL_ISSUES = [
  "healthcare_affordability",
  "border_security",
  "economy_jobs",
  "education_funding",
  "public_safety",
  "crime_public_safety",
  "property_taxes",
  "water_infrastructure",
  "energy_grid",
  "reproductive_rights",
  "gun_rights_safety",
  "environment_climate",
  "election_integrity",
  "immigration",
  "housing_affordability",
];

const SKIP_KEYWORDS = [
  "appoint",
  "nomination",
  "resolution honoring",
  "resolution congratulating",
  "recognition",
  "memorial",
  "ceremonial",
  "naming",
  "rename",
  "technical correction",
  "conforming",
];

interface Bill {
  id: string;
  title: string;
  summary: string;
  jurisdiction?: string;
}

interface Tag {
  billId: string;
  canonicalIssue: string;
  stanceLens: "in_favor" | "opposed";
  confidence: number;
}

async function classifyBatch(batchNum: number): Promise<{
  batchNum: number;
  total: number;
  tagged: number;
  skipped: number;
}> {
  const inputPath = `/tmp/untagged-batch-${batchNum}.json`;
  const outputPath = `/tmp/tags-untagged-${batchNum}.json`;

  console.log(`\n=== BATCH ${batchNum} ===`);
  console.log(`Reading from: ${inputPath}`);

  const bills: Bill[] = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  console.log(`Bills to classify: ${bills.length}`);

  const tags: Tag[] = [];
  let skipped = 0;

  // Classify in groups of 5 to save API calls
  for (let i = 0; i < bills.length; i += 5) {
    const batch = bills.slice(i, Math.min(i + 5, bills.length));

    // Check for skippable bills in this batch
    let batchSkipped = 0;
    const billsToClassify: Bill[] = [];

    for (const bill of batch) {
      const shouldSkip = SKIP_KEYWORDS.some(
        (kw) =>
          bill.title?.toLowerCase().includes(kw) ||
          bill.summary?.toLowerCase().includes(kw)
      );
      if (shouldSkip) {
        skipped++;
        batchSkipped++;
      } else {
        billsToClassify.push(bill);
      }
    }

    // Skip API call if all bills in batch are skippable
    if (billsToClassify.length === 0) {
      console.log(
        `  Skipped items ${i + 1}-${Math.min(i + 5, bills.length)} (all procedural/ceremonial)`
      );
      continue;
    }

    // Create prompt for classification
    const billsList = billsToClassify
      .map(
        (b) =>
          `ID: ${b.id}\nTitle: ${b.title}\nSummary: ${b.summary}`
      )
      .join("\n\n");

    const prompt = `Classify these legislative bills by canonical policy issue.

CANONICAL ISSUES (use exact IDs):
${CANONICAL_ISSUES.join(", ")}

For each bill:
1. Assign ONE canonical issue (best fit)
2. Determine stance lens: "in_favor" (bill promotes the issue) or "opposed" (bill restricts/opposes it)
3. Assign confidence 0.60–1.00 based on clarity

Return ONLY a valid JSON array with objects like:
[
  {
    "billId": "exact-id",
    "canonicalIssue": "issue-id",
    "stanceLens": "in_favor",
    "confidence": 0.85
  }
]

Bills to classify:
${billsList}`;

    try {
      const response = await client.messages.create({
        model: "claude-opus-4-1-20250805",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === "text") {
        try {
          const classified = JSON.parse(content.text) as Tag[];
          if (Array.isArray(classified)) {
            tags.push(...classified);
          }
        } catch (e) {
          console.error(
            `Failed to parse response for batch ${i}-${i + 5}:`,
            e
          );
          console.error("Response text:", content.text);
        }
      }
    } catch (error) {
      console.error(
        `API error for batch ${batchNum} items ${i}-${i + 5}:`,
        error
      );
      throw error;
    }

    console.log(
      `  Processed items ${i + 1}-${Math.min(i + 5, bills.length)} (${billsToClassify.length} classified, ${batchSkipped} skipped)`
    );
  }

  // Write results
  fs.writeFileSync(outputPath, JSON.stringify(tags, null, 2));
  console.log(
    `✓ Batch ${batchNum}: ${tags.length} tagged, ${skipped} skipped → ${outputPath}`
  );

  return { batchNum, total: bills.length, tagged: tags.length, skipped };
}

async function main() {
  const results = [];
  for (const batchNum of [36, 37, 38, 39]) {
    try {
      const result = await classifyBatch(batchNum);
      results.push(result);
      // Small delay between batches to avoid rate limits
      await new Promise((r) => setTimeout(r, 2000));
    } catch (error) {
      console.error(
        `Failed to process batch ${batchNum}:`,
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  }

  console.log("\n=== SUMMARY ===");
  let totalBills = 0,
    totalTagged = 0,
    totalSkipped = 0;
  results.forEach((r) => {
    console.log(
      `Batch ${r.batchNum}: ${r.total} bills, ${r.tagged} tagged, ${r.skipped} skipped`
    );
    totalBills += r.total;
    totalTagged += r.tagged;
    totalSkipped += r.skipped;
  });
  console.log(
    `\nTotal: ${totalBills} bills, ${totalTagged} tagged, ${totalSkipped} skipped`
  );
}

main();
