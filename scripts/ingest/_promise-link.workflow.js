export const meta = {
  name: "promise-link-agent",
  description:
    "Classify each promise's pole-axis side via subscription subagents (Haiku), writing _promise-link-import.ts-ready result files",
  phases: [
    {
      title: "Link",
      detail: "one Haiku agent per exported batch file; retry on failure",
      model: "haiku",
    },
  ],
};

// HOW TO RUN (dev machine, the subscription linking path — same policy as
// _promise-extract.workflow.js: bulk LLM work never uses the API key):
//   1. npx tsx --env-file=.env.local scripts/ingest/_promise-link-export.ts \
//        --out /tmp/link-batches
//      -> writes /tmp/link-batches/batch-0001.json.. and manifest.json
//   2. In a Claude Code session in this repo: read the manifest's batchFiles
//      array, then run this workflow with
//        args = { batchFiles: <manifest.batchFiles>, resultDir: "/tmp/link-results" }
//   3. npx tsx --env-file=.env.local scripts/ingest/_promise-link-import.ts \
//        --batches /tmp/link-batches --results /tmp/link-results [--dry-run]
//
// args = { batchFiles: string[], resultDir?: string }
const input =
  typeof args === "string" ? JSON.parse(args ?? "{}") : (args ?? {});
const batchFiles = input.batchFiles;
if (!Array.isArray(batchFiles) || batchFiles.length === 0) {
  throw new Error(
    "promise-link.workflow.js requires args.batchFiles — read it from " +
      "<export --out dir>/manifest.json (written by _promise-link-export.ts).",
  );
}
const resultDir = input.resultDir ?? "/tmp/link-results";
const resultPath = (f) =>
  `${resultDir}/${f
    .split("/")
    .pop()
    .replace(/\.json$/u, "")}-results.json`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    batchFile: { type: "string" },
    promisesInBatch: { type: "integer" },
    sidesClassified: { type: "integer" },
    resultFile: { type: "string" },
  },
  required: ["batchFile", "promisesInBatch", "sidesClassified", "resultFile"],
};

function buildPrompt(file) {
  const out = resultPath(file);
  return `You are the PROMISE-LINK POLE CLASSIFIER for this repo's promise-ledger pipeline, running
as a subagent (the subscription equivalent of scripts/ingest/promise-link.ts's
classifyPromiseSide() direct-API path, which this replaces for bulk runs). Your ONLY job is a
small, bounded classification per promise — you do not decide any linking or evidence logic
yourself, that is pure code in the import step.

GROUND RULES — read the repo's source of truth first, do not improvise:
1. Read scripts/ingest/promise-link.ts's buildPoleSystemPrompt() function in full, and the pole
   vocabulary it renders (src/lib/alignment/poleVocabulary.ts's renderTaggerPoleBlock() output).
   This is the SAME pole vocabulary the bill tagger uses — a promise's side and a bill's side must
   be directly comparable, so apply the definitions exactly as written, do not paraphrase.
2. Judge ONLY from the promise's own text against the pole definitions for ITS canonical_issue.
   Never use outside knowledge about the candidate, their party, or how the vote turned out.
3. "unclear" is the CORRECT answer whenever the promise text does not commit to a side of that
   issue's axis. A promise can be genuine yet directionally unclear (e.g. "I will hold hearings on
   drug pricing"). Never guess: guessing wrongly corrupts a downstream verdict; "unclear" just
   means a human reviews it later, which costs nothing.

TASK:
1. Read the JSON file at ${file} — an array of promises, each:
   { id, candidateId, canonicalIssue, promiseText, promiseType, conditionsDeadline,
     voteMatches: [...], cosponsorMatches: [...] }
   (voteMatches/cosponsorMatches are pre-fetched official-record matches — you do NOT need them
   for classification; they exist only so the import step can build link rows without a second
   DB query. Ignore them for this task.)
2. For EACH promise, classify which side of its canonical_issue's pole axis the promise text
   commits to, using EXACTLY the rules and format from buildPoleSystemPrompt() in step 1:
     {"side": "in_favor"} or {"side": "opposed"} or {"side": "unclear"}
3. Write a JSON file to EXACTLY ${out} (create the directory if needed) with shape: a FLAT ARRAY
   of { "promiseId": "...", "sideJson": "<the JSON object string from step 2>" } — one entry per
   promise in the input file (every promise gets exactly one entry). This is the input contract of
   scripts/ingest/_promise-link-import.ts.
4. Reply via the structured output with your tallies (promisesInBatch = promises in the input
   file; sidesClassified = entries you wrote to the result file — should equal promisesInBatch;
   resultFile = "${out}"). Do not include the classifications inline in your reply.`;
}

async function linkOne(file) {
  return agent(buildPrompt(file), {
    label: file.split("/").pop(),
    phase: "Link",
    model: "haiku",
    schema: SCHEMA,
  });
}

let pending = batchFiles;
const done = [];
for (let attempt = 1; attempt <= 3 && pending.length > 0; attempt++) {
  log(
    `Link attempt ${attempt}: ${pending.length} batch(es), ${done.length} done`,
  );
  const res = await parallel(pending.map((f) => () => linkOne(f)));
  const retry = [];
  for (let i = 0; i < res.length; i++) {
    const r = res[i];
    if (r && typeof r.sidesClassified === "number" && r.promisesInBatch > 0) {
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
    sides: t.sides + (r.sidesClassified ?? 0),
  }),
  { promises: 0, sides: 0 },
);
log(
  `Done: ${done.length}/${batchFiles.length} batches, ${totals.promises} promises seen, ` +
    `${totals.sides} sides classified. Next: _promise-link-import.ts --batches <export dir> ` +
    `--results ${resultDir}.`,
);
return { done, failed: pending, totals };
