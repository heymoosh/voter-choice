/**
 * scripts/ingest/or-orestar-donors.ts
 *
 * Oregon ORESTAR campaign finance ingest.
 * Fetches 2024 contribution data for Oregon state legislative candidates
 * from ORESTAR (Oregon Elections Reporting System) public portal.
 *
 * Requires a visible browser (headless: false) because the ORESTAR WAF
 * blocks headless/XHR requests. Opens a browser window — do not interact
 * with it while the script is running.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/or-orestar-donors.ts [--dry-run]
 *
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import { chromium, type Browser, type Page } from "playwright";
import { sql } from "drizzle-orm";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { requireDb } from "../../db/client";
import { candidates, donorAggregates } from "../../db/schema";
import {
  mapEmployerToBucket,
  bucketIndividualByAmount,
  type DonorBucketLabel,
} from "./_bucket-mapping";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCE = "or_orestar_bulk";
const SOURCE_URL =
  "https://secure.sos.state.or.us/orestar/gotoPublicTransactionSearch.do";
const ELECTION_CYCLE = "2024";
const ORESTAR_BASE = "https://secure.sos.state.or.us/orestar";
// OR campaigns fundraise throughout the 2-year election cycle (2023+2024 for 2024 races)
const VALID_YEARS = new Set(["2023", "2024"]);

// ---------------------------------------------------------------------------
// 2024 General Election OR legislative committees
// Extracted from ORESTAR Committees/Filers by Election → 2024 General Election
// ---------------------------------------------------------------------------

const OR_2024_COMMITTEES = [
  { sooRsn: "80764", raw: "Barton, BrentFriends of Brent Barton", type: "State Representative, 40th DistrictDemocrat" },
  { sooRsn: "76081", raw: "Bates, AlanCommittee to Elect Dr. Alan Bates", type: "State Senator, 3rd DistrictDemocrat" },
  { sooRsn: "93220", raw: "Bates, StephenFriends of Steve Bates", type: "State Senator, 26th DistrictRepublican" },
  { sooRsn: "95600", raw: "Bell, KevinKevin Bell for House District 2", type: "State Representative, 2nd DistrictDemocrat" },
  { sooRsn: "94988", raw: "Boddie, NathanBoddie For Bend", type: "State Representative, 54th DistrictDemocrat" },
  { sooRsn: "87845", raw: "Boles, DenycFriends of Denyc Boles", type: "State Senator, 10th DistrictRepublican" },
  { sooRsn: "97858", raw: "Bonham, DanielCommittee to Elect Daniel Bonham", type: "State Senator, 26th DistrictRepublican" },
  { sooRsn: "94046", raw: "Born, JamesFriends of Dr. James Born", type: "State Representative, 52nd DistrictRepublican" },
  { sooRsn: "76051", raw: "Bruce, RobertFriends of Robert Bruce", type: "State Senator, 26th DistrictDemocrat" },
  { sooRsn: "97255", raw: "Buehler, GabrielFreedom Fighters for Gabriel Buehler", type: "State Representative, 25th DistrictRepublican" },
  { sooRsn: "95227", raw: "Busch, MelissaMelissa for Oregon", type: "State Senator, 16th DistrictDemocrat" },
  { sooRsn: "89073", raw: "Bussell, SerinFriends of Serin Bussell", type: "State Representative, 33rd DistrictDemocrat" },
  { sooRsn: "95229", raw: "Bynum, JanelleCommittee to Elect Janelle Bynum", type: "State Representative, 39th DistrictDemocrat" },
  { sooRsn: "94102", raw: "Castille, KalikoKaliko for Oregon", type: "State Representative, 41st DistrictDemocrat" },
  { sooRsn: "94215", raw: "Clem, BrianOregonians for Clem", type: "State Representative, 21st DistrictDemocrat" },
  { sooRsn: "93224", raw: "Clevenger, DerekCommittee to Elect Derek Clevenger", type: "State Representative, 17th DistrictNonaffiliated" },
  { sooRsn: "94167", raw: "Collins, TylerTyler For Oregon", type: "State Representative, 11th DistrictRepublican" },
  { sooRsn: "94923", raw: "Cooke, MaryMary for HD11", type: "State Representative, 11th DistrictDemocrat" },
  { sooRsn: "80212", raw: "Crawley, TimothyCrawley for Oregon", type: "State Representative, 48th DistrictNonaffiliated" },
  { sooRsn: "89552", raw: "Danel, TessahFriends of Tessah Danel", type: "State Representative, 39th DistrictDemocrat" },
  { sooRsn: "94160", raw: "Dillon, HeatherFriends of Heather Dillon", type: "State Representative, 11th DistrictRepublican" },
  { sooRsn: "92060", raw: "Ems, KeatonKeaton for Oregon", type: "State Senator, 8th DistrictRepublican" },
  { sooRsn: "95288", raw: "Ernst, VictoriaVictoria Ernst for District 24", type: "State Representative, 24th DistrictDemocrat" },
  { sooRsn: "59268", raw: "Esquivel, SalCommittee to Elect Sal Esquivel", type: "State Representative, 6th DistrictRepublican" },
  { sooRsn: "95247", raw: "Everton, JosephJoe Everton for Hillsboro", type: "State Representative, 30th DistrictRepublican" },
  { sooRsn: "91358", raw: "Glaser, KatherineFriends of Katie Boshart Glaser", type: "State Representative, 11th DistrictRepublican" },
  { sooRsn: "94541", raw: "Gray, Jr., FrederickRick Gray for the House", type: "State Representative, 32nd DistrictNonaffiliated" },
  { sooRsn: "88111", raw: "Harmon Johnson, NkengeFriends of Nkenge", type: "State Senator, 10th DistrictDemocrat" },
  { sooRsn: "95176", raw: "Haynes, KoriFriends of Kori Haynes", type: "State Representative, 39th DistrictRepublican" },
  { sooRsn: "89197", raw: "Hill, JuliaFriends of Julia Hill", type: "State Representative, 39th DistrictDemocrat" },
  { sooRsn: "95204", raw: "Hindley, JeffreyFriends to elect Jeff Hindley", type: "State Representative, 36th DistrictRepublican" },
  { sooRsn: "68263", raw: "Huddle, JohnFriends of John Huddle", type: "State Representative, 55th DistrictDemocrat" },
  { sooRsn: "93690", raw: "Husseman, RobertRobert Husseman For Oregon", type: "State Representative, 21st DistrictDemocrat" },
  { sooRsn: "95349", raw: "Keister, Bradybrady4joco3", type: "State Representative, 3rd DistrictDemocrat" },
  { sooRsn: "88748", raw: "Keny-Guyer, AlissaFriends of Alissa Keny-Guyer", type: "State Representative, 46th DistrictDemocrat" },
  { sooRsn: "90014", raw: "Kiely, EileenEileen Kiely for Oregon", type: "State Senator, 27th DistrictDemocrat" },
  { sooRsn: "36788", raw: "Kim, DaveDave Kim for Senate", type: "State Senator, 25th DistrictRepublican" },
  { sooRsn: "93968", raw: "Kinzey, JenniferJennifer For Oregon", type: "State Representative, 34th DistrictDemocrat" },
  { sooRsn: "88692", raw: "Kreisman, PaigeCommittee to Elect Paige Kreisman", type: "State Representative, 42nd DistrictDemocrat" },
  { sooRsn: "93671", raw: "Landstrom, WillFriends of Wilbert Landstrom", type: "State Representative, 19th DistrictDemocrat" },
  { sooRsn: "94515", raw: "Ledford, BillFriends Of Bill Ledford", type: "State Representative, 12th DistrictRepublican" },
  { sooRsn: "95249", raw: "Lembke, RoyVote for Keith Lembke", type: "State Representative, 16th DistrictRepublican" },
  { sooRsn: "94964", raw: "Lepore, BrianLepore for Oregon", type: "State Representative, 55th DistrictDemocrat" },
  { sooRsn: "93935", raw: "LLERANDI GONZALEZ, JANETLlerandi for Oregon", type: "State Representative, 53rd DistrictDemocrat" },
  { sooRsn: "93188", raw: "Loosley, SteveFriends of Steve Loosley", type: "State Representative, 2nd DistrictRepublican" },
  { sooRsn: "94791", raw: "Lowder, JamesJim4Oregon", type: "State Representative, 22nd DistrictRepublican" },
  { sooRsn: "95244", raw: "Malmedal, CarolinaFriends of Carolina Malmedal", type: "State Senator, 15th DistrictRepublican" },
  { sooRsn: "93833", raw: "McCall, DavidFriends of Dave McCall", type: "State Representative, 21st DistrictDemocrat" },
  { sooRsn: "90071", raw: "Middleton, MaryFriends of Mary Middleton", type: "State Representative, 4th DistrictDemocrat" },
  { sooRsn: "88747", raw: "Milesnick, RobertFriends of Rob Milesnick", type: "State Senator, 23rd DistrictDemocrat" },
  { sooRsn: "89214", raw: "Miller, CarinaCarina for Oregon", type: "State Senator, 30th DistrictDemocrat" },
  { sooRsn: "95107", raw: "Moore, MichaelFriends of Michael Moore", type: "State Representative, 8th DistrictRepublican" },
  { sooRsn: "94086", raw: "Morrill, ToddTodd for Oregon HD 30", type: "State Representative, 30th DistrictRepublican" },
  { sooRsn: "95411", raw: "Morrow, MichaelMorrow 4 Oregon", type: "State Representative, 21st DistrictLibertarian" },
  { sooRsn: "89549", raw: "Mukumoto, CalvinFriends of Cal Mukumoto", type: "State Representative, 9th DistrictDemocrat" },
  { sooRsn: "95294", raw: "Munster-Moore, GinaFriends of Gina Munster Moore", type: "State Representative, 29th DistrictRepublican" },
  { sooRsn: "92187", raw: "Nearman, MikeNearman4Oregon", type: "State Representative, 23rd DistrictRepublican" },
  { sooRsn: "66721", raw: "Nelsen, JohnFriends of John Nelsen", type: "State Representative, 49th DistrictRepublican" },
  { sooRsn: "56689", raw: "Newell, DavidFriends of David Newell", type: "State Representative, 37th DistrictRepublican" },
  { sooRsn: "96854", raw: "Newgard, SteveFriends of Steve Newgard", type: "State Representative, 40th DistrictRepublican" },
  { sooRsn: "95218", raw: "Niemeyer, RobertBob Niemeyer Campaign", type: "State Representative, 25th DistrictRepublican" },
  { sooRsn: "95737", raw: "Pinnell, EricPinnell For Government", type: "State Senator, 4th DistrictLibertarian" },
  { sooRsn: "89527", raw: "Reardon, MichaelReardon for Oregon", type: "State Representative, 48th DistrictDemocrat" },
  { sooRsn: "84831", raw: "Reitz, ChrissyChrissy for Oregon", type: "State Senator, 26th DistrictDemocrat" },
  { sooRsn: "95179", raw: "Reynolds, RobFriends of Rob Reynolds", type: "State Representative, 41st DistrictRepublican" },
  { sooRsn: "95169", raw: "Rice, KimberlyPeople For Kim Rice", type: "State Senator, 18th DistrictRepublican" },
  { sooRsn: "91720", raw: "Ross, JosephJoe Ross 2022 District 33 Campaign Committee", type: "State Representative, 33rd DistrictNonaffiliated" },
  { sooRsn: "83970", raw: "Rydmark, SethFriends of Seth Rydmark", type: "State Representative, 39th DistrictRepublican" },
  { sooRsn: "89529", raw: "Samaniego, JerryJerry for Oregon", type: "State Representative, 7th DistrictDemocrat" },
  { sooRsn: "72233", raw: "Schrader, KurtSchrader for State Senate (Kurt)", type: "State Senator, 20th DistrictDemocrat" },
  { sooRsn: "89129", raw: "Shank, MichaelMichael Shank for State Representative, District 55", type: "State Representative, 55th DistrictNonaffiliated" },
  { sooRsn: "89555", raw: "Shaw, LynnetteFriends of Lynnette Shaw", type: "State Representative, 24th DistrictDemocrat" },
  { sooRsn: "95205", raw: "Sipe, MichaelMichael Sipe for State Representative", type: "State Representative, 53rd DistrictRepublican" },
  { sooRsn: "95650", raw: "Sorace, AnthonyAnthony for Oregon", type: "State Representative, 31st DistrictDemocrat" },
  { sooRsn: "58354", raw: "Stiegler, JudithJudy for District 54", type: "State Representative, 54th DistrictDemocrat" },
  { sooRsn: "90668", raw: "Stone, KatFRIENDS OF KAT STONE", type: "State Senator, 1st DistrictDemocrat" },
  { sooRsn: "56308", raw: "Strobeck, KenCitizens for Ken Strobeck", type: "State Representative, 6th DistrictRepublican" },
  { sooRsn: "94281", raw: "Swenson, EricEric Swenson for Oregon", type: "State Senator, 11th DistrictDemocrat" },
  { sooRsn: "96835", raw: "Thatcher, KimFriends of Kim Thatcher", type: "State Senator, 11th DistrictRepublican" },
  { sooRsn: "93956", raw: "tooze, danielTooze for State Representative", type: "State Representative, 40th DistrictRepublican" },
  { sooRsn: "77172", raw: "Tosky, BrianFriends of Brian Tosky", type: "State Representative, 34th DistrictDemocrat" },
  { sooRsn: "95241", raw: "Velez, JohnVelez for Oregon", type: "State Senator, 13th DistrictRepublican" },
  { sooRsn: "96379", raw: "Vial, ArmandCommittee to Elect Rich Vial", type: "State Senator, 18th DistrictNonaffiliated" },
  { sooRsn: "95301", raw: "Walsh, RichardFriends of Rich Walsh", type: "State Senator, 11th DistrictDemocrat" },
  { sooRsn: "95184", raw: "Weber, SuzanneFriends of Suzanne Weber", type: "State Senator, 16th DistrictRepublican" },
  { sooRsn: "87958", raw: "Wimmer, LaurieLaurie for Oregon", type: "State Representative, 36th DistrictDemocrat" },
  { sooRsn: "95267", raw: "Woods, AaronFriends of Aaron Woods", type: "State Senator, 13th DistrictDemocrat" },
  { sooRsn: "95163", raw: "Woods, JohnFriends of John Woods", type: "State Representative, 34th DistrictRepublican" },
  { sooRsn: "89807", raw: "Zika, Joseph (Jack)Jack Zika for State Representative", type: "State Representative, 53rd DistrictRepublican" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DbCandidate {
  id: string;
  fullName: string;
  jurisdiction: string;
}

interface OrestarContrib {
  contributor: string;
  subType: string;
  amount: number;
}

interface CommitteeResult {
  sooRsn: string;
  lastName: string;
  firstInitial: string;
  chamber: "house" | "senate";
  contribs: OrestarContrib[];
}

// ---------------------------------------------------------------------------
// Name normalization
// ---------------------------------------------------------------------------

const SUFFIXES = new Set(["JR", "SR", "II", "III", "IV"]);

function norm(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLastName(fullName: string): string {
  const parts = norm(fullName).split(" ").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!SUFFIXES.has(parts[i] ?? "")) return parts[i] ?? "";
  }
  return parts[parts.length - 1] ?? "";
}

function extractFirstInitial(fullName: string): string {
  return norm(fullName).split(" ").filter(Boolean)[0]?.[0] ?? "";
}

/** Parse "Last, FirstCommitteeName" ORESTAR format */
function parseCandidateFromRaw(raw: string): { lastName: string; firstInitial: string } {
  const commaIdx = raw.indexOf(",");
  if (commaIdx < 0) {
    const first = norm(raw.split(/\s+/)[0] ?? "");
    return { lastName: first, firstInitial: "" };
  }
  const lastName = norm(raw.substring(0, commaIdx).trim());
  const rest = raw.substring(commaIdx + 1).trim();
  const firstInitial = norm(rest.split(/\s+/)[0] ?? "")[0] ?? "";
  return { lastName, firstInitial };
}

