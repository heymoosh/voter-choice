export const meta = {
  name: "promise-extract-agent",
  description:
    "Extract campaign promises from already-fetched archived pages via subscription subagents (Sonnet), writing _promise-extract-import.ts-ready result files",
  phases: [
    {
      title: "Extract",
      detail: "one Sonnet agent per exported batch file; retry on failure",
      model: "sonnet",
    },
  ],
};

// HOW TO RUN (dev machine, the subscription extraction path — same policy as
// _tag-bills.workflow.js: bulk LLM work never uses the API key):
//   1. npx tsx --env-file=.env.local scripts/ingest/_promise-extract-export.ts \
//        --corpus <spike --json output> --out /tmp/promise-batches
//      → writes /tmp/promise-batches/batch-0001.json.. and manifest.json
//   2. In a Claude Code session in this repo: read the manifest's batchFiles
//      array, then run this workflow with
//        args = { batchFiles: <manifest.batchFiles>, resultDir: "/tmp/promise-results" }
//   3. npx tsx --env-file=.env.local scripts/ingest/_promise-extract-import.ts \
//        --batches /tmp/promise-batches --results /tmp/promise-results [--dry-run]
//   4. Re-run step 1 against the same corpus file to pick up anything still
//      missing (fetchAlreadyExtracted skips whatever step 3 already wrote).
//
// args = { batchFiles: string[], resultDir?: string }
const input =
  typeof args === "string" ? JSON.parse(args ?? "{}") : (args ?? {});
const batchFiles = input.batchFiles;
if (!Array.isArray(batchFiles) || batchFiles.length === 0) {
  throw new Error(
    "promise-extract.workflow.js requires args.batchFiles — read it from " +
      "<export --out dir>/manifest.json (written by _promise-extract-export.ts).",
  );
}
const resultDir = input.resultDir ?? "/tmp/promise-results";
const resultPath = (f) =>
  `${resultDir}/${f
    .split("/")
    .pop()
    .replace(/\.json$/u, "")}-results.json`;

// Agent returns a SMALL summary; the extractions go to the result file.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    batchFile: { type: "string" },
    candidatesInBatch: { type: "integer" },
    pagesProcessed: { type: "integer" },
    promisesFound: { type: "integer" },
    resultFile: { type: "string" },
  },
  required: [
    "batchFile",
    "candidatesInBatch",
    "pagesProcessed",
    "promisesFound",
    "resultFile",
  ],
};

function buildPrompt(file) {
  const out = resultPath(file);
  return `You are the PROMISE EXTRACTOR for this repo's promise-ledger pipeline, running as a
subagent (the subscription equivalent of scripts/ingest/promise-extract.ts's old, now-removed,
direct-API path). Extract campaign promises from one exported batch of already-fetched pages.

GROUND RULES — read the repo's source of truth first, do not improvise the rubric:
1. Read scripts/ingest/promise-extract.ts's buildExtractionSystemPrompt() function in full. It
   defines the FOUR-GATE extraction test (committed actor / falsifiable action / determinable
   scope / testable window), the canonical-issue and sub-issue vocabularies, the calibration
   examples, and the exact per-promise field contract (promise_text, canonical_issue, sub_issue,
   promise_type, conditions_deadline). Apply it EXACTLY — do not paraphrase or loosen any gate.
2. The load-bearing rule: promise_text must be a VERBATIM, character-for-character quote from the
   page text you were given — never a paraphrase, never reworded, even slightly. A downstream
   script re-checks every quote against the original page text and silently drops anything that
   doesn't match exactly, so a paraphrase is simply wasted work, not a shortcut.
3. Prefer returning nothing over a doubtful extraction. A wrong promise is a false attribution to
   a named candidate; a missed one costs nothing. Most pages have zero qualifying promises — that
   is the expected, correct outcome, not a failure.

TASK:
1. Read the JSON file at ${file} — an array of candidates, each:
   { candidateId, name, office, state, district, cycle, pages: [{ pageUrl, archiveUrl, pageText }] }
   pageText is already plain text (HTML stripped), truncated to a fixed length — treat it as
   the full page.
2. For each candidate, for each page, build the same context promise-extract.ts's
   buildPagePrompt() would (candidate name, office/state/district, cycle, page URL, page text)
   and apply the four-gate rubric from step 1 to that page's text ONLY — do not let one page's
   content leak into another's extraction, and do not use outside knowledge of the candidate.
3. For each page with at least one qualifying promise, produce a JSON array string in EXACTLY
   this shape (the same shape the old direct-API call used to return per page):
     [{ "promise_text": "...", "canonical_issue": "...", "sub_issue": "..." | null,
        "promise_type": "...", "conditions_deadline": "..." | null }, ...]
   Skip pages with zero qualifying promises entirely — do not emit an entry for them.
4. Write a JSON file to EXACTLY ${out} (create the directory if needed) with shape: a FLAT ARRAY
   of { "candidateId": "...", "pageUrl": "...", "archiveUrl": "...", "promisesJson": "<the JSON
   array string from step 3>" } — one entry per (candidate, page) that had ≥1 promise. This is
   the input contract of scripts/ingest/_promise-extract-import.ts, which re-validates every
   quote against the original page text before anything reaches the database.
5. Reply via the structured output with your tallies (candidatesInBatch = candidates in the input
   file; pagesProcessed = total pages you looked at across all candidates; promisesFound = total
   promise objects across all your promisesJson arrays; resultFile = "${out}"). Do not include the
   extractions inline in your reply.`;
}

async function extractOne(file) {
  return agent(buildPrompt(file), {
    label: file.split("/").pop(),
    phase: "Extract",
    model: "sonnet",
    schema: SCHEMA,
  });
}

let pending = batchFiles;
const done = [];
for (let attempt = 1; attempt <= 3 && pending.length > 0; attempt++) {
  log(
    `Extract attempt ${attempt}: ${pending.length} batch(es), ${done.length} done`,
  );
  const res = await parallel(pending.map((f) => () => extractOne(f)));
  const retry = [];
  for (let i = 0; i < res.length; i++) {
    const r = res[i];
    if (r && typeof r.pagesProcessed === "number" && r.candidatesInBatch > 0) {
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
    candidates: t.candidates + (r.candidatesInBatch ?? 0),
    pages: t.pages + (r.pagesProcessed ?? 0),
    promises: t.promises + (r.promisesFound ?? 0),
  }),
  { candidates: 0, pages: 0, promises: 0 },
);
log(
  `Done: ${done.length}/${batchFiles.length} batches, ${totals.candidates} candidates seen, ` +
    `${totals.pages} pages processed, ${totals.promises} promises found. ` +
    `Next: _promise-extract-import.ts --batches <export dir> --results ${resultDir}, then re-run ` +
    `the export script against the same corpus to verify 0 candidates remaining.`,
);
return { done, failed: pending, totals };
