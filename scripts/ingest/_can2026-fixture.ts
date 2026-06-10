/**
 * scripts/ingest/_can2026-fixture.ts
 *
 * Synthetic CAN2026 fixture for can2026.test.ts. Mirrors the physical layout
 * documented in docs/CAN2026_ENRICHMENT_SCHEMA.md §0: one large HTML-entity-
 * encoded `<astro-island props="…">` blob containing TWO `var CARDS` datasets
 * (Senate first, House second, each keyed by state), `var BILLS`, and
 * `var BTN_COLORS`, where all fields are CSS classes / table columns / tag
 * labels inside pre-rendered HTML. The live network is blocked in dev — this
 * fixture (and `--file`) is how the parser is exercised.
 */

export function encodeHtmlEntities(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// --------------------------------------------------------------------------
// Senate dataset cards
// --------------------------------------------------------------------------

export const SENATE_CARD_AL = `
<div class="state-card">
  <div class="race-summary">Alabama Senate — open seat · Safe R</div>
  <span class="tag-safer">Safe R</span>
  <div class="state-rating">Safe Republican</div>
  <p class="forecasts">Cook: Lean R | Sabato: Likely R | Inside Elections: Safe R</p>
  <p>Senate Class II. Trump won by 29 points. Tommy Tuberville not seeking reelection, ran for governor.</p>
  <div class="member-card">
    <h3>Steve Marshall (R)</h3>
    <p class="bio">Open-seat nominee. Attorney General of Alabama. Won the primary with 62.5%.</p>
    <h4>Key Votes</h4>
    <table class="key-votes">
      <tr><th>Bill</th><th>Vote</th><th>Date</th><th>Context</th><th>Source</th></tr>
      <tr><td><a data-bill="ira">Inflation Reduction Act (H.R. 5376)</a></td><td class="vote-n">Nay</td><td>Aug. 7, 2022</td><td>Voted against the reconciliation package.</td><td>--</td></tr>
      <tr><td><a data-bill="cares">CARES Act (H.R. 748)</a></td><td class="vote-y">Yea (procedural)</td><td>Mar. 25, 2020</td><td>Unanimous passage.</td><td>Senate.gov</td></tr>
      <tr><td>American Rescue Plan (H.R. 1319)</td><td class="vote-na">N/A -- Not yet senator</td><td>Mar. 6, 2021</td><td>Took office in 2025.</td><td>--</td></tr>
    </table>
    <h4>Donor Trail (2025–2026)</h4>
    <p>Total raised $11.88M · Cash on hand $9.67M (March 31, 2026) · PAC share ~22%</p>
    <ul class="donor-sectors">
      <li>Ideology/Single-Issue $1,866,426</li>
      <li>Securities and Investment $1,027,346</li>
    </ul>
    <p class="donor-note">AIPAC career total $237,577. No Fairshake/crypto confirmed 2026.</p>
    <table class="fec-metrics">
      <tr><th>FEC Metric</th><th>Amount</th></tr>
      <tr><td>Unitemized small-dollar donations</td><td>$412,338</td></tr>
    </table>
  </div>
  <div class="data-gap">DATA GAP: No documented dark money expenditures for this race.</div>
  <div class="source-box">Sources: Cook Political Report | Fairshake FEC (C00835959) | NPR May 21, 2026</div>
</div>`;

export const SENATE_CARD_AR = `
<div class="state-card">
  <div class="race-summary">Arkansas — no Senate seat on the 2026 ballot</div>
  <div class="member-card">
    <h3>Sen. Tom Cotton [R-AR]</h3>
    <p>Incumbent. Not on the 2026 ballot — next election: 2028.</p>
    <table class="key-votes">
      <tr><th>Bill</th><th>Vote</th><th>Date</th><th>Context</th><th>Source</th></tr>
      <tr><td><a data-bill="ira">Inflation Reduction Act (H.R. 5376)</a></td><td class="vote-nay">Nay</td><td>Aug. 7, 2022</td><td>Live Pair gesture noted.</td><td>--</td></tr>
    </table>
  </div>
</div>`;

// --------------------------------------------------------------------------
// House dataset cards
// --------------------------------------------------------------------------

export const HOUSE_CARD_AZ = `
<div class="house-card">
<section class="district" data-district="6">
  <div class="race-summary">Arizona 6th — Juan Ciscomani (R, Inc) vs. TBD · Toss-Up</div>
  <span class="tag-tossup">Toss-Up</span>
  <span class="tag-safer">Republican</span>
  <span class="tag-flag">Watch List</span>
  <span class="tag-flag">Committee Power</span>
  <p>Cook: Toss-Up | Sabato: Lean R | Inside Elections: Toss-Up</p>
  <p>Harris +1 (2024)</p>
  <div class="member-card">
    <h3>Juan Ciscomani (R)</h3>
    <p class="bio">Incumbent. First elected 2022.</p>
    <table class="key-votes">
      <tr><th>Bill</th><th>Vote</th><th>Date</th><th>Context</th><th>Source</th></tr>
      <tr><td>One Big Beautiful Bill Act (H.R. 1)</td><td class="vote-yea">Yea</td><td>May 22, 2025</td><td>Party-line passage.</td><td>--</td></tr>
    </table>
  </div>
</section>
</div>`;

export const HOUSE_CARD_DE = `
<div class="pending-profile">
  <p>Delaware — 1 seat | Safe Democrat | Harris +13 (2024)</p>
  <p>House race profile in development.</p>
  <p>What we know: At-large seat currently held by a Democrat.</p>
  <p>What is pending: Donor trail and key-vote table.</p>
  <p>ETA: July 2026</p>
</div>`;

// --------------------------------------------------------------------------
// Payload / page assembly
// --------------------------------------------------------------------------

const BILLS_JS = `var BILLS = {
  ira: {title: "Inflation Reduction Act (H.R. 5376) — Aug. 16, 2022", body: \`<p>What it did: Largest climate investment in U.S. history; prescription drug pricing reform.</p><p>Procedural note: Passed 51-50 via budget reconciliation.</p>\`},
  cares: {title: "CARES Act (H.R. 748) — Mar. 27, 2020", body: \`<p>What it did: $2.2T pandemic relief package, passed by voice vote in the House.</p>\`}
};`;

const BTN_COLORS_JS = `var BTN_COLORS = {"AL": "#cc2222", "AR": "#cc3333", "AZ": "#2222cc", "DE": "#2244cc"};`;

export function buildCan2026Payload(
  opts: { datasets?: 1 | 2; includeBills?: boolean } = {},
): string {
  const { datasets = 2, includeBills = true } = opts;
  const parts: string[] = [
    `{"template":"aigenerated","templateVersion":"201","content":"2026 Elections — Updated May 22, 2026"}`,
    `Click any state to open the race profile for that Senate seat.`,
    `var CARDS = {};`,
    `CARDS["AL"] = \`${SENATE_CARD_AL}\`;`,
    `CARDS["AR"] = \`${SENATE_CARD_AR}\`;`,
  ];
  if (datasets === 2) {
    parts.push(
      `Click a state to open its House race profile. Light gray states have profiles in development.`,
      `var CARDS = {};`,
      `CARDS["AZ"] = \`${HOUSE_CARD_AZ}\`;`,
      `CARDS["DE"] = \`${HOUSE_CARD_DE}\`;`,
    );
  }
  if (includeBills) parts.push(BILLS_JS);
  parts.push(BTN_COLORS_JS);
  return parts.join("\n");
}

/** Full fake page: a small astro-island plus the big payload island, both
 *  HTML-entity-encoded like the real Astro build. */
export function buildCan2026FixtureHtml(payload?: string): string {
  const big = encodeHtmlEntities(payload ?? buildCan2026Payload());
  const small = encodeHtmlEntities(`{"widget":"nav","items":["Home"]}`);
  return [
    `<!DOCTYPE html><html><head><title>2026 Elections</title></head><body>`,
    `<astro-island uid="nav1" props="${small}"></astro-island>`,
    `<main><astro-island uid="page1" component-export="Page" props="${big}"></astro-island></main>`,
    `</body></html>`,
  ].join("\n");
}