function chamberFromType(type: string): "house" | "senate" {
  return type.includes("State Senator") ? "senate" : "house";
}

// ---------------------------------------------------------------------------
// Bucket classification (ORESTAR has limited contributor metadata)
// ---------------------------------------------------------------------------

function classifyOrestarContributor(
  contributor: string,
  amount: number,
  subType: string,
): DonorBucketLabel {
  const upper = contributor.toUpperCase().trim();

  if (upper.startsWith("MISCELLANEOUS CASH CONTRIBUTIONS") ||
      upper.startsWith("MISCELLANEOUS IN-KIND") ||
      upper.startsWith("MISCELLANEOUS ACCOUNTS PAYABLE")) {
    return "Small individual donors (under $200)";
  }

  if (upper.includes("ACTBLUE") || upper.includes("WINRED") || upper.includes("FUNDRAISE.COM")) {
    return "Small individual donors (under $200)";
  }

  // Committee/PAC: has numeric ID in parens, e.g. "(306)"
  if (/\(\d+\)/.test(contributor)) {
    const bucketFromName = mapEmployerToBucket(contributor);
    if (bucketFromName) return bucketFromName;
    const nameUpper = contributor.toUpperCase();
    if (nameUpper.includes("DEMOCRATIC") || nameUpper.includes("REPUBLICAN") ||
        nameUpper.includes("PARTY") || nameUpper.includes("CENTRAL COMMITTEE") ||
        nameUpper.includes("DEMOCRATIC CAUCUS") || nameUpper.includes("REPUBLICAN CAUCUS")) {
      return "Party committees";
    }
    return "Other";
  }

  // Try industry mapping on the name
  const bucketFromName = mapEmployerToBucket(contributor);
  if (bucketFromName && bucketFromName !== "Other" && bucketFromName !== "Self-funded") {
    return bucketFromName;
  }

  // Individual contributor
  return bucketIndividualByAmount(amount);
}

