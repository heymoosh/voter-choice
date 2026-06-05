/**
 * Repeated-sampling-with-abstention reconciler for large-format ballots.
 *
 * Why: the vision model misreads candidate names on large-format ballots
 * (e.g. a 17.5×23" trifold) because the page downscales past the vision API's
 * ~1.15MP cap, leaving candidate text ~6-12px tall. Empirically the misreads
 * are NONDETERMINISTIC (a different wrong name each run) while correct reads
 * are STABLE — and the model, when unsure, returns name=null/illegible rather
 * than fabricating (see extract-prompt.ts). So the fix is not higher resolution
 * but consensus: extract the same ballot N times and keep only names a majority
 * of runs AGREE on; mark disagreements illegible. This recovers stable/legible
 * names, recovers the borderline ones by majority vote, and turns the genuinely
 * unreadable columns into honest gaps instead of fabricated candidates.
 *
 * Layout-general: no tiling, no geometry — operates purely on the structured
 * per-page extractions, so it cannot fragment structure the way image tiling did.
 * Pure + deterministic given its inputs (unit-tested in extract-sampler.test.ts).
 */
import type {
  ExtractCandidate,
  ExtractRace,
  ExtractSection,
  PlaceholderReason,
} from "./extract-types";
import type { PageExtraction } from "./extract-stitcher";

/** Number of independent extractions to reconcile for a large-format ballot. */
export const SAMPLE_COUNT = 3;

/**
 * Large-format gate. The vision API downscales any image to ~1.15 MP, so a page
 * whose logical area exceeds ~1.0M pt² (bigger than tabloid, 792×1224 ≈ 970k)
 * loses enough resolution that candidate text becomes unreliable. Only these get
 * the (N×-cost) sampling treatment; normal letter/legal/tabloid ballots take the
 * single-shot path unchanged.
 */
export function isLargeFormatPage(
  widthPx: number,
  heightPx: number,
  scale: number,
): boolean {
  const wPt = widthPx / scale;
  const hPt = heightPx / scale;
  return wPt * hPt > 1_000_000;
}

const PLACEHOLDER_TYPES: ReadonlyArray<Exclude<PlaceholderReason, null>> = [
  "write_in",
  "no_petition_filed",
  "illegible",
];

const normName = (s: string | null | undefined): string =>
  (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Most frequent value (first-seen wins ties). */
function mode<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  let best: T | undefined;
  let bestN = 0;
  for (const v of values) {
    const n = (counts.get(v) ?? 0) + 1;
    counts.set(v, n);
    if (n > bestN) {
      bestN = n;
      best = v;
    }
  }
  return best;
}

function raceKey(r: ExtractRace, sectionName: string): string {
  return [
    sectionName.trim().toLowerCase(),
    r.office?.trim().toLowerCase() ?? "",
    r.district?.trim().toLowerCase() ?? "",
    r.position?.trim().toLowerCase() ?? "",
    r.party_context ?? "",
  ].join("|");
}

/**
 * Reconcile the candidate at one slot index across the N versions of a race.
 * Emits a name ONLY when ≥2 runs gave a name AND one name is a strict majority
 * of the runs that gave a name — otherwise an honest `illegible` gap. A
 * placeholder (write-in / no-petition) is emitted when it's the majority of all
 * versions. This is the abstention rule that kills fabrication: a lone or
 * disagreeing read never becomes a shown candidate.
 */
export function reconcileSlot(
  entries: ReadonlyArray<ExtractCandidate | undefined>,
  versions: number,
): ExtractCandidate {
  const nameReads: {
    norm: string;
    orig: string;
    party: string | null;
    pos?: string;
  }[] = [];
  const placeholders: Exclude<PlaceholderReason, null>[] = [];

  for (const e of entries) {
    if (!e) continue;
    if (
      e.placeholder_reason &&
      PLACEHOLDER_TYPES.includes(e.placeholder_reason) &&
      e.placeholder_reason !== "illegible"
    ) {
      placeholders.push(e.placeholder_reason);
    } else if (e.name && e.placeholder_reason == null) {
      nameReads.push({
        norm: normName(e.name),
        orig: e.name,
        party: e.party ?? null,
        pos: e.ballot_position,
      });
    }
    // name=null/illegible → abstention; ignored.
  }

  // Names: require ≥2 confident reads AND a strict majority among them.
  if (nameReads.length >= 2) {
    const byNorm = new Map<string, typeof nameReads>();
    for (const r of nameReads) {
      const arr = byNorm.get(r.norm) ?? [];
      arr.push(r);
      byNorm.set(r.norm, arr);
    }
    let top: typeof nameReads = [];
    for (const arr of byNorm.values()) if (arr.length > top.length) top = arr;
    if (top.length >= 2 && top.length * 2 > nameReads.length) {
      const orig = mode(top.map((r) => r.orig)) ?? top[0].orig;
      const party = mode(top.map((r) => r.party)) ?? null;
      const pos = mode(
        top.map((r) => r.pos).filter((p): p is string => Boolean(p)),
      );
      return {
        name: orig,
        party,
        ...(pos ? { ballot_position: pos } : {}),
        placeholder_reason: null,
      };
    }
  }

  // Placeholders: emit when a type is the majority of all versions.
  if (placeholders.length > 0) {
    const topPh = mode(placeholders)!;
    const phCount = placeholders.filter((p) => p === topPh).length;
    if (phCount * 2 > versions) {
      return { name: null, party: null, placeholder_reason: topPh };
    }
  }

  // No consensus → honest gap.
  return { name: null, party: null, placeholder_reason: "illegible" };
}

