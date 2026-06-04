/**
 * extractionToRaces — structured BallotExtraction → workspace `Race[]`.
 *
 * Replaces the lossy text round-trip (`ballotJsonToText` → `parseBallotContent`)
 * for the PDF-extract path so that:
 *
 *   1. ALL sections survive — Federal, State, County, Municipal, Judicial,
 *      Propositions, plus the eleven SectionName values the extraction
 *      schema supports. The prior text path collapsed everything that wasn't
 *      a clean `OFFICE: candidate` single line.
 *
 *   2. The voter's `ballotTag` (from PartyGate) drives a precise filter:
 *      - "DEM-primary" → races whose `party_context === "Democratic Primary"`
 *        OR `party_context === null` (universal — judicial retentions,
 *        propositions, non-partisan races).
 *      - "REP-primary" → analogously for "Republican Primary" + null.
 *      - "GENERAL" → ALL races (no party filter; general election ballots
 *        carry `party_context: null` anyway, but we don't enforce it).
 *      - null or anything else (unaffiliated, "registered_other") → ONLY
 *        races with `party_context === null`. Per the task spec, third-party
 *        and unaffiliated voters cannot cross over into a DEM/REP primary.
 *
 *   3. Race ids stay distinct even when DEM and REP primaries carry the same
 *      office name (e.g. two "U.S. Senator" rows). We append a short
 *      party-context suffix to the id so React reconciliation and pick
 *      tracking don't conflate the two.
 *
 * Per the bake-off "extract everything, filter downstream" principle.
 */

import type { Race, RaceSection } from "./raceDeriver";
import { makeRaceId } from "./raceDeriver";
import { normalizeRaceLabel } from "./normalizeRaceLabel";
import type {
  BallotExtraction,
  ExtractRace,
  ExtractSection,
  SectionName,
} from "./server/extract-types";

const KNOWN_SECTIONS: RaceSection[] = [
  "Federal",
  "State",
  "County",
  "Municipal",
  "Judicial",
  "Propositions",
  "Constitutional Amendments",
  "County Questions",
  "Ballot Measures",
  "Judicial Retention",
  "Bond Measures",
  "Local",
];

const KNOWN_SECTION_SET = new Set<string>(KNOWN_SECTIONS);

function normalizeSection(name: SectionName | string): RaceSection {
  // Schema-defined names pass through; anything off-schema falls back to
  // "Local" so the rail still renders the race rather than dropping it.
  return (KNOWN_SECTION_SET.has(name) ? name : "Local") as RaceSection;
}

function partyContextTag(
  partyContext: ExtractRace["party_context"],
): "DEM" | "REP" | "ALL" {
  if (partyContext === "Democratic Primary") return "DEM";
  if (partyContext === "Republican Primary") return "REP";
  return "ALL";
}

/**
 * Predicate: does this race pass the party-context filter for the given
 * voter ballotTag? Universal races (party_context === null) always pass.
 *
 * BallotTag coverage (P0 Harris County TX fix — pre-fix only handled
 * DEM-primary / REP-primary / GENERAL, which meant a TX runoff voter
 * with ballotTag "DEM-runoff" or "REP-runoff" got every race filtered
 * out when the extractor labeled them `party_context: "Democratic
 * Primary"` — a defensible interpretation for a DEM primary runoff).
 *
 * Recognized tags (from src/lib/state-rules/rules.ts options[].ballotTag):
 *   - DEM-primary, DEM-runoff, DEM-runoff-open → tag === "DEM"
 *   - REP-primary, REP-runoff, REP-runoff-open → tag === "REP"
 *   - GENERAL → all
 *   - UNSURE → all (the voter hasn't picked a lane; show both rosters
 *     so chat can help them disambiguate)
 *   - null / anything else (unaffiliated, registered_other, flag-off) →
 *     only universal races (no partisan crossover)
 *
 * Note: `extractionToRaces` collapses null ballotTag into a derived
 * effective tag via `inferBallotTagFromExtraction` BEFORE this predicate
 * runs — so in practice this null branch is reachable only when the
 * caller passes a non-null but unrecognized string. The branch is kept
 * as a defensive belt-and-suspenders default.
 */
