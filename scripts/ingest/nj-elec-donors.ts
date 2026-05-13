/**
 * New Jersey ELEC campaign finance data ingest.
 *
 * Downloads bulk contribution CSV from njelecefilesearch.com for NJ state
 * legislature candidates, filters for the 2023 election cycle, and upserts
 * donor_aggregates rows.
 *
 * Coverage: PAC, business/corp, union, party, and committee-to-committee
 * contributions. Individual contributions are not included in the ELEC bulk
 * download endpoint; they are fetched separately if needed.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/nj-elec-donors.ts [--dry-run]
 */

import { requireDb } from "../../db/client";
import { candidates, donorAggregates } from "../../db/schema";
import { sql } from "drizzle-orm";
import { mapEmployerToBucket, bucketIndividualByAmount, type DonorBucketLabel } from "./_bucket-mapping";

const SOURCE = "nj_elec_bulk";
const SOURCE_URL = "https://www.njelecefilesearch.com/SearchContributionToEntity";
const ELECTION_CYCLE = "2023";

const DRY_RUN = process.argv.includes("--dry-run");

const ELEC_API = "https://www.njelecefilesearch.com/api/VWContributionDetail/DownlodDataCSV";

// Nickname → legal name first-letter
const NICKNAME_FIRST_LETTERS: Record<string, string[]> = {
  "BILL": ["W"],   // William
  "BOB": ["R"],    // Robert
  "TONY": ["A"],   // Anthony
  "JIM": ["J"],    // James
  "JOE": ["J"],    // Joseph
  "MIKE": ["M"],   // Michael
  "CHRIS": ["C", "P"],  // Christopher or Peter
  "JAY": ["J"],    // Jay
  "NICK": ["N"],   // Nicholas
  "DICK": ["R"],   // Richard
  "HERB": ["H"],   // Herbert
  "ROB": ["R"],    // Robert
  "CRAIG": ["C"],
  "WILL": ["W"],   // William
  "LOU": ["L"],    // Louis
  "SEAN": ["S"],
  "VIN": ["V"],
  "PARKER": ["F", "P"], // F Parker Space
  "DECLAN": ["D"],
  "GREG": ["G"],
  "GABE": ["G"],
  "GARNET": ["G"],
  "TERESA": ["M", "T"], // M Teresa Ruiz
};

