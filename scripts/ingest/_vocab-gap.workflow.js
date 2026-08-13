export const meta = {
  name: "vocab-gap-review",
  description:
    "Review every promise against its canonical issue's definition via subscription subagents; propose missing issues, sub-issues, and pole splits as a human-approvable gap report",
  phases: [
    {
      title: "Review",
      detail: "one Sonnet agent per issue group, blind to the other groups",
      model: "sonnet",
    },
    {
      title: "Synthesize",
      detail: "merge per-group findings into one gap report",
      model: "sonnet",
    },
  ],
};

// HOW TO RUN (dev machine — the subscription pattern; plan-doc policy
// 2026-08-13: bulk LLM classification never uses the API key):
//   1. npx tsx --env-file=.env.local scripts/ingest/_export-vocab-gap-input.ts
//      → writes /tmp/vocab-gap-input.json (all promises grouped by issue)
//   2. In a Claude Code session in this repo: run this workflow
//   3. Read /tmp/vocab-gap/gap-report.md — every proposal carries example
//      promise ids and counts. Approve/reject per proposal; approved changes
//      land as a VERSIONED vocabulary bump (canonicalIssues.ts +
//      poleVocabulary.ts + extractor/tagger version), never a silent edit.
//
// VALIDATION BASELINE (do not feed to the agents — reviewers stay blind):
// Muxin's 2026-08-13 manual pass over the 30-promise TX worksheet expects
// this report to surface, at minimum: a trade/tariffs id; a labor/wages/
// worker-power id (min-wage + PRO Act promises misfiled under economy_jobs);
// a Social Security/retirement id (misfiled under healthcare_affordability);
// education POLICY vs education_funding; an AI id; a public_safety sub-issue
// split on enforcement direction; water_infrastructure vs climate-resilience
// framing. If the report misses most of these, the prompts need work.
//
// args = { inputFile?: string, resultDir?: string }
const input =
  typeof args === "string" ? JSON.parse(args ?? "{}") : (args ?? {});
const inputFile = input.inputFile ?? "/tmp/vocab-gap-input.json";
const resultDir = input.resultDir ?? "/tmp/vocab-gap";

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    issueId: { type: "string" },
    promisesReviewed: { type: "integer" },
    fitsCleanly: { type: "integer" },
    misfits: { type: "integer" },
    proposals: { type: "integer" },
  },
  required: ["issueId", "promisesReviewed", "misfits", "proposals"],
};

const SYNTH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    groupsMerged: { type: "integer" },
    newIssueProposals: { type: "integer" },
    subIssueProposals: { type: "integer" },
    poleProposals: { type: "integer" },
    reportPath: { type: "string" },
  },
  required: ["groupsMerged", "reportPath"],
};

function reviewPrompt(issueId) {
  return `You are reviewing the canonical-issue VOCABULARY of this repo's promise ledger
for gaps, using the promises actually filed under ONE issue. You are not re-tagging
promises — you are auditing whether the vocabulary itself is fine-grained enough for
what candidates actually promise.

GROUND TRUTH — read from source, do not improvise:
1. src/lib/canonicalIssues.ts — the full list of existing canonical issue ids.
2. src/lib/alignment/poleVocabulary.ts — each issue's in_favor/opposed pole
   definitions, bill signals, and disambiguation notes. THE POLES CARRY DIRECTION;
   the issue id is deliberately direction-neutral. A promise taking a side is NOT a
   vocabulary gap — a promise whose TOPIC the definitions don't really cover is.
3. The JSON file at ${inputFile} — find the group whose issueId is "${issueId}" and
   review ONLY that group's promises.

FOR EACH PROMISE in the group, judge fit against the issue's definition and poles:
- "fits" — the topic is genuinely this issue (even if the promise takes a side).
- "better_existing:<id>" — another EXISTING id fits the topic better.
- "needs_new" — no existing id honestly covers the topic; describe the missing id.
- "needs_sub_issue" — the id is right but the topic needs a named facet beneath it
  (use this especially where DIRECTION-WITHIN-THE-TOPIC would otherwise be lost:
  e.g. a "public safety" promise that specifically expands enforcement vs one that
  reforms it — sub-issues are what alignment reads to know WHICH KIND of caring
  about the topic a promise expresses).

Also note pole-definition problems: cases where the issue's existing in_favor/opposed
poles cannot express what this promise is for or against.

WRITE a JSON file to EXACTLY ${resultDir}/review-${issueId}.json (create the
directory if needed) with shape:
{
  "issueId": "${issueId}",
  "perPromise": [{ "promiseId": "...", "fit": "fits|better_existing:<id>|needs_new|needs_sub_issue", "reason": "<one sentence>" }],
  "proposals": [{
    "kind": "new_issue|sub_issue|pole_change",
    "id": "<snake_case id or parent_issue/sub_issue>",
    "definition": "<one-sentence definition, direction-neutral>",
    "poleSketch": "<for new_issue/pole_change: one line per pole>",
    "examplePromiseIds": ["..."],
    "reason": "<why the existing vocabulary cannot express this>"
  }]
}
Propose conservatively: a proposal needs at least one concrete promise behind it, and
"the label reads oddly" is not a gap (note it in perPromise reasons instead).

Reply via the structured output with tallies only. Do not include the report inline.`;
}

