/* ── Values Tag Request block ───────────────────────────────────── */

export interface ValuesTagItem {
  id: string;
  label: string;
}

export interface ValuesTagRequestBlock {
  items: ValuesTagItem[];
}

const VALUES_TAG_REQUEST_BLOCK_RE =
  /\[VALUES_TAG_REQUEST\]([\s\S]*?)\[\/VALUES_TAG_REQUEST\]/g;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidValuesTagItem(value: unknown): value is ValuesTagItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    v.id.trim().length > 0 &&
    typeof v.label === "string" &&
    v.label.trim().length > 0
  );
}

/**
 * Find and parse the LAST [VALUES_TAG_REQUEST] block in content.
 * Returns null if absent, malformed, or has fewer than 2 valid items.
 */
export function parseValuesTagRequestBlock(
  content: string,
): ValuesTagRequestBlock | null {
  if (!content) return null;

  const matches = [...content.matchAll(VALUES_TAG_REQUEST_BLOCK_RE)];
  if (matches.length === 0) return null;

  const last = matches[matches.length - 1];
  const body = last[1];

  const items: ValuesTagItem[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      if (isValidValuesTagItem(parsed)) {
        items.push({ id: parsed.id, label: parsed.label });
      }
    } catch {
      // Skip malformed JSON lines.
    }
  }

  if (items.length < 2) return null;

  return { items };
}

/** Strip all [VALUES_TAG_REQUEST]...[/VALUES_TAG_REQUEST] blocks from text. */
export function stripValuesTagRequestBlocks(content: string): string {
  if (!content) return "";
  return content
    .replace(VALUES_TAG_REQUEST_BLOCK_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Detects whether content contains an open [VALUES_TAG_REQUEST] tag without a
 * matching closing tag. Used to switch the chat UI to a "building..."
 * placeholder during streaming.
 */
export function hasOpenValuesTagRequestBlock(content: string): boolean {
  if (!content) return false;
  const openCount = (content.match(/\[VALUES_TAG_REQUEST\b/g) ?? []).length;
  const closeCount = (content.match(/\[\/VALUES_TAG_REQUEST\]/g) ?? []).length;
  return openCount > closeCount;
}

/**
 * Strips a half-emitted [VALUES_TAG_REQUEST] tag (open without close) from the
 * end of content. Returns the prose preceding the partial block.
 */
export function stripPartialValuesTagRequestBlock(content: string): string {
  if (!content) return "";
  const lastOpen = content.lastIndexOf("[VALUES_TAG_REQUEST");
  if (lastOpen === -1) return content;
  const closeAfter = content.indexOf("[/VALUES_TAG_REQUEST]", lastOpen);
  if (closeAfter !== -1) return content;
  return content.slice(0, lastOpen).replace(/\s+$/, "");
}

/* ── Race Patterns block ────────────────────────────────────────── */

/**
 * A donor-coalition slice: one taxonomy bucket with its percentage share.
 * Used by both [RACE_PATTERNS] (donorCoalition) and for compatibility with
 * the existing RaceFinalFunder shape. The name DonorBucketSlice is the
 * canonical shared type going forward.
 */
export interface DonorBucketSlice {
  label: string;
  percent: number;
}

/**
 * @deprecated Alias for DonorBucketSlice. Kept so existing consumers
 * (e.g. FunderBars.tsx) continue to compile without modification.
 */
export type RaceFinalFunder = DonorBucketSlice;

export interface SourceRef {
  name: string;
  url?: string;
}

export interface EndorsementEntry {
  name: string;
  category: string;
  orgUrl?: string;
  partisanLean?: "partisan" | "nonpartisan" | "mixed";
}

export interface RetrospectiveEntry {
  metric: string;
  value: string;
  trend: string;
  period: string;
  source: SourceRef;
}

export interface ValuesHighlight {
  issueTag: string;
  element: string;
}

export interface RacePatternsCandidate {
  id: string;
  name: string;
  incumbent: boolean;
  priorRole?: string;
  donorCoalition: DonorBucketSlice[] | null;
  donorSource?: SourceRef;
  donorUnavailable?: { reason: string };
  endorsements: EndorsementEntry[] | null;
  endorsementSource?: SourceRef;
  endorsementUnavailable?: { reason: string };
  platformAlignment: { kept: number; total: number } | null;
  alignmentSource?: SourceRef;
  alignmentUnavailable?: { reason: string };
  retrospective: RetrospectiveEntry[] | null;
  retrospectiveUnavailable?: { reason: string };
  valuesHighlight: ValuesHighlight | null;
}

export interface RacePatternsBlock {
  race: string;
  candidates: RacePatternsCandidate[];
}

const RACE_PATTERNS_BLOCK_RE =
  /\[RACE_PATTERNS\s+race="([^"]+)"\]([\s\S]*?)\[\/RACE_PATTERNS\]/g;

function sanitizeUnavailable(value: unknown): { reason: string } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  if (!isNonEmptyString(v.reason)) return undefined;
  return { reason: v.reason };
}

function sanitizeAlignment(
  value: unknown,
): { kept: number; total: number } | null | undefined {
  // Distinguish: `null` (challenger) vs missing (no record indicator) vs object
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  if (
    typeof v.kept === "number" &&
    typeof v.total === "number" &&
    Number.isFinite(v.kept) &&
    Number.isFinite(v.total) &&
    v.total > 0 &&
    v.kept >= 0 &&
    v.kept <= v.total
  ) {
    return { kept: v.kept, total: v.total };
  }
  return undefined;
}

function sanitizeDonorCoalition(
  value: unknown,
): DonorBucketSlice[] | null | undefined {
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;
  const out: DonorBucketSlice[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (
      isNonEmptyString(e.label) &&
      typeof e.percent === "number" &&
      Number.isFinite(e.percent)
    ) {
      out.push({
        label: e.label,
        percent: Math.max(0, Math.min(100, e.percent)),
      });
    }
  }
  return out.length > 0 ? out : null;
}

const PARTISAN_LEAN_VALUES = ["partisan", "nonpartisan", "mixed"] as const;
type PartisanLean = (typeof PARTISAN_LEAN_VALUES)[number];

function isValidPartisanLean(v: unknown): v is PartisanLean {
  return (
    typeof v === "string" &&
    (PARTISAN_LEAN_VALUES as readonly string[]).includes(v)
  );
}

function sanitizeEndorsements(
  value: unknown,
): EndorsementEntry[] | null | undefined {
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;
  const out: EndorsementEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (isNonEmptyString(e.name) && isNonEmptyString(e.category)) {
      const endorsed: EndorsementEntry = { name: e.name, category: e.category };
      // orgUrl: accept only non-empty strings
      if (isNonEmptyString(e.orgUrl)) {
        endorsed.orgUrl = e.orgUrl;
      }
      // partisanLean: accept only the three literal values
      if (isValidPartisanLean(e.partisanLean)) {
        endorsed.partisanLean = e.partisanLean;
      }
      out.push(endorsed);
    }
  }
  return out.length > 0 ? out : null;
}

