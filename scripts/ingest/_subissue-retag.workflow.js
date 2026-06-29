export const meta = {
  name: 'subissue-retag-healthcare',
  description: 'Assign a healthcare sub_issue facet to each healthcare_affordability bill on the Neon alignment branch (Sonnet taggers, schema-validated). Sub-issues INHERIT the parent pole — no new direction.',
  phases: [{ title: 'SubTag', detail: 'one Sonnet agent per ~100-bill batch; M2 retry on failure', model: 'sonnet' }],
}

// args = { baseDir, batches: [{ parent, batchId, count }, ...] }
// Defensive: the harness may deliver args as a JSON string rather than a parsed object.
const input = typeof args === 'string' ? JSON.parse(args) : args
const baseDir = input.baseDir
const batches = input.batches
const batchPath = (id) => `${baseDir}/${id}.json`
const resultPath = (id) => `${baseDir}/_results/${id}.json`

// The 5 approved healthcare sub-issues. MUST stay in sync with
// src/lib/alignment/subIssues.ts — this is the rendered output of
// renderTaggerSubIssueBlock() (sub-issue v1) embedded literally so the
// background-workflow agents see the exact same facets the live tagger does.
const SUB_ISSUE_IDS = ['drug_prices', 'coverage_access', 'provider_costs', 'senior_care', 'mental_behavioral_health']

const SUB_ISSUE_BLOCK = `SUB-ISSUE FACETS (sub-issue sub-issue-v1) — a sub-issue is a topic facet of an existing (bill, issue) tag; it INHERITS the parent issue's pole direction (do NOT pick a new direction). Set "sub_issue" only when a bill clearly matches one facet's bill_signals; otherwise omit it.

  healthcare_affordability:
    drug_prices (Drug & Insulin Prices):
      bill_signals: insulin / drug price caps; Medicare Part D drug-price negotiation; PBM (pharmacy benefit manager) reform
    coverage_access (Insurance Coverage & Access):
      bill_signals: ACA subsidies; Medicaid expansion / block-grant; ACA repeal; HSAs (health savings accounts)
    provider_costs (Hospital & Provider Costs):
      bill_signals: surprise-billing protections; price transparency; provider-consolidation / anti-monopoly; site-neutral payment
    senior_care (Medicare & Senior Care):
      bill_signals: Medicare benefits; Medicare Advantage rules; long-term / nursing-home care; nursing-home staffing
    mental_behavioral_health (Mental & Behavioral Health):
      bill_signals: mental-health parity enforcement; SUD / opioid treatment funding; 988 crisis funding; behavioral-health workforce`

const RULES = `You are assigning the TOPIC FACET (sub_issue) of each bill that is already tagged to the canonical issue "healthcare_affordability". A sub_issue narrows WHICH bills count toward a voter's specific concern; it INHERITS the parent's pole/direction — you are NOT choosing a new direction here, only the facet.
- Assign EXACTLY ONE sub_issue from {${SUB_ISSUE_IDS.join(', ')}} when one facet clearly dominates the bill (its bill_signals are the substance of the bill).
- Assign null when NO single facet clearly dominates: the bill spans several facets co-equally, it is a broad/structural healthcare bill that doesn't map to one facet, or it is off-facet within healthcare. WHEN IN DOUBT, null — a null falls back to the parent issue, so a null is never worse than today; never guess a facet.
- Assign null for THIN / title-only bills (null or uninformative summary with no facet signal). Do NOT guess from a marketing title alone.
CROSS-CUTTING:
- Judge by substance/effect, not by the bill's title or marketing name.
- Summaries may contain HTML tags — ignore the markup, read the text.
- REPEAL / disapproval / sunset bills still belong to the facet of the rule they touch (e.g. repealing ACA subsidies → coverage_access).
confidence: "high" = the facet's bill_signals are clearly the substance; "medium" = reasonable inference; "low" = thin/ambiguous (use null unless one facet is still discernible).`

// Agent returns a SMALL summary; the sub_issue data goes to an in-repo result file.
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    batchId: { type: 'string' },
    written: { type: 'integer' }, // number of sub_issue objects written to the result file
    assigned: { type: 'integer' }, // bills given a non-null sub_issue
    null_count: { type: 'integer' }, // bills left null (fall back to parent)
  },
  required: ['batchId', 'written'],
}

function buildPrompt(m) {
  return `Assign a healthcare sub_issue to every bill in a batch. Every bill is already tagged to the parent issue "healthcare_affordability".

${SUB_ISSUE_BLOCK}

HOW TO DECIDE:
${RULES}

TASK:
1. Read the JSON file at ${batchPath(m.batchId)}. It is { parent, batchId, bills: [{ bill_id, title, summary }] } with ${m.count} bills.
2. For EACH bill, decide sub_issue ∈ {${SUB_ISSUE_IDS.join(', ')}} OR null (when none clearly dominates, or the bill is thin/title-only), plus a confidence (high|medium|low).
3. WRITE a JSON file to EXACTLY this absolute path: ${resultPath(m.batchId)}
   with shape: { "batchId": "${m.batchId}", "parent": "healthcare_affordability", "tags": [ { "bill_id": "...", "sub_issue": "..."|null, "confidence": "..." }, ... ] }
   — EXACTLY one entry per bill. COPY each bill_id CHARACTER-FOR-CHARACTER from the input (the openstates ids are long UUIDs — do not abbreviate, retype, or alter them). No extras, no omissions.
4. Return the structured summary: { batchId: "${m.batchId}", written: <number of entries written>, assigned: <non-null count>, null_count: <null count> }.

The written file is the source of truth; make sure it is valid JSON and complete before returning.`
}

phase('SubTag')

async function subTagOne(m) {
  const r = await agent(buildPrompt(m), {
    label: m.batchId,
    phase: 'SubTag',
    model: 'sonnet',
    schema: SCHEMA,
  })
  return { ...m, summary: r }
}

// M2: the workflow's structured return verifies written==count; the MAIN LOOP then
// re-reads every in-repo result file for authoritative coverage. Retry up to 3x.
let pending = batches
const done = []
for (let attempt = 1; attempt <= 3 && pending.length > 0; attempt++) {
  log(`SubTag attempt ${attempt}: ${pending.length} batch(es), ${done.length} done`)
  const res = await parallel(pending.map((m) => () => subTagOne(m)))
  const retry = []
  for (let i = 0; i < res.length; i++) {
    const x = res[i]
    if (x && x.summary && x.summary.written === x.count) done.push({ batchId: x.batchId, parent: x.parent, written: x.summary.written })
    else retry.push(pending[i])
  }
  pending = retry
}

const totalWritten = done.reduce((s, b) => s + b.written, 0)
log(`Sub-tagging complete: ${done.length} batches, ${totalWritten} entries written; ${pending.length} still failing`)
return { done, stillFailing: pending.map((m) => m.batchId), totalWritten }
