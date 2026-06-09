/**
 * F1 end-to-end verification — runs the PRODUCTION reconciliation path on the NJ
 * test ballot (page 1, uncached): render → N× extractWithVision → reconcilePageSamples,
 * then prints the reconciled ballot and flags any fabricated name vs ground truth.
 *
 * Run: F1_VERIFY_PDF=/path/to/ballot.pdf npx tsx scripts/_verify-f1.ts
 *      F1_VERIFY_PDF=/path/to/ballot.pdf RUNS=3 npx tsx scripts/_verify-f1.ts
 * Throwaway dev harness. Writes nothing.
 */
// @ts-nocheck — dev-only harness; not part of the typed build.
import fs from "node:fs";
import path from "node:path";

const PDF = process.env.F1_VERIFY_PDF;

// Ground truth (surname-only, verified from the PDF).
const TRUTH: Record<string, string[]> = {
  "United States Senator|Democratic Primary": ["BOOKER"],
  "Member of the House of Representatives|Democratic Primary": ["NORCROSS"],
  "Members of the Board of County Commissioners|Democratic Primary": [
    "CAPPELLI",
    "YOUNG",
    "HAWKINS",
    "MERCEDES",
  ],
  "United States Senator|Republican Primary": [
    "LEBOVICS",
    "MURPHY",
    "ZDAN",
    "TABOR",
  ],
  "Member of the House of Representatives|Republican Primary": ["GALDO"],
  "Members of the Board of County Commissioners|Republican Primary": ["STONE"],
};
const norm = (s) => (s ?? "").toUpperCase().replace(/[^A-Z]/g, "");

async function main() {
  if (!PDF) {
    console.error(
      "Usage: F1_VERIFY_PDF=/path/to/ballot.pdf npx tsx scripts/_verify-f1.ts",
    );
    process.exit(2);
  }
  if (!fs.existsSync(PDF)) {
    console.error(`[verify-f1] PDF not found: ${PDF}`);
    process.exit(2);
  }

  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
  const { renderPdfPages } = await import("../src/lib/server/extract-pdfjs");
  const { extractWithVision, getAnthropicClient } = await import(
    "../src/lib/server/extract-vision"
  );
  const { reconcilePageSamples, isLargeFormatPage, SAMPLE_COUNT } =
    await import("../src/lib/server/extract-sampler");

  const buffer = fs.readFileSync(PDF);
  const allPages = await renderPdfPages(new Uint8Array(buffer), { scale: 2.0 });
  const page1 = allPages.filter((p) => p.pageIndex === 1);
  const large = page1.some((p) => isLargeFormatPage(p.width, p.height, 2.0));
  console.log(
    `page1 ${page1[0].width}x${page1[0].height}px @scale2 → largeFormat=${large}`,
  );
  const imgs = page1.map((p) => ({
    pageIndex: p.pageIndex,
    pngBuffer: p.pngBuffer,
  }));
  const N = Number(process.env.RUNS ?? SAMPLE_COUNT);
  const client = getAnthropicClient();

  const samples = [];
  for (let i = 0; i < N; i++) {
    const t0 = Date.now();
    const v = await extractWithVision(client, imgs);
    samples.push(v.pageResults.map((r) => r.page));
    console.log(
      `  sample ${i + 1}/${N} done in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );
  }
  const reconciled = reconcilePageSamples(samples);

  console.log(`\n=== RECONCILED BALLOT (${N} samples) ===\n`);
  let races = 0;
  let fabricated = 0;
  for (const page of reconciled) {
    for (const sec of page.sections ?? []) {
      for (const race of sec.races ?? []) {
        races++;
        const tkey = `${race.office}|${race.party_context ?? ""}`;
        const truth = TRUTH[tkey];
        console.log(
          `[${sec.section_name}] ${race.office} (${race.party_context ?? "—"}) vote ${race.vote_for_n}`,
        );
        for (const c of race.candidates ?? []) {
          let tag = "";
          if (c.name && truth) {
            const hit = truth.some((t) => norm(t) === norm(c.name));
            if (!hit) {
              tag = "   🔴 FABRICATED (not on ballot)";
              fabricated++;
            } else tag = "   ✅";
          }
          console.log(
            `      ${c.name ? (c.ballot_position ?? "?") : "—"}  ${c.name ?? "[" + c.placeholder_reason + "]"}${tag}`,
          );
        }
      }
    }
  }
  console.log(
    `\nTOTAL RACES: ${races}   FABRICATED NAMES: ${fabricated}  (must be 0)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