function sanitizeRetrospective(
  value: unknown,
): RetrospectiveEntry[] | null | undefined {
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;
  const out: RetrospectiveEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const src = sanitizeSourceRef(e.source);
    if (
      isNonEmptyString(e.metric) &&
      isNonEmptyString(e.value) &&
      isNonEmptyString(e.trend) &&
      isNonEmptyString(e.period) &&
      src
    ) {
      out.push({
        metric: e.metric,
        value: e.value,
        trend: e.trend,
        period: e.period,
        source: src,
      });
    }
  }
  return out.length > 0 ? out : null;
}

function sanitizeSourceRef(value: unknown): SourceRef | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  if (!isNonEmptyString(v.name)) return undefined;
  const ref: SourceRef = { name: v.name };
  if (isNonEmptyString(v.url)) ref.url = v.url;
  return ref;
}

function sanitizeValuesHighlight(
  value: unknown,
): ValuesHighlight | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  // issueTag is required; element must be present but may be empty string
  // (empty element means the highlight couldn't be surfaced — treat as null)
  if (!isNonEmptyString(v.issueTag)) return undefined;
  if (
    typeof v.element !== "string" ||
    (v.element as string).trim().length === 0
  )
    return null;
  return { issueTag: v.issueTag, element: (v.element as string).trim() };
}

function isValidRacePatternsCandidate(
  value: unknown,
): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    isNonEmptyString(v.id) &&
    isNonEmptyString(v.name) &&
    typeof v.incumbent === "boolean"
  );
}

