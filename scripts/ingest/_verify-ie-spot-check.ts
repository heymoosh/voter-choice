/**
 * scripts/ingest/_verify-ie-spot-check.ts
 *
 * One-off browser replacement for the 6b live-run spot checks (2026-08-16).
 * The ingest reads the FEC bulk CSV; this script verifies its two findings
 * against DIFFERENT FEC systems, so the check is independent:
 *
 *   1. The two quarantined billion-dollar filings — fetched as-filed from
 *      docquery (the raw electronic filing), printing the Schedule E lines so
 *      a human can see the absurd amount field with their own eyes.
 *   2. The C00418897 support total for the Iowa Senate candidate — fetched
 *      from the OpenFEC API (FEC's processed database, which powers fec.gov's
 *      own committee pages) and compared to what our ingest aggregated.
 *
 * Runs from a normal dev machine (fec.gov is egress-blocked from the remote
 * container). No database, no .env needed. Uses the public DEMO_KEY unless
 * FEC_API_KEY is set — the script makes at most two API calls, well under
 * DEMO_KEY's hourly allowance.
 *
 * Usage: npx tsx scripts/ingest/_verify-ie-spot-check.ts
 */

const TARGET_CANDIDATE = "H6FL11274";

// What the 2026-08-15 live ingest recorded, for side-by-side comparison.
const QUARANTINED = [
  { fileNumber: 1957562, spenderId: "C00945709", ourReading: "≈$8 billion" },
  { fileNumber: 1957556, spenderId: "C00944025", ourReading: "≈$9 billion" },
];

const COMMITTEE_CHECK = {
  committeeId: "C00418897",
  candidateId: "S6IA00298",
  cycle: 2026,
  // Our ingest's aggregate: support dollars from this spender for this
  // candidate. FEC's processed number will drift a little day to day; same
  // ballpark (within ~5%) is a pass.
  oursSupport: 9_756_436,
};

const API_KEY = process.env.FEC_API_KEY ?? "DEMO_KEY";

function dollars(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Fields in the raw filing line that look like dollar amounts >= $1M. */
function bigNumericFields(line: string): string[] {
  return (
    line
      .split(",")
      .map((f) => f.replace(/"/g, "").trim())
      .filter((f) => /^\d+(\.\d{1,2})?$/.test(f))
      .map(Number)
      // Image/transaction ids are 13+ digits; real IE amounts under $10T.
      .filter((n) => n >= 1_000_000 && n < 1e13)
      .map(dollars)
  );
}

async function checkFiling(q: (typeof QUARANTINED)[number]) {
  const dir = String(q.fileNumber % 1000).padStart(3, "0");
  const url = `https://docquery.fec.gov/csv/${dir}/${q.fileNumber}.csv`;
  console.log(
    `\n=== Quarantined filing ${q.fileNumber} (spender ${q.spenderId}, our reading: ${q.ourReading}) ===`,
  );
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    console.log(`Filing header: ${lines[1]?.slice(0, 160) ?? "(missing)"}`);
    const seLines = lines.filter((l) => {
      const bare = l.replace(/"/g, "");
      return bare.startsWith("SE") || bare.includes(TARGET_CANDIDATE);
    });
    if (seLines.length === 0) {
      console.log(
        `No Schedule E lines found — open ${url} in a browser/text editor and look manually.`,
      );
      return;
    }
    for (const line of seLines.slice(0, 5)) {
      console.log(`  as filed: ${line.slice(0, 240)}`);
      const big = bigNumericFields(line);
      if (big.length > 0)
        console.log(
          `  dollar-looking fields ≥ $1M in that line: ${big.join(", ")}`,
        );
    }
    if (seLines.length > 5)
      console.log(`  (${seLines.length - 5} more Schedule E lines not shown)`);
    console.log(
      "  VERDICT NEEDED FROM HUMAN: does the amount above look like an obvious data-entry error",
      "\n  (billions on a routine ad buy)? If yes, the quarantine was right.",
    );
  } catch (e) {
    console.log(`Could not fetch ${url}: ${(e as Error).message}`);
    console.log(
      "Fallback: open that URL in your browser — it downloads the filing as CSV; open it in any text editor.",
    );
  }
}

function compareRow(
  r: {
    committee_name?: string;
    support_oppose_indicator: string;
    total: number;
  },
  oursSupport: number,
) {
  const dir = r.support_oppose_indicator === "S" ? "SUPPORT" : "OPPOSE";
  console.log(
    `  FEC says ${dir}: ${dollars(r.total)}  (${r.committee_name ?? ""})`,
  );
  if (r.support_oppose_indicator !== "S") return;
  const delta = Math.abs(r.total - oursSupport);
  const pct = (delta / oursSupport) * 100;
  console.log(`  Our ingest says SUPPORT: ${dollars(oursSupport)}`);
  console.log(
    pct <= 5
      ? `  MATCH: within ${pct.toFixed(1)}% — our aggregation checks out against FEC's own database.`
      : `  DIFFERS by ${pct.toFixed(1)}% (${dollars(delta)}) — paste this output back for a look.`,
  );
}

async function checkCommitteeTotal() {
  const c = COMMITTEE_CHECK;
  console.log(
    `\n=== Committee total: ${c.committeeId} re ${c.candidateId}, cycle ${c.cycle} ===`,
  );
  const base = "https://api.open.fec.gov/v1/schedules/schedule_e/by_candidate/";
  const params: Record<string, string> = {
    candidate_id: c.candidateId,
    cycle: String(c.cycle),
    per_page: "100",
    api_key: API_KEY,
  };

  async function get(withElectionFull: boolean) {
    const url = new URL(base);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (withElectionFull) url.searchParams.set("election_full", "false");
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`,
      );
    }
    return (await res.json()) as {
      results: {
        committee_id: string;
        committee_name?: string;
        support_oppose_indicator: string;
        total: number;
      }[];
    };
  }

  try {
    let data;
    try {
      // election_full=false scopes senate totals to the 2-year cycle, which
      // is what the 2026 bulk file (and therefore our ingest) covers.
      data = await get(true);
    } catch {
      data = await get(false);
    }
    const mine = data.results.filter((r) => r.committee_id === c.committeeId);
    if (mine.length === 0) {
      console.log(
        `OpenFEC returned no rows for ${c.committeeId}. Committees it did return for this candidate:`,
      );
      for (const r of data.results.slice(0, 20)) {
        console.log(
          `  ${r.committee_id} ${r.committee_name ?? ""} ${r.support_oppose_indicator}: ${dollars(r.total)}`,
        );
      }
      return;
    }
    for (const r of mine) {
      compareRow(r, c.oursSupport);
    }
  } catch (e) {
    console.log(`OpenFEC request failed: ${(e as Error).message}`);
    if (API_KEY === "DEMO_KEY") {
      console.log(
        "If that was a rate-limit (429), wait an hour or get a free key at https://api.data.gov/signup/ and re-run with FEC_API_KEY=<key>.",
      );
    }
  }
}

async function main() {
  console.log(
    "6b spot-check: verifying the live ingest's findings against FEC's own systems.",
  );
  for (const q of QUARANTINED) {
    await checkFiling(q);
  }
  await checkCommitteeTotal();
  console.log("\nDone. Paste this whole output back into the session.");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
