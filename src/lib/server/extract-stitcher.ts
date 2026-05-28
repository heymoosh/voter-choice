/**
 * Stitcher — deterministic post-processing that merges per-page extraction
 * results into a single ballot.
 *
 * Background: the vision path calls Sonnet ONCE per PDF page in parallel
 * (decision-design.md §"Multi-page PDF strategy"). Per-page is the natural
 * unit of work for vision, but it splits sections across boundaries when
 * a long list of races (e.g., 11 State Representative districts) wraps a
 * page. This stitcher reassembles those splits.
 *
 * Merge rules:
 *  - Same section_name on consecutive entries → merge the races into one
 *    section. Section names compared case-insensitively after trimming.
 *  - Within a merged section, dedupe races by the identity key
 *    `(office, district, position, party_context)` so a section header
 *    repeated on a continuation page doesn't double-up.
 *  - Multi-party (NJ-shape) ballots: DEM and REP variants of the same
 *    office stay distinct because `party_context` is in the identity key.
 *
 * Election metadata: take the first page that has a non-empty
 * `jurisdiction` or `election_date`, falling back to the first page's
 * metadata otherwise.
 */

import type {
  ExtractElectionMetadata,
  ExtractRace,
  ExtractSection,
} from "./extract-types";

export interface PageExtraction {
  election_metadata: ExtractElectionMetadata | Partial<ExtractElectionMetadata>;
  sections: ExtractSection[];
}

export interface StitchedExtraction {
  election_metadata: ExtractElectionMetadata;
  sections: ExtractSection[];
}

function normSectionName(name: string | undefined | null): string {
  return (name ?? "").trim().toLowerCase();
}

function raceIdentityKey(race: ExtractRace): string {
  return [
    race.office?.trim().toLowerCase() ?? "",
    race.district?.trim().toLowerCase() ?? "",
    race.position?.trim().toLowerCase() ?? "",
    race.party_context?.trim().toLowerCase() ?? "",
  ].join("|");
}

function defaultMetadata(): ExtractElectionMetadata {
  return {
    election_date: "",
    election_type: "primary",
    jurisdiction: "",
  };
}

function hasInformativeMetadata(m: Partial<ExtractElectionMetadata>): boolean {
  const jurisdiction = m.jurisdiction?.trim();
  const date = m.election_date?.trim();
  return Boolean(jurisdiction) || Boolean(date);
}

function pickMetadata(pages: PageExtraction[]): ExtractElectionMetadata {
  if (pages.length === 0) return defaultMetadata();
  // Find the first page with informative metadata; fall back to first page.
  const informative = pages.find((p) =>
    hasInformativeMetadata(p.election_metadata ?? {}),
  );
  const chosen: Partial<ExtractElectionMetadata> =
    informative?.election_metadata ?? pages[0].election_metadata ?? {};
  return {
    election_date: chosen.election_date ?? "",
    election_type: chosen.election_type ?? "primary",
    jurisdiction: chosen.jurisdiction ?? "",
    ...(chosen.ballot_style ? { ballot_style: chosen.ballot_style } : {}),
  };
}

export function stitchPages(pages: PageExtraction[]): StitchedExtraction {
  if (pages.length === 0) {
    return { election_metadata: defaultMetadata(), sections: [] };
  }

  const metadata = pickMetadata(pages);
  const stitched: ExtractSection[] = [];

  for (const page of pages) {
    if (!page.sections || page.sections.length === 0) continue;
    for (const incoming of page.sections) {
      const last = stitched[stitched.length - 1];
      const sameAsLast =
        last &&
        normSectionName(last.section_name) ===
          normSectionName(incoming.section_name);
      if (sameAsLast) {
        // Merge — append races we haven't already seen.
        for (const race of incoming.races) {
          const key = raceIdentityKey(race);
          if (!last.races.some((r) => raceIdentityKey(r) === key)) {
            last.races.push(race);
          }
        }
      } else {
        // Push a copy so subsequent merges into `last` don't mutate the
        // caller's input.
        stitched.push({
          section_name: incoming.section_name,
          races: [...incoming.races],
        });
      }
    }
  }

  return { election_metadata: metadata, sections: stitched };
}
