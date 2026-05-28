/**
 * normalizeCandidateName — display-layer title-casing for candidate
 * strings extracted from upstream PDF / Civic sources, which routinely
 * return ALL-CAPS values ("BOOKER", "NORCROSS").
 *
 * Contract (per audit Fix 1):
 *   - Fully uppercase input → title-case it word-by-word.
 *   - Mixed-case input → pass through verbatim (preserve author intent;
 *     names like "McMahon", "DeShawn", "O'Brien" already carry the right
 *     capitalisation).
 *   - Generational suffixes (`Jr.`, `Sr.`, `II`, `III`, `IV`, `V`) stay
 *     uppercase when source is uppercase — they're not normal words.
 *   - Single-letter middle initials with a trailing period (`M.`) stay
 *     uppercase within an otherwise title-cased name.
 *   - Empty / whitespace-only input → empty string (so display sites
 *     don't emit stray space).
 *
 * Apostrophe heuristic: "O'BRIEN" → "O'Brien" (the letter following the
 * apostrophe is capitalised, the rest lowercased). This is good enough
 * for the common Irish/Scottish surname patterns surfaced by ballot
 * extractions; we deliberately don't try to second-guess "MacArthur" /
 * "Macarthur" — when source is uppercase the only signal we have is
 * the letter index, so we apply a simple rule.
 *
 * Hyphenated last names: each segment is title-cased
 * ("SMITH-JONES" → "Smith-Jones").
 *
 * Why display-layer (not extraction): the raw upstream value is
 * preserved on `ExtractRace.candidates[].name` for the prompt and the
 * printable artifact's underlying source data; the normalizer is only
 * applied where the value is rendered to humans.
 */

// "Jr." / "Sr." render in title-case ("Jr.", "Sr."), but Roman numerals
// (II/III/IV/V/VI/...) stay all-uppercase — they're not normal words.
const JR_SR_SUFFIX = /^(jr|sr)\.?$/i;
const ROMAN_NUMERAL = /^[ivxlcdm]+$/i;
const MIDDLE_INITIAL = /^[a-z]\.$/i;

function isAllUpper(s: string): boolean {
  // "All upper" = at least one letter, and every letter is uppercase.
  // Punctuation / digits don't disqualify.
  let hasLetter = false;
  for (const ch of s) {
    if (ch >= "a" && ch <= "z") return false;
    if (ch >= "A" && ch <= "Z") hasLetter = true;
  }
  return hasLetter;
}

function titleCaseWord(word: string): string {
  // Roman numerals stay uppercase ("II", "III", "IV", "VIII").
  if (ROMAN_NUMERAL.test(word) && word.length >= 2) {
    return word.toUpperCase();
  }
  // Jr./Sr. render title-cased ("JR." → "Jr.").
  if (JR_SR_SUFFIX.test(word)) {
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  }
  // Middle initials stay uppercase ("M.").
  if (MIDDLE_INITIAL.test(word)) {
    return word.toUpperCase();
  }
  // Apostrophe / hyphen segments: title-case each segment between the
  // separator, so "O'BRIEN" → "O'Brien" and "SMITH-JONES" → "Smith-Jones".
  return word
    .split(/([-'])/)
    .map((segment) => {
      if (segment === "-" || segment === "'") return segment;
      if (segment.length === 0) return segment;
      return segment[0].toUpperCase() + segment.slice(1).toLowerCase();
    })
    .join("");
}

export function normalizeCandidateName(raw: string): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "";

  // If the source already has mixed case, treat that as authoritative.
  if (!isAllUpper(trimmed)) return trimmed;

  // All-uppercase → tokenise on whitespace, title-case each word.
  return trimmed.split(/\s+/).map(titleCaseWord).join(" ");
}
