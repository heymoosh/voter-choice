/**
 * Shared types for the `/api/extract-ballot` route. The target schema is
 * documented in the PDF bake-off `decision-design.md` (under §"Target
 * output schema") and the route's response shape is described inline in
 * the route file.
 *
 * Keep this file pure-types so it can be imported from both client and
 * server modules without dragging Node-only deps.
 */

/**
 * `placeholder_reason` distinguishes blank-line entries from real candidates.
 *
 * - `"no_petition_filed"`: ballots that print "NO PETITION FILED" beneath an
 *   office name (NJ-shape primaries). The race exists but the party has no
 *   candidate; we surface it so downstream UX can show that fact rather
 *   than silently dropping it.
 * - `"write_in"`: write-in slots. For multi-seat races (vote_for_n > 1) we
 *   emit one write-in placeholder PER SEAT.
 * - `"illegible"`: a real candidate slot whose name could not be read reliably
 *   (e.g. dense/low-resolution large-format ballots). We emit the slot with
 *   `name: null` so the model never FABRICATES a plausible name — an honest gap
 *   beats a wrong name. Filtered out of the selectable candidate list like the
 *   other placeholders; the raw count is preserved for telemetry / future UX.
 * - `null`: a real candidate.
 */
export type PlaceholderReason =
  "no_petition_filed" | "write_in" | "illegible" | null;

/**
 * Section names — kept open to a fixed list per the bake-off's section_name
 * enum (decision-design.md §"Target output schema", expanded 2026-05-27 to
 * cover FL-style "Constitutional Amendments", "County Questions", etc.).
 *
 * We keep this as a TypeScript string union (not a runtime enum) so callers
 * can validate at the JSON boundary without paying for an enum object.
 */
export type SectionName =
  | "Federal"
  | "State"
  | "County"
  | "Municipal"
  | "Judicial"
  | "Propositions"
  | "Constitutional Amendments"
  | "County Questions"
  | "Ballot Measures"
  | "Judicial Retention"
  | "Bond Measures";

export interface ExtractCandidate {
  name: string | null;
  party: string | null;
  ballot_position?: string;
  placeholder_reason: PlaceholderReason;
}

export interface ExtractRace {
  office: string;
  district?: string;
  position?: string;
  vote_for_n: number;
  party_context: "Democratic Primary" | "Republican Primary" | null;
  candidates: ExtractCandidate[];
  /**
   * Official ballot summary/body text for non-candidate contests
   * (constitutional amendments, county/charter questions, bond measures,
   * referenda, judicial retention). Populated verbatim from the ballot as
   * printed — NO AI summarization or derivation. Capped at ~1500 characters.
   * Omitted for candidate races.
   */
  measure_text?: string;
}

export interface ExtractSection {
  section_name: SectionName | string; // allow string fallback for safety
  races: ExtractRace[];
}

export interface ExtractElectionMetadata {
  election_date: string;
  election_type: "primary" | "primary_runoff" | "general" | "special";
  jurisdiction: string;
  ballot_style?: string;
}

export interface DetectorScore {
  /** Dictionary-recognized token ratio (English + Spanish). 0..1. */
  dictionary_ratio: number;
  /** Count of ballot-vocab hits (Vote for, Senator, etc.). */
  ballot_vocab_hits: number;
  /** Count of capitalized 2+ word sequences (candidate-name shape). */
  proper_noun_count: number;
  /** Plaintext reason the detector picked the path it picked. */
  decision_reason: string;
}

/**
 * `extraction_path` distinguishes which extraction stage produced the
 * response:
 *   - `"pdfjs"`: the cheap text-layer + Sonnet post-processor path.
 *   - `"vision"`: the per-page Sonnet vision fan-out.
 *   - `"textract"`: AWS Textract form/table OCR + Sonnet post-processor
 *     (large-format fallback).
 *   - `"cached"`: a previously computed extraction served from the
 *     content-addressed cache (SHA-256 of the PDF bytes).
 */
export type ExtractionPath = "pdfjs" | "vision" | "textract" | "cached";

export interface ExtractMeta {
  extraction_path: ExtractionPath;
  pages: number;
  latency_ms: number;
  cost_usd: number;
  detector_score?: DetectorScore;
  /**
   * Set to `true` when this response was served from the extraction cache
   * (sha-256 of the uploaded PDF). Absent or false on real-extraction
   * responses. Lets the client surface "instant — we read this ballot
   * earlier" UI and lets us tail-scrape cache hit rate post-launch.
   */
  cache_hit?: boolean;
  /**
   * Set to `true` when the ballot is large-format (page area > 1 MP at the
   * rendered scale). Large-format pages downscale past the vision API's
   * ~1.15 MP cap, making candidate text unreliable even with the Textract
   * or sampling path — a voter-facing "verify against your official ballot"
   * warning should be shown. Present only when `true`; absent otherwise.
   *
   * Note: `low_confidence` signals large-format geometry, not a per-race
   * accuracy grade. Fully confident Textract extractions (e.g. NJ R-Senate
   * 4/4) still set this flag because the *ballot* is large-format, so the
   * downstream UX can always show the caution regardless of which path ran.
   */
  low_confidence?: boolean;
}

/**
 * Client-visible meta shape (PR D Fix 4). The `/api/extract-ballot` route
 * returns this in `_meta` rather than the full `ExtractMeta` — `cost_usd`
 * and the granular `detector_score` are internal observability fields
 * that don't need to leave the server. They stay in the function logs
 * (the `extract.completed` JSON shape) and in the durable extraction
 * cache (so future debugging can still read them) but never reach the
 * browser.
 *
 * The fields kept here are the ones the client legitimately needs:
 *   - `extraction_path` — informs the "Cached!" UI affordance later
 *   - `cache_hit` — same; also useful for client-side telemetry hooks
 *   - `pages` — generic ballot-size hint, not sensitive
 *   - `latency_ms` — generic timing hint, not sensitive
 *   - `low_confidence` — voter-facing "verify against your official ballot"
 *     flag; set when the ballot is large-format (see `ExtractMeta`)
 */
export interface PublicExtractMeta {
  extraction_path: ExtractionPath;
  pages: number;
  latency_ms: number;
  cache_hit?: boolean;
  low_confidence?: boolean;
}

/**
 * Strip server-only telemetry from `ExtractMeta` before shipping the
 * extraction response to the browser. Keep `cache_hit` only when it was
 * present on the source (the fresh-extraction path doesn't set it).
 */
export function toPublicExtractMeta(meta: ExtractMeta): PublicExtractMeta {
  const out: PublicExtractMeta = {
    extraction_path: meta.extraction_path,
    pages: meta.pages,
    latency_ms: meta.latency_ms,
  };
  if (meta.cache_hit !== undefined) {
    out.cache_hit = meta.cache_hit;
  }
  if (meta.low_confidence) {
    out.low_confidence = true;
  }
  return out;
}

export interface BallotExtraction {
  election_metadata: ExtractElectionMetadata;
  sections: ExtractSection[];
  _meta: ExtractMeta;
}
