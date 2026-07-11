/**
 * scripts/dev/seed-polis-clusters.ts  —  DISPOSABLE, LOCAL-ONLY seed
 *
 * Seeds `polis_response_vectors` with THREE distinguishable archetypal
 * answer-patterns (+ per-row noise) so the real /api/polis `clusterMap` renders
 * three separated opinion groups against a local DB. This is a dev aid for
 * eyeballing the pol.is-style map end-to-end through the real endpoint; the
 * deterministic parity/screenshot proof uses the same algorithm via a mock
 * fixture (scripts/design/parity-gallery-scenarios.ts).
 *
 * ⚠️  NEVER run this against production. It deliberately IGNORES the ambient
 * DATABASE_URL (which, in this repo's .env.local, points at prod Neon) and
 * reads a SEPARATE, explicit `POLIS_SEED_DATABASE_URL` that you must point at a
 * throwaway local/branch database, plus a `--confirm-local` flag. It refuses to
 * run otherwise, and refuses any URL that looks like the known prod host.
 *
 * Usage (local only):
 *   POLIS_SEED_DATABASE_URL="postgres://localhost/voterchoice_dev" \
 *     npx tsx scripts/dev/seed-polis-clusters.ts --confirm-local
 *
 * Do NOT commit a real connection string. This file hard-codes none.
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { polisResponseVectors } from "../../db/schema";

type Answer = "agree" | "disagree" | "pass";

const STATEMENTS = ["s1", "s2", "s3", "s4", "s5", "s6"] as const;
const ARCHETYPES: Record<"A" | "B" | "C", Answer[]> = {
  A: ["agree", "agree", "disagree", "disagree", "pass", "pass"],
  B: ["disagree", "disagree", "agree", "agree", "pass", "pass"],
  C: ["disagree", "disagree", "disagree", "disagree", "agree", "agree"],
};
const COUNTS = { A: 26, B: 25, C: 17 } as const;
const SEED_STATE = "TX";

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function buildRows(): Array<{
  sessionToken: string;
  stateCode: string;
  responses: Record<string, Answer>;
  recordedHour: Date;
}> {
  const r = rng(42);
  const hour = new Date();
  hour.setUTCMinutes(0, 0, 0);
  const rows: ReturnType<typeof buildRows> = [];
  for (const kind of ["A", "B", "C"] as const) {
    for (let i = 0; i < COUNTS[kind]; i++) {
      const responses: Record<string, Answer> = {};
      for (let j = 0; j < STATEMENTS.length; j++) {
        let ans = ARCHETYPES[kind][j];
        if (r() < 0.15) {
          const alt: Answer[] = ["agree", "disagree", "pass"];
          ans = alt[Math.floor(r() * 3)];
        }
        responses[STATEMENTS[j]] = ans;
      }
      rows.push({
        sessionToken: randomUUID(),
        stateCode: SEED_STATE,
        responses,
        recordedHour: hour,
      });
    }
  }
  return rows;
}

async function main(): Promise<void> {
  const url = process.env.POLIS_SEED_DATABASE_URL;
  const confirmed = process.argv.includes("--confirm-local");

  if (!url || !confirmed) {
    console.error(
      "Refusing to run. Set POLIS_SEED_DATABASE_URL to a LOCAL/throwaway DB " +
        "and pass --confirm-local. This never uses the ambient DATABASE_URL.",
    );
    process.exit(1);
  }
  // Belt-and-suspenders: refuse anything that looks like the known prod host.
  if (/ep-silent-dew|neondb\b.*production|\.aws\.neon\.tech/.test(url)) {
    console.error("Refusing: POLIS_SEED_DATABASE_URL looks like production.");
    process.exit(1);
  }

  const db = drizzle(neon(url), {
    schema: { polisResponseVectors },
  });
  const rows = buildRows();
  await db.insert(polisResponseVectors).values(rows);
  console.log(
    `Seeded ${rows.length} polis_response_vectors rows (${COUNTS.A} A / ${COUNTS.B} B / ${COUNTS.C} C) for state ${SEED_STATE}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
