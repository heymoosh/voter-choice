// Phase 2 real-data layer — fetches the prototype's data seams from the real
// backend. The prototype's data shapes were deliberately built to match
// src/lib/structured-blocks.ts, so /api/race-data's response maps directly onto
// RACE_PATTERNS[raceId] (racePatterns) + ALIGNMENT_SCORES[raceId] (alignmentScores).
import { applyRaceData, getRealStateCode } from "./data";

interface ThinCandidate {
  name: string;
  party?: string;
}
interface ProtoRace {
  id: string;
  section?: string;
  label: string;
  candidates?: ThinCandidate[];
}
interface ProtoIssue {
  canonicalIssue?: string;
  stance?: string;
  interpretation?: string;
  name?: string;
}

/** Prototype issue `stance` is prose ("voter favors …"); the API wants a verb. */
function toStance(s?: string): "in_favor" | "opposed" {
  return s && /\b(oppos|against|repeal|block|ban|cut)\b/i.test(s)
    ? "opposed"
    : "in_favor";
}

function toApiIssues(issues: ProtoIssue[]) {
  return (issues || [])
    .filter((i) => i && i.canonicalIssue)
    .map((i) => ({
      canonicalIssue: i.canonicalIssue as string,
      label: i.interpretation || i.name || (i.canonicalIssue as string),
      stance: toStance(i.stance),
    }));
}

/** POST /api/race-data for one race → { racePatterns, alignmentScores, … } | null. */
export async function fetchRaceData(
  race: ProtoRace,
  issues: ProtoIssue[],
  stateCode: string,
) {
  const candidates = (race.candidates || []).filter((c) => c && c.name);
  if (candidates.length === 0) return null; // propositions / no roster
  try {
    const res = await fetch("/api/race-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raceId: race.id,
        raceLabel: race.label,
        section: race.section || "Federal",
        stateCode,
        candidates: candidates.map((c) => ({ name: c.name, party: c.party })),
        issues: toApiIssues(issues),
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Single-load: fetch ALL races' patterns once (in parallel) and apply them to
 * the data module BEFORE the workspace mounts. This is the prototype's
 * load-once model — switching races in the workspace then reads already-loaded
 * data (no per-race loader, which was the drifted app's bug).
 */
export async function loadAllRaceData(races: ProtoRace[], issues: ProtoIssue[]) {
  const stateCode = getRealStateCode() || "NJ";
  await Promise.all(
    (races || []).map(async (race) => {
      const data = await fetchRaceData(race, issues, stateCode);
      if (data && data.racePatterns) {
        applyRaceData(race.id, data.racePatterns, data.alignmentScores ?? null);
      }
      // On failure, the race keeps its mock/empty fallback — don't block others.
    }),
  );
}

/* ─── Phase 2b: real BALLOT fetch (address → civic, or upload/paste → extract) ───
   Replaces the prototype's mock geocode + the temp NJ seed. The text path is
   fully local (no API key); civic + PDF extraction need keys (prod). */
import { parseBallotContent } from "../lib/parseBallotContent";
import { deriveRaces } from "../lib/raceDeriver";
import type { Race, ContestLike } from "../lib/raceDeriver";
import { extractionToRaces } from "../lib/extractionToRaces";

export interface BallotResult {
  races: Race[];
  stateCode: string;
}

/** text → contests (replicates the old app's parsedBallotToContests). */
function parsedTextToContests(text: string): ContestLike[] {
  const trimmed = (text || "").trim();
  if (!trimmed) return [];
  const parsed = parseBallotContent(trimmed);
  const counts = new Map<string, number>();
  for (const r of parsed.races)
    counts.set(r.office, (counts.get(r.office) ?? 0) + 1);
  return parsed.races.map((r) => ({
    office: r.office,
    district: (counts.get(r.office) ?? 1) > 1 ? r.candidate : "",
    candidates: r.candidate ? [{ name: r.candidate, party: r.party }] : [],
  }));
}

// Full state-name / abbreviation → 2-letter code (for stateCode detection
// from an address string or a ballot jurisdiction like "Camden County, NJ").
const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI",
  minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
  nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC",
  "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR",
  pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY",
};

export function stateCodeFrom(s: string): string {
  const lower = (s || "").toLowerCase();
  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    if (lower.includes(name)) return code;
  }
  const m = (s || "").match(/\b([A-Z]{2})\b/);
  return m ? m[1].toUpperCase() : "";
}

/** Address → /api/civic. Returns races when Civic has the ballot; else empty
 *  (→ upload/paste). Always returns a best-effort stateCode. */
export async function fetchBallotFromAddress(
  address: string,
): Promise<BallotResult> {
  try {
    const res = await fetch("/api/civic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    if (res.ok) {
      const data = await res.json();
      const contests = data?.contests;
      const stateCode = stateCodeFrom(data?.county || data?.normalizedAddress || address);
      if (Array.isArray(contests) && contests.length > 0) {
        return { races: deriveRaces({ contests }), stateCode };
      }
      return { races: [], stateCode };
    }
  } catch {
    /* fall through to address-derived state + empty races (→ upload) */
  }
  return { races: [], stateCode: stateCodeFrom(address) };
}

/** Pasted ballot text → races (fully local, no API key). */
export async function fetchBallotFromText(text: string): Promise<BallotResult> {
  const contests = parsedTextToContests(text);
  return { races: deriveRaces({ contests }), stateCode: stateCodeFrom(text) };
}

/** Uploaded PDF/file → /api/extract-ballot → races (needs Anthropic key). */
export async function fetchBallotFromFile(file: File): Promise<BallotResult> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/extract-ballot", { method: "POST", body: fd });
    if (!res.ok) return { races: [], stateCode: "" };
    const extraction = await res.json();
    return {
      races: extractionToRaces(extraction, null),
      stateCode: stateCodeFrom(extraction?.jurisdiction || ""),
    };
  } catch {
    return { races: [], stateCode: "" };
  }
}

/* ─── Phase 2b: party-primary filtering ("2 Senate races" fix) ───
   A primary ballot carries both parties' contests. When races span >1 party we
   show the party gate; the pick filters races to that party (a registered Dem
   sees only the DEM primary). General-election ballots are single-party-neutral
   → no gate. */
function partyLetter(p?: string): string {
  const t = (p || "").toLowerCase();
  if (t.startsWith("d")) return "D";
  if (t.startsWith("r")) return "R";
  return "";
}

export function racesSpanMultipleParties(races: Race[]): boolean {
  const seen = new Set<string>();
  for (const r of races || [])
    for (const c of r.candidates || []) {
      const l = partyLetter(c.party);
      if (l) seen.add(l);
    }
  return seen.size > 1;
}

export function filterRacesByParty(races: Race[], party: string): Race[] {
  const want = partyLetter(party);
  if (!want) return races || [];
  return (races || [])
    .filter((r) => {
      const cands = r.candidates || [];
      if (cands.length === 0) return true; // keep non-partisan / propositions
      return cands.some((c) => partyLetter(c.party) === want);
    })
    .map((r) => ({
      ...r,
      candidates: (r.candidates || []).filter((c) => {
        const l = partyLetter(c.party);
        return l === "" || l === want;
      }),
    }));
}
