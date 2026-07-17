/**
 * scripts/ops/list-roster-feedback.ts
 *
 * Reads the `roster_feedback` table (POST /api/roster-feedback — the
 * "Missing a rep? Something look wrong?" intake, card "[P1] Ballot-accuracy
 * feedback intake") and prints submissions newest-first with state/office
 * columns, so Muxin can triage reports instead of manually re-combing
 * state sites.
 *
 * Usage:
 *   DATABASE_URL=<neon-url> npx tsx scripts/ops/list-roster-feedback.ts [--limit N] [--state XX]
 *   npx tsx scripts/ops/list-roster-feedback.ts   (reads DATABASE_URL from .env.local)
 *
 * With no DATABASE_URL, exits 1 with a clear error — same honest-failure
 * posture as check-schema-drift.ts, not a silent empty list.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd(), true); // dev=true -> loads .env.local

import { fileURLToPath } from "node:url";
import path from "node:path";
import { desc, eq, type SQL } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { rosterFeedback } from "../../db/schema";

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

export interface ListArgs {
  limit: number;
  state: string | null;
}

const DEFAULT_LIMIT = 50;

export function parseArgs(argv: string[]): ListArgs {
  let limit = DEFAULT_LIMIT;
  let state: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit" && argv[i + 1]) {
      const n = Number(argv[i + 1]);
      if (Number.isFinite(n) && n > 0) limit = Math.trunc(n);
      i++;
    } else if (argv[i] === "--state" && argv[i + 1]) {
      state = argv[i + 1].toUpperCase();
      i++;
    }
  }

  return { limit, state };
}

// ---------------------------------------------------------------------------
// Row formatting (PURE — no DB)
// ---------------------------------------------------------------------------

export interface RosterFeedbackRow {
  id: string;
  createdAt: Date | string;
  state: string | null;
  office: string | null;
  district: string | null;
  candidateRef: string | null;
  message: string;
}

const MESSAGE_PREVIEW_LENGTH = 100;

export function formatRow(row: RosterFeedbackRow): string {
  const when = new Date(row.createdAt).toISOString();
  const state = row.state ?? "—";
  const office = row.office ?? "—";
  const district = row.district ?? "";
  const seat = [office, district].filter(Boolean).join(" · ") || "—";
  const preview =
    row.message.length > MESSAGE_PREVIEW_LENGTH
      ? row.message.slice(0, MESSAGE_PREVIEW_LENGTH) + "…"
      : row.message;
  return `${when}  [${state}]  ${seat}\n    ${preview}`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const db = requireDb();

  const whereClause: SQL | undefined = args.state
    ? eq(rosterFeedback.state, args.state)
    : undefined;

  const rows = await db
    .select()
    .from(rosterFeedback)
    .where(whereClause)
    .orderBy(desc(rosterFeedback.createdAt))
    .limit(args.limit);

  if (rows.length === 0) {
    console.log("No roster_feedback rows found.");
    return 0;
  }

  console.log(
    `${rows.length} roster_feedback row(s)${args.state ? ` (state=${args.state})` : ""}:\n`,
  );
  for (const row of rows) {
    console.log(formatRow(row));
    console.log("");
  }

  return 0;
}

/**
 * True only when this file is the program entrypoint (CLI), not when
 * imported by a test. Mirrors check-stock-watcher-liveness.ts's guard:
 * wrapped in try/catch because under a non-file: loader (vitest)
 * fileURLToPath(import.meta.url) throws — in which case we are
 * definitionally NOT the CLI, so return false.
 */
function isInvokedDirectly(): boolean {
  try {
    const entry = process.argv?.[1];
    if (!entry) return false;
    return fileURLToPath(import.meta.url) === path.resolve(entry);
  } catch {
    return false;
  }
}

if (isInvokedDirectly()) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error("✗ list-roster-feedback FAILED:");
      console.error(err);
      process.exit(1);
    });
}