function buildRacePatternsCandidate(
  parsed: Record<string, unknown>,
): RacePatternsCandidate {
  const out: RacePatternsCandidate = {
    id: parsed.id as string,
    name: parsed.name as string,
    incumbent: parsed.incumbent as boolean,
    donorCoalition: null,
    endorsements: null,
    platformAlignment: null,
    retrospective: null,
    valuesHighlight: null,
  };

  if (isNonEmptyString(parsed.priorRole)) {
    out.priorRole = parsed.priorRole;
  }

  // Donor coalition
  if (Object.prototype.hasOwnProperty.call(parsed, "donorCoalition")) {
    const dc = sanitizeDonorCoalition(parsed.donorCoalition);
    out.donorCoalition = dc ?? null;
    if (out.donorCoalition !== null) {
      const ds = sanitizeSourceRef(parsed.donorSource);
      if (ds) out.donorSource = ds;
    }
  }
  const donorUnavailable = sanitizeUnavailable(parsed.donorUnavailable);
  if (donorUnavailable && out.donorCoalition === null) {
    out.donorUnavailable = donorUnavailable;
  }

  // Endorsements
  if (Object.prototype.hasOwnProperty.call(parsed, "endorsements")) {
    const endo = sanitizeEndorsements(parsed.endorsements);
    out.endorsements = endo ?? null;
    if (out.endorsements !== null) {
      const es = sanitizeSourceRef(parsed.endorsementSource);
      if (es) out.endorsementSource = es;
    }
  }
  const endorsementUnavailable = sanitizeUnavailable(
    parsed.endorsementUnavailable,
  );
  if (endorsementUnavailable && out.endorsements === null) {
    out.endorsementUnavailable = endorsementUnavailable;
  }

  // Platform alignment: explicit null = challenger; missing/invalid = unknown
  if (Object.prototype.hasOwnProperty.call(parsed, "platformAlignment")) {
    const alignment = sanitizeAlignment(parsed.platformAlignment);
    if (alignment === null) {
      out.platformAlignment = null;
    } else if (alignment) {
      out.platformAlignment = alignment;
      const as_ = sanitizeSourceRef(parsed.alignmentSource);
      if (as_) out.alignmentSource = as_;
    }
  }
  const alignmentUnavailable = sanitizeUnavailable(parsed.alignmentUnavailable);
  if (alignmentUnavailable && out.platformAlignment === null) {
    out.alignmentUnavailable = alignmentUnavailable;
  }

  // Retrospective
  if (Object.prototype.hasOwnProperty.call(parsed, "retrospective")) {
    const retro = sanitizeRetrospective(parsed.retrospective);
    out.retrospective = retro ?? null;
  }
  const retrospectiveUnavailable = sanitizeUnavailable(
    parsed.retrospectiveUnavailable,
  );
  if (retrospectiveUnavailable && out.retrospective === null) {
    out.retrospectiveUnavailable = retrospectiveUnavailable;
  }

  // Values highlight
  if (Object.prototype.hasOwnProperty.call(parsed, "valuesHighlight")) {
    const vh = sanitizeValuesHighlight(parsed.valuesHighlight);
    out.valuesHighlight = vh ?? null;
  }

  return out;
}

/**
 * Find and parse the LAST [RACE_PATTERNS] block in content.
 * Returns null if absent, malformed, or has fewer than 2 valid candidates.
 */
export function parseRacePatternsBlock(
  content: string,
): RacePatternsBlock | null {
  if (!content) return null;

  const matches = [...content.matchAll(RACE_PATTERNS_BLOCK_RE)];
  if (matches.length === 0) return null;

  const last = matches[matches.length - 1];
  const race = last[1].trim();
  const body = last[2];

  const candidates: RacePatternsCandidate[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      if (isValidRacePatternsCandidate(parsed)) {
        candidates.push(
          buildRacePatternsCandidate(parsed as Record<string, unknown>),
        );
      }
    } catch {
      // Skip malformed JSON lines.
    }
  }

  if (candidates.length < 2) return null;

  return { race, candidates };
}