function passesPartyFilter(
  race: ExtractRace,
  ballotTag: string | null,
): boolean {
  const tag = partyContextTag(race.party_context);
  // Universal races (no party_context) always pass.
  if (tag === "ALL") return true;
  // General election + UNSURE both pass everything.
  if (ballotTag === "GENERAL") return true;
  if (ballotTag === "UNSURE") return true;
  // DEM lane covers primary + both runoff variants.
  if (
    ballotTag === "DEM-primary" ||
    ballotTag === "DEM-runoff" ||
    ballotTag === "DEM-runoff-open"
  ) {
    return tag === "DEM";
  }
  // REP lane covers primary + both runoff variants.
  if (
    ballotTag === "REP-primary" ||
    ballotTag === "REP-runoff" ||
    ballotTag === "REP-runoff-open"
  ) {
    return tag === "REP";
  }
  // null / unknown ballotTag (unaffiliated, registered_other,
  // flag-off paths): partisan races are not eligible.
  return false;
}

/**
 * P0 just-passed-election fix (Option B).
 *
 * When the voter uploads a PDF for an election that has already passed
 * (e.g. they look up a TX DEM runoff 2 days after the May 26 runoff),
 * `getUpcomingElection()` returns the NEXT election — likely a general
 * — so `requiresClosedPrimaryGate()` / `requiresRunoffGate()` return
 * false and PartyGate never fires. `ballotContext` stays null. The
 * existing `passesPartyFilter` then drops every partisan race because
 * null ballotTag falls through to the "no partisan crossover" branch,
 * leaving the workspace with 0 races.
 *
 * Rather than touching the election-date logic or PartyGate behavior,
 * we infer the voter's lane from the PDF itself when ballotContext is
 * null. The PDF self-identifies as a party-specific ballot via its
 * race-level `party_context` values:
 *   - Empty set (all party_context null) → general-election content →
 *     "GENERAL" (every race passes).
 *   - Singleton set {"Democratic Primary"} → infer "DEM-primary".
 *   - Singleton set {"Republican Primary"} → infer "REP-primary".
 *   - Multi-element set (NJ-shape sample ballot carrying BOTH parties)
 *     → ambiguous; fall back to "GENERAL" so the user sees too much
 *     rather than 0 races. They can still narrow via chat.
 *
 * We deliberately map all DEM-* tags to "DEM-primary" (and similarly
 * for REP) — `passesPartyFilter` collapses primary/runoff/runoff-open
 * back into the same DEM/REP lane, so picking the canonical "primary"
 * variant is enough.
 */
function inferBallotTagFromExtraction(
  extraction: BallotExtraction,
): "DEM-primary" | "REP-primary" | "GENERAL" {
  const partyContexts = new Set<string>();
  for (const section of extraction.sections ?? []) {
    for (const race of section.races ?? []) {
      if (race.party_context) partyContexts.add(race.party_context);
    }
  }
  // No party-tagged races → general-election content; show everything.
  if (partyContexts.size === 0) return "GENERAL";
  // Multi-party ballot (NJ-shape sample) → ambiguous; fail open.
  if (partyContexts.size > 1) return "GENERAL";
  // Singleton set — infer the lane.
  const only = partyContexts.values().next().value as string;
  if (/democratic/i.test(only)) return "DEM-primary";
  if (/republican/i.test(only)) return "REP-primary";
  // Unrecognized single party label — fail open.
  return "GENERAL";
}

/**
 * Defensive metadata-leakage blocklist (P0 Harris County TX fix).
 *
 * Even when the extractor performs correctly, prompt drift CAN emit a
 * race whose `office` is a metadata field — "Election", "Ballot style",
 * "Date", "Jurisdiction", "Precinct" — pulled from the ballot header
 * rather than the contest list. Those have all surfaced in real
 * extractions. Filter them at the adapter boundary so the workspace
 * rail never shows metadata-shaped "races" regardless of upstream
 * extraction quality. Case-insensitive, whitespace-tolerant.
 *
 * Real race offices ("U.S. Senate", "President of the United States",
 * "Lieutenant Governor", "County Judge") all contain multiple words
 * AND/OR civic-vocabulary nouns; the blocklist only catches the bare
 * single-word metadata tokens. A genuine "Election" race name would
 * also be rejected — that's an acceptable trade-off for a single-word
 * generic noun (no real ballot has just "Election" as a contest name).
 */
