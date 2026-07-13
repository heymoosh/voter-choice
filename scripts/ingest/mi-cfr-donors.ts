/**
 * scripts/ingest/mi-cfr-donors.ts
 *
 * Michigan donor ingest from Michigan Transparency Network (MiTN) Campaign Finance Reporting.
 * Source: https://www.michigan.gov/sos/elections/disclosure/cfr
 * Download: https://mi-boe.entellitrak.com/etk-mi-boe-prod/page.request.do?page=gov.mi.boe.component.cfrexport.page.cfrexportfile&id=10886
 *
 * File format: ZIP containing tab-delimited .txt files
 * Key columns: com_type, can_first_name, can_last_name, contributor_employer,
 *              contribtype, contributor_l_name_or_org, amount
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/mi-cfr-donors.ts [--dry-run]
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/mi-cfr-donors.ts --file /tmp/MI_contributions_2024.zip
 *
 * Default file: /tmp/MI_contributions_2024.zip
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import * as fs from "node:fs";
import * as readline from "node:readline";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
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

const DEFAULT_FILE = "/tmp/MI_contributions_2024.zip";
const SOURCE = "mi_cfr_bulk";
const SOURCE_URL = "https://www.michigan.gov/sos/elections/disclosure/cfr";
const ELECTION_CYCLE = "2024";
const DOWNLOAD_URL =
  "https://mi-boe.entellitrak.com/etk-mi-boe-prod/page.request.do?page=gov.mi.boe.component.cfrexport.page.cfrexportfile&id=10886";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DbCandidate {
  id: string;
  fullName: string;
  jurisdiction: string;
}

// ---------------------------------------------------------------------------
// Name normalization helpers
// ---------------------------------------------------------------------------

const SUFFIXES = new Set(["JR", "SR", "II", "III", "IV"]);

function norm(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normName(fullName: string): string {
  return norm(fullName);
}

// ---------------------------------------------------------------------------
// ZIP streaming — lists files in zip, processes each one
// ---------------------------------------------------------------------------

async function listZipFiles(zipPath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn("unzip", ["-l", zipPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    proc.on("close", (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`unzip -l exited with code ${code}`));
        return;
      }
      const files: string[] = [];
      for (const line of out.split("\n")) {
        const m = line.match(/(\S+\.txt)$/);
        if (m) files.push(m[1] ?? "");
      }
      resolve(files);
    });
    proc.on("error", reject);
  });
}

async function streamZipFile(
  zipPath: string,
  fileName: string,
  onRow: (row: Record<string, string>) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("unzip", ["-p", zipPath, fileName], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const rl = readline.createInterface({
      input: proc.stdout,
      crlfDelay: Infinity,
    });
    let headers: string[] | null = null;
    let errOutput = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      errOutput += chunk.toString();
    });
    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const fields = trimmed.split("\t");
      if (headers === null) {
        headers = fields;
        return;
      }
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
        reject(
          new Error(`unzip exited ${code} for ${fileName}: ${errOutput}`),
        );
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const fileIdx = process.argv.indexOf("--file");
  const filePath =
    fileIdx !== -1 ? (process.argv[fileIdx + 1] ?? DEFAULT_FILE) : DEFAULT_FILE;

  if (!fs.existsSync(filePath)) {
    console.error(`[mi-cfr] file not found: ${filePath}`);
    console.error(`Download from: ${DOWNLOAD_URL}`);
    process.exitCode = 1;
    return;
  }

  const db = requireDb();

  const miHouse = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-MI-house'`)) as DbCandidate[];
  const miSenate = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-MI-senate'`)) as DbCandidate[];

  console.log(
    `[mi-cfr] DB: house=${miHouse.length} senate=${miSenate.length}`,
  );

  // Build full-name index (FIRSTNAME LASTNAME → candidate)
  const nameIdx = new Map<string, DbCandidate>();
  for (const c of [...miHouse, ...miSenate]) {
    const normalized = normName(c.fullName);
    nameIdx.set(normalized, c);
  }

  // Also build last-name index for fuzzy matching
  const lastNameIdx = new Map<string, DbCandidate[]>();
  for (const c of [...miHouse, ...miSenate]) {
    const parts = normName(c.fullName).split(" ").filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    if (!last) continue;
    const existing = lastNameIdx.get(last) ?? [];
    existing.push(c);
    lastNameIdx.set(last, existing);
  }

  const agg = new Map<string, number>();
  const candidateNames = new Map<string, string>();
  let rowsProcessed = 0;
  let rowsSkipped = 0;

  const zipFiles = await listZipFiles(filePath);
  console.log(`[mi-cfr] zip contains: ${zipFiles.join(", ")}`);

  for (const fileName of zipFiles) {
    console.log(`[mi-cfr] processing ${fileName}...`);
    let fileRows = 0;

    await streamZipFile(filePath, fileName, (row) => {
      // Only candidate committee contributions
      const comType = row["com_type"]?.trim() ?? "";
      if (comType !== "Candidate") {
        rowsSkipped++;
        return;
      }

      const canFirst = row["can_first_name"]?.trim() ?? "";
      const canLast = row["can_last_name"]?.trim() ?? "";
      if (!canLast) {
        rowsSkipped++;
        return;
      }

      const amountStr = (row["amount"] ?? "").replace(/[$,]/g, "");
      const amount = parseFloat(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) {
        rowsSkipped++;
        return;
      }

      // Match candidate by full name first
      const candidateKey = norm(`${canFirst} ${canLast}`);
      let dbMatch = nameIdx.get(candidateKey) ?? null;

      if (!dbMatch) {
        // Fallback: last-name match
        const lastKey = norm(canLast);
        const candidates = lastNameIdx.get(lastKey);
        if (candidates && candidates.length > 0) {
          const firstInitial = norm(canFirst)[0] ?? "";
          dbMatch =
            candidates.find((c) => {
              const parts = normName(c.fullName).split(" ").filter(Boolean);
              return (parts[0]?.[0] ?? "") === firstInitial;
            }) ??
            candidates[0] ??
            null;
        }
      }

      if (!dbMatch) {
        rowsSkipped++;
        return;
      }

      // Classify contributor
      const employer = row["contributor_employer"]?.trim() ?? "";
      const contribType = row["contribtype"]?.trim() ?? "";
      const orgName = row["contributor_l_name_or_org"]?.trim() ?? "";
      const contribFirst = row["contributor_f_name"]?.trim() ?? "";

      let bucket: DonorBucketLabel;

      if (!contribFirst && orgName) {
        // Org contribution
        const orgBucket = mapEmployerToBucket(orgName);
        bucket = orgBucket ?? "Other";
      } else if (contribFirst) {
        // Individual — use employer for bucketing
        const empBucket = mapEmployerToBucket(employer);
        if (empBucket && empBucket !== "Other" && empBucket !== "Self-funded") {
          bucket = empBucket;
        } else {
          bucket = bucketIndividualByAmount(amount);
        }
      } else {
        bucket = "Other";
      }

      const aggKey = `${dbMatch.id}|${ELECTION_CYCLE}|${bucket}`;
      agg.set(aggKey, (agg.get(aggKey) ?? 0) + amount);
      candidateNames.set(dbMatch.id, `${canFirst} ${canLast}`);
      rowsProcessed++;
      fileRows++;

      if (rowsProcessed % 50000 === 0) {
        console.log(`[mi-cfr] processed=${rowsProcessed}`);
      }
    });

    console.log(`[mi-cfr] ${fileName}: ${fileRows} rows matched`);
  }

  const matchedCandidates = new Set(
    [...agg.keys()].map((k) => k.substring(0, k.indexOf("|"))),
  );

  console.log(
    `[mi-cfr] processed=${rowsProcessed} skipped=${rowsSkipped} ` +
      `candidates_matched=${matchedCandidates.size} rows_to_upsert=${agg.size}`,
  );

  if (isDryRun) {
    const sample = [...agg.entries()].slice(0, 3);
    for (const [key, amt] of sample) {
      const [cid, , bucket] = key.split("|");
      console.log(
        `[mi-cfr] [dry-run] candidate=${cid} bucket=${bucket} amount=${amt.toFixed(2)}`,
      );
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
        rawMetadata: { miCandidateName: candidateNames.get(candidateId) ?? "" },
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

  console.log(`[mi-cfr] done upserted=${upserted}`);
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[mi-cfr] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}
