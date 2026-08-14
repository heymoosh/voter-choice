export const meta = {
  name: "vocab-delta-retag",
  description:
    "Judge already-tagged bills against ONLY the six pole-vocab-v2 issue ids via subscription subagents; existing tags are never touched",
  phases: [
    {
      title: "Delta-tag",
      detail: "one Sonnet agent per exported batch file; retry on failure",
      model: "sonnet",
    },
  ],
};

// HOW TO RUN (dev machine — subscription pattern; plan-doc policy 2026-08-13:
// bulk LLM classification never uses the API key):
//   1. npx tsx --env-file=.env.local scripts/ingest/_export-vocab-delta-batches.ts
//      → writes /tmp/vocab-delta-batch-0..3.json (tagged bills + their tags)
//   2. In a Claude Code session in this repo: run this workflow
//   3. npx tsx --env-file=.env.local scripts/ingest/insert-issue-tags.ts \
//        /tmp/vocab-delta-results/vocab-delta-batch-0-tags.json   (repeat 1..3)
//   4. ONE-SHOT: do not loop on the export — bills matching none of the six
//      new ids (the vast majority) get no row and would re-export forever.
//      See the export script's header.
//
// args = { batchFiles?: string[], resultDir?: string }
const input =
  typeof args === "string" ? JSON.parse(args ?? "{}") : (args ?? {});
const batchFiles = input.batchFiles ?? [
  "/tmp/vocab-delta-batch-0.json",
  "/tmp/vocab-delta-batch-1.json",
  "/tmp/vocab-delta-batch-2.json",
  "/tmp/vocab-delta-batch-3.json",
];
const resultDir = input.resultDir ?? "/tmp/vocab-delta-results";
const resultPath = (f) =>
  `${resultDir}/${f
    .split("/")
    .pop()
    .replace(/\.json$/u, "")}-tags.json`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    batchFile: { type: "string" },
    billsInBatch: { type: "integer" },
    billsNewlyTagged: { type: "integer" },
    tagsWritten: { type: "integer" },
  },
  required: ["batchFile", "billsInBatch", "tagsWritten"],
};

function buildPrompt(file) {
  return `You are the vocabulary-v2 DELTA TAGGER. These bills were already classified
against the pre-v2 canonical vocabulary; your ONLY job is to judge each one against the
SIX issue ids that pole-vocab-v2 added. You never re-judge, change, or emit tags for any
other issue — existing tags are context, not your subject.

GROUND RULES — read the repo's source of truth first, do not improvise vocabulary:
1. Read src/lib/canonicalIssues.ts and find the pole-vocab-v2 additions:
   trade_tariffs, curriculum_culture, redistricting_reform,
   election_security_disinformation, congressional_term_limits,
   retirement_income_security. These six are the ONLY ids you may emit.
2. Read each of those six entries in src/lib/alignment/poleVocabulary.ts — pole
   definitions, bill signals, and especially the notes: the orientation guard on
   election_security_disinformation (a "security"-framed bill whose operative provisions
   restrict voter ACCESS is election_integrity's territory — emit NOTHING for it here),
   the solvency means-trap on retirement_income_security, and the boundary notes on
   trade_tariffs and curriculum_culture.
3. Read the system-prompt section of scripts/ingest/tag-bills.ts (buildSystemPrompt and
   the constants around it) and apply its classification rules: judge by substance not
   title; repeal/disapproval bills score by NET EFFECT; omnibus bills by the dominant
   provision per issue; procedural/ceremonial/study bills and bills with no clear
   directional signal get NO tag — for THIS pass, most bills matching none of the six
   ids is the expected, correct outcome, not a failure.

TASK:
1. Read the JSON file at ${file} — an array of
   { id, title, summary, jurisdiction, existing_tags }. existing_tags shows how the bill
   was classified under the old vocabulary ("issue:stance" strings) — useful context
   (e.g. a bill tagged economy_jobs whose substance is actually tariffs likely belongs
   in trade_tariffs too), but NEVER copy or modify them.
2. For each bill decide zero or more tags among the six ids ONLY. Each tag:
   canonical_issue, stance_lens ∈ {in_favor, opposed} judged against THAT issue's poles,
   confidence ∈ [0,1] (0.9 = clear signal, 0.6 = reasonable inference, 0.3 = thin).
3. Write a JSON file to EXACTLY ${resultPath(file)} (create the directory if needed)
   with shape: a FLAT ARRAY of
   { "billId": "<id>", "canonicalIssue": "...", "stanceLens": "...", "confidence": 0.9 }
   — the input contract of scripts/ingest/insert-issue-tags.ts. Write [] if no bill in
   the batch matches any of the six ids.
4. Reply via the structured output with your tallies. Do not include the tags inline.`;
}

async function tagOne(file) {
  return agent(buildPrompt(file), {
    label: file.split("/").pop(),
    phase: "Delta-tag",
    model: "sonnet",
    schema: SCHEMA,
  });
}

let pending = batchFiles;
const done = [];
for (let attempt = 1; attempt <= 3 && pending.length > 0; attempt++) {
  log(
    `Delta-tag attempt ${attempt}: ${pending.length} batch(es), ${done.length} done`,
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
    tagged: t.tagged + (r.billsNewlyTagged ?? 0),
    tags: t.tags + (r.tagsWritten ?? 0),
  }),
  { bills: 0, tagged: 0, tags: 0 },
);
log(
  `Done: ${done.length}/${batchFiles.length} batches, ${totals.bills} bills judged ` +
    `against the six v2 ids, ${totals.tagged} newly tagged, ${totals.tags} tag rows. ` +
    `Next: insert-issue-tags.ts on each ${resultDir}/*-tags.json (one-shot; do not loop the export).`,
);
return { done, failed: pending, totals };
