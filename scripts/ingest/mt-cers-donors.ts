/**
 * Montana CERS campaign finance data ingest.
 *
 * Fetches contribution CSVs from MT CERS public search for all MT DB candidates.
 * No login required — CERS public search is unauthenticated. The script
 * bootstraps its own session by GETting the public search page first.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/mt-cers-donors.ts
 *
 * Optional: CERS_SESSION_COOKIE="<cookie>" overrides the auto-bootstrapped session.
 */

import { requireDb } from "../../db/client";
import { candidates, donorAggregates } from "../../db/schema";
import { sql } from "drizzle-orm";
import { mapEmployerToBucket, bucketIndividualByAmount, type DonorBucketLabel } from "./_bucket-mapping";

const CERS_BASE = "https://cers-ext.mt.gov/CampaignTracker";
const SOURCE = "mt_cers_bulk";
const SOURCE_URL = "https://cers-ext.mt.gov/CampaignTracker/public/search";
const ELECTION_CYCLE = "2024";

// Session cookie — auto-bootstrapped from the public search page if not supplied.
let initialCookie = process.env.CERS_SESSION_COOKIE ?? "";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Cookie jar — starts with browser cookies, JSESSIONID added after first POST
let cookieJar = initialCookie;

function getHeaders(extra?: Record<string, string>) {
  return { "Cookie": cookieJar, "User-Agent": UA, "Accept": "application/json, text/html, */*", "Referer": CERS_BASE + "/public/searchResults/searchFinancials", ...extra };
}

function captureSetCookies(resp: Response) {
  // Merge JSESSIONID from Set-Cookie into cookieJar
  const setCookie = resp.headers.get("set-cookie");
  if (setCookie) {
    const match = setCookie.match(/JSESSIONID=([^;]+)/i);
    if (match && !cookieJar.includes("JSESSIONID")) {
      cookieJar = cookieJar + "; JSESSIONID=" + match[1];
    }
  }
}

async function bootstrapSession(): Promise<string> {
  const resp = await fetch(CERS_BASE + "/public/search", {
    headers: { "User-Agent": UA, "Accept": "text/html,*/*" },
  });
  // Node 22: getSetCookie() returns all Set-Cookie headers as an array.
  const all: string[] = (resp.headers as any).getSetCookie?.() ??
    (resp.headers.get("set-cookie") ? [resp.headers.get("set-cookie")!] : []);
  if (all.length === 0) throw new Error("[mt-cers] No session cookies from public search page");
  return all.map((c: string) => c.split(";")[0]).filter(Boolean).join("; ");
}

async function ceresPost(path: string, body: string): Promise<Response> {
  const resp = await fetch(CERS_BASE + path, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/x-www-form-urlencoded" }),
    body,
  });
  captureSetCookies(resp);
  return resp;
}

function classifyRow(lineItem: string, employer: string, contributorName: string, amount: number): DonorBucketLabel | null {
  const li = lineItem.trim();
  if (li === "All Other Expenditures") return null;
  if (li === "Political Party Committee Contributions") return "Party committees";
  if (li === "Individual Contributions") {
    const fromEmp = mapEmployerToBucket(employer);
    if (fromEmp && fromEmp !== "Self-funded" && fromEmp !== "Other") return fromEmp;
    if (fromEmp === "Self-funded") return "Self-funded";
    return bucketIndividualByAmount(amount);
  }
  if (li === "Other Political Committee Contributions" || li === "Federal PAC") {
    const fromName = mapEmployerToBucket(contributorName);
    if (fromName && fromName !== "Self-funded" && fromName !== "Other") return fromName;
    return "Other";
  }
  return "Other";
}

// Nicknames that appear in DB but not CERS
const NICKNAME_MAP: Record<string, string> = {
  "CHIP": "SIDNEY", // Chip Fitzpatrick = Sidney Fitzpatrick
  "SJ": "SJ",
};

function norm(s: string): string {
  return s.toUpperCase().replace(/[^A-Z ]/g, "").replace(/\s+/g, " ").trim();
}

// DB: "Tyson Running Wolf" → last name = "RUNNING WOLF" (all after first word)
function extractLastName(fullName: string): string {
  const parts = norm(fullName).split(" ").filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  return parts.slice(1).join(" "); // everything after first name
}

function extractFirstName(fullName: string): string {
  const parts = norm(fullName).split(" ").filter(Boolean);
  const raw = parts[0] ?? "";
  return NICKNAME_MAP[raw] ?? raw;
}

// CERS: "Running Wolf, Tyson T" → last name = "RUNNING WOLF" (everything before comma)
function ceresLastName(n: string): string {
  const comma = n.indexOf(",");
  if (comma >= 0) return norm(n.substring(0, comma));
  return norm(n).split(" ")[0] ?? "";
}