function norm(s: string): string {
  return s.toUpperCase()
    .replace(/['']/g, "")
    .replace(/[-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract candidate last name from DB fullName
function dbLastName(fullName: string): string {
  const parts = norm(fullName).split(" ").filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  // Handle compound last names: "Pintor Marin" → last 2 words; "McCann Stamato" → last 2 words
  // Heuristic: if last word is a known suffix, use last 2 words; otherwise just last word
  // Simple approach: return last word
  return parts[parts.length - 1];
}

function dbFirstLetter(fullName: string): string {
  const first = fullName.split(" ")[0] ?? "";
  return norm(first)[0] ?? "";
}

// Parse "LASTNAME, FIRSTNAME..." from entity name
function parseEntityName(entity: string): { last: string; firstLetter: string } | null {
  const commaIdx = entity.indexOf(",");
  if (commaIdx < 0) return null;
  const rawLast = entity.substring(0, commaIdx).trim();
  const afterComma = entity.substring(commaIdx + 1).trim();
  // Take first token after comma as "first name" (may be initial like "M TERESA")
  const firstTokens = afterComma.split(/\s+/).filter(Boolean);
  // Use first non-initial token as first name if first token is single letter
  let firstToken = firstTokens[0] ?? "";
  if (firstToken.length === 1 && firstTokens.length > 1) {
    firstToken = firstTokens[1];
  }
  return { last: norm(rawLast), firstLetter: norm(firstToken)[0] ?? "" };
}

// Build matcher: entity name → DB candidate fullName
function buildMatcher(dbCandidates: Array<{ id: string; fullName: string; jurisdiction: string }>) {
  // Index by last name
  const byLast = new Map<string, Array<{ id: string; fullName: string; firstLetter: string; first: string }>>();

  for (const c of dbCandidates) {
    const last = dbLastName(c.fullName);
    const firstLetter = dbFirstLetter(c.fullName);
    const first = norm(c.fullName.split(" ")[0] ?? "");
    if (!byLast.has(last)) byLast.set(last, []);
    byLast.get(last)!.push({ id: c.id, fullName: c.fullName, firstLetter, first });
  }

  // Also index compound last names ("PINTOR MARIN" → Eliana Pintor Marin)
  // and "MCCANN STAMATO" → Barbara McCann Stamato
  const extraMap = new Map<string, string>(); // normalized compound last → fullName
  for (const c of dbCandidates) {
    const parts = norm(c.fullName).split(" ").filter(Boolean);
    if (parts.length >= 3) {
      // Try last 2 words as compound last name
      const compoundLast = parts.slice(-2).join(" ");
      extraMap.set(compoundLast, c.fullName);
      // Try last 3 words
      if (parts.length >= 4) {
        const compoundLast3 = parts.slice(-3).join(" ");
        extraMap.set(compoundLast3, c.fullName);
      }
    }
  }

  return function match(entityName: string): string | null {
    // Try "LASTNAME, FIRST..." format
    const parsed = parseEntityName(entityName);
    if (!parsed) return null;

    const { last, firstLetter } = parsed;

    // Try compound last name match first (e.g., "PINTOR MARIN, ELIANA")
    if (extraMap.has(last)) {
      const candidate = extraMap.get(last)!;
      // Verify first letter
      const dbFirst = norm(candidate.split(" ")[0] ?? "")[0] ?? "";
      const dbNickLetters = NICKNAME_FIRST_LETTERS[norm(candidate.split(" ")[0] ?? "")] ?? [];
      if (!firstLetter || firstLetter === dbFirst || dbNickLetters.includes(firstLetter)) {
        return candidate;
      }
    }

    // Try simple last name match
    const candidates = byLast.get(last);
    if (!candidates || candidates.length === 0) return null;

    if (candidates.length === 1) {
      const { fullName, firstLetter: dbFirstLetter, first: dbFirst } = candidates[0];
      // Get accepted first letters for this candidate (nickname mapping)
      const nickLetters = NICKNAME_FIRST_LETTERS[dbFirst] ?? [];
      const allAccepted = [dbFirstLetter, ...nickLetters];
      if (!firstLetter || allAccepted.includes(firstLetter)) {
        return fullName;
      }
      return null;
    }

    // Multiple candidates with same last name — require first letter match
    for (const { fullName, firstLetter: dbFirstLetter, first: dbFirst } of candidates) {
      const nickLetters = NICKNAME_FIRST_LETTERS[dbFirst] ?? [];
      const allAccepted = [dbFirstLetter, ...nickLetters];
      if (firstLetter && allAccepted.includes(firstLetter)) {
        return fullName;
      }
    }
    return null;
  };
}

// Map NJ ELEC contributor type to donor bucket
function classifyContributorType(
  contributorType: string,
  empName: string,
  occupationName: string,
  amount: number
): DonorBucketLabel | null {
  const ct = contributorType.toUpperCase().trim();

  if (ct === "INDIVIDUAL") {
    return bucketIndividualByAmount(amount);
  }
  if (ct === "NOT PROVIDED") {
    // Use amount to guess
    return bucketIndividualByAmount(amount);
  }
  if (ct === "POLITICAL PARTY CMTE" || ct === "LEGISLATIVE LEADERSHIP CMTE") {
    return "Party committees";
  }
  if (ct === "UNION PAC" || ct === "UNION") {
    // Check for public safety
    const emp = (empName + " " + occupationName).toUpperCase();
    if (/POLICE|FIRE|SHERIFF|FOP|FIREFIGHTER/i.test(emp)) {
      return "Public safety unions";
    }
    if (/TEACHER|NEA|AFT|EDUCATION/i.test(emp)) {
      return "Education employees";
    }
    return "Trade unions (non-public-safety)";
  }
  if (ct === "CANDIDATE COMMITTEE" || ct === "POLITICAL CMTE") {
    return "Other";
  }
  if (ct === "BUSINESS/CORP" || ct === "BUSINESS/ CORP ASSOC/ PAC" || ct === "TRADE ASSOCIATION PAC" || ct === "PROFESSIONAL PAC" || ct === "REGULATED INDUSTRIES PAC") {
    // Try industry matching
    const industryStr = (empName + " " + occupationName).trim();
    const bucket = industryStr ? mapEmployerToBucket(industryStr) : null;
    return bucket ?? "Other";
  }
  if (ct === "IDEOLOGICAL ASSOC/ PAC" || ct === "INTEREST") {
    return "Other";
  }
  if (ct === "MISC/ OTHER" || ct === "POLITICAL CLUB") {
    return "Other";
  }
  return "Other";
}

async function downloadCsv(officeCodes: string): Promise<string> {
  const body = {
    ENTITY_S: "", NONPACOnly: "false",
    FirstName: "", LastName: "", NonIndName: "",
    OfficeCodes: officeCodes, PartyCodes: "", LocationCodes: "",
    ElectionTypeCodes: "", ElectionYears: "",
    ContributorFirstName: "", ContributorLastName: "",
    ContributorMI: "", ContributorSuffix: "", ContributorNonIndName: "",
    ContributorTypeCodes: "", EMP_NAME: "", OccupationCodes: "",
    DateFrom: "", DateTo: "", AmountFrom: "", AmountTo: "",
  };

  const resp = await fetch(ELEC_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`ELEC API returned ${resp.status}`);

  const blobUrl = (await resp.json()) as string;
  console.log(`[nj-elec] downloading CSV from blob storage for OfficeCodes=${officeCodes}`);

  const csvResp = await fetch(blobUrl);
  if (!csvResp.ok) throw new Error(`Blob download returned ${csvResp.status}`);
  return csvResp.text();
}

// Minimal CSV parser that handles quoted fields
function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { fields.push(field); field = ""; }
      else field += ch;
    }
  }
  fields.push(field);
  return fields;
}