function reconcileRace(races: ExtractRace[], versions: number): ExtractRace {
  const template = races[0];
  // Slot count = modal candidate count (resists a run that hallucinated extras
  // or dropped one); leftover hallucinated slots reconcile to illegible anyway.
  const count = mode(races.map((r) => r.candidates?.length ?? 0)) ?? 0;
  const candidates: ExtractCandidate[] = [];
  for (let i = 0; i < count; i++) {
    candidates.push(
      reconcileSlot(
        races.map((r) => r.candidates?.[i]),
        versions,
      ),
    );
  }

  // Low-confidence-race guard. If MORE slots came back `illegible` than resolved
  // to a name, the column was mostly unreadable — and a semi-stable hallucination
  // can still reach a bare majority in that noise (observed: a fake "MEISSNER"
  // surfacing as the lone name amid 4 illegible R-Senate slots). Distrust those
  // lone names and blank them, so we never show a fabricated candidate as the
  // sole/dominant entry. Healthy races (0 illegible slots) are untouched.
  //
  // NOTE (residual): this does NOT fire when a hard column resolves to MORE names
  // than illegibles with a fake among them (e.g. [illegible, MEISSNER, MURPHY,
  // ZDAN, illegible] — 3 names / 2 illegible). A stricter `>= 2 illegible` rule
  // would catch it but also blanks the real MURPHY/ZDAN — a safety-vs-completeness
  // product call left to the user (see F1_EXTRACTION_HANDOFF.md residual note).
  const named = candidates.filter((c) => c.name).length;
  const illegibleSlots = candidates.filter(
    (c) => c.placeholder_reason === "illegible",
  ).length;
  const guarded =
    illegibleSlots > named
      ? candidates.map((c) =>
          c.name
            ? {
                name: null,
                party: null,
                placeholder_reason: "illegible" as const,
              }
            : c,
        )
      : candidates;

  return {
    office: template.office,
    ...(template.district ? { district: template.district } : {}),
    ...(template.position ? { position: template.position } : {}),
    vote_for_n: mode(races.map((r) => r.vote_for_n)) ?? template.vote_for_n,
    party_context: template.party_context,
    candidates: guarded,
  };
}

/** Reconcile N independent versions of ONE page into a single page. */
function reconcilePage(versions: PageExtraction[]): PageExtraction {
  const N = versions.length;
  const majority = Math.floor(N / 2) + 1;

  const racesByKey = new Map<string, ExtractRace[]>();
  const sectionByKey = new Map<string, string>();
  const keyOrder: string[] = [];
  for (const v of versions) {
    for (const sec of v.sections ?? []) {
      const secName = String(sec.section_name ?? "");
      for (const race of sec.races ?? []) {
        const key = raceKey(race, secName);
        if (!racesByKey.has(key)) {
          racesByKey.set(key, []);
          sectionByKey.set(key, secName);
          keyOrder.push(key);
        }
        racesByKey.get(key)!.push(race);
      }
    }
  }

  const sections: ExtractSection[] = [];
  const sectionIdx = new Map<string, number>();
  for (const key of keyOrder) {
    const races = racesByKey.get(key)!;
    if (races.length < majority) continue; // race seen by a minority → drop
    const reconciled = reconcileRace(races, N);
    const secName = sectionByKey.get(key)!;
    const secKey = secName.trim().toLowerCase();
    let idx = sectionIdx.get(secKey);
    if (idx === undefined) {
      idx = sections.length;
      sectionIdx.set(secKey, idx);
      sections.push({ section_name: secName, races: [] });
    }
    sections[idx].races.push(reconciled);
  }

  const meta =
    versions.find((v) => {
      const m = v.election_metadata ?? {};
      return (
        Boolean(m.jurisdiction?.trim()) || Boolean(m.election_date?.trim())
      );
    })?.election_metadata ??
    versions[0]?.election_metadata ??
    {};

  return { election_metadata: meta, sections };
}

/**
 * Reconcile N independent whole-ballot extractions (each = per-page array, in
 * page order) into a single per-page array, ready for `stitchPages`. Pages are
 * aligned by index (same render → same page order).
 */
export function reconcilePageSamples(
  samples: PageExtraction[][],
): PageExtraction[] {
  if (samples.length === 0) return [];
  if (samples.length === 1) return samples[0];
  const pageCount = Math.max(...samples.map((s) => s.length));
  const out: PageExtraction[] = [];
  for (let k = 0; k < pageCount; k++) {
    const versions = samples
      .map((s) => s[k])
      .filter((p): p is PageExtraction => Boolean(p));
    if (versions.length === 0) continue;
    out.push(reconcilePage(versions));
  }
  return out;
}