function ceresFirstName(n: string): string {
  const after = n.indexOf(",");
  if (after >= 0) {
    const rest = norm(n.substring(after + 1));
    return rest.split(" ").filter(Boolean)[0] ?? "";
  }
  return "";
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const db = requireDb();

  // 0. Bootstrap session if no cookie supplied via env
  if (!initialCookie) {
    console.log("[mt-cers] No CERS_SESSION_COOKIE — bootstrapping from public search page");
    initialCookie = await bootstrapSession();
    cookieJar = initialCookie;
    console.log("[mt-cers] Session bootstrapped");
  }

  // 1. Load MT DB candidates
  const dbCands = await db.select({
    id: candidates.id,
    fullName: candidates.fullName,
    jurisdiction: candidates.jurisdiction,
  }).from(candidates).where(sql`${candidates.jurisdiction} LIKE 'state-MT-%'`);
  console.log(`[mt-cers] DB candidates: ${dbCands.length}`);

  // 2. Establish CERS session + get all 2024 state-district candidates
  const searchBody = "financialSearchType=CANDIDATE&contrSearchTypeCode=CANDIDATE&contrCanLastName=&contrCanFirstName=&contrCommitteeName=&contributorLastName=&contributorFirstName=&contrPartyCode=&contrCandidateTypeCode=SD&contrOfficeCode=&contrContributorTypeCode=&contrAmountRangeCode=&electionYear=2024&contrSearchFromDate=&contrSearchToDate=";
  const searchResp = await ceresPost("/public/searchResults/searchFinancials", searchBody);
  if (!searchResp.ok) { console.error("[mt-cers] searchFinancials failed:", searchResp.status); process.exit(1); }

  const dataUrl = CERS_BASE + "/public/searchResults/listFinancialCandidateResults?sEcho=10&iColumns=5&iDisplayStart=0&iDisplayLength=600&mDataProp_0=checked&mDataProp_1=candidateName&mDataProp_2=electionYear&mDataProp_3=officeTitle&mDataProp_4=partyDescr&sSearch=&iSortCol_0=1&sSortDir_0=asc&iSortingCols=1";
  const dataResp = await fetch(dataUrl, { headers: getHeaders() });
  const ceresData = await dataResp.json() as { iTotalRecords: number; aaData: any[] };
  console.log(`[mt-cers] CERS candidates: ${ceresData.iTotalRecords} (returned ${ceresData.aaData.length})`);

  // 3. Build CERS index: lastName|chamber → [{id, name, fn}]
  const ceresIdx = new Map<string, Array<{id: number; name: string; fn: string}>>();
  for (const c of ceresData.aaData) {
    const office: string = c.officeTitle || "";
    const chamber = office.includes("House District") ? "house" : office.includes("Senate District") ? "senate" : null;
    if (!chamber) continue;
    const ln = ceresLastName(c.candidateName);
    if (!ln) continue;
    const key = ln + "|" + chamber;
    const arr = ceresIdx.get(key) ?? [];
    arr.push({ id: c.candidateId, name: c.candidateName.trim(), fn: ceresFirstName(c.candidateName) });
    ceresIdx.set(key, arr);
  }

  // 4. Match DB candidates to CERS
  type Match = { dbId: string; ceresId: number; dbName: string; cycle: string };
  const matches: Match[] = [];
  const unmatched2024: typeof dbCands = [];
  for (const db of dbCands) {
    const chamber = db.jurisdiction.includes("-house") ? "house" : "senate";
    const ln = extractLastName(db.fullName);
    const fn = extractFirstName(db.fullName);
    const key = ln + "|" + chamber;
    const opts = ceresIdx.get(key) ?? [];
    if (opts.length === 0) { unmatched2024.push(db); continue; }
    if (opts.length === 1) { matches.push({ dbId: db.id, ceresId: opts[0].id, dbName: db.fullName, cycle: ELECTION_CYCLE }); continue; }
    const fnMatch = opts.find(c => c.fn.startsWith(fn.substring(0, 3)));
    if (fnMatch) { matches.push({ dbId: db.id, ceresId: fnMatch.id, dbName: db.fullName, cycle: ELECTION_CYCLE }); }
    else { unmatched2024.push(db); }
  }

  // Fallback: try 2022 for senators unmatched in 2024 (staggered terms — half run in 2022)
  const noMatch: string[] = [];
  if (unmatched2024.length > 0) {
    const unmatched2024Senate = unmatched2024.filter(d => d.jurisdiction.includes("-senate"));
    console.log(`[mt-cers] Trying 2022 fallback for ${unmatched2024Senate.length} senate candidates`);
    const searchBody22 = searchBody.replace("electionYear=2024", "electionYear=2022");
    await ceresPost("/public/searchResults/searchFinancials", searchBody22);
    const data22Resp = await fetch(dataUrl.replace("sEcho=10", "sEcho=11"), { headers: getHeaders() });
    const data22 = await data22Resp.json() as { aaData: any[] };
    const ceresIdx22 = new Map<string, Array<{id: number; name: string; fn: string}>>();
    for (const c of data22.aaData) {
      const office: string = c.officeTitle || "";
      const chamber = office.includes("House District") ? "house" : office.includes("Senate District") ? "senate" : null;
      if (!chamber) continue;
      const ln = ceresLastName(c.candidateName);
      if (!ln) continue;
      const key = ln + "|" + chamber;
      const arr = ceresIdx22.get(key) ?? [];
      arr.push({ id: c.candidateId, name: c.candidateName.trim(), fn: ceresFirstName(c.candidateName) });
      ceresIdx22.set(key, arr);
    }
    // Re-establish 2024 session for downloads
    await ceresPost("/public/searchResults/searchFinancials", searchBody);

    for (const db of unmatched2024) {
      const chamber = db.jurisdiction.includes("-house") ? "house" : "senate";
      const ln = extractLastName(db.fullName);
      const fn = extractFirstName(db.fullName);
      const key = ln + "|" + chamber;
      const opts = (chamber === "senate" ? ceresIdx22 : ceresIdx).get(key) ?? [];
      if (opts.length === 0) { noMatch.push(db.fullName); continue; }
      if (opts.length === 1) { matches.push({ dbId: db.id, ceresId: opts[0].id, dbName: db.fullName, cycle: chamber === "senate" ? "2022" : ELECTION_CYCLE }); continue; }
      const fnMatch = opts.find(c => c.fn.startsWith(fn.substring(0, 3)));
      if (fnMatch) { matches.push({ dbId: db.id, ceresId: fnMatch.id, dbName: db.fullName, cycle: chamber === "senate" ? "2022" : ELECTION_CYCLE }); }
      else { noMatch.push(`${db.fullName} (ambiguous)`); }
    }
  }
  console.log(`[mt-cers] matched=${matches.length} unmatched=${noMatch.length}`);
  if (noMatch.length) console.log("[mt-cers] unmatched:", noMatch.join("; "));

  // 5. For each match: download CSV, parse, aggregate
  type BucketRow = { candidateId: string; electionCycle: string; bucketLabel: DonorBucketLabel; amountTotal: number };
  const upsertRows: BucketRow[] = [];
  let downloadOk = 0, downloadErr = 0;

  for (const m of matches) {
    try {
      const prepResp = await ceresPost("/public/searchResults/prepareDownloadFile", `candidateId=${m.ceresId}&committeeId=0`);
      const prepData = await prepResp.json() as { fileName?: string; errorMsg?: string };
      if (!prepData.fileName) { downloadErr++; continue; }

      const csvUrl = CERS_BASE + "/public/searchResults/downloadFile?fileName=" + encodeURIComponent(prepData.fileName);
      const csvResp = await fetch(csvUrl, { headers: getHeaders() });
      const csv = await csvResp.text();

      const lines = csv.split("\n").filter(l => l.trim());
      const bucketTotals = new Map<DonorBucketLabel, number>();

      for (let i = 1; i < lines.length; i++) {
        const fields = lines[i].split("|");
        // Headers: CandidateID|CandidateName|CandidateAddress|CandidateZip|ReportingDateRange|Name|Address|City/State/Zip|Occupation|Employer|DatePaid|Purpose|Description|LineItem|Amount|ElectionType|AmountSubtype|OfficeTitle
        const contribName = fields[5] ?? "";
        const employer = fields[9] ?? "";
        const lineItem = fields[13] ?? "";
        const purpose = fields[11] ?? "";
        const amountStr = fields[14] ?? "0";
        const amount = parseFloat(amountStr) || 0;
        if (amount <= 0) continue;
        if (/refund|return/i.test(purpose)) continue;
        const bucket = classifyRow(lineItem, employer, contribName, amount);
        if (!bucket) continue;
        bucketTotals.set(bucket, (bucketTotals.get(bucket) ?? 0) + amount);
      }

      for (const [bucket, total] of bucketTotals) {
        upsertRows.push({ candidateId: m.dbId, electionCycle: m.cycle, bucketLabel: bucket, amountTotal: total });
      }
      downloadOk++;
    } catch (e: any) {
      console.warn(`[mt-cers] error for ${m.dbName}: ${e.message}`);
      downloadErr++;
    }
    // Small delay to avoid hammering the server
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`[mt-cers] downloads ok=${downloadOk} err=${downloadErr} upsert_rows=${upsertRows.length}`);
  if (isDryRun) {
    upsertRows.slice(0, 10).forEach(r => console.log(`  ${r.candidateId} | ${r.bucketLabel} | ${r.amountTotal.toFixed(2)}`));
    return;
  }

  // 6. Upsert to DB
  let upserted = 0;
  for (const row of upsertRows) {
    await db.insert(donorAggregates).values({
      candidateId: row.candidateId,
      electionCycle: row.electionCycle,
      bucketLabel: row.bucketLabel,
      amountTotal: row.amountTotal.toFixed(2),
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      rawMetadata: {},
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
  console.log(`[mt-cers] done upserted=${upserted}`);
}

main().catch(e => { console.error("[mt-cers] fatal:", e.message); process.exitCode = 1; });