// ---------------------------------------------------------------------------
// Per-committee data collection using Playwright page navigation
// ---------------------------------------------------------------------------

async function getCommitteeId(page: Page, sooRsn: string, csrf: string): Promise<string | null> {
  await page.goto(
    `${ORESTAR_BASE}/sooDetail.do?sooRsn=${sooRsn}&OWASP_CSRFTOKEN=${csrf}`,
    { waitUntil: "load", timeout: 20000 },
  );
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a[href]")) as HTMLAnchorElement[];
    for (const l of links) {
      const m = l.href.match(/filerId=(\d+)/);
      if (m?.[1]) return m[1];
    }
    return null;
  });
}

interface ParsedPage {
  contribs: OrestarContrib[];
  /** true if a row with year < 2023 was seen — safe to stop paginating */
  foundPreCycle: boolean;
  rowCount: number;
}

/** Extract transaction rows from the current page via DOM queries. */
async function extractPageRows(page: Page, validYears: Set<string>): Promise<ParsedPage> {
  return page.evaluate((years: string[]) => {
    const validSet = new Set(years);
    const contribs: Array<{ contributor: string; subType: string; amount: number }> = [];
    let foundPreCycle = false;
    let rowCount = 0;

    // Use document-level querySelectorAll to get each <tr> exactly once
    // (table.querySelectorAll would include nested table rows, causing duplicates)
    {
      const rows = Array.from(document.querySelectorAll("tr"));
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("td")).map((td) =>
          (td.textContent ?? "").replace(/\s+/g, " ").trim(),
        );
        if (cells.length < 7) continue;
        // Data rows: cell[1] is a date MM/DD/YYYY, cell[6] starts with $
        const dateCell = cells[1] ?? "";
        const amountCell = cells[6] ?? "";
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateCell)) continue;
        if (!amountCell.startsWith("$")) continue;
        rowCount++;
        const year = dateCell.split("/")[2] ?? "";
        if (year && parseInt(year, 10) < 2023) {
          foundPreCycle = true;
          continue;
        }
        if (!validSet.has(year)) continue;
        const subType = cells[5] ?? "";
        if (!subType.includes("Contribution")) continue;
        const amount = parseFloat(amountCell.replace(/[$,]/g, ""));
        if (!isFinite(amount) || amount <= 0) continue;
        const contributor = cells[4] ?? "";
        contribs.push({ contributor, subType, amount });
      }
    } // end block (single querySelectorAll pass)
    return { contribs, foundPreCycle, rowCount };
  }, [...validYears]);
}

