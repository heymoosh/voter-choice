/**
 * Classify bills using heuristic rules when API is unavailable.
 * This is a fallback approach based on title/summary keyword matching.
 * Usage: npx tsx scripts/ingest/_classify-batch-heuristic.ts <batch_input> <tags_output>
 */

import * as fs from "node:fs";

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

// Keywords mapped to canonical issues and stance indicators
const ISSUE_KEYWORDS: Record<
  string,
  { keywords: string[]; opposedKeywords?: string[] }
> = {
  healthcare_affordability: {
    keywords: ["healthcare", "health care", "medical", "prescription", "medicare", "medicaid", "insurance", "hospital"],
    opposedKeywords: ["cut", "reduce", "eliminate", "repeal"],
  },
  border_security: {
    keywords: ["border", "immigration", "customs", "enforcement", "illegal alien", "undocumented"],
    opposedKeywords: [],
  },
  economy_jobs: {
    keywords: ["economy", "job", "employment", "wage", "labor", "business", "small business", "tax"],
    opposedKeywords: ["cut job", "job loss", "eliminate position"],
  },
  education_funding: {
    keywords: ["education", "school", "student", "tuition", "university", "college", "grant"],
    opposedKeywords: ["cut", "reduce", "eliminate", "defund"],
  },
  public_safety: {
    keywords: ["safety", "law enforcement", "police", "officer"],
    opposedKeywords: ["cut", "reduce", "eliminate"],
  },
  crime_public_safety: {
    keywords: ["crime", "criminal", "prison", "jail", "violent", "felony"],
    opposedKeywords: [],
  },
  property_taxes: {
    keywords: ["property tax", "real estate tax", "homeowner"],
    opposedKeywords: ["raise", "increase"],
  },
  water_infrastructure: {
    keywords: ["water", "infrastructure", "pipe", "dam", "irrigation"],
    opposedKeywords: [],
  },
  energy_grid: {
    keywords: ["energy", "power", "grid", "electricity", "renewable", "coal", "natural gas"],
    opposedKeywords: [],
  },
  reproductive_rights: {
    keywords: ["abortion", "reproductive", "pregnancy", "contraception", "roe"],
    opposedKeywords: [],
  },
  gun_rights_safety: {
    keywords: ["gun", "firearm", "weapon", "ammunition", "concealed carry", "second amendment"],
    opposedKeywords: [],
  },
  environment_climate: {
    keywords: ["environment", "climate", "global warming", "pollution", "conservation", "carbon"],
    opposedKeywords: [],
  },
  election_integrity: {
    keywords: ["election", "vote", "voting", "ballot", "franchise"],
    opposedKeywords: [],
  },
  immigration: {
    keywords: ["immigration", "immigrant", "visa", "asylum", "refugee"],
    opposedKeywords: [],
  },
  housing_affordability: {
    keywords: ["housing", "affordable housing", "rent", "mortgage", "homelessness"],
    opposedKeywords: ["cut", "reduce", "eliminate"],
  },
};

// Skip patterns for procedural/ceremonial bills
const SKIP_PATTERNS = [
  /^(Expressing|expressing|honoring|commemorating|designating|naming|establishing)/i,
  /^(Authorizing the use of|Providing for a)/i,
  /^(To provide funds for|Appropriations)/i,
  /motion to/i,
  /quorum call/i,
  /ceremonial/i,
  /post office/i,
  /courthouse/i,
  /federal building/i,
];

function shouldSkip(title: string, summary: string | null): boolean {
  const text = `${title} ${summary || ""}`.toLowerCase();

  // Skip procedural bills
  if (SKIP_PATTERNS.some((p) => p.test(title))) {
    return true;
  }

  // Skip very short resolutions without substantive summary
  if (
    title.length < 30 &&
    (!summary || summary.length < 100) &&
    /resolution|concurrent resolution|joint resolution/i.test(title)
  ) {
    return true;
  }

  return false;
}

function classifyBill(bill: BillRow): TagInput[] {
  const text = `${bill.title} ${bill.summary || ""}`.toLowerCase();

  if (shouldSkip(bill.title, bill.summary)) {
    return [];
  }

  const tags: TagInput[] = [];

  for (const [issue, patterns] of Object.entries(ISSUE_KEYWORDS)) {
    // Check if any keyword is present
    const hasKeyword = patterns.keywords.some(
      (kw) => text.includes(kw.toLowerCase())
    );

    if (!hasKeyword) continue;

    // Determine stance based on context
    let stanceLens: "in_favor" | "opposed" = "in_favor";
    let confidence = 0.75;

    if (patterns.opposedKeywords && patterns.opposedKeywords.length > 0) {
      const hasOpposedKeyword = patterns.opposedKeywords.some((kw) =>
        text.includes(kw.toLowerCase())
      );
      if (hasOpposedKeyword) {
        stanceLens = "opposed";
        confidence = 0.8;
      }
    }

    // Context-based confidence adjustments
    if (issue === "election_integrity") {
      // Ballotpedia resolutions are typically not substantive on election integrity
      if (/concurrent resolution/i.test(bill.title)) {
        confidence = 0.65;
      }
    }

    tags.push({
      billId: bill.id,
      canonicalIssue: issue,
      stanceLens,
      confidence: Math.round(confidence * 1000) / 1000,
    });
  }

  return tags;
}

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath || !outputPath) {
    console.error(
      "Usage: npx tsx _classify-batch-heuristic.ts <input.json> <output.json>"
    );
    process.exit(1);
  }

  const bills: BillRow[] = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  console.log(
    `[classify-heuristic] loaded ${bills.length} bills from ${inputPath}`
  );

  const allTags: TagInput[] = [];
  let billsProcessed = 0;
  let billsTagged = 0;
  let billsSkipped = 0;

  for (const bill of bills) {
    const tags = classifyBill(bill);
    billsProcessed++;

    if (tags.length === 0) {
      billsSkipped++;
    } else {
      billsTagged++;
      allTags.push(...tags);
      console.log(`[classify-heuristic] bill=${bill.id} tags=${tags.length}`);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(allTags, null, 2));
  console.log(
    `[classify-heuristic] complete bills_processed=${billsProcessed} bills_tagged=${billsTagged} bills_skipped=${billsSkipped} total_tags=${allTags.length} output=${outputPath}`
  );
}

main().catch((e) => {
  console.error("[classify-heuristic] fatal:", e.message);
  process.exit(1);
});
