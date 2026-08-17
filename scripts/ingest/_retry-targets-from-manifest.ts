/**
 * scripts/ingest/_retry-targets-from-manifest.ts
 *
 * Filters a spike --json corpus down to candidates with NO in-window
 * homepage capture yet in the local snapshot store -- so a retry after a
 * Common Crawl collapse only re-queries what's actually still missing,
 * instead of re-poking candidates that already succeeded (2026-08-17
 * national-run collapse: 30/292 captured, need to retry only the other 262
 * without re-hitting the 30 that worked).
 *
 * Usage:
 *   npx tsx scripts/ingest/_retry-targets-from-manifest.ts \
 *     --corpus spike-nontx-2022.json --dir site-snapshots --cycle 2022 \
 *     > spike-retry-2022.json
 */
import { readFileSync } from "node:fs";
import { cycleDefaults, toCdxCutoff } from "./_promise-corpus-spike";
import { loadSnapshotTargets } from "./promise-site-snapshot";
import { defaultSnapshotDir, parseManifest } from "./site-snapshot-store";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): void {
  const corpusPath = arg("--corpus");
  if (!corpusPath) {
    console.error(
      "Usage: _retry-targets-from-manifest.ts --corpus <spike --json file> [--dir DIR] [--cycle 2022]",
    );
    process.exit(1);
  }
  const dir = arg("--dir") ?? defaultSnapshotDir();
  const cycle = Number(arg("--cycle") ?? 2022);
  const defaults = cycleDefaults(cycle);
  const fromCompact = `${defaults.fromDate.replace(/-/gu, "")}000000`;
  const cutoffCompact = toCdxCutoff(defaults.electionDay);

  const targets = loadSnapshotTargets(
    JSON.parse(readFileSync(corpusPath, "utf8")),
  );
  const allEntries = parseManifest(
    readFileSync(`${dir}/manifest.jsonl`, "utf8"),
  );
  const inWindow = allEntries.filter(
    (e) => e.timestamp >= fromCompact && e.timestamp <= cutoffCompact,
  );
  const captured = new Set(
    inWindow.map((e) => `${e.candidateId}::${e.original}`),
  );

  const remaining = targets.filter(
    (t) => !captured.has(`${t.candidateId}::${t.website}`),
  );

  process.stderr.write(
    `[retry-targets] ${remaining.length}/${targets.length} candidates still need a Common Crawl capture attempt\n`,
  );
  console.log(JSON.stringify(remaining, null, 2));
}

main();
