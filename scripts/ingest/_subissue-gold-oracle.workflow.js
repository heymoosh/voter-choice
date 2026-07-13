export const meta = {
  name: 'subissue-gold-oracle',
  description: 'Independent 3-juror Opus panel labels the healthcare sub-issue gold sample BLIND (facet ∈ 5 + null) — ground truth for the cutover gate, independent of the Sonnet that produced the sub-tags.',
  phases: [{ title: 'Label', detail: '3 independent Opus jurors per facet batch, blind to the tagger; M2 retry', model: 'opus' }],
}

// args = { baseDir, batches: [{ parent, batchId, count }, ...], jurors: 3 }
const input = typeof args === 'string' ? JSON.parse(args) : args
const baseDir = input.baseDir
const batches = input.batches
const JURORS = input.jurors || 3
const batchPath = (id) => `${baseDir}/${id}.json`
const resultPath = (id, j) => `${baseDir}/_results/${id}.j${j}.json`

const FACETS = ['drug_prices', 'coverage_access', 'provider_costs', 'senior_care', 'mental_behavioral_health']

// Verbatim rendered output of renderTaggerSubIssueBlock() (sub-issue-v1) — the SAME
// facet defs the sub-tagger saw, so the panel judges against an identical rubric.
const SUB_ISSUE_BLOCK = `SUB-ISSUE FACETS (healthcare_affordability) — a facet is a TOPIC of a healthcare bill. Pick the ONE facet whose bill_signals are the substance of the bill; otherwise null.
  drug_prices (Drug & Insulin Prices): insulin / drug price caps; Medicare Part D drug-price negotiation; PBM (pharmacy benefit manager) reform
  coverage_access (Insurance Coverage & Access): ACA subsidies; Medicaid expansion / block-grant; ACA repeal; HSAs (health savings accounts)
  provider_costs (Hospital & Provider Costs): surprise-billing protections; price transparency; provider-consolidation / anti-monopoly; site-neutral payment
  senior_care (Medicare & Senior Care): Medicare benefits; Medicare Advantage rules; long-term / nursing-home care; nursing-home staffing
  mental_behavioral_health (Mental & Behavioral Health): mental-health parity enforcement; SUD / opioid treatment funding; 988 crisis funding; behavioral-health workforce`

const RULES = `You are an INDEPENDENT JUROR establishing GROUND TRUTH for the TOPIC FACET of each healthcare bill. Reason ONLY from the bill's title + summary and the facet definitions below. You have NO prior tag to defer to — decide from scratch.
- sub_issue = one of {${FACETS.join(', ')}} → that facet's bill_signals are clearly the substance of the bill.
- sub_issue = null → NO single facet clearly dominates: the bill spans several facets co-equally, it is a broad/structural healthcare bill, it is off-facet within healthcare, or it is thin/title-only with no facet signal. WHEN IN DOUBT, null — never guess a facet.
CROSS-CUTTING:
- Judge by substance/effect, NOT by the bill's title or marketing name.
- Summaries may contain HTML tags — ignore the markup, read the text.
- REPEAL / disapproval / sunset bills belong to the facet of the rule they touch (repealing ACA subsidies → coverage_access).
confidence: "high" = the facet's signals are clearly the substance; "medium" = reasonable inference; "low" = thin/ambiguous (prefer null unless one facet is still discernible).`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    batchId: { type: 'string' },
    juror: { type: 'integer' },
    written: { type: 'integer' },
  },
  required: ['batchId', 'juror', 'written'],
}

function buildPrompt(m, juror) {
  return `You are juror #${juror} of an independent panel. Assign the TOPIC FACET of every bill in a batch, BLIND (no existing tag is provided). Every bill is already tagged to the canonical issue "healthcare_affordability".

${SUB_ISSUE_BLOCK}

HOW TO DECIDE:
${RULES}

TASK:
1. Read the JSON file at ${batchPath(m.batchId)}. It is { parent, batchId, bills: [{ bill_id, title, summary }] } with ${m.count} bills.
2. For EACH bill, independently decide sub_issue ∈ {${FACETS.join(', ')}} OR null, plus a confidence (high|medium|low).
3. WRITE a JSON file to EXACTLY this absolute path: ${resultPath(m.batchId, juror)}
   with shape: { "batchId": "${m.batchId}", "juror": ${juror}, "tags": [ { "bill_id": "...", "sub_issue": "..."|null, "confidence": "..." }, ... ] }
   — EXACTLY one entry per bill. COPY each bill_id CHARACTER-FOR-CHARACTER from the input (long openstates UUIDs — do not abbreviate or alter). No extras, no omissions.
4. Return the structured summary: { batchId: "${m.batchId}", juror: ${juror}, written: <number written> }.

The written file is the source of truth; make sure it is valid JSON and complete before returning.`
}

phase('Label')

async function labelOne(m, juror) {
  const r = await agent(buildPrompt(m, juror), {
    label: `${m.batchId}.j${juror}`,
    phase: 'Label',
    model: 'opus',
    schema: SCHEMA,
  })
  return { batchId: m.batchId, count: m.count, juror, summary: r }
}

let pending = []
for (const m of batches) for (let j = 1; j <= JURORS; j++) pending.push({ m, j })
const done = []
for (let attempt = 1; attempt <= 3 && pending.length > 0; attempt++) {
  log(`Label attempt ${attempt}: ${pending.length} (batch×juror) task(s), ${done.length} done`)
  const res = await parallel(pending.map((t) => () => labelOne(t.m, t.j)))
  const retry = []
  for (let i = 0; i < res.length; i++) {
    const x = res[i]
    if (x && x.summary && x.summary.written === x.count) done.push({ batchId: x.batchId, juror: x.juror, written: x.summary.written })
    else retry.push(pending[i])
  }
  pending = retry
}

const totalWritten = done.reduce((s, b) => s + b.written, 0)
log(`Panel complete: ${done.length} juror-files, ${totalWritten} labels; ${pending.length} still failing`)
return { done, stillFailing: pending.map((t) => `${t.m.batchId}.j${t.j}`), totalWritten }
