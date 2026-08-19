export const meta = {
  name: "promise-adjudicate-agent",
  description:
    "Adjudicate campaign promises (kept/broken/etc.) via subscription subagents (Sonnet), writing _promise-adjudicate-import.ts-ready result files",
  phases: [
    {
      title: "Adjudicate",
      detail: "one Sonnet agent per exported batch file; retry on failure",
      model: "sonnet",
    },
  ],
};

// HOW TO RUN (dev machine, the subscription adjudication path — same policy
// as _promise-extract.workflow.js: bulk LLM work never uses the API key):
//   1. npx tsx --env-file=.env.local scripts/ingest/_promise-adjudicate-export.ts \
//        --cycle 2022 --out /tmp/adjudicate-batches
//      -> writes /tmp/adjudicate-batches/{deterministic.json,batch-0001.json,...,manifest.json}
//   2. In a Claude Code session in this repo: read the manifest's batchFiles
//      array (and its nowIso/window), then run this workflow with
//        args = { batchFiles: <manifest.batchFiles>, nowIso: <manifest.nowIso>,
//                  window: <manifest.window>, resultDir: "/tmp/adjudicate-results" }
//   3. npx tsx --env-file=.env.local scripts/ingest/_promise-adjudicate-import.ts \
//        --batches /tmp/adjudicate-batches --results /tmp/adjudicate-results [--dry-run]
//      (this also upserts deterministic.json's rows — no LLM step needed for those)
//
// args = { batchFiles: string[], nowIso: string, window: {start,end}, resultDir?: string }
const input =
  typeof args === "string" ? JSON.parse(args ?? "{}") : (args ?? {});
const batchFiles = input.batchFiles;
if (!Array.isArray(batchFiles) || batchFiles.length === 0) {
  throw new Error(
    "promise-adjudicate.workflow.js requires args.batchFiles — read it from " +
      "<export --out dir>/manifest.json (written by _promise-adjudicate-export.ts).",
  );
}
if (!input.nowIso || !input.window?.start || !input.window?.end) {
  throw new Error(
    "promise-adjudicate.workflow.js requires args.nowIso and args.window — " +
      "also read from manifest.json.",
  );
}
const resultDir = input.resultDir ?? "/tmp/adjudicate-results";
const resultPath = (f) =>
  `${resultDir}/${f
    .split("/")
    .pop()
    .replace(/\.json$/u, "")}-results.json`;

// Agent returns a SMALL summary; the verdicts go to the result file.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    batchFile: { type: "string" },
    promisesInBatch: { type: "integer" },
    verdictsWritten: { type: "integer" },
    resultFile: { type: "string" },
  },
  required: ["batchFile", "promisesInBatch", "verdictsWritten", "resultFile"],
};

