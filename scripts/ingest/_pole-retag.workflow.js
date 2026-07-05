export const meta = {
  name: "pole-retag-4issues",
  description:
    "Re-tag economy/education/property/energy bills against (axis,pole) defs on the Neon alignment branch (Sonnet taggers, schema-validated)",
  phases: [
    {
      title: "Tag",
      detail: "one Sonnet agent per ~100-bill batch; M2 retry on failure",
      model: "sonnet",
    },
  ],
};

// args = { baseDir, batches: [{ issue, batchId, count }, ...] }
// Defensive: the harness may deliver args as a JSON string rather than a parsed object.
const input = typeof args === "string" ? JSON.parse(args) : args;
const baseDir = input.baseDir;
const batches = input.batches;
const batchPath = (id) => `${baseDir}/${id}.json`;
const resultPath = (id) => `${baseDir}/_results/${id}.json`;

const POLES = {
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
MIXED: "all-of-the-above"/IRA-style bills funding BOTH → tag by the dominant provision; if genuinely co-equal → no_score.
Reliability/cost-only bills (both poles claim them) → no_score. Never cross-score against environment_climate.`,
};

const RULES = `You are tagging the DIRECTIONAL LENS of each bill for ONE canonical issue: what does a YEA vote MEAN for that issue?
- pole_stance = "in_favor"  → a YEA vote advances Pole A (the in_favor pole).
- pole_stance = "opposed"   → a YEA vote advances Pole B (the opposed pole).
- pole_stance = "no_score"  → the bill does not clearly advance EITHER pole for this issue: off-topic, purely procedural/ceremonial, a study/reporting bill, thin/uninformative (e.g. null or title-only with no directional signal), an outcome-only claim that both poles share, or a genuinely co-equal mixed bill. WHEN IN DOUBT, no_score — failing safe (abstain) is correct; never guess a direction.
CROSS-CUTTING:
- REPEAL / "congressional disapproval" / nullification / sunset bills: score by NET EFFECT. Determine what the underlying rule/law DID, then the direction of REPEALING it. (e.g. nullifying a rule that RESTRICTED oil/gas leasing → advances fossil production → in_favor for energy_grid.)
- Omnibus/multi-topic: tag by the DOMINANT provision for THIS issue; if no dominant direction → no_score.
- Summaries may contain HTML tags — ignore the markup, read the text.
- Judge by substance/effect, not by the bill's title or marketing name (a restrictive "Integrity Act" is still restrictive).
confidence: "high" = clear directional signal in title+summary; "medium" = reasonable inference; "low" = thin/ambiguous (kept, because the app shows the underlying vote). Most null/title-only bills should be no_score with low confidence unless the title is itself decisively directional.`;

// Agent returns a SMALL summary; the tag data goes to an in-repo result file.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    batchId: { type: "string" },
    written: { type: "integer" }, // number of tag objects written to the result file
    in_favor: { type: "integer" },
    opposed: { type: "integer" },
    no_score: { type: "integer" },
  },
  required: ["batchId", "written"],
};

function buildPrompt(m) {
  return `Tag every bill in a batch for the canonical issue "${m.issue}".

POLE DEFINITIONS (${m.issue}):
${POLES[m.issue]}

HOW TO DECIDE:
${RULES}

TASK:
1. Read the JSON file at ${batchPath(m.batchId)}. It is { issue, batchId, bills: [{ bill_id, title, summary }] } with ${m.count} bills.
2. For EACH bill, decide pole_stance ∈ {in_favor, opposed, no_score} and a confidence (high|medium|low).
3. WRITE a JSON file to EXACTLY this absolute path: ${resultPath(m.batchId)}
   with shape: { "batchId": "${m.batchId}", "issue": "${m.issue}", "tags": [ { "bill_id": "...", "pole_stance": "...", "confidence": "..." }, ... ] }
   — EXACTLY one entry per bill. COPY each bill_id CHARACTER-FOR-CHARACTER from the input (the openstates ids are long UUIDs — do not abbreviate, retype, or alter them). No extras, no omissions.
4. Return the structured summary: { batchId: "${m.batchId}", written: <number of tags written>, in_favor, opposed, no_score }.

The written file is the source of truth; make sure it is valid JSON and complete before returning.`;
}

phase("Tag");

async function tagOne(m) {
  const r = await agent(buildPrompt(m), {
    label: m.batchId,
    phase: "Tag",
    model: "sonnet",
    schema: SCHEMA,
  });
  return { ...m, summary: r };
}

// M2: the workflow's structured return verifies written==count; the MAIN LOOP then
// re-reads every in-repo result file for authoritative coverage. Retry up to 3x.
let pending = batches;
const done = [];
for (let attempt = 1; attempt <= 3 && pending.length > 0; attempt++) {
  log(
    `Tag attempt ${attempt}: ${pending.length} batch(es), ${done.length} done`,
  );
  const res = await parallel(pending.map((m) => () => tagOne(m)));
  const retry = [];
  for (let i = 0; i < res.length; i++) {
    const x = res[i];
    if (x && x.summary && x.summary.written === x.count)
      done.push({
        batchId: x.batchId,
        issue: x.issue,
        written: x.summary.written,
      });
    else retry.push(pending[i]);
  }
  pending = retry;
}

const totalWritten = done.reduce((s, b) => s + b.written, 0);
log(
  `Tagging complete: ${done.length} batches, ${totalWritten} tags written; ${pending.length} still failing`,
);
return { done, stillFailing: pending.map((m) => m.batchId), totalWritten };
