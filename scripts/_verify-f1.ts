/**
 * F1 Step-1 verification — live, UNCACHED extraction of the NJ test ballot.
 * Calls renderPdfPages + extractWithVision directly (bypasses the route's cache,
 * Origin check, and rate limiter), so it exercises ONLY the hardened prompt.
 *
 * Run: npx tsx scripts/_verify-f1.ts   (1 real Sonnet call per page)
 * Throwaway — delete after verifying. Does NOT write anything.
 */
import fs from "node:fs";
import path from "node:path";

const PDF =
  "/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/agitated-shockley-cda6b6/.playwright-mcp/nj-june2-2026-ballot.pdf";

async function main() {
  // tsx does not auto-load .env.local; pull in ANTHROPIC_VOTER_API.
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }

  const { renderPdfPages } = await import("../src/lib/server/extract-pdfjs.ts");
  const { extractWithVision, getAnthropicClient } = await import(
    "../src/lib/server/extract-vision.ts"
  );

  const buffer = fs.readFileSync(PDF);
  console.log("Rendering pages @ scale 2.0 …");
  const pages = await renderPdfPages(new Uint8Array(buffer), { scale: 2.0 });
  console.log(
    `Rendered ${pages.length} page(s). Calling vision LIVE (uncached) …`,
  );
  const t0 = Date.now();
  const client = getAnthropicClient();
  const vision = await extractWithVision(
    client,
    pages.map((p) => ({ pageIndex: p.pageIndex, pngBuffer: p.pngBuffer })),
  );
  console.log(
    `Outcome: ${vision.overallOutcome} in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`,
  );

  let raceCount = 0;
  for (const r of vision.pageResults) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page: any = (r as any).page;
    if (!page) {
      console.log(
        `Page ${r.pageIndex}: ERROR ${JSON.stringify((r as any).error)}`,
      );
      continue;
    }
    for (const sec of page.sections ?? []) {
      for (const race of sec.races ?? []) {
        raceCount++;
        const flag = /senator/i.test(race.office) ? "   <<< SENATOR" : "";
        const pc = race.party_context ? ` (${race.party_context})` : "";
        console.log(
          `[${sec.section_name}] ${race.office}${pc} — vote ${race.vote_for_n}${flag}`,
        );
        for (const c of race.candidates ?? []) {
          const label = c.name
            ? `${c.ballot_position ?? "?"}  ${c.name}${c.party ? " · " + c.party : ""}`
            : `—  [${c.placeholder_reason ?? "null-name/no-reason"}]`;
          console.log(`      ${label}`);
        }
      }
    }
  }
  console.log(
    `\nTOTAL RACES: ${raceCount}  (expect ~8 coherent, NOT ~30 fragments)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