function buildPrompt(file) {
  const out = resultPath(file);
  return `You are the PROMISE ADJUDICATOR for this repo's promise-ledger pipeline, running as a
subagent (the subscription equivalent of scripts/ingest/promise-adjudicate.ts's direct-API
adjudicateWithModel() path, which this replaces for bulk runs — same policy as the promise
EXTRACTOR workflow). Adjudicate whether each promise in one exported batch was kept, by applying
a PUBLISHED RUBRIC exactly as written.

GROUND RULES — read the repo's source of truth first, do not improvise the rubric:
1. Read scripts/ingest/promise-adjudicate.ts's buildAdjudicationSystemPrompt() function in full —
   it is the complete, authoritative rubric text (rule order, evidence rungs, the unit of
   evaluation, the six verdict rules). Apply it EXACTLY, rule by rule, first match wins. Do not
   paraphrase, loosen, or reorder any rule.
2. You are NOT the judge — you are an evidence assembler applying a published rubric. You may
   cite ONLY the linked actions given to you for that promise; never outside knowledge of the
   candidate, their party, or the outcome.
3. Prefer not_yet_rated over guessing. A wrong kept/broken call is a false public claim about a
   named official; flagging costs nothing. Rules 4 and 5 of the rubric name three patterns
   (compound splits, inaction-with-opportunity, conduct violations) that ARE cleanly decidable —
   do not flag those into not_yet_rated just because they are hard.
4. The test was PRE-DECLARED at extraction (promise_type + conditions_deadline), before any
   outcome was known. Apply that declared test. If it looks mis-typed, that is a flag (rule 6),
   not a re-interpretation by you.

TASK:
1. Read the JSON file at ${file} — an array of promises, each:
   { id, candidateId, canonicalIssue, promiseText, promiseType, conditionsDeadline, actions:
     [{ actionId, actionType, direction, evidenceLevel, billId, billTitle, billStatus, voteCast,
        voteDate }] }
2. This run's clock/window (same for every promise in this batch): now=${input.nowIso},
   window=${input.window.start} to ${input.window.end}.
3. For EACH promise, build the same context promise-adjudicate.ts's buildAdjudicationPrompt()
   would (the promise text verbatim, its pre-declared test, the window, and its linked actions
   rendered as renderActionForPrompt() would) and apply the rubric from step 1 to that promise's
   actions ONLY — do not let one promise's evidence leak into another's verdict.
4. Produce a JSON object string in EXACTLY this shape (the same shape the direct-API call used to
   return per promise):
     {"verdict": "<kept|attempted_blocked|compromise|broken|not_yet_testable|not_yet_rated>",
      "rationale": "<2-4 sentences citing the rule applied and the specific evidence>",
      "evidence_action_ids": ["<only ids from THIS promise's own actions list>"],
      "ambiguous_reason": "<only when verdict is not_yet_rated: why>"}
   evidence_action_ids MUST be a subset of the promise's own actions[].actionId — never invent an
   id, never cite another promise's action. A downstream script re-validates this and discards
   any verdict that cites an unlinked id, so fabricating one is simply wasted work.
5. Write a JSON file to EXACTLY ${out} (create the directory if needed) with shape: a FLAT ARRAY
   of { "promiseId": "...", "verdictJson": "<the JSON object string from step 4>" } — one entry
   per promise in the input file (every promise gets exactly one entry, even not_yet_rated ones).
   This is the input contract of scripts/ingest/_promise-adjudicate-import.ts, which re-validates
   every verdict (evidence ids, enum, rationale) before anything reaches the database.
6. Reply via the structured output with your tallies (promisesInBatch = promises in the input
   file; verdictsWritten = entries you wrote to the result file — should equal promisesInBatch;
   resultFile = "${out}"). Do not include the verdicts inline in your reply.`;
}

async function adjudicateOne(file) {
  return agent(buildPrompt(file), {
    label: file.split("/").pop(),
    phase: "Adjudicate",
    model: "sonnet",
    schema: SCHEMA,
  });
}

let pending = batchFiles;
const done = [];
for (let attempt = 1; attempt <= 3 && pending.length > 0; attempt++) {
  log(
    `Adjudicate attempt ${attempt}: ${pending.length} batch(es), ${done.length} done`,
  );
  const res = await parallel(pending.map((f) => () => adjudicateOne(f)));
  const retry = [];
  for (let i = 0; i < res.length; i++) {
    const r = res[i];
    if (r && typeof r.verdictsWritten === "number" && r.promisesInBatch > 0) {
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
    promises: t.promises + (r.promisesInBatch ?? 0),
    verdicts: t.verdicts + (r.verdictsWritten ?? 0),
  }),
  { promises: 0, verdicts: 0 },
);
log(
  `Done: ${done.length}/${batchFiles.length} batches, ${totals.promises} promises seen, ` +
    `${totals.verdicts} verdicts written. Next: _promise-adjudicate-import.ts --batches ` +
    `<export dir> --results ${resultDir}.`,
);
return { done, failed: pending, totals };
