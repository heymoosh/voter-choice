/**
 * normalizeRaceLabel — convert raw extracted office strings into concise
 * canonical labels for the workspace rail, ballot pane, and print artifact.
 *
 * Why this exists: PDF extraction (and some Civic API rows) returns verbose
 * multi-clause office titles ("Member of the House of Representatives —
 * District 1st Congressional District") that break the rail's tight
 * Newsreader/IBM Plex Serif rhythm. The deriver and extraction bridge call
 * this for the user-visible `Race.label`; the raw office + district stay on
 * the underlying data structures (ExtractRace.office / ExtractRace.district)
 * for prompt construction and the printed ballot artifact.
 *
 * Heuristics ordered by specificity. Returns a sensible fallback when no
 * rule matches — never throws.
 */

/**
 * Build a concise canonical label for a race.
 *
 * @param office Raw office string from extraction or Civic
 * @param district Optional district token (numeric, "Nth", "Nth Congressional
 *                 District", or already-formed string)
 * @returns Canonical label (e.g. `"U.S. House — CD-1"`, `"U.S. Senate"`)
 */
export function normalizeRaceLabel(office: string, district?: string): string {
  const raw = (office ?? "").trim();
  if (raw.length === 0) return "";
  const districtRaw = (district ?? "").trim();

  // Constitutional-amendment questions and similar amendment ballot text are
  // not office titles — pass them through (the section bucket handles grouping).
  if (/constitutional\s+amendment/i.test(raw)) return raw;

  // ── Federal House (most-verbose-input first) ─────────────────────────
  // Matches any phrasing that lands on the federal House:
  //   - "Member of the House of Representatives"
  //   - "House of Representatives"
  //   - "U.S. House of Representatives"
  //   - "U.S. House"
  //   - "U.S. Representative" / "United States Representative"
  if (
    /^(member of\s+)?(the\s+)?(u\.?\s?s\.?|united\s+states)\s+house(\s+of\s+representatives)?$/i.test(
      raw,
    ) ||
    /^(member of\s+)?(the\s+)?house\s+of\s+representatives$/i.test(raw) ||
    /^(u\.?\s?s\.?|united\s+states)\s+representative$/i.test(raw) ||
    // FL-style phrasing surfaced by extraction: "Representative in Congress"
    // (also accepts "Representative in the Congress").
    /^representative\s+in\s+(the\s+)?congress$/i.test(raw)
  ) {
    const suffix = federalDistrictSuffix(districtRaw);
    return suffix ? `U.S. House — ${suffix}` : "U.S. House";
  }

  // ── U.S. Senate ──────────────────────────────────────────────────────
  if (/^(united\s+states|u\.?\s?s\.?)\s+senator$/i.test(raw)) {
    return "U.S. Senate";
  }

  // ── Executive ────────────────────────────────────────────────────────
  if (/^president(\s+of\s+the\s+united\s+states)?$/i.test(raw))
    return "President";
  if (/^vice\s+president$/i.test(raw)) return "Vice President";
  if (/^governor$/i.test(raw)) return "Governor";
  if (/^lieutenant\s+governor$/i.test(raw)) return "Lt. Governor";
  if (/^attorney\s+general$/i.test(raw)) return "Attorney General";
  if (/^secretary\s+of\s+state$/i.test(raw)) return "Secretary of State";

  // ── State legislature ────────────────────────────────────────────────
  // "State Senator" or bare "Senator" (Civic federal Senate is matched above)
  if (/^(state\s+)?senator$/i.test(raw)) {
    const suffix = stateDistrictSuffix(districtRaw);
    return suffix ? `State Senate — ${suffix}` : "State Senate";
  }
  if (/^state\s+representative$/i.test(raw)) {
    const suffix = stateDistrictSuffix(districtRaw);
    return suffix ? `State House — ${suffix}` : "State House";
  }

  // ── County / Municipal ───────────────────────────────────────────────
  if (
    /^members?\s+of\s+(the\s+)?(state\s+|the\s+)?board\s+of\s+county\s+commissioners?$/i.test(
      raw,
    )
  ) {
    return "County Commissioners";
  }

  // County Committee — already concise; preserve verbatim.
  if (
    /^(female|male)\s+members?\s+of\s+(the\s+)?county\s+committee$/i.test(raw)
  ) {
    return raw;
  }
  // Some ballots phrase it as "Female Member of the County Committee" (singular).
  if (
    /^(female|male)\s+member\s+of\s+(the\s+)?county\s+committee$/i.test(raw)
  ) {
    return raw;
  }

  // ── Judiciary ────────────────────────────────────────────────────────
  if (/^circuit(\s+court)?\s+judge$/i.test(raw)) return "Circuit Court Judge";
  if (/^county\s+judge$/i.test(raw)) return "County Judge";

  // ── Elections ────────────────────────────────────────────────────────
  if (/^supervisor\s+of\s+elections?$/i.test(raw)) {
    return "Supervisor of Elections";
  }

  // ── Default — compose office + district with em-dash ─────────────────
  // Caller can rely on the normalizer for the full visible label, so the
  // default branch preserves the legacy "office — district" composition.
  if (districtRaw.length === 0) return raw;
  const suffix = stateDistrictSuffix(districtRaw);
  return suffix ? `${raw} — ${suffix}` : `${raw} — ${districtRaw}`;
}

/**
 * Build the federal-district suffix used in "U.S. House — <suffix>".
 *
 *   "1"                              → "CD-1"
 *   "1st"                            → "CD-1"
 *   "1st Congressional District"     → "CD-1"
 *   "District 1"                     → "CD-1"
 *   "TX-07"                          → "TX-07" (preserve already-formed token)
 *   ""                               → ""
 */
function federalDistrictSuffix(district: string): string {
  if (district.length === 0) return "";
  const m =
    /^(?:district\s+)?(\d+)(?:st|nd|rd|th)?(?:\s+(?:congressional\s+)?district)?$/i.exec(
      district,
    );
  if (m) return `CD-${m[1]}`;
  return district;
}

/**
 * Build the state-district suffix used in "State Senate — District N".
 *
 *   "12"            → "District 12"
 *   "District 12"   → "District 12"
 *   "Ward 4 / 12"   → "" (caller falls back to the raw district)
 *   ""              → ""
 */
function stateDistrictSuffix(district: string): string {
  if (district.length === 0) return "";
  const m = /^(?:district\s+)?(\d+)(?:st|nd|rd|th)?$/i.exec(district);
  if (m) return `District ${m[1]}`;
  return "";
}