async function getCommitteeContribs(
  page: Page,
  committeeId: string,
  csrf: string,
): Promise<OrestarContrib[]> {
  const allContribs: OrestarContrib[] = [];
  let pageIdx = 0;
  let keepGoing = true;
  let firstPageRowCount = 0;
  let totalRecords = 0;

  while (keepGoing) {
    const url =
      pageIdx === 0
        ? `${ORESTAR_BASE}/cneSearch.do?cneSearchButtonName=search&cneSearchFilerCommitteeId=${committeeId}&OWASP_CSRFTOKEN=${csrf}`
        : `${ORESTAR_BASE}/gotoPublicTransactionSearchResults.do?cneSearchButtonName=next&cneSearchFilerCommitteeId=${committeeId}&cneSearchContributorTxtSearchType=C&cneSearchFilerCommitteeTxtSearchType=C&cneSearchPageIdx=${pageIdx}&OWASP_CSRFTOKEN=${csrf}`;

    await page.goto(url, { waitUntil: "load", timeout: 20000 });

    const { contribs: contribsOnPage, foundPreCycle, rowCount } = await extractPageRows(
      page,
      VALID_YEARS,
    );
    allContribs.push(...contribsOnPage);

    // Stop immediately once we see a pre-2023 row (ORESTAR is newest-first)
    if (foundPreCycle) {
      keepGoing = false;
    } else if (pageIdx === 0) {
      // Extract total record count from page text
      const totalText = await page.evaluate(() => {
        const tds = Array.from(document.querySelectorAll("td"));
        for (const td of tds) {
          const m = td.textContent?.match(/(\d+) records found/);
          if (m?.[1]) return m[1];
        }
        return "0";
      });
      totalRecords = parseInt(totalText ?? "0", 10);
      firstPageRowCount = rowCount;
      if (firstPageRowCount >= totalRecords || totalRecords === 0) keepGoing = false;
    } else {
      if (rowCount === 0) keepGoing = false;
      if (firstPageRowCount > 0) {
        const fetched = pageIdx * firstPageRowCount + rowCount;
        if (fetched >= totalRecords) keepGoing = false;
      }
    }

    pageIdx++;
    if (pageIdx > 100) {
      console.warn(`[or-orestar] committeeId=${committeeId} reached page limit`);
      keepGoing = false;
    }
  }

  return allContribs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  console.log("[or-orestar] establishing ORESTAR session...");
  // Visit home page first to satisfy WAF JS challenge
  await page.goto(`${ORESTAR_BASE}/`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(1500);

  await page.goto(
    `${ORESTAR_BASE}/gotoPublicTransactionSearch.do`,
    { waitUntil: "load", timeout: 30000 },
  );
  await page.waitForTimeout(1000);

  // Extract CSRF token from any navigation link
  const csrf = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a[href]")) as HTMLAnchorElement[];
    for (const l of links) {
      const m = l.href.match(/OWASP_CSRFTOKEN=([A-Z0-9-]+)/);
      if (m?.[1]) return m[1];
    }
    return null;
  });

  if (!csrf) {
    console.error("[or-orestar] could not extract CSRF token — aborting");
    await browser.close();
    process.exitCode = 1;
    return;
  }

  console.log(`[or-orestar] CSRF: ${csrf.substring(0, 8)}... collecting ${OR_2024_COMMITTEES.length} committees`);

  const results: CommitteeResult[] = [];

  for (let i = 0; i < OR_2024_COMMITTEES.length; i++) {
    const committee = OR_2024_COMMITTEES[i]!;
    const { lastName, firstInitial } = parseCandidateFromRaw(committee.raw);
    const chamber = chamberFromType(committee.type);

    process.stdout.write(`[or-orestar] [${i + 1}/${OR_2024_COMMITTEES.length}] ${committee.raw.split(",")[0]}... `);

    try {
      const committeeId = await getCommitteeId(page, committee.sooRsn, csrf);
      if (!committeeId) {
        console.log("no committeeId");
        continue;
      }

      const contribs = await getCommitteeContribs(page, committeeId, csrf);
      const count2024 = contribs.length;
      console.log(`${count2024} contributions`);

      results.push({ sooRsn: committee.sooRsn, lastName, firstInitial, chamber, contribs });
    } catch (e) {
      console.log(`error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await browser.close();

  // Load DB candidates for OR
  const db = requireDb();

  const orHouse = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-OR-house'`)) as DbCandidate[];
  const orSenate = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-OR-senate'`)) as DbCandidate[];

  console.log(`[or-orestar] DB: house=${orHouse.length} senate=${orSenate.length}`);

  const houseIdx = new Map<string, DbCandidate[]>();
  const senateIdx = new Map<string, DbCandidate[]>();

  for (const c of orHouse) {
    const last = extractLastName(c.fullName);
    if (!last) continue;
    const arr = houseIdx.get(last) ?? [];
    arr.push(c);
    houseIdx.set(last, arr);
  }
  for (const c of orSenate) {
    const last = extractLastName(c.fullName);
    if (!last) continue;
    const arr = senateIdx.get(last) ?? [];
    arr.push(c);
    senateIdx.set(last, arr);
  }

  // Aggregate
  const agg = new Map<string, number>();
  let totalContribs = 0;
  let totalSkipped = 0;

  for (const result of results) {
    const { lastName, firstInitial, chamber, contribs } = result;
    const idx = chamber === "house" ? houseIdx : senateIdx;
    const dbCandidates = idx.get(lastName);
    if (!dbCandidates || dbCandidates.length === 0) {
      totalSkipped += contribs.length;
      continue;
    }

    let dbMatch: DbCandidate;
    if (dbCandidates.length === 1) {
      dbMatch = dbCandidates[0]!;
    } else {
      dbMatch =
        dbCandidates.find((c) => extractFirstInitial(c.fullName) === firstInitial) ??
        dbCandidates[0]!;
    }

    for (const contrib of contribs) {
      const bucket = classifyOrestarContributor(contrib.contributor, contrib.amount, contrib.subType);
      const aggKey = `${dbMatch.id}|${ELECTION_CYCLE}|${bucket}`;
      agg.set(aggKey, (agg.get(aggKey) ?? 0) + contrib.amount);
      totalContribs++;
    }
  }

  const matchedCandidates = new Set(
    [...agg.keys()].map((k) => k.substring(0, k.indexOf("|"))),
  );

  console.log(
    `[or-orestar] contribs_processed=${totalContribs} skipped=${totalSkipped} ` +
      `candidates_matched=${matchedCandidates.size} rows_to_upsert=${agg.size}`,
  );

  if (isDryRun) {
    const sample = [...agg.entries()].slice(0, 5);
    for (const [key, amt] of sample) {
      const [cid, , bucket] = key.split("|");
      console.log(`[or-orestar] [dry-run] candidate=${cid} bucket=${bucket} amount=${amt.toFixed(2)}`);
    }
    return;
  }

  let upserted = 0;
  for (const [aggKey, amount] of agg) {
    const firstPipe = aggKey.indexOf("|");
    const secondPipe = aggKey.indexOf("|", firstPipe + 1);
    const candidateId = aggKey.substring(0, firstPipe);
    const cycle = aggKey.substring(firstPipe + 1, secondPipe);
    const bucketLabel = aggKey.substring(secondPipe + 1) as DonorBucketLabel;

    await db
      .insert(donorAggregates)
      .values({
        candidateId,
        electionCycle: cycle,
        bucketLabel,
        amountTotal: amount.toFixed(2),
        source: SOURCE,
        sourceUrl: SOURCE_URL,
        rawMetadata: {},
        insertedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          donorAggregates.candidateId,
          donorAggregates.electionCycle,
          donorAggregates.bucketLabel,
        ],
        set: {
          amountTotal: sql`excluded.amount_total`,
          source: sql`excluded.source`,
          sourceUrl: sql`excluded.source_url`,
          rawMetadata: sql`excluded.raw_metadata`,
          insertedAt: sql`excluded.inserted_at`,
        },
      });
    upserted++;
  }

  console.log(`[or-orestar] done upserted=${upserted}`);
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[or-orestar] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}
