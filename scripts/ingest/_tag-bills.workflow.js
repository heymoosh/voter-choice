export const meta = {
  name: "tag-bills-agent",
  description:
    "Tag untagged federal bills against the canonical issue vocabulary via subscription subagents (Sonnet), writing insert-issue-tags.ts-ready result files",
  phases: [
    {
      title: "Tag",
      detail: "one Sonnet agent per exported batch file; retry on failure",
      model: "sonnet",
    },
  ],
};

// HOW TO RUN (dev machine, the subscription tagging path — plan doc policy
// 2026-08-13: bulk LLM classification never uses the API key):
//   1. npx tsx --env-file=.env.local scripts/ingest/_export-untagged-batches.ts
//      → writes /tmp/untagged-batch-40..43.json (bills with NO issue_tags row)
//   2. In a Claude Code session in this repo: run this workflow
//      (args optional; defaults below match the export's output paths)
//   3. npx tsx --env-file=.env.local scripts/ingest/insert-issue-tags.ts \
//        /tmp/tag-results/untagged-batch-40-tags.json   (repeat for 41..43)
//   4. Re-run step 1; repeat until it reports 0 untagged bills.
//
// args = { batchFiles?: string[], resultDir?: string }
const input =
  typeof args === "string" ? JSON.parse(args ?? "{}") : (args ?? {});
const batchFiles = input.batchFiles ?? [
  "/tmp/untagged-batch-40.json",
  "/tmp/untagged-batch-41.json",
  "/tmp/untagged-batch-42.json",
  "/tmp/untagged-batch-43.json",
];
const resultDir = input.resultDir ?? "/tmp/tag-results";
const resultPath = (f) =>
  `${resultDir}/${f
    .split("/")
    .pop()
    .replace(/\.json$/u, "")}-tags.json`;

// Agent returns a SMALL summary; the tag data goes to the result file.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    batchFile: { type: "string" },
    billsInBatch: { type: "integer" },
    billsTagged: { type: "integer" },
    billsSkipped: { type: "integer" },
    tagsWritten: { type: "integer" },
  },
  required: ["batchFile", "billsInBatch", "tagsWritten"],
};

function buildPrompt(file) {
  return `You are the ISSUE TAGGER for this repo's bills pipeline, running as a subagent
(the subscription equivalent of scripts/ingest/tag-bills.ts's API path). Classify every
bill in one exported batch against the repo's canonical issue vocabulary.

GROUND RULES — read the repo's source of truth first, do not improvise vocabulary:
1. Read src/lib/canonicalIssues.ts — the ONLY valid canonical_issue ids.
2. Read src/lib/alignment/poleVocabulary.ts — each issue's (in_favor / opposed) pole
   definitions. stance_lens answers: "what does a YEA vote on this bill MEAN for this
   issue?" — in_favor advances the in_favor pole, opposed advances the opposed pole.
3. Read the system-prompt section of scripts/ingest/tag-bills.ts (buildSystemPrompt and
   the constants around it) and apply exactly its classification rules: judge by
   substance not title; repeal/disapproval bills score by NET EFFECT of the repeal;
   omnibus bills by the dominant provision per issue; procedural/ceremonial/study bills
   and bills with no clear directional signal get NO tag (that is the correct outcome,
   not a failure); a bill may get tags for MULTIPLE issues when it genuinely moves more
   than one.

TASK:
1. Read the JSON file at ${file} — an array of { id, title, summary, jurisdiction }.
   Summaries may be null or contain HTML; ignore markup, read the text.
2. For each bill decide zero or more tags. Each tag: canonical_issue (from the
   vocabulary ONLY), stance_lens ∈ {in_favor, opposed}, confidence ∈ [0,1]
   (0.9 = clear signal in title+summary, 0.6 = reasonable inference, 0.3 = thin).
   NEVER invent an issue id; when no issue clearly fits, emit no tag for that bill.
3. Write a JSON file to EXACTLY ${resultPath(file)} (create the directory if needed)
   with shape: a FLAT ARRAY of
   { "billId": "<id>", "canonicalIssue": "...", "stanceLens": "...", "confidence": 0.9 }
   — this is the input contract of scripts/ingest/insert-issue-tags.ts.
4. Reply via the structured output with your tallies. Do not include the tags inline.`;
}

async function tagOne(file) {
  return agent(buildPrompt(file), {
    label: file.split("/").pop(),
    phase: "Tag",
    model: "sonnet",
    schema: SCHEMA,
  });
}

let pending = batchFiles;
const done = [];
for (let attempt = 1; attempt <= 3 && pending.length > 0; attempt++) {
  log(
    `Tag attempt ${attempt}: ${pending.length} batch(es), ${done.length} done`,
  );
  const res = await parallel(pending.map((f) => () => tagOne(f)));
  const retry = [];
  for (let i = 0; i < res.length; i++) {
    const r = res[i];
    if (r && typeof r.tagsWritten === "number" && r.billsInBatch > 0) {
      done.push(r);
    } else {
      retry.push(pending[i]);
    }
  }
  pending = retry;
}

if (pending.length > 0) {
  log(
    `FAILED after retries: ${pending.join(", ")} — re-run the workflow for these.`,
  );
}
const totals = done.reduce(
  (t, r) => ({
    bills: t.bills + (r.billsInBatch ?? 0),
    tagged: t.tagged + (r.billsTagged ?? 0),
    tags: t.tags + (r.tagsWritten ?? 0),
  }),
  { bills: 0, tagged: 0, tags: 0 },
);
log(
  `Done: ${done.length}/${batchFiles.length} batches, ${totals.bills} bills seen, ` +
    `${totals.tagged} tagged, ${totals.tags} tag rows written. ` +
    `Next: insert-issue-tags.ts on each ${resultDir}/*-tags.json, then re-run the export to verify 0 remaining.`,
);
return { done, failed: pending, totals };
