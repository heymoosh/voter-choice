/**
 * _promise-gold-sample.ts — build the promise-ledger GOLD WORKSHEETS for the
 * two human annotators (rubric §6.2: Muxin + her husband, labeling
 * INDEPENDENTLY — no discussing a case until both labels are recorded).
 *
 * Two rounds, matching what is honestly labelable when:
 *
 * ROUND 1 — "extraction" (available NOW): validates the corpus itself.
 *   For each stored promise the annotator answers, against the archived page:
 *     is_promise      — does the quoted text pass the rubric §1 four gates?
 *                       (yes / no)
 *     issue_correct   — is canonical_issue right? (yes / no; if no, write the
 *                       right id in issue_correction)
 *     type_correct    — is the DECLARED TEST (promise_type) right? (yes / no;
 *                       if no, write the right type in type_correction)
 *     notes           — free text
 *
 * ROUND 2 — "verdict": the rubric §6 gold set proper. The worksheet is
 *   BLIND — it never shows the adjudicator's verdict — and the annotator
 *   writes their own verdict from the promise, its declared test, and its
 *   linked official-record actions. Meaningful only for promises whose
 *   promised window has actually CLOSED (2026-cycle promises stay
 *   not_yet_testable until 2027-01-03 by rubric §4.1 — see --cycle below).
 *
 * Output (scripts/ingest/_promise-gold/, deliberately untracked):
 *   <round>-round.annotator-a.csv   ← one copy per annotator, identical
 *   <round>-round.annotator-b.csv
 *   cases.json                      ← machine-readable case manifest
 * Each annotator fills ONLY their own file, without conferring, then both
 * are scored with scripts/ingest/_promise-gold-score.ts.
 *
 * Read-only against the DB.
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-gold-sample.ts
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-gold-sample.ts --round verdict
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-gold-sample.ts --round verdict --cycle 2022
 * --cycle N scopes to promises made_at within that election cycle's window
 * (same Jan-1-of-odd-year..Dec-31-of-cycle-year convention as
 * fetchAlreadyExtracted in promise-extract.ts) — use it for a --round verdict
 * worksheet so a closed-window cohort (e.g. the 2022 retrospective) isn't
 * buried under an open-window cohort's not_yet_testable placeholders.
 * Omit --cycle for the unscoped (all-promises) worksheet, e.g. --round
 * extraction, which stays meaningful across every cycle at once.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { TERM_WINDOW, termWindowForCycle } from "./promise-adjudicate";

const OUT_DIR = "scripts/ingest/_promise-gold";

export interface GoldCase {
  promiseId: string;
  candidateName: string;
  seat: string;
  promiseText: string;
  canonicalIssue: string;
  subIssue: string | null;
  promiseType: string;
  conditionsDeadline: string | null;
  archiveUrl: string | null;
  /** Round 2 only: the promise's promised-term window, "YYYY-MM-DD..YYYY-MM-DD". */
  promisedWindow: string;
  /**
   * Round 2 only: the linked official-record actions, rendered one-line,
   * each including its own date — an action outside promisedWindow is
   * excluded at the query level (see main()), never merely unlabeled.
   */
  linkedActions: string[];
}

/** Minimal CSV escaping: quote every field, double internal quotes. */
export function csvField(value: string | null): string {
  const s = value ?? "";
  return `"${s.replace(/"/gu, '""')}"`;
}

export function csvLine(fields: (string | null)[]): string {
  return fields.map(csvField).join(",");
}

const EXTRACTION_COLUMNS = [
  "promise_id",
  "candidate",
  "seat",
  "canonical_issue",
  "sub_issue",
  "promise_type",
  "conditions_deadline",
  "promise_text",
  "archive_url",
  // ── annotator fills from here ──
  "is_promise (yes/no)",
  "issue_correct (yes/no)",
  "issue_correction",
  "type_correct (yes/no)",
  "type_correction",
  "notes",
];

const VERDICT_COLUMNS = [
  "promise_id",
  "candidate",
  "seat",
  "canonical_issue",
  "promise_type",
  "conditions_deadline",
  "promise_text",
  "archive_url",
  "promised_window",
  "linked_actions",
  // ── annotator fills from here (BLIND — no adjudicator verdict shown) ──
  "verdict (kept/attempted_blocked/compromise/broken/not_yet_testable/not_yet_rated)",
  "rationale",
];