/** Strip all [RACE_PATTERNS]...[/RACE_PATTERNS] blocks from text. */
export function stripRacePatternsBlocks(content: string): string {
  if (!content) return "";
  return content
    .replace(RACE_PATTERNS_BLOCK_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Detects whether content contains an open [RACE_PATTERNS...] tag without a
 * matching closing tag. Used to switch the chat UI to a "building..."
 * placeholder during streaming.
 */
export function hasOpenRacePatternsBlock(content: string): boolean {
  if (!content) return false;
  const openCount = (content.match(/\[RACE_PATTERNS\b/g) ?? []).length;
  const closeCount = (content.match(/\[\/RACE_PATTERNS\]/g) ?? []).length;
  return openCount > closeCount;
}

/**
 * Strips a half-emitted [RACE_PATTERNS...] tag (open without close) from the
 * end of content. Returns the prose preceding the partial block.
 */
export function stripPartialRacePatternsBlock(content: string): string {
  if (!content) return "";
  const lastOpen = content.lastIndexOf("[RACE_PATTERNS");
  if (lastOpen === -1) return content;
  const closeAfter = content.indexOf("[/RACE_PATTERNS]", lastOpen);
  if (closeAfter !== -1) return content;
  return content.slice(0, lastOpen).replace(/\s+$/, "");
}

/* ── Alignment Scores block ─────────────────────────────────── */

export type AlignmentVoteCast = "with" | "against";

export interface ContributingVote {
  billTitle: string;
  voteCast: AlignmentVoteCast;
  date: string;
  source: SourceRef;
}

export interface AlignmentScore {
  canonicalIssue: string;
  issueLabel: string;
  resolvedStance: string;
  kept: number;
  total: number;
  contributingVotes: ContributingVote[];
}

export interface AlignmentScoresEntry {
  candidateId: string;
  scores: AlignmentScore[] | null;
  unavailable?: { reason: string };
}

export interface AlignmentScoresBlock {
  race: string;
  entries: AlignmentScoresEntry[];
}

const ALIGNMENT_SCORES_BLOCK_RE =
  /\[ALIGNMENT_SCORES\s+race="([^"]+)"\]([\s\S]*?)\[\/ALIGNMENT_SCORES\]/g;

function sanitizeContributingVote(value: unknown): ContributingVote | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  if (!isNonEmptyString(v.billTitle)) return null;
  if (v.voteCast !== "with" && v.voteCast !== "against") return null;
  if (!isNonEmptyString(v.date)) return null;
  const src = sanitizeSourceRef(v.source);
  if (!src) return null;

  return {
    billTitle: v.billTitle,
    voteCast: v.voteCast,
    date: v.date,
    source: src,
  };
}

function sanitizeAlignmentScore(value: unknown): AlignmentScore | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  if (!isNonEmptyString(v.canonicalIssue)) return null;
  if (!isNonEmptyString(v.issueLabel)) return null;
  if (!isNonEmptyString(v.resolvedStance)) return null;

  if (
    typeof v.kept !== "number" ||
    typeof v.total !== "number" ||
    !Number.isFinite(v.kept) ||
    !Number.isFinite(v.total) ||
    !Number.isInteger(v.kept) ||
    !Number.isInteger(v.total) ||
    v.kept < 0 ||
    v.total <= 0 ||
    v.kept > v.total
  )
    return null;

  const contributingVotes: ContributingVote[] = [];
  if (Array.isArray(v.contributingVotes)) {
    for (const cv of v.contributingVotes) {
      const sanitized = sanitizeContributingVote(cv);
      if (sanitized !== null) contributingVotes.push(sanitized);
    }
  }

  return {
    canonicalIssue: v.canonicalIssue,
    issueLabel: v.issueLabel,
    resolvedStance: v.resolvedStance,
    kept: v.kept,
    total: v.total,
    contributingVotes,
  };
}

function buildAlignmentScoresEntry(
  parsed: Record<string, unknown>,
): AlignmentScoresEntry | null {
  if (!isNonEmptyString(parsed.candidateId)) return null;

  const scores: AlignmentScore[] = [];
  if (Array.isArray(parsed.scores)) {
    for (const s of parsed.scores) {
      const sanitized = sanitizeAlignmentScore(s);
      if (sanitized !== null) scores.push(sanitized);
    }
  }

  const unavailable = sanitizeUnavailable(parsed.unavailable);

  if (scores.length === 0) {
    if (!unavailable) return null; // no valid scores, no unavailable → drop entry
    return { candidateId: parsed.candidateId, scores: null, unavailable };
  }

  const entry: AlignmentScoresEntry = {
    candidateId: parsed.candidateId,
    scores,
  };
  if (unavailable) entry.unavailable = unavailable;
  return entry;
}

/**
 * Find and parse the LAST [ALIGNMENT_SCORES] block in content.
 * Returns null if absent, malformed, or has zero valid entries.
 */