interface CsvRow {
  IsIndividual: string;
  FirstName: string;
  LastName: string;
  NonIndName: string;
  OccupationName: string;
  EmpName: string;
  ContributorType: string;
  ContributionType: string;
  ContributionDate: string;
  ContributionAmount: string;
  EntityName: string;
  Location: string;
  ElectionYear: string;
}

async function main() {
  const db = requireDb();

  console.log(`[nj-elec] starting dryRun=${DRY_RUN}`);

  // Fetch NJ candidates from DB
  const dbCandidates = await db
    .select({ id: candidates.id, fullName: candidates.fullName, jurisdiction: candidates.jurisdiction })
    .from(candidates)
    .where(sql`jurisdiction LIKE 'state-NJ-%'`);

  console.log(`[nj-elec] db_candidates=${dbCandidates.length}`);

  const match = buildMatcher(dbCandidates);

  // Build candidate lookup by fullName
  const candByName = new Map(dbCandidates.map(c => [c.fullName, c.id]));

  // Download both Senate (1) and Assembly (2) CSVs
  // Note: the download endpoint ignores office filter but we filter by year ourselves
  const csvSenate = await downloadCsv("1");

  type BucketKey = string; // `${candidateId}::${bucket}`
  const aggregates = new Map<BucketKey, number>();
  const candidateMatched = new Set<string>();
  let rowsScanned = 0;
  let rowsMatched = 0;
  let rowsSkipped = 0;

  function processRows(csvText: string, label: string) {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { console.log(`[nj-elec] ${label} empty`); return; }
    const headers = parseCsvRow(lines[0]);
    const rows: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCsvRow(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] ?? ""; });
      rows.push(row as unknown as CsvRow);
    }
    console.log(`[nj-elec] ${label} total_rows=${rows.length}`);

    for (const row of rows) {
      rowsScanned++;
      if (row.ElectionYear !== ELECTION_CYCLE) continue;
      if (row.ContributionType === "IN-KIND") continue; // skip in-kind

      const amount = parseFloat(row.ContributionAmount) || 0;
      if (amount <= 0) continue;

      const entityName = row.EntityName?.trim();
      if (!entityName) continue;

      const fullName = match(entityName);
      if (!fullName) { rowsSkipped++; continue; }

      const candidateId = candByName.get(fullName);
      if (!candidateId) { rowsSkipped++; continue; }

      const bucket = classifyContributorType(
        row.ContributorType,
        row.EmpName,
        row.OccupationName,
        amount
      );
      if (!bucket) { rowsSkipped++; continue; }

      const key: BucketKey = `${candidateId}::${bucket}`;
      aggregates.set(key, (aggregates.get(key) ?? 0) + amount);
      candidateMatched.add(fullName);
      rowsMatched++;
    }
  }

  processRows(csvSenate, "senate_csv");

  console.log(`[nj-elec] rows_scanned=${rowsScanned} rows_matched=${rowsMatched} rows_skipped=${rowsSkipped}`);
  console.log(`[nj-elec] candidates_matched=${candidateMatched.size}`);

  // Build upsert rows
  const upsertRows = Array.from(aggregates.entries()).map(([key, total]) => {
    const [candidateId, bucket] = key.split("::");
    return {
      candidateId,
      electionCycle: ELECTION_CYCLE,
      bucketLabel: bucket as DonorBucketLabel,
      amountTotal: total,
      source: SOURCE,
      sourceUrl: SOURCE_URL,
    };
  });

  console.log(`[nj-elec] rows_to_upsert=${upsertRows.length}`);

  if (DRY_RUN || upsertRows.length === 0) {
    console.log(`[nj-elec] dry_run — skipping upsert`);
    upsertRows.slice(0, 10).forEach(r => {
      const name = dbCandidates.find(c => c.id === r.candidateId)?.fullName ?? r.candidateId;
      console.log(`  ${name} | ${r.bucketLabel} | $${r.amountTotal.toFixed(2)}`);
    });
    return;
  }

  let upserted = 0;
  for (const row of upsertRows) {
    await db
      .insert(donorAggregates)
      .values({
        candidateId: row.candidateId,
        electionCycle: row.electionCycle,
        bucketLabel: row.bucketLabel,
        amountTotal: row.amountTotal.toFixed(2),
        source: row.source,
        sourceUrl: row.sourceUrl,
        insertedAt: new Date(),
      })
      .onConflictDoUpdate({
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

  console.log(`[nj-elec] complete candidates_matched=${candidateMatched.size} rows_upserted=${upserted} dry_run=${DRY_RUN}`);
}

main().catch(err => { console.error(err); process.exit(1); });
