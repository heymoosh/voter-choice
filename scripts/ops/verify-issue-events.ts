/**
 * scripts/ops/verify-issue-events.ts
 *
 * Post-go-live verification for the voter_issue_events persistence feature
 * (backlog card 39a6b6e3). Confirms, against the DATABASE_URL in .env.local:
 *   1. the table exists (migration 0005 applied),
 *   2. both indexes exist,
 *   3. the schema holds ONLY the expected columns — no PII (session id / address /
 *      verbatim text),
 *   4. rows are being written (run AFTER a full prod session),
 *   5. the off-topic path writes a label on null-canonical rows,
 *   6. prints the most recent rows for eyeballing.
 *
 * Usage: npx tsx scripts/ops/verify-issue-events.ts
 * Run it AFTER a full production session (address -> issues -> all seats verdicted).
 * Exit code 0 = PASS, 1 = FAIL.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd(), true); // dev=true -> loads .env.local

import { requireDb } from "../../db/client";
import { sql } from "drizzle-orm";

const EXPECTED_COLS = new Set([
  "id",
  "canonical_issue",
  "off_topic_label",
  "resolved_stance",
  "rank",
  "was_off_topic",
  "confidence_level",
  "state_code",
  "recorded_at",
]);

type Row = Record<string, unknown>;
async function q(db: ReturnType<typeof requireDb>, text: string): Promise<Row[]> {
  const res = await db.execute(sql.raw(text));
  return ((res as { rows?: Row[] }).rows ?? (res as unknown as Row[])) || [];
}

async function main() {
  const db = requireDb();
  let pass = true;
  const ok = (m: string) => console.log("  ✓ " + m);
  const bad = (m: string) => {
    pass = false;
    console.log("  ✗ " + m);
  };

  // 1. table exists
  const reg = await q(db, "SELECT to_regclass('voter_issue_events') AS t");
  if (reg[0]?.t) {
    ok("table voter_issue_events exists (migration 0005 applied)");
  } else {
    bad("table missing — migration 0005 NOT applied to this DB");
    console.log("\nVERIFY: FAIL");
    process.exit(1);
  }

  // 2. indexes
  const idx = await q(
    db,
    "SELECT indexname FROM pg_indexes WHERE tablename='voter_issue_events' ORDER BY 1",
  );
  const idxNames = idx.map((r) => String(r.indexname));
  for (const need of [
    "voter_issue_events_issue_idx",
    "voter_issue_events_state_issue_idx",
  ]) {
    idxNames.includes(need) ? ok(`index ${need}`) : bad(`missing index ${need}`);
  }

  // 3. columns / privacy
  const cols = await q(
    db,
    "SELECT column_name FROM information_schema.columns WHERE table_name='voter_issue_events'",
  );
  const colset = new Set(cols.map((r) => String(r.column_name)));
  const unexpected = [...colset].filter((c) => !EXPECTED_COLS.has(c));
  const missing = [...EXPECTED_COLS].filter((c) => !colset.has(c));
  unexpected.length
    ? bad("UNEXPECTED column(s) — PRIVACY REVIEW NEEDED: " + unexpected.join(", "))
    : ok("no unexpected columns (no session id / address / verbatim text)");
  if (missing.length) bad("missing expected column(s): " + missing.join(", "));

  // 4. row counts
  const cnt = await q(
    db,
    "SELECT count(*)::int AS n, max(recorded_at) AS latest FROM voter_issue_events",
  );
  const n = Number(cnt[0]?.n ?? 0);
  console.log(`  → total rows: ${n}, latest: ${cnt[0]?.latest ?? "none"}`);
  n > 0
    ? ok("rows present")
    : bad(
        "ZERO rows — did a full session complete? (must reach all-seats-verdicted; Redis dedups identical sessions; confirm the flag is live on a fresh deploy)",
      );

  // 5. off-topic path
  const off = await q(
    db,
    "SELECT count(*)::int AS n FROM voter_issue_events WHERE canonical_issue IS NULL AND off_topic_label IS NOT NULL",
  );
  const offN = Number(off[0]?.n ?? 0);
  console.log(`  → off-topic rows (null canonical + label): ${offN}`);
  offN > 0
    ? ok("off-topic path writing labels")
    : console.log(
        "  · (no off-topic rows yet — raise an off-topic concern in the test to exercise this)",
      );

  // 6. recent sample
  console.log("\nMost recent rows:");
  console.table(
    await q(
      db,
      "SELECT canonical_issue, off_topic_label, resolved_stance, rank, confidence_level, state_code, recorded_at FROM voter_issue_events ORDER BY recorded_at DESC LIMIT 10",
    ),
  );

  console.log("\n" + (pass ? "VERIFY: PASS" : "VERIFY: FAIL — see ✗ above"));
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
