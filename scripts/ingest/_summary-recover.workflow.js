export const meta = {
  name: "summary-recover",
  description:
    "Summarize recovered full bill text + (contested batches) assign pole_stance, on the Neon alignment branch (Sonnet)",
  phases: [
    {
      title: "Recover",
      detail:
        "Sonnet agent per batch: summary (+pole_stance) from full text; writes in-repo result file",
      model: "sonnet",
    },
  ],
};

const input = typeof args === "string" ? JSON.parse(args) : args;
const baseDir = input.baseDir;
// Accept either an explicit `batches` list or a compact `groups` form
// ([{ prefix, counts:[...] }]) that expands to batchId `${prefix}-${i+1}` with issue
// derived from the prefix (null for the summary-only group).
let batches = input.batches;
if (!batches && input.groups) {
  batches = [];
  for (const g of input.groups) {
    g.counts.forEach((count, i) => {
      batches.push({
        batchId: `${g.prefix}-${String(i + 1).padStart(3, "0")}`,
        issue: g.prefix === "__summary_only__" ? null : g.prefix,
        count,
      });
    });
  }
}
const batchPath = (id) => `${baseDir}/${id}.json`;
const resultPath = (id) => `${baseDir}/_results/${id}.json`;

// Compact (axis, pole) defs — A ≡ in_favor, B ≡ opposed. Orientation is fixed PER ISSUE.
const POLES = {
  gun_rights_safety: `A/in_favor = gun ACCESS/rights (concealed-carry reciprocity, repeal waiting periods, block bans, suppressor dereg). B/opposed = gun REGULATION/safety (background checks, assault-weapon/high-cap bans, red-flag, storage, waiting periods).`,
  immigration: `A/in_favor = WELCOMING/expand legal immigration & protections (path to citizenship, DACA/TPS, raise refugee caps, in-state tuition). B/opposed = RESTRICTIVE/enforcement-first (E-Verify mandates, asylum limits, more detention, cooperation with ICE).`,
  border_security: `A/in_favor = STRENGTHEN border enforcement (wall funding, more Border Patrol, detention). B/opposed = LIMIT enforcement/humane (cut wall funding, alternatives to detention, expand asylum).`,
  public_safety: `A/in_favor = POLICING/enforcement capacity (police funding, tougher enforcement powers, protect qualified immunity). B/opposed = REFORM & prevention (accountability, end qualified immunity, diversion). MEANS-TRAP: funding crime PREVENTION/community-investment advances B/opposed, NOT A.`,
  crime_public_safety: `A/in_favor = TOUGH-ON-CRIME/enforcement (mandatory minimums, more police, cash-bail retention, tougher penalties). B/opposed = criminal-justice REFORM (bail/sentencing reform, decriminalization, reentry).`,
  reproductive_rights: `A/in_favor = PROTECT/expand access (codify Roe, clinic access, fund repro care, protect contraception/IVF). B/opposed = RESTRICT access (abortion bans/limits, defund providers, fetal personhood, IVF/contraception restrictions).`,
  environment_climate: `A/in_favor = CLIMATE ACTION/environmental protection (emissions limits, clean-energy incentives, conservation, public-land protection). B/opposed = DEREGULATION/limit climate mandates (roll back EPA rules, open lands to drilling). NOTE: orientation is OPPOSITE to energy_grid — judge environment independently.`,
  election_integrity: `A/in_favor = VOTING ACCESS/expand participation (auto/same-day registration, mail-voting expansion, restore rights). B/opposed = voting RESTRICTIONS/security-first (voter-ID, roll purges, limit mail/drop boxes). ORIENTATION LOCK: a restrictive "Election Integrity Act" is B/opposed regardless of its title.`,
  economy_jobs: `A/in_favor = PUBLIC INVESTMENT & worker protections (infrastructure/jobs spending, minimum-wage increases, pro-union/PRO Act, expanded unemployment). B/opposed = DEREGULATION & lower taxes (corporate/income tax cuts, deregulation, right-to-work, spending cuts). Outcome-only "more jobs" reveals no side → no_score.`,
  education_funding: `A/in_favor = INCREASE public-education funding & access (public-school funding, Title I, loan relief, pre-K, teacher pay). B/opposed = SCHOOL CHOICE/limit federal spending (vouchers/ESA, cut Dept of Ed, block grants, oppose loan forgiveness). Charter bills → dominant mechanism.`,
  property_taxes: `A/in_favor = LOWER/cap property taxes (caps, homestead exemptions, rollbacks, assessment limits). B/opposed = MAINTAIN tax base for services (oppose caps, raise rates/assessments to fund schools/services).`,
  energy_grid: `A/in_favor = EXPAND FOSSIL/conventional production (oil/gas leasing, pipelines, LNG, block emissions rules; nuclear & carbon-capture → A). B/opposed = CLEAN-ENERGY transition/restrict fossil (renewables, emissions limits, block fossil leases, electrification). MEANS-TRAP: funding CLEAN energy advances B/opposed, NOT A.`,
};

