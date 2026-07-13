export const meta = {
  name: 'gold-oracle-panel',
  description: 'Independent 3-juror Opus panel labels the gold sample BLIND against the pole defs — the ground-truth anchor for the cutover inversion gate (independent of the Sonnet that produced pole_v1).',
  phases: [{ title: 'Label', detail: '3 independent Opus jurors per batch, blind to pole_v1; M2 retry', model: 'opus' }],
}

// args = { baseDir, batches: [{ issue, batchId, count }, ...], jurors: 3 }
const input = typeof args === 'string' ? JSON.parse(args) : args
const baseDir = input.baseDir
const batches = input.batches
const JURORS = input.jurors || 3
const batchPath = (id) => `${baseDir}/${id}.json`
const resultPath = (id, j) => `${baseDir}/_results/${id}.j${j}.json`

// Pole definitions — inlined from docs/alignment/POLE_VOCABULARY.md (the keystone).
// The 4 marked (verbatim) are copied unchanged from _pole-retag.workflow.js.
const POLES = {
  gun_rights_safety: `Pole A ≡ in_favor = "Gun access / rights": protect/expand the right to own and carry firearms; remove or block restrictions (concealed-carry reciprocity; repealing waiting periods; blocking bans; protecting private/unlicensed sales; suppressor deregulation e.g. "Hearing Protection Act"; arming teachers / campus-carry).
Pole B ≡ opposed = "Gun regulation / safety": tighten access to reduce gun violence (universal background checks; assault-weapon / high-capacity-magazine bans; red-flag / ERPO laws; waiting periods; raising the purchase age).
NOTE: a safety *incentive* that is voluntary (e.g. a tax credit for a gun safe — not a mandate) is genuinely ambiguous in direction → low confidence, usually no_score. Criminal-penalty, hunting/sport, and purely technical/administrative gun bills → no_score.`,

  immigration: `Pole A ≡ in_favor = "Welcoming / expand legal immigration & protections": expand legal pathways and protections (path to citizenship; DACA/TPS codification; raising refugee/visa caps; in-state tuition; protections against removal).
Pole B ≡ opposed = "Restrictive / enforcement-first": reduce immigration and increase enforcement/removal (border-wall funding; mandatory E-Verify; asylum limits; more ICE/detention funding; Remain-in-Mexico; lowering refugee/visa caps; cutting family or diversity visa categories).
NOTE: tag under immigration's OWN orientation — border-enforcement provisions are opposed HERE (the same bill may carry the mirror lens under border_security; that is correct and independent).`,

  border_security: `Pole A ≡ in_favor = "Strengthen border enforcement": increase physical/personnel border security and deterrence (border-wall funding; more Border Patrol agents; detention capacity; asylum restrictions at the border; rapid-expulsion measures).
Pole B ≡ opposed = "Limit enforcement / humane & legal-pathway": de-emphasize hardline enforcement; prioritize processing and asylum access (cutting wall funding; alternatives to detention; expanding asylum processing; ending family separation).
NOTE: border_security is ENFORCEMENT-centric — enforcement = Pole A (in_favor), the mirror of immigration. Bills not actually about the PHYSICAL border (interior immigration enforcement, foreign-land-ownership, etc.) → no_score here.`,

  reproductive_rights: `Pole A ≡ in_favor = "Protect / expand access": codifying Roe; protecting clinic access; funding reproductive care; protecting contraception / IVF.
Pole B ≡ opposed = "Restrict reproductive access": abortion bans/limits; defunding providers; fetal-personhood; restricting medication abortion; contraception-coverage restrictions / Title X gag rule; IVF restrictions or personhood measures affecting IVF; defunding family planning.
SCOPE: off-topic bills mis-filed here — gender-affirming-care, trans-sports, aid-in-dying, menstrual-product bills — are NOT this issue → no_score.`,

  public_safety: `Pole A ≡ in_favor = "Policing / enforcement capacity": expand policing and enforcement capacity (police funding increases; tougher enforcement powers; qualified-immunity protection). Subject is POLICING/ENFORCEMENT, not the "safety" outcome.
Pole B ≡ opposed = "Reform & prevention": police accountability; ending qualified immunity; diversion / community-investment programs.
MEANS-TRAP: funding crime PREVENTION / community-investment advances Pole B (opposed), NOT Pole A — even though it "funds public safety."
BOUNDARY: public_safety = policing / use-of-force ONLY. A purely sentencing/charging/incarceration bill belongs to crime_public_safety → no_score under public_safety.`,

  crime_public_safety: `Pole A ≡ in_favor = "Tough-on-crime / enforcement": mandatory minimums; more police; cash-bail retention; tougher penalties.
Pole B ≡ opposed = "Criminal-justice reform": bail reform; sentencing reform; decriminalization; reentry programs.
MEANS: reform / reentry bills are Pole B even though they aim to reduce crime.
BOUNDARY: crime_public_safety = sentencing / charging / incarceration. A pure policing / use-of-force bill belongs to public_safety → no_score under crime_public_safety.`,

  environment_climate: `Pole A ≡ in_favor = "Climate action / environmental protection": emissions limits; clean-energy incentives; conservation / public-lands protection; EPA authority.
Pole B ≡ opposed = "Deregulation / limit climate mandates": rolling back EPA rules; opening public lands to drilling; blocking climate spending.
RULINGS: permitting / NEPA reform → judge by dominant effect (fast-tracks fossil → Pole B; fast-tracks clean transmission → Pole A; co-equal → no_score); carbon-capture → Pole A.
OVERLAP: route emissions/nature/climate here; cost/reliability/source bills → energy_grid. Never cross-score against energy_grid.`,

  election_integrity: `Pole A ≡ in_favor = "Voting access / expand participation": automatic / same-day registration; mail-voting expansion; restoring the Voting Rights Act; early voting.
Pole B ≡ opposed = "Voting restrictions / security-first": voter-ID requirements; voter-roll purges; limiting mail / drop boxes; restricting early voting.
ORIENTATION LOCK (high inversion risk): subject = ballot ACCESS / the franchise. The word "integrity" is a PARTISAN FRAME and does NOT set direction. ANY provision that restricts voter access = opposed regardless of the bill's title — even one literally named "Election Integrity Act."
FALL-THROUGH: a bill that neither expands nor restricts voter ACCESS (redistricting, ECRA / certification, campaign-finance disclosure, audits) = no_score, never default to a pole.`,

  // ---- the 4 below are verbatim from _pole-retag.workflow.js (already validated) ----
  economy_jobs: `Pole A ≡ in_favor = "Public investment & worker protections": government spending/programs and labor protections to create jobs/raise wages (infrastructure spending; jobs programs; minimum-wage increases; pro-union/PRO Act; expanded unemployment).
Pole B ≡ opposed = "Deregulation & lower taxes (market-led growth)": reduce taxes/regulation to spur private growth (corporate/income tax cuts; deregulation; right-to-work; spending cuts).
NOTE: outcome-only phrasing ("more/better jobs") does NOT reveal a side — both poles claim it. The MEANS are the poles. If a bill is only "good for jobs/economy" with no clear means, → no_score.`,

  education_funding: `Pole A ≡ in_favor = "Increase public-education funding & access": public-school funding increases; Title I; student-loan relief; universal pre-K; teacher pay.
Pole B ≡ opposed = "School choice / limit federal spending": voucher/ESA programs; cutting the Dept. of Education; block grants; opposing loan forgiveness.
RULE: charter bills straddle (public funding + choice mechanism) — tag by the DOMINANT mechanism: new choice/voucher authority → opposed; pure public-school funding → in_favor.`,

  property_taxes: `Pole A ≡ in_favor = "Lower / cap property taxes": property-tax caps; homestead exemptions; rollbacks; assessment limits.
Pole B ≡ opposed = "Maintain tax base for services": opposing caps; raising rates/assessments to fund schools/services.`,

  energy_grid: `Pole A ≡ in_favor = "Expand fossil / conventional production": boost FOSSIL & conventional production (oil, gas, coal) and the grid carrying it (oil/gas leasing; pipeline approvals; LNG exports; blocking emissions rules).
Pole B ≡ opposed = "Clean-energy transition / restrict fossil": shift to renewables and cut emissions (renewable tax credits; emissions limits; blocking new fossil leases; grid electrification).
MEANS-TRAP: funding/expanding CLEAN energy (renewables, electrification) advances Pole B (opposed) — do NOT tag in_favor merely because a bill "funds energy".
RULINGS: nuclear → Pole A (firm conventional baseload); carbon-capture/CCS → Pole A (extends fossil-plant life).
MIXED: "all-of-the-above"/IRA-style bills funding BOTH → tag by the dominant provision; if genuinely co-equal → no_score. Reliability/cost-only bills (both poles claim them) → no_score. Never cross-score against environment_climate.`,
}

