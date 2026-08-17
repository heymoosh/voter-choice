/**
 * scripts/ingest/_corpus-from-manifest.ts
 *
 * One-off recovery tool (2026-08-17): Common Crawl's index server started
 * rate-limiting after 3 back-to-back full-corpus runs (25/31 -> 10/31, with
 * several PREVIOUSLY successful candidates failing every index query on the
 * next run). Re-running promise-commoncrawl-snapshot.ts again would just
 * hammer the same server harder. But every run APPENDS to
 * site-snapshots/manifest.jsonl rather than overwriting it, so nothing
 * captured so far is lost -- this reads what's already on disk and rebuilds
 * the corpus file promise-extract.ts consumes, with ZERO network calls.
 *
 * Usage:
 *   npx tsx scripts/ingest/_corpus-from-manifest.ts \
 *     --corpus spike-tx-2022.json --dir site-snapshots > corpus-tx-2022-cc.json
 */
import { readFileSync } from "node:fs";
import { cycleDefaults, toCdxCutoff } from "./_promise-corpus-spike";
import { loadSnapshotTargets, toCorpusRow } from "./promise-site-snapshot";
import { defaultSnapshotDir, parseManifest } from "./site-snapshot-store";
import { replayUrl } from "./web-archives";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): void {
  const corpusPath = arg("--corpus");
  if (!corpusPath) {
    console.error(
      "Usage: _corpus-from-manifest.ts --corpus <spike --json file> [--dir DIR] [--cycle 2022]",
    );
    process.exit(1);
  }
  const dir = arg("--dir") ?? defaultSnapshotDir();
  const cycle = Number(arg("--cycle") ?? 2022);
  const defaults = cycleDefaults(cycle);
  // Excludes any manifest entry outside the retrospective's own capture
  // window -- critically, a LIVE self-snapshot taken by a DIFFERENT,
  // parallel pipeline (promise-site-snapshot.ts, timestamped with today's
  // date) that happens to share this candidateId + website. Without this,
  // a same-domain incumbent running again would silently get their CURRENT
  // site passed off as their 2022 capture (2026-08-17 finding: caught this
  // for teamronny.com before any DB write happened, dry-run only).
  const fromCompact = `${defaults.fromDate.replace(/-/gu, "")}000000`;
  const cutoffCompact = toCdxCutoff(defaults.electionDay);
  const targets = loadSnapshotTargets(
    JSON.parse(readFileSync(corpusPath, "utf8")),
  );
  const allEntries = parseManifest(
    readFileSync(`${dir}/manifest.jsonl`, "utf8"),
  );
  const entries = allEntries.filter(
    (e) => e.timestamp >= fromCompact && e.timestamp <= cutoffCompact,
  );

  const rows = targets
    .map((target) => {
      const forCandidate = entries.filter(
        (e) => e.candidateId === target.candidateId,
      );
      const homepage = forCandidate
        .filter((e) => e.original === target.website)
        .sort((a, b) => (a.fetchedAt < b.fetchedAt ? 1 : -1))[0];
      if (!homepage) return null;
      return toCorpusRow({
        target,
        canonicalCaptureUrl: replayUrl(
          "snapshot",
          homepage.timestamp,
          target.website,
        ),
        pagesCaptured: forCandidate.length,
        pagesFailed: 0,
      });
    })
    .filter(Boolean);

  process.stderr.write(
    `[corpus-from-manifest] ${rows.length}/${targets.length} candidates already captured in ${dir} (no network used)\n`,
  );
  console.log(JSON.stringify(rows, null, 2));
}

main();
