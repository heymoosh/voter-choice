/**
 * _summary-stream-filter.ts — filter the searchablebill COPY stream from pg_restore.
 *
 * Reads stdin (the `pg_restore --data-only -t opencivicdata_searchablebill` output),
 * keeps only rows whose bill_id is in our idset and is_error='f' with non-empty text,
 * unescapes COPY text, and writes one JSON line per bill to _summary-text.jsonl.
 * Memory-safe (line-by-line) and disk-safe (only our ~16.8k texts are stored).
 *
 *   docker run --rm -v <root>:/data:ro postgres:17 pg_restore --data-only \
 *     -t opencivicdata_searchablebill /data/2026-05-public.pgdump \
 *     | npx tsx scripts/ingest/_summary-stream-filter.ts
 */
import { readFileSync, writeFileSync, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";

const DIR = "scripts/ingest/_pole-batches";
const idset: Record<string, string> = JSON.parse(
  readFileSync(`${DIR}/_summary-idset.json`, "utf8"),
);
const want = new Set(Object.keys(idset));

// COPY text-format unescape (\n \r \t \\ and friends)
const MAP: Record<string, string> = {
  n: "\n",
  r: "\r",
  t: "\t",
  "\\": "\\",
  b: "\b",
  f: "\f",
  v: "\v",
};
const unescape = (s: string) => s.replace(/\\(.)/g, (_, c) => MAP[c] ?? c);

async function main() {
  const out = createWriteStream(`${DIR}/_summary-text.jsonl`);
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

  let cols: string[] | null = null;
  let iBill = -1,
    iText = -1,
    iErr = -1;
  let scanned = 0,
    matched = 0,
    withText = 0,
    errored = 0,
    done = false;
  const seen = new Set<string>();
  const lenBuckets: Record<string, number> = {
    "0": 0,
    "<500": 0,
    "500-2k": 0,
    "2k-10k": 0,
    "10k-50k": 0,
    ">50k": 0,
  };

  for await (const line of rl) {
    if (done) continue;
    if (!cols) {
      // find: COPY public.opencivicdata_searchablebill (a, b, c, ...) FROM stdin;
      const m = line.match(
        /^COPY\s+public\.opencivicdata_searchablebill\s*\(([^)]+)\)\s+FROM stdin;/i,
      );
      if (m) {
        cols = m[1].split(",").map((c) => c.trim());
        iBill = cols.indexOf("bill_id");
        iText = cols.indexOf("raw_text");
        iErr = cols.indexOf("is_error");
        process.stderr.write(
          `[filter] columns parsed; bill_id@${iBill} raw_text@${iText} is_error@${iErr}\n`,
        );
      }
      continue;
    }
    if (line === "\\.") {
      done = true;
      continue;
    }
    scanned++;
    if (scanned % 200000 === 0)
      process.stderr.write(`[filter] scanned=${scanned} matched=${matched}\n`);
    const f = line.split("\t");
    const bill = f[iBill];
    if (!bill || !want.has(bill) || seen.has(bill)) continue;
    matched++;
    seen.add(bill);
    if (f[iErr] === "t") {
      errored++;
      continue;
    }
    const text = unescape(f[iText] ?? "");
    const len = text.trim().length;
    if (len === 0) {
      lenBuckets["0"]++;
      continue;
    }
    withText++;
    lenBuckets[
      len < 500
        ? "<500"
        : len < 2000
          ? "500-2k"
          : len < 10000
            ? "2k-10k"
            : len < 50000
              ? "10k-50k"
              : ">50k"
    ]++;
    out.write(JSON.stringify({ id: idset[bill], ocd: bill, len, text }) + "\n");
  }
  await new Promise((r) => out.end(r));

  const stats = {
    total_target: want.size,
    scanned,
    matched,
    withText,
    errored,
    emptyText: lenBuckets["0"],
    lenBuckets,
    yield_pct: Math.round((withText / want.size) * 100),
  };
  writeFileSync(`${DIR}/_summary-yield.json`, JSON.stringify(stats, null, 2));
  console.log("\n=== SUMMARY-TEXT YIELD ===");
  console.log(JSON.stringify(stats, null, 2));
  console.log(`\nText → ${DIR}/_summary-text.jsonl`);
}
main().catch((e) => {
  console.error("FILTER FAILED:", e.message);
  process.exit(1);
});
