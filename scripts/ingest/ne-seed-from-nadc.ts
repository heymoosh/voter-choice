/**
 * scripts/ingest/ne-seed-from-nadc.ts
 *
 * Seeds NE candidates directly from the NADC contribution CSV
 * (which is already cached at /tmp/NE_2024_contributions.zip from a prior run
 * of ne-nadc-donors.ts, or can be auto-downloaded).
 *
 * Nebraska has a unicameral legislature (49 senators). All candidates in the
 * NADC file under Filer Type = "Candidate Committee" are treated as state-NE-senate
 * unless the committee name strongly implies a house district (NE has no house).
 *
 * Candidate IDs use a deterministic hash of the lowercase normalized name so they
 * are stable across re-runs and consistent with the ne-nadc-donors.ts matcher.
 *
 * Run BEFORE ne-nadc-donors.ts so candidates exist for donor matching.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ne-seed-from-nadc.ts
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ne-seed-from-nadc.ts --dry-run
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ne-seed-from-nadc.ts --local-file /path/to/file.zip
 */

import * as fs from "node:fs";
import * as readline from "node:readline";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { candidates, candidateOffices } from "../../db/schema";

const NE_BULK_URL =
  "https://nadc-e.nebraska.gov/PublicSite/Docs/BulkDataDownloads/2024_ContributionLoanExtract.csv.zip";
const DEFAULT_CSV_PATH = "/tmp/NE_2024_contributions.zip";
// Nebraska is unicameral — all state legislative candidates are senators
const JURISDICTION_DB = "state-NE-senate";
const OFFICE_LABEL = "NE Senate";

// ---------------------------------------------------------------------------
// CSV helpers (same as ne-nadc-donors.ts)
// ---------------------------------------------------------------------------

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { fields.push(current); current = ""; }
      else { current += ch; }
    }
  }
  fields.push(current);
  return fields;
}

async function streamZipCsv(
  zipPath: string,
  onRow: (row: Record<string, string>) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("unzip", ["-p", zipPath], { stdio: ["ignore", "pipe", "pipe"] });
    const rl = readline.createInterface({ input: proc.stdout, crlfDelay: Infinity });
    let headers: string[] | null = null;
    let errOutput = "";
    proc.stderr.on("data", (chunk: Buffer) => { errOutput += chunk.toString(); });
    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const fields = parseCsvLine(trimmed);
      if (headers === null) { headers = fields; return; }
      const row: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i] as string] = fields[i] ?? "";
      }
      onRow(row);
    });
    rl.on("close", () => resolve());
    rl.on("error", reject);
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`unzip exited with code ${code}: ${errOutput.trim()}`));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

function deterministicUuid(input: string): string {
  const hash = createHash("sha1").update(input).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

function buildCandidateId(normalizedName: string): string {
  // Use deterministic ID based on normalized name — matches what ne-nadc-donors will use
  const hash = createHash("sha1")
    .update(`ne-nadc-candidate:${normalizedName}`)
    .digest("hex")
    .slice(0, 16);
  return `ne-nadc-${hash}`;
}

const NAME_SUFFIXES = new Set(["JR", "SR", "II", "III", "IV"]);

function normalizeName(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/** Strip known suffixes from the end of a name token array */
function stripSuffixes(tokens: string[]): string[] {
  let end = tokens.length;
  while (end > 1 && NAME_SUFFIXES.has(tokens[end - 1] ?? "")) end--;
  return tokens.slice(0, end);
}

/** Build a display name from a normalized (all-caps) NADC candidate name.
 *  Strips suffixes (JR, SR, II, III, IV) so that extractLastNameFromDbName
 *  in ne-nadc-donors.ts returns the actual last name, matching the CSV extractor.
 */
function buildDisplayName(normalizedName: string): string {
  const tokens = normalizedName.split(/\s+/).filter(Boolean);
  const stripped = stripSuffixes(tokens);
  return stripped
    .map((t) => t.toLowerCase().replace(/\b\w/, (c) => c.toUpperCase()))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const localFileIdx = process.argv.indexOf("--local-file");
  const localFile = localFileIdx !== -1 ? process.argv[localFileIdx + 1] : null;

  let csvPath = localFile ?? DEFAULT_CSV_PATH;
  if (!localFile && !fs.existsSync(csvPath)) {
    console.log(`[ne-seed-nadc] downloading NADC bulk data ...`);
    const res = await fetch(NE_BULK_URL, { headers: { "User-Agent": "voter-choice-ne-seed" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching NADC bulk data`);
    const buf = await res.arrayBuffer();
    fs.writeFileSync(csvPath, Buffer.from(buf));
    console.log(`[ne-seed-nadc] downloaded ${(buf.byteLength / 1_048_576).toFixed(1)} MB`);
  } else {
    console.log(`[ne-seed-nadc] using file at ${csvPath}`);
  }

  const db = requireDb();

  // Collect unique candidate names from NADC data
  const candidateNames = new Set<string>();
  await streamZipCsv(csvPath, (row) => {
    const filerType = (row["Filer Type"] ?? "").trim();
    if (filerType !== "Candidate Committee") return;
    const name = (row["Candidate Name"] ?? "").trim();
    if (name) candidateNames.add(normalizeName(name));
  });

  console.log(`[ne-seed-nadc] found ${candidateNames.size} unique candidate names in NADC data`);

  // Load existing NE candidates from DB
  const existingRows = await db
    .select({ fullName: candidates.fullName })
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = ${JURISDICTION_DB}`);
  const existingNormalized = new Set(existingRows.map((r) => normalizeName(r.fullName)));
  console.log(`[ne-seed-nadc] ${existingNormalized.size} NE candidates already in DB`);

  let inserted = 0;
  let skipped = 0;

  for (const normalizedName of candidateNames) {
    if (existingNormalized.has(normalizedName)) {
      skipped += 1;
      continue;
    }

    const displayName = buildDisplayName(normalizedName);

    const candidateId = buildCandidateId(normalizedName);

    if (!isDryRun) {
      await db
        .insert(candidates)
        .values({
          id: candidateId,
          fullName: displayName,
          sourceId: `ne-nadc:${normalizedName}`,
          jurisdiction: JURISDICTION_DB,
          isIncumbent: false,
          rawMetadata: {
            source: "ne_nadc_bulk",
            normalizedName,
            note: "seeded from NADC contribution data",
          },
        })
        .onConflictDoNothing();

      const officeId = deterministicUuid(`${candidateId}:${JURISDICTION_DB}:2024`);
      await db
        .insert(candidateOffices)
        .values({
          id: officeId,
          candidateId,
          officeLabel: OFFICE_LABEL,
          jurisdiction: JURISDICTION_DB,
          termStart: "2024-01-01",
          sourceUrl: "https://nadc-e.nebraska.gov/",
        })
        .onConflictDoNothing();

      inserted += 1;
    } else {
      console.log(`[ne-seed-nadc] [dry-run] would insert: ${displayName}`);
      inserted += 1;
    }
  }

  console.log(
    `[ne-seed-nadc] done inserted=${isDryRun ? "(dry-run) " : ""}${inserted} skipped=${skipped}`,
  );
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[ne-seed-nadc] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}