export function renderExtractionCsv(cases: GoldCase[]): string {
  const lines = [csvLine(EXTRACTION_COLUMNS)];
  for (const c of cases) {
    lines.push(
      csvLine([
        c.promiseId,
        c.candidateName,
        c.seat,
        c.canonicalIssue,
        c.subIssue,
        c.promiseType,
        c.conditionsDeadline,
        c.promiseText,
        c.archiveUrl,
        "",
        "",
        "",
        "",
        "",
        "",
      ]),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function renderVerdictCsv(cases: GoldCase[]): string {
  const lines = [csvLine(VERDICT_COLUMNS)];
  for (const c of cases) {
    lines.push(
      csvLine([
        c.promiseId,
        c.candidateName,
        c.seat,
        c.canonicalIssue,
        c.promiseType,
        c.conditionsDeadline,
        c.promiseText,
        c.archiveUrl,
        c.promisedWindow,
        c.linkedActions.join(" | ") || "(none — no official record)",
        "",
        "",
      ]),
    );
  }
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const roundIdx = argv.indexOf("--round");
  const round = roundIdx >= 0 ? (argv[roundIdx + 1] ?? "") : "extraction";
  if (round !== "extraction" && round !== "verdict") {
    process.stderr.write(
      "[promise-gold-sample] --round must be 'extraction' or 'verdict'\n",
    );
    process.exit(1);
  }
  const cycleIdx = argv.indexOf("--cycle");
  let cycle: number | undefined;
  if (cycleIdx >= 0) {
    const parsed = Number(argv[cycleIdx + 1]);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      process.stderr.write(
        `[promise-gold-sample] invalid --cycle value "${argv[cycleIdx + 1]}" — must be a positive integer year.\n`,
      );
      process.exit(1);
    }
    cycle = parsed;
  }

  const db = requireDb();
  const rows =
    cycle !== undefined
      ? await db.execute(sql`
          SELECT p.id, p.promise_text, p.canonical_issue, p.sub_issue,
                 p.promise_type, p.conditions_deadline, p.archive_url,
                 c.full_name AS candidate_name, c.state, c.district
          FROM candidate_promises p
          JOIN candidates c ON c.id = p.candidate_id
          WHERE p.made_at IS NOT NULL
            AND p.made_at >= ${`${cycle - 1}-01-01`}::date
            AND p.made_at <= ${`${cycle}-12-31`}::date
          ORDER BY c.state, c.district, p.id
        `)
      : await db.execute(sql`
          SELECT p.id, p.promise_text, p.canonical_issue, p.sub_issue,
                 p.promise_type, p.conditions_deadline, p.archive_url,
                 c.full_name AS candidate_name, c.state, c.district
          FROM candidate_promises p
          JOIN candidates c ON c.id = p.candidate_id
          ORDER BY c.state, c.district, p.id
        `);

  // Actions must fall inside the PROMISED TERM window, not just be linked
  // by candidate+issue — same fix as fetchPromisesWithActions in
  // promise-adjudicate.ts (2026-08-19 finding: an unfiltered join here would
  // hand annotators a member's out-of-window votes as if they were evidence
  // for a different cycle's promise). Sponsorship rows fall back to the
  // bill's introduced_date since date_cosponsored is null for the sponsor.
  const window = cycle !== undefined ? termWindowForCycle(cycle) : TERM_WINDOW;
  const actionRows = await db.execute(sql`
    SELECT pa.promise_id, pa.action_type, pa.direction, pa.evidence_level,
           COALESCE(b.title, pa.bill_id, v.bill_id) AS bill_ref, v.vote_cast,
           COALESCE(v.vote_date, bc.date_cosponsored, b.introduced_date) AS action_date
    FROM promise_actions pa
    LEFT JOIN votes v ON v.id = pa.vote_id
    LEFT JOIN bills b ON b.id = COALESCE(pa.bill_id, v.bill_id)
    LEFT JOIN bill_cosponsors bc ON bc.id = pa.cosponsor_id
    WHERE COALESCE(v.vote_date, bc.date_cosponsored, b.introduced_date)
      BETWEEN ${window.start}::date AND ${window.end}::date
  `);
  const actionsByPromise = new Map<string, string[]>();
  for (const r of actionRows.rows as Record<string, unknown>[]) {
    const key = String(r.promise_id);
    const list = actionsByPromise.get(key) ?? [];
    list.push(
      `${String(r.action_type)}${r.vote_cast ? `(${String(r.vote_cast)})` : ""} ` +
        `${String(r.direction)} [${String(r.evidence_level)}] ${String(r.bill_ref ?? "")} ` +
        `(${r.action_date === null ? "date unknown" : String(r.action_date)})`.trim(),
    );
    actionsByPromise.set(key, list);
  }

  const cases: GoldCase[] = (rows.rows as Record<string, unknown>[]).map(
    (r) => ({
      promiseId: String(r.id),
      candidateName: String(r.candidate_name ?? "(unknown)"),
      seat: `${String(r.state ?? "?")}-${String(r.district ?? "?")}`,
      promiseText: String(r.promise_text),
      canonicalIssue: String(r.canonical_issue),
      subIssue: r.sub_issue === null ? null : String(r.sub_issue),
      promiseType: String(r.promise_type),
      conditionsDeadline:
        r.conditions_deadline === null ? null : String(r.conditions_deadline),
      archiveUrl: r.archive_url === null ? null : String(r.archive_url),
      promisedWindow: `${window.start}..${window.end}`,
      linkedActions: actionsByPromise.get(String(r.id)) ?? [],
    }),
  );

  mkdirSync(resolve(OUT_DIR), { recursive: true });
  const csv =
    round === "extraction"
      ? renderExtractionCsv(cases)
      : renderVerdictCsv(cases);
  const scopeSuffix = cycle !== undefined ? `-${cycle}` : "";
  for (const annotator of ["annotator-a", "annotator-b"]) {
    const path = resolve(
      OUT_DIR,
      `${round}-round${scopeSuffix}.${annotator}.csv`,
    );
    writeFileSync(path, csv);
    process.stderr.write(`[promise-gold-sample] wrote ${path}\n`);
  }
  writeFileSync(
    resolve(OUT_DIR, `cases${scopeSuffix}.json`),
    JSON.stringify({ round, cycle, count: cases.length, cases }, null, 2),
  );
  process.stderr.write(
    `[promise-gold-sample] ${cases.length} cases, round=${round}. ` +
      "Each annotator fills ONLY their own CSV, independently (rubric §6.2 — " +
      "no discussing a case until both labels are recorded), then run " +
      "_promise-gold-score.ts on the two files.\n",
  );
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    process.stderr.write(
      `[promise-gold-sample] fatal: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
}