const RULES = `You are an INDEPENDENT JUROR establishing the GROUND TRUTH for the directional lens of each bill for ONE canonical issue: what does a YEA vote MEAN for that issue? Reason ONLY from the bill's title + summary and the pole definitions below. You have no prior tag to defer to — decide from scratch.
- pole_stance = "in_favor"  → a YEA vote advances Pole A (the in_favor pole).
- pole_stance = "opposed"   → a YEA vote advances Pole B (the opposed pole).
- pole_stance = "no_score"  → the bill does not clearly advance EITHER pole for this issue: off-topic, purely procedural/ceremonial, a study/reporting bill, thin/uninformative, an outcome-only claim both poles share, or a genuinely co-equal mixed bill. WHEN IN DOUBT, no_score — failing safe (abstain) is correct; never guess a direction.
CROSS-CUTTING:
- REPEAL / "congressional disapproval" / nullification / sunset bills: score by NET EFFECT. Determine what the underlying rule/law DID, then the direction of REPEALING it (e.g. nullifying a rule that RESTRICTED oil/gas leasing → advances fossil production → in_favor for energy_grid).
- Omnibus/multi-topic: tag by the DOMINANT provision for THIS issue; if no dominant direction → no_score.
- Summaries may contain HTML tags — ignore the markup, read the text.
- Judge by substance/effect, NOT by the bill's title or marketing name (a restrictive "Integrity Act" is still restrictive).
confidence: "high" = clear directional signal in title+summary; "medium" = reasonable inference; "low" = thin/ambiguous. Use no_score (not a low-confidence guess) when neither pole is clearly advanced.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    batchId: { type: 'string' },
    juror: { type: 'integer' },
    written: { type: 'integer' },
    in_favor: { type: 'integer' },
    opposed: { type: 'integer' },
    no_score: { type: 'integer' },
  },
  required: ['batchId', 'juror', 'written'],
}

function buildPrompt(m, juror) {
  return `You are juror #${juror} of an independent panel. Label every bill in a batch for the canonical issue "${m.issue}", BLIND (no existing tag is provided).

POLE DEFINITIONS (${m.issue}):
${POLES[m.issue]}

HOW TO DECIDE:
${RULES}

TASK:
1. Read the JSON file at ${batchPath(m.batchId)}. It is { issue, batchId, bills: [{ bill_id, title, summary }] } with ${m.count} bills.
2. For EACH bill, independently decide pole_stance ∈ {in_favor, opposed, no_score} and a confidence (high|medium|low).
3. WRITE a JSON file to EXACTLY this absolute path: ${resultPath(m.batchId, juror)}
   with shape: { "batchId": "${m.batchId}", "issue": "${m.issue}", "juror": ${juror}, "tags": [ { "bill_id": "...", "pole_stance": "...", "confidence": "..." }, ... ] }
   — EXACTLY one entry per bill. COPY each bill_id CHARACTER-FOR-CHARACTER from the input (long openstates UUIDs — do not abbreviate, retype, or alter them). No extras, no omissions.
4. Return the structured summary: { batchId: "${m.batchId}", juror: ${juror}, written: <number written>, in_favor, opposed, no_score }.

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
  return { batchId: m.batchId, issue: m.issue, count: m.count, juror, summary: r }
}

// Flatten to (batch × juror) tasks; M2 verify-and-retry on written==count.
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
