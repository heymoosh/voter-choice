import React from "react";

/* ──────────────────────────────────────────────────────────────
 * SourcedClaim — inline citation chip
 *
 * Renders a small, clickable badge inside running prose so voters
 * can inspect where a factual claim came from.
 *
 *  - kind='source'   → subtle, footnote-y (primary tint, § glyph)
 *  - kind='advocacy' → warm/amber accent (! glyph) so voters notice
 *                       the source has a position
 *
 * If `url` is provided, click opens that URL. Otherwise we fall
 * back to a Google search for the source name.
 *
 * Tooltip uses the native `title` attribute — no JS tooltip lib;
 * one less moving part, accessible by default.
 * ────────────────────────────────────────────────────────────── */

export interface SourcedClaimProps {
  kind: "source" | "advocacy";
  name: string;
  url?: string;
}

const TIER_1_KEYWORDS = [
  "bls",
  "bjs",
  "fbi ucr",
  "fbi",
  "cdc",
  "census",
  "department of education",
  "ed ",
  "texas demographic center",
  "dps",
  "tea",
  "hhsc",
  "tec",
  "texas ethics commission",
  "harris county",
  "travis county",
  "dallas county",
  "bexar county",
];

const TIER_2_KEYWORDS = [
  "jama",
  "nejm",
  "nature",
  "science",
  "peer-reviewed",
  "university",
];

const TIER_3_KEYWORDS = [
  "pew research",
  "rand",
  "urban institute",
  "brookings",
  "aei",
  "vera institute",
  "tax foundation",
];

const CANDIDATE_BEHAVIOR_KEYWORDS = [
  "vote smart",
  "votesmart",
  "ballotpedia",
  "opensecrets",
  "tec filings",
];

function classifyTier(name: string): string {
  const n = name.toLowerCase();
  if (CANDIDATE_BEHAVIOR_KEYWORDS.some((k) => n.includes(k)))
    return "Candidate behavior";
  if (TIER_1_KEYWORDS.some((k) => n.includes(k)))
    return "Tier 1 — government / official";
  if (TIER_2_KEYWORDS.some((k) => n.includes(k)))
    return "Tier 2 — peer-reviewed";
  if (TIER_3_KEYWORDS.some((k) => n.includes(k)))
    return "Tier 3 — research org";
  return "Source";
}

function buildHref(name: string, url?: string): string {
  if (url && /^https?:\/\//i.test(url)) return url;
  return `https://www.google.com/search?q=${encodeURIComponent(name)}`;
}

export function SourcedClaim({ kind, name, url }: SourcedClaimProps) {
  const trimmedName = name.trim() || "source";
  const href = buildHref(trimmedName, url);

  const tooltip =
    kind === "advocacy"
      ? `${trimmedName} — Advocacy — click to open`
      : `${trimmedName} — ${classifyTier(trimmedName)} — click to open`;

  const baseClass =
    "inline-flex items-baseline gap-1 px-1.5 py-0.5 mx-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors no-underline align-baseline";

  const variantClass =
    kind === "advocacy"
      ? "bg-accent/15 text-accent hover:bg-accent/25"
      : "bg-primary/10 text-primary hover:bg-primary/20";

  const glyph = kind === "advocacy" ? "!" : "§";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={tooltip}
      data-citation-kind={kind}
      className={`${baseClass} ${variantClass}`}
    >
      <span className="opacity-60" aria-hidden="true">
        {glyph}
      </span>
      <span>{trimmedName}</span>
    </a>
  );
}

/**
 * Parse the body of a citation token (the text inside the brackets,
 * after the prefix and colon). Returns the source name and an
 * optional URL.
 *
 * Strategy: split on commas, check the LAST fragment for `https?://`.
 * If it matches, peel it off as the URL; rejoin the rest as the name.
 * Anything else (ISO dates, natural-language dates, multi-word names
 * with commas) stays as part of the name.
 */
export function parseCitationBody(body: string): {
  name: string;
  url?: string;
} {
  const parts = body.split(",").map((p) => p.trim());
  if (parts.length === 0) return { name: body.trim() };

  const last = parts[parts.length - 1];
  if (/^https?:\/\//i.test(last)) {
    const name = parts.slice(0, -1).join(", ").trim();
    return { name: name || last, url: last };
  }
  return { name: parts.join(", ").trim() };
}