function synthPrompt(issueIds) {
  return `You are merging the per-issue vocabulary-gap reviews into ONE report a human
will approve or reject proposal-by-proposal.

READ:
1. Every ${resultDir}/review-<issueId>.json for issueIds: ${issueIds.join(", ")}.
2. src/lib/canonicalIssues.ts and src/lib/alignment/poleVocabulary.ts (so merged
   proposals never collide with existing ids).

MERGE the proposals across groups: identical/overlapping proposals from different
groups become ONE proposal with combined example ids and a total count. Keep
per-promise misfit lists intact. Order proposals by evidence count, descending.

WRITE two files:
1. ${resultDir}/gap-report.json — machine-readable: { proposals: [merged proposal
   objects incl. combined examplePromiseIds, count, sourceIssueIds], misfits:
   [{ promiseId, filedUnder, fit, reason }] (every non-"fits" row) }.
2. ${resultDir}/gap-report.md — the human review document: one section per merged
   proposal (kind, proposed id, definition, pole sketch, evidence count, example
   promise TEXTS quoted with their ids, and an explicit APPROVE / REJECT checkbox
   line), then a misfit appendix table. State clearly at the top: approving a
   proposal means a VERSIONED vocabulary bump + re-tag, never a silent edit.

Reply via the structured output with tallies and the report path.`;
}

// Workflow scripts have no filesystem access, so group discovery is
// delegated to a cheap scout agent instead of reading the input here.
const scout = await agent(
  `Read the JSON file at ${inputFile} and reply with the issueId of every entry in
its "groups" array. Do not include anything else.`,
  {
    label: "scout-groups",
    phase: "Review",
    model: "sonnet",
    effort: "low",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        issueIds: { type: "array", items: { type: "string" }, maxItems: 64 },
      },
      required: ["issueIds"],
    },
  },
);
const issueIds = (scout?.issueIds ?? []).filter(Boolean);
if (issueIds.length === 0) {
  log(`No issue groups found in ${inputFile} — did the export run?`);
  return { error: "no-groups" };
}
log(`Reviewing ${issueIds.length} issue groups`);

// Review every group; one retry pass for failures.
let pending = issueIds;
const done = [];
for (let attempt = 1; attempt <= 2 && pending.length > 0; attempt++) {
  const res = await parallel(
    pending.map(
      (id) => () =>
        agent(reviewPrompt(id), {
          label: `review:${id}`,
          phase: "Review",
          model: "sonnet",
          schema: REVIEW_SCHEMA,
        }),
    ),
  );
  const retry = [];
  for (let i = 0; i < res.length; i++) {
    if (res[i] && typeof res[i].promisesReviewed === "number") {
      done.push(res[i]);
    } else {
      retry.push(pending[i]);
    }
  }
  pending = retry;
}
if (pending.length > 0) {
  log(
    `Review FAILED after retry for: ${pending.join(", ")} — proceeding without.`,
  );
}

const synth = await agent(synthPrompt(done.map((d) => d.issueId)), {
  label: "synthesize-gap-report",
  phase: "Synthesize",
  model: "sonnet",
  schema: SYNTH_SCHEMA,
});

const totals = done.reduce(
  (t, r) => ({
    promises: t.promises + (r.promisesReviewed ?? 0),
    misfits: t.misfits + (r.misfits ?? 0),
    proposals: t.proposals + (r.proposals ?? 0),
  }),
  { promises: 0, misfits: 0, proposals: 0 },
);
log(
  `Done: ${done.length}/${issueIds.length} groups, ${totals.promises} promises ` +
    `reviewed, ${totals.misfits} misfits, ${totals.proposals} raw proposals -> ` +
    `${synth?.reportPath ?? `${resultDir}/gap-report.md`}. ` +
    `Next: read gap-report.md and approve/reject per proposal.`,
);
return { groups: done, failed: pending, synthesis: synth, totals };