const METADATA_OFFICE_BLOCKLIST = new Set([
  "election",
  "election day",
  "election type",
  "ballot style",
  "ballot",
  "date",
  "election date",
  "vote",
  "jurisdiction",
  "precinct",
]);

function isMetadataLeakage(office: string | null | undefined): boolean {
  if (!office) return true;
  const normalized = office.trim().toLowerCase();
  return METADATA_OFFICE_BLOCKLIST.has(normalized);
}

/**
 * Build a label for the workspace rail/pane from an extracted race.
 *
 * Delegates to `normalizeRaceLabel` for the canonical short form. The raw
 * office + district stay on the ExtractRace for prompt construction and
 * the printed ballot artifact — only the user-visible label is normalized.
 */
function buildLabel(race: ExtractRace): string {
  const office = (race.office ?? "").trim();
  const district = (race.district ?? "").trim();
  return normalizeRaceLabel(office, district);
}

/**
 * Build the race id. Disambiguates DEM and REP rows for the same office
 * (e.g. two "U.S. Senator" entries on a closed-primary ballot) by
 * appending the party-context tag — otherwise both rows would slug to
 * the same id and the rail would key-collide.
 */
function buildId(race: ExtractRace): string {
  const office = (race.office ?? "").trim();
  const district = (race.district ?? "").trim();
  const base = makeRaceId(office, district);
  const tag = partyContextTag(race.party_context);
  // ALL: no suffix — propositions, judicial retentions, general-election
  // races never collide with party-keyed siblings.
  if (tag === "ALL") return base;
  // Lowercase tag suffix keeps the slug shape consistent with makeRaceId.
  return `${base}-${tag.toLowerCase()}`;
}

/**
 * Filter the candidate roster to real entries (drop write-in and
 * no-petition-filed placeholders) and map to the `Race.candidates`
 * shape consumed by the chat ground-truth builder and ChatPanel.
 */
function buildCandidates(race: ExtractRace): { name: string; party: string }[] {
  return race.candidates
    .filter((c) => c.placeholder_reason === null && c.name)
    .map((c) => ({ name: c.name ?? "", party: c.party ?? "" }));
}

/**
 * Materialize the eligible races of one ExtractSection into `Race[]`,
 * already filtered by ballotTag and tagged with the canonical section
 * name. Pure / synchronous — no allocations beyond the output.
 */
function buildSectionRaces(
  section: ExtractSection,
  ballotTag: string | null,
): Race[] {
  const canonical = normalizeSection(section.section_name);
  const out: Race[] = [];
  for (const race of section.races ?? []) {
    // P0 defensive guard: drop metadata-shaped offices BEFORE the party
    // filter so a "race" with office "Election" never reaches the rail
    // regardless of party_context.
    if (isMetadataLeakage(race.office)) continue;
    if (!passesPartyFilter(race, ballotTag)) continue;
    out.push({
      id: buildId(race),
      section: canonical,
      label: buildLabel(race),
      decided: false,
      candidates: buildCandidates(race),
      voteForN: race.vote_for_n > 0 ? race.vote_for_n : 1,
    });
  }
  return out;
}

export function extractionToRaces(
  extraction: BallotExtraction | null,
  ballotTag: string | null,
): Race[] {
  if (!extraction?.sections?.length) return [];

  // P0 just-passed-election fix (Option B): when ballotContext is null
  // (PartyGate didn't fire — e.g. the voter uploaded a PDF for an
  // election that has already passed, so getUpcomingElection() returns
  // a downstream general that doesn't gate), infer the lane from the
  // extracted ballot itself. See `inferBallotTagFromExtraction` for the
  // full inference semantics.
  const effectiveBallotTag =
    ballotTag ?? inferBallotTagFromExtraction(extraction);

  // Group eligible races by canonical section name so we can emit them
  // in the canonical SECTION_ORDER regardless of the input order.
  const bySection = new Map<RaceSection, Race[]>();
  for (const section of extraction.sections as ExtractSection[]) {
    const races = buildSectionRaces(section, effectiveBallotTag);
    for (const race of races) {
      const bucket = bySection.get(race.section);
      if (bucket) bucket.push(race);
      else bySection.set(race.section, [race]);
    }
  }

  const out: Race[] = [];
  for (const section of KNOWN_SECTIONS) {
    const races = bySection.get(section);
    if (races) out.push(...races);
  }
  return out;
}
