/**
 * getCandidateIdentity — the single source of truth for how a candidate
 * is named given blind-mode state.
 *
 * Ported from docs/design/2026-redesign/prototype/prototype-shared.jsx.
 * Every surface (candidate card, compare, all-votes, chat intro, ballot
 * pane) must use this function so the alias never leaks.
 *
 * NEEDS-KEY: aliasLabel ("Candidate A") and secondary ("identity hidden")
 * are English literals. Callers that need localised strings should build
 * their own label from `alias` and localize separately — this util stays
 * decoupled from the i18n layer.
 */

/** Minimal structural shape required by getCandidateIdentity. */
export interface CandidateIdentityInput {
  id: string;
  name: string;
  priorRole?: string;
  priorRoleOverride?: string;
}

export interface CandidateIdentityOpts {
  blindMode?: boolean;
  /** Set<id> or predicate (id) => bool. Missing/falsy = never revealed. */
  revealed?: Set<string> | ((id: string) => boolean);
  /** 0-based position of candidate in race; drives A/B/C alias. */
  index?: number;
}

export interface CandidateIdentityResult {
  isBlind: boolean;
  /** Single uppercase letter: "A", "B", "C", … */
  alias: string;
  /** NEEDS-KEY: "Candidate A" — English literal. */
  aliasLabel: string;
  /** Primary name to display (real name or aliasLabel). */
  displayName: string;
  /** Last name or aliasLabel for inline mentions. */
  displayLast: string;
  /** Role / subtitle line. NEEDS-KEY: "identity hidden" is an English literal. */
  secondary: string;
}

export function getCandidateIdentity(
  candidate: CandidateIdentityInput,
  opts?: CandidateIdentityOpts,
): CandidateIdentityResult {
  const { blindMode = false, revealed, index = 0 } = opts || {};
  const alias = String.fromCharCode(65 + index); // A, B, C…
  const aliasLabel = "Candidate " + alias; // NEEDS-KEY
  let isRevealed = false;
  if (revealed) {
    isRevealed =
      typeof revealed === "function"
        ? !!revealed(candidate.id)
        : !!(revealed.has && revealed.has(candidate.id));
  }
  const isBlind = !!blindMode && !isRevealed;
  const lastName = (candidate.name || "").split(" ").pop();
  return {
    isBlind,
    alias,
    aliasLabel,
    displayName: isBlind ? aliasLabel : candidate.name,
    displayLast: isBlind ? aliasLabel : (lastName ?? ""),
    secondary: isBlind
      ? "identity hidden" // NEEDS-KEY
      : candidate.priorRole || candidate.priorRoleOverride || "",
  };
}
