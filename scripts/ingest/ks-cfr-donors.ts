/**
 * Kansas Campaign Finance Registry (CFR) donor ingest.
 *
 * Scrapes the Kansas SOS Campaign Finance Viewer at
 * https://sos.ks.gov/elections/cfr_viewer/cfr_examiner_entry.aspx
 * for State Representative and State Senator filings in 2024.
 *
 * Approach: page-by-page traversal of search results. For each candidate
 * on the current results page, click their filing, extract Schedule A
 * contributions, then go back. Repeat across all pages.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ks-cfr-donors.ts [--dry-run]
 *
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import { chromium, type Page } from "playwright";
import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { candidates, donorAggregates } from "../../db/schema";
import {
  mapEmployerToBucket,
  bucketIndividualByAmount,
  type DonorBucketLabel,
} from "./_bucket-mapping";

const SOURCE = "ks_cfr_bulk";
const SOURCE_URL = "https://sos.ks.gov/elections/cfr_viewer/cfr_examiner_entry.aspx";
const ELECTION_CYCLE = "2024";
const BASE_URL = "https://sos.ks.gov";
const ENTRY_URL = `${BASE_URL}/elections/cfr_viewer/cfr_examiner_entry.aspx`;

const DRY_RUN = process.argv.includes("--dry-run");

const OFFICES = [
  { code: "7", chamber: "house", name: "State Representative" },
  { code: "6", chamber: "senate", name: "State Senator" },
];

function norm(s: string): string {
  return s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/gu, "").replace(/[^A-Z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function classifyContrib(name: string, occupation: string, employer: string, amount: number): DonorBucketLabel {
  const combined = `${name} ${occupation} ${employer}`.toUpperCase();
  if (/\bREPUBLICAN\b|\bDEMOCRAT(IC)?\b|\bGOP\b|\bPARTY\b/.test(combined)) return "Party committees";
  if (/\bPAC\b|\bPOLITICAL ACTION\b|\bCOMMITTEE\b/.test(combined)) {
    const b = mapEmployerToBucket(name);
    return (b && b !== "Other" && b !== "Self-funded") ? b : "Other";
  }
  if (/\bUNION\b|\bAFL\b|\bCIO\b|\bAFSCME\b|\bSEIU\b/.test(combined)) {
    if (/POLICE|FIRE|FIREFIGHTER|SHERIFF/.test(combined)) return "Public safety unions";
    if (/TEACHER|NEA|AFT|EDUCATION/.test(combined)) return "Education employees";
    return "Trade unions (non-public-safety)";
  }
  const b = mapEmployerToBucket(employer || occupation || name);
  return (b && b !== "Other" && b !== "Self-funded") ? b : bucketIndividualByAmount(amount);
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function navigateToSearch(page: Page, officeCode: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(ENTRY_URL, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForSelector("#ddlViewerOptions", { timeout: 20000, state: "visible" });
      await page.selectOption("#ddlViewerOptions", "Candidate");
      await Promise.all([
        page.waitForNavigation({ timeout: 20000 }),
        page.locator("input[value=Submit]").click(),
      ]);
      await page.waitForSelector("#drpdownOffice", { timeout: 15000 });
      await page.selectOption("#drpdownOffice", officeCode);
      await page.selectOption("#drpdownFilingType", "Receipts and Expenditures Report");
      await page.fill("#txtStartDate", "01/01/2024");
      await page.fill("#txtEndDate", "12/31/2025");
      await Promise.all([
        page.waitForNavigation({ timeout: 20000 }),
        page.locator("input[value='Submit Search']").click(),
      ]);
      await page.waitForLoadState("networkidle");
      return;
    } catch (e) {
      if (attempt === 2) throw e;
      console.log(`[ks-cfr] navigateToSearch attempt ${attempt + 1} failed, retrying...`);
      await sleep(5000);
    }
  }
}

async function getScheduleARows(page: Page): Promise<Array<{name: string; occupation: string; employer: string; amount: number}>> {
  const rows: Array<{name: string; occupation: string; employer: string; amount: number}> = [];
  let pg = 1;
  while (true) {
    const pageRows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("table tr")).flatMap(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 5) return [];
        const amtText = Array.from(cells).reverse()[0]?.textContent?.trim() ?? "";
        const amount = parseFloat(amtText.replace(/[$,\s]/g, "")) || 0;
        if (amount <= 0) return [];
        return [{
          name: cells[0]?.textContent?.trim() ?? "",
          occupation: cells[2]?.textContent?.trim() ?? "",
          employer: cells[3]?.textContent?.trim() ?? "",
          amount,
        }];
      });
    });
    rows.push(...pageRows);
    const hasNext = await page.evaluate((pg) =>
      Array.from(document.querySelectorAll("a[href*='doPostBack']"))
        .some(l => l.textContent?.trim() === String(pg + 1))
    , pg);
    if (!hasNext) break;
    await page.evaluate((pg) => {
      const l = Array.from(document.querySelectorAll("a[href*='doPostBack']"))
        .find(a => a.textContent?.trim() === String(pg + 1)) as HTMLElement | undefined;
      l?.click();
    }, pg);
    await page.waitForLoadState("domcontentloaded");
    pg++;
    await sleep(300);
  }
  return rows;
}

async function main() {
  const db = requireDb();
  console.log(`[ks-cfr] starting dryRun=${DRY_RUN}`);

  const dbCandidates = await db
    .select({ id: candidates.id, fullName: candidates.fullName, jurisdiction: candidates.jurisdiction })
    .from(candidates)
    .where(sql`jurisdiction LIKE 'state-KS-%'`);
  console.log(`[ks-cfr] db_candidates=${dbCandidates.length}`);

  const byLast = new Map<string, typeof dbCandidates>();
  for (const c of dbCandidates) {
    const parts = norm(c.fullName).split(" ").filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    if (!byLast.has(last)) byLast.set(last, []);
    byLast.get(last)!.push(c);
  }

  function matchCandidate(portalName: string, chamber: string): typeof dbCandidates[0] | null {
    // Portal: "LASTNAME FIRSTNAME [MIDDLE]"
    const parts = norm(portalName).split(" ").filter(Boolean);
    if (!parts.length) return null;
    const lastName = parts[0]!;
    const firstName = parts[1] ?? "";
    const pool = (byLast.get(lastName) ?? []).filter(c => c.jurisdiction.includes(chamber));
    if (pool.length === 1) return pool[0]!;
    if (pool.length > 1 && firstName) {
      const exact = pool.find(c => {
        const cp = norm(c.fullName).split(" ").filter(Boolean);
        return cp[0] === firstName || cp[1] === firstName;
      });
      if (exact) return exact;
    }
    const all = byLast.get(lastName) ?? [];
    return pool[0] ?? all[0] ?? null;
  }

  const aggregates = new Map<string, number>();
  const matched = new Set<string>();
  const seenNames = new Set<string>(); // deduplicate candidates across pages
  let processed = 0;
  let totalContribs = 0;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    for (const office of OFFICES) {
      console.log(`[ks-cfr] searching ${office.name}...`);
      await navigateToSearch(page, office.code);

      let pageNum = 1;
      while (true) {
        // Get candidate links on current results page
        const candidates_on_page = await page.evaluate(() =>
          Array.from(document.querySelectorAll("a[href*='doPostBack']"))
            .filter(l => /^[A-Z]{2,}/.test(l.textContent?.trim() ?? ""))
            .map(l => ({ name: l.textContent?.trim() ?? "", arg: l.getAttribute("href")?.match(/'([^']+)'/)?.[1] ?? "" }))
        );

        for (const c of candidates_on_page) {
          if (seenNames.has(c.name)) continue; // already processed this candidate
          seenNames.add(c.name);

          const dbMatch = matchCandidate(c.name, office.chamber);
          if (!dbMatch) {
            console.log(`[ks-cfr] UNMATCHED: ${c.name}`);
            continue;
          }

          // Click the candidate's filing link
          try {
            const locator = page.locator(`a[href*="${c.arg}"]`).first();
            await Promise.all([
              page.waitForNavigation({ timeout: 15000 }),
              locator.click(),
            ]);
          } catch {
            console.log(`[ks-cfr] NAV_FAIL: ${c.name}`);
            await navigateToSearch(page, office.code);
            // Re-navigate to current page
            for (let p = 1; p < pageNum; p++) {
              await page.evaluate((p) => {
                const l = Array.from(document.querySelectorAll("a[href*='doPostBack']"))
                  .find(a => a.textContent?.trim() === String(p + 1)) as HTMLElement | undefined;
                l?.click();
              }, p);
              await page.waitForLoadState("domcontentloaded");
              await sleep(300);
            }
            continue;
          }

          // Read report summary
          const reportText = await page.evaluate(() => document.body.innerText);
          const totalMatch = reportText.match(/TOTAL CONTRIBUTIONS AND OTHER RECEIPTS[^\$]*\$([\d,.]+)/i);
          const totalAmt = totalMatch ? parseFloat(totalMatch[1]!.replace(/,/g, "")) : 0;
          processed++;

          if (totalAmt <= 0) {
            console.log(`[ks-cfr] [p${pageNum}] ${c.name} → $0`);
            await Promise.all([
              page.waitForNavigation({ timeout: 15000 }),
              page.locator("a:has-text('Go Back')").first().click(),
            ]);
            continue;
          }

          console.log(`[ks-cfr] [p${pageNum}] ${c.name} → $${totalAmt.toFixed(2)} → ${dbMatch.fullName}`);

          // Navigate to Schedule A
          let contribRows: Array<{name: string; occupation: string; employer: string; amount: number}> = [];
          const hasSchedA = /Schedule A.*?view\/print/i.test(reportText);
          if (hasSchedA) {
            try {
              // Schedule A link: find "view/print" link near "Schedule A" text
              // Remove target="_blank" so it opens in same tab, then click
              await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll("a"));
                for (const link of links) {
                  const cell = link.closest("td")?.textContent ?? "";
                  if (cell.toLowerCase().includes("schedule a") && /view\/print|view/i.test(link.textContent ?? "")) {
                    (link as HTMLAnchorElement).removeAttribute("target");
                    break; // don't click yet, will use locator below
                  }
                }
              });
              const schedALocator = page.locator("td:has-text('Schedule A') + td a, td:has-text('Schedule A') a").first();
              await Promise.all([
                page.waitForNavigation({ timeout: 15000 }),
                schedALocator.click(),
              ]);
              contribRows = await getScheduleARows(page);
              // Go back from Schedule A to main report
              await Promise.all([
                page.waitForNavigation({ timeout: 15000 }),
                page.locator("a:has-text('Go Back')").first().click(),
              ]);
            } catch {
              console.log(`[ks-cfr]   schedule A failed`);
            }
          }

          if (!contribRows.length && totalAmt > 0) {
            contribRows = [{ name: "", occupation: "", employer: "", amount: totalAmt }];
          }

          let anyMatch = false;
          for (const cr of contribRows) {
            const bucket = classifyContrib(cr.name, cr.occupation, cr.employer, cr.amount);
            const key = `${dbMatch.id}::${bucket}`;
            aggregates.set(key, (aggregates.get(key) ?? 0) + cr.amount);
            anyMatch = true;
            totalContribs += cr.amount;
          }
          if (anyMatch) matched.add(dbMatch.fullName);

          // Go back to results from main report page
          try {
            await Promise.all([
              page.waitForNavigation({ timeout: 15000 }),
              page.locator("a:has-text('Go Back')").first().click(),
            ]);
          } catch {
            await navigateToSearch(page, office.code);
            for (let p = 1; p < pageNum; p++) {
              const nextPageLocator = page.locator(`a[href*='doPostBack']:has-text('${p + 1}')`).first();
              await Promise.all([page.waitForNavigation({ timeout: 10000 }), nextPageLocator.click()]);
              await sleep(300);
            }
          }
          await sleep(300);
        }

        // Advance to next page
        const hasNext = await page.evaluate((pg) =>
          Array.from(document.querySelectorAll("a[href*='doPostBack']"))
            .some(l => l.textContent?.trim() === String(pg + 1))
        , pageNum);
        if (!hasNext) break;

        await Promise.all([
          page.waitForNavigation({ timeout: 10000 }),
          page.locator(`a[href*='doPostBack']:has-text('${pageNum + 1}')`).first().click(),
        ]);
        await sleep(300);
        pageNum++;
        await sleep(500);
      }

      console.log(`[ks-cfr] ${office.name} done — pages=${pageNum} processed=${processed} matched=${matched.size}`);
    }
  } finally {
    await browser.close();
  }

  const upsertRows = Array.from(aggregates.entries()).map(([key, total]) => {
    const [candidateId, bucket] = key.split("::");
    return { candidateId: candidateId!, electionCycle: ELECTION_CYCLE, bucketLabel: bucket as DonorBucketLabel, amountTotal: total };
  });

  console.log(`[ks-cfr] processed=${processed} candidates_matched=${matched.size} rows_to_upsert=${upsertRows.length} total_contributions=$${totalContribs.toFixed(2)}`);

  if (DRY_RUN || upsertRows.length === 0) {
    console.log(`[ks-cfr] dry_run — skipping upsert`);
    upsertRows.slice(0, 10).forEach(r => {
      const name = dbCandidates.find(c => c.id === r.candidateId)?.fullName ?? r.candidateId;
      console.log(`  ${name} | ${r.bucketLabel} | $${r.amountTotal.toFixed(2)}`);
    });
    return;
  }

  let upserted = 0;
  for (const row of upsertRows) {
    await db.insert(donorAggregates).values({
      candidateId: row.candidateId,
      electionCycle: row.electionCycle,
      bucketLabel: row.bucketLabel,
      amountTotal: row.amountTotal.toFixed(2),
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      insertedAt: new Date(),
    }).onConflictDoUpdate({
      target: [donorAggregates.candidateId, donorAggregates.electionCycle, donorAggregates.bucketLabel],
      set: {
        amountTotal: sql`excluded.amount_total`,
        source: sql`excluded.source`,
        sourceUrl: sql`excluded.source_url`,
        insertedAt: sql`excluded.inserted_at`,
      },
    });
    upserted++;
  }

  console.log(`[ks-cfr] complete candidates_matched=${matched.size} rows_upserted=${upserted}`);
}

main().catch(err => { console.error(err); process.exit(1); });
