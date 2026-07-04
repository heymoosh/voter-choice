/* ====================================================
   VOTER CHOICE · shared primitives (design-system core)
   ====================================================
   The single source of truth for cross-cutting LOGIC that more than
   one component needs. Loaded FIRST (before components/screens/views)
   so every script references the same implementation as a bare global
   — change it here, it changes everywhere.

   This is the "shared language" layer of the design system: formatting,
   candidate identity / blind-mode labelling, and peer-funding
   comparison. Presentation primitives (FundingMixBars, DeadlineMeter,
   IssueRow, ErrorBanner) live in the component files and compose these.

   Repo targets:
     formatDollars        → REUSE existing src/lib/ballot-utils.ts →
                            formatCurrencyShort (do NOT create a new util)
     getCandidateIdentity → src/lib/candidateIdentity.ts (+ a
                            useCandidateIdentity hook over blind-mode state)
     getPeerComparison    → src/lib/peerComparison.ts
     anonymizeText        → src/lib/anonymizeText.ts (if not already present)
   ==================================================== */

/* ---------- money formatting ----------
   $1.2M / $340k / $512. Used by FunderBars, the Money-trail teaser,
   CompareModal, the print sheet — anywhere a dollar amount renders. */
function formatDollars(n) {
  if (typeof n !== "number") return "";
  if (n >= 1_000_000)
    return "$" + (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return "$" + Math.round(n / 1_000) + "k";
  return "$" + n;
}

/* ---------- candidate identity (blind mode) ----------
   ONE place that decides how a candidate is named given blind-mode
   state. Every surface (candidate card, compare, all-votes, chat intro,
   ballot pane) must agree, or the alias leaks. Returns:
     isBlind       — hide the real identity?
     alias         — "A" / "B" / "C"   (positional)
     aliasLabel    — "Candidate A"
     displayName   — what to show as the primary name
     displayLast   — last name (or alias) for inline mentions
     secondary     — role/subtitle line (hidden when blind)
   `revealed` may be a Set, a function (id)=>bool, or omitted. */
function getCandidateIdentity(candidate, opts) {
  const { blindMode = false, revealed, index = 0 } = opts || {};
  const alias = String.fromCharCode(65 + index); // A, B, C…
  const aliasLabel = "Candidate " + alias;
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
    displayLast: isBlind ? aliasLabel : lastName,
    secondary: isBlind
      ? "identity hidden"
      : candidate.priorRole || candidate.priorRoleOverride || "",
  };
}

/* ---------- peer funding comparison ----------
   "2.0× more / less raised than Candidate B" — the SAME thresholds
   everywhere (Money-trail teaser AND the comparison rails inside
   FunderBars). Below 0.85 → less, above 1.18 → more, otherwise null
   (too close to claim a difference).
     total: this candidate's total
     peers: [{ total, aliasOrName }]  (may include self; self is filtered)
   Returns null, or { kind:'more'|'less', multiplier:'2.0', peer, label }. */
function getPeerComparison(total, peers) {
  if (typeof total !== "number" || total <= 0) return null;
  if (!peers || peers.length < 2) return null;
  const others = peers.filter((p) => p.total !== total && p.total > 0);
  if (others.length === 0) return null;
  const peer = others.reduce((a, b) => (b.total > a.total ? b : a), others[0]);
  const ratio = total / peer.total;
  if (ratio < 0.85) {
    const multiplier = (1 / ratio).toFixed(1);
    return {
      kind: "less",
      multiplier,
      peer,
      label: `${multiplier}× less than ${peer.aliasOrName}`,
    };
  }
  if (ratio > 1.18) {
    const multiplier = ratio.toFixed(1);
    return {
      kind: "more",
      multiplier,
      peer,
      label: `${multiplier}× more than ${peer.aliasOrName}`,
    };
  }
  return null;
}

/* ---------- narrative anonymization ----------
   Replace a candidate's last name with their alias in AI narrative
   text when blind. Whole-word only so we don't mangle unrelated text. */
function anonymizeText(text, anonCtx) {
  if (!text || !anonCtx?.blindMode || !anonCtx?.realLastName) return text;
  const alias = anonCtx.alias || "this candidate";
  const safe = anonCtx.realLastName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp("\\b" + safe + "\\b", "g"), alias);
}

Object.assign(window, {
  formatDollars,
  getCandidateIdentity,
  getPeerComparison,
  anonymizeText,
  // Back-compat alias used by older call sites.
  __formatDollars: formatDollars,
});
