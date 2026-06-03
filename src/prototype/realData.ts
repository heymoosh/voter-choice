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