const RULES = `pole_stance = "in_favor" if a YEA vote advances Pole A; "opposed" if YEA advances Pole B; "no_score" if the bill doesn't clearly advance EITHER pole for THIS issue (off-topic, procedural, study-only, genuinely mixed). When in doubt → no_score (failing safe is correct).
- REPEAL/"congressional disapproval"/nullification: score by NET EFFECT (what the underlying rule did, then the effect of repealing it).
- Omnibus/mixed: tag by the DOMINANT provision for this issue; co-equal → no_score.
- Judge by substance/effect, not the bill's marketing title.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { batchId: { type: "string" }, written: { type: "integer" } },
  required: ["batchId", "written"],
};

function buildPrompt(m) {
  const issue = m.issue;
  const taggingStep = issue
    ? `
2. Assign a pole_stance ∈ {in_favor, opposed, no_score} and confidence ∈ {high, medium, low} for the canonical issue "${issue}".
POLES (${issue}): ${POLES[issue]}
RULES: ${RULES}`
    : `
(This batch is summary-only — do NOT assign a pole_stance.)`;

  const resultShape = issue
    ? `{ "batchId": "${m.batchId}", "issue": "${issue}", "results": [ { "bill_id": "...", "summary": "...", "pole_stance": "...", "confidence": "..." }, ... ] }`
    : `{ "batchId": "${m.batchId}", "issue": null, "results": [ { "bill_id": "...", "summary": "..." }, ... ] }`;

  return `You are processing a batch of state bills, each with its FULL TEXT.

1. Read the JSON file at ${batchPath(m.batchId)} — { batchId, issue, bills: [{ id, text }] } with ${m.count} bills.
2. For EACH bill, write a concise, neutral, factual **summary** (1–2 sentences) of what the bill actually DOES — its operative effect, not its title. No editorializing. This becomes the bill's stored summary used for alignment tagging.${taggingStep}

WRITE a JSON file to EXACTLY: ${resultPath(m.batchId)}
shape: ${resultShape}
— EXACTLY one entry per bill, all ${m.count} bill_ids (the "id" field) copied CHARACTER-FOR-CHARACTER. No extras/omissions.

Then return { batchId: "${m.batchId}", written: <number written> }. The file is the source of truth.`;
}

phase("Recover");

async function runOne(m) {
  const r = await agent(buildPrompt(m), {
    label: m.batchId,
    phase: "Recover",
    model: "sonnet",
    schema: SCHEMA,
  });
  return {
    ...m,
    written: r && typeof r.written === "number" ? r.written : null,
  };
}

let pending = batches;
const done = [];
for (let attempt = 1; attempt <= 3 && pending.length > 0; attempt++) {
  log(
    `Recover attempt ${attempt}: ${pending.length} batch(es), ${done.length} done`,
  );
  const res = await parallel(pending.map((m) => () => runOne(m)));
  const retry = [];
  for (let i = 0; i < res.length; i++) {
    const x = res[i];
    if (x && x.written === x.count)
      done.push({ batchId: x.batchId, issue: x.issue, written: x.written });
    else retry.push(pending[i]);
  }
  pending = retry;
}
const total = done.reduce((s, b) => s + b.written, 0);
log(
  `Recover complete: ${done.length} batches, ${total} entries; ${pending.length} still failing`,
);
return { done, stillFailing: pending.map((m) => m.batchId), total };