export function parseAlignmentScoresBlock(
  content: string,
): AlignmentScoresBlock | null {
  if (!content) return null;

  const matches = [...content.matchAll(ALIGNMENT_SCORES_BLOCK_RE)];
  if (matches.length === 0) return null;

  const last = matches[matches.length - 1];
  const race = last[1].trim();
  const body = last[2];

  const entries: AlignmentScoresEntry[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object") {
        const entry = buildAlignmentScoresEntry(
          parsed as Record<string, unknown>,
        );
        if (entry !== null) entries.push(entry);
      }
    } catch {
      // Skip malformed JSON lines.
    }
  }

  if (entries.length === 0) return null;

  return { race, entries };
}

/** Strip all [ALIGNMENT_SCORES]...[/ALIGNMENT_SCORES] blocks from text. */
export function stripAlignmentScoresBlocks(content: string): string {
  if (!content) return "";
  return content
    .replace(ALIGNMENT_SCORES_BLOCK_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Detects whether content contains an open [ALIGNMENT_SCORES...] tag without a
 * matching closing tag. Used to switch the chat UI to a "building..."
 * placeholder during streaming.
 */
export function hasOpenAlignmentScoresBlock(content: string): boolean {
  if (!content) return false;
  const openCount = (content.match(/\[ALIGNMENT_SCORES\b/g) ?? []).length;
  const closeCount = (content.match(/\[\/ALIGNMENT_SCORES\]/g) ?? []).length;
  return openCount > closeCount;
}

/**
 * Strips a half-emitted [ALIGNMENT_SCORES...] tag (open without close) from
 * the end of content. Returns the prose preceding the partial block.
 */
export function stripPartialAlignmentScoresBlock(content: string): string {
  if (!content) return "";
  const lastOpen = content.lastIndexOf("[ALIGNMENT_SCORES");
  if (lastOpen === -1) return content;
  const closeAfter = content.indexOf("[/ALIGNMENT_SCORES]", lastOpen);
  if (closeAfter !== -1) return content;
  return content.slice(0, lastOpen).replace(/\s+$/, "");
}

/* ── Concern Interpretation block ───────────────────────────── */

export type ConcernInterpretationConfidence = "clear" | "low" | "off_topic";
export type ConcernInterpretationSourceType = "tag" | "freeText";

export interface ConcernInterpretationEntry {
  sourceType: ConcernInterpretationSourceType;
  sourceTagId?: string; // present when sourceType === "tag"
  sourceText?: string; // present when sourceType === "freeText"
  rank: number; // 1-based; preserves user-supplied rank
  interpretation: string; // human-readable
  canonicalIssue?: string; // canonical id for downstream alignment lookup
  stance?: string; // optional; LLM may include for clear-confidence entries
  confidence: ConcernInterpretationConfidence;
  disambiguationQuestion?: string; // present when confidence === "low"
  disambiguationOptions?: string[]; // present when confidence === "low"; 2-4 entries
}

export interface ConcernInterpretationBlock {
  entries: ConcernInterpretationEntry[];
}

const CONCERN_INTERPRETATION_BLOCK_RE =
  /\[CONCERN_INTERPRETATION\]([\s\S]*?)\[\/CONCERN_INTERPRETATION\]/g;

const CONCERN_INTERPRETATION_CONFIDENCE_VALUES: readonly ConcernInterpretationConfidence[] =
  ["clear", "low", "off_topic"];

function isValidConfidence(v: unknown): v is ConcernInterpretationConfidence {
  return (
    typeof v === "string" &&
    (CONCERN_INTERPRETATION_CONFIDENCE_VALUES as readonly string[]).includes(v)
  );
}

function isValidSourceType(v: unknown): v is ConcernInterpretationSourceType {
  return v === "tag" || v === "freeText";
}

/**
 * Sanitize a single parsed JSON object into a ConcernInterpretationEntry.
 * Returns null if any required field fails validation.
 *
 * Required fields: sourceType, rank (positive integer), interpretation
 * (non-empty, trimmed), confidence (one of three literals).
 *
 * When confidence === "low", both disambiguationQuestion and a non-empty
 * disambiguationOptions array are required; without them the entry is dropped.
 */
function sanitizeConcernInterpretationEntry(
  value: unknown,
): ConcernInterpretationEntry | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  // sourceType — required
  if (!isValidSourceType(v.sourceType)) return null;

  // rank — required, must be a finite positive integer
  if (
    typeof v.rank !== "number" ||
    !Number.isFinite(v.rank) ||
    !Number.isInteger(v.rank) ||
    v.rank < 1
  )
    return null;

  // interpretation — required, non-empty after trim
  if (
    typeof v.interpretation !== "string" ||
    v.interpretation.trim().length === 0
  )
    return null;

  // confidence — required, must be one of the three literals
  if (!isValidConfidence(v.confidence)) return null;

  // confidence === "low" requires disambiguationQuestion + non-empty disambiguationOptions
  if (v.confidence === "low") {
    if (
      typeof v.disambiguationQuestion !== "string" ||
      v.disambiguationQuestion.trim().length === 0
    )
      return null;
    if (
      !Array.isArray(v.disambiguationOptions) ||
      (v.disambiguationOptions as unknown[]).filter(
        (o) => typeof o === "string" && (o as string).trim().length > 0,
      ).length === 0
    )
      return null;
  }

  const entry: ConcernInterpretationEntry = {
    sourceType: v.sourceType,
    rank: v.rank,
    interpretation: v.interpretation.trim(),
    confidence: v.confidence,
  };

  // Optional fields
  if (v.sourceType === "tag" && isNonEmptyString(v.sourceTagId)) {
    entry.sourceTagId = v.sourceTagId;
  }
  if (v.sourceType === "freeText" && isNonEmptyString(v.sourceText)) {
    entry.sourceText = v.sourceText;
  }
  if (isNonEmptyString(v.canonicalIssue)) {
    entry.canonicalIssue = v.canonicalIssue;
  }
  if (isNonEmptyString(v.stance)) {
    entry.stance = v.stance;
  }
  if (v.confidence === "low") {
    entry.disambiguationQuestion = (v.disambiguationQuestion as string).trim();
    entry.disambiguationOptions = (v.disambiguationOptions as unknown[])
      .filter(
        (o): o is string =>
          typeof o === "string" && (o as string).trim().length > 0,
      )
      .map((o) => o.trim());
  }

  return entry;
}

/**
 * Find and parse the LAST [CONCERN_INTERPRETATION] block in content.
 * Returns null if absent, malformed, or has zero valid entries after
 * sanitization.
 */
export function parseConcernInterpretationBlock(
  content: string,
): ConcernInterpretationBlock | null {
  if (!content) return null;

  const matches = [...content.matchAll(CONCERN_INTERPRETATION_BLOCK_RE)];
  if (matches.length === 0) return null;

  const last = matches[matches.length - 1];
  const body = last[1];

  const entries: ConcernInterpretationEntry[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      const entry = sanitizeConcernInterpretationEntry(parsed);
      if (entry !== null) {
        entries.push(entry);
      }
    } catch {
      // Skip malformed JSON lines.
    }
  }

  if (entries.length === 0) return null;

  return { entries };
}

/** Strip all [CONCERN_INTERPRETATION]...[/CONCERN_INTERPRETATION] blocks from text. */
export function stripConcernInterpretationBlocks(content: string): string {
  if (!content) return "";
  return content
    .replace(CONCERN_INTERPRETATION_BLOCK_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Detects whether content contains an open [CONCERN_INTERPRETATION] tag without
 * a matching closing tag. Used to switch the chat UI to a "building..."
 * placeholder during streaming.
 */
export function hasOpenConcernInterpretationBlock(content: string): boolean {
  if (!content) return false;
  const openCount = (content.match(/\[CONCERN_INTERPRETATION\b/g) ?? []).length;
  const closeCount = (content.match(/\[\/CONCERN_INTERPRETATION\]/g) ?? [])
    .length;
  return openCount > closeCount;
}

/**
 * Strips a half-emitted [CONCERN_INTERPRETATION] tag (open without close) from
 * the end of content. Returns the prose preceding the partial block.
 */
export function stripPartialConcernInterpretationBlock(
  content: string,
): string {
  if (!content) return "";
  const lastOpen = content.lastIndexOf("[CONCERN_INTERPRETATION");
  if (lastOpen === -1) return content;
  const closeAfter = content.indexOf("[/CONCERN_INTERPRETATION]", lastOpen);
  if (closeAfter !== -1) return content;
  return content.slice(0, lastOpen).replace(/\s+$/, "");
}
