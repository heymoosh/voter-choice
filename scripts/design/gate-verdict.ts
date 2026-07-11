// scripts/design/gate-verdict.ts
//
// Shared verdict-computation logic for parity-gate.ts's report.json, used by
// both parity-gate.ts's own printReport() (the source of the gate's exit
// code) and gate-summary.ts (the PR-comment tally). Extracted into its own
// module specifically so gate-summary.ts can import the real logic instead
// of hand-duplicating it — its previous copy silently ignored the CONTENT
// check entirely (only read .structural/.visual), a bug the two independent
// copies could drift on further. Zero import-time side effects: doesn't
// import parity-gate.ts itself, whose module body boots a dev server +
// browser via main() the instant it's imported (see gate-summary.ts's
// original header comment on why it never did this either).

export interface CheckResult {
  ran: boolean;
  pass?: boolean;
  skipReason?: string;
}

export interface GateResultLike {
  captureError?: string;
  structural: CheckResult;
  content: CheckResult;
  visual: CheckResult;
}

export type EvidenceBasis = "structural" | "content" | "visual";

export interface GateVerdict {
  /** true/false once a real verdict is reached; null when nothing ran for
   *  this scenario at all (fully skipped — no probe, no ref, not
   *  automatable, or capture never got scheduled). */
  pass: boolean | null;
  /** Which checks actually ran and back this verdict — shown in the report
   *  so a reader can see what a PASS was actually earned on, not just that
   *  the word "PASS" was printed. */
  evidence: EvidenceBasis[];
  /** Set when a would-be PASS is instead forced to FAIL because it would
   *  otherwise rest on visual evidence alone, with no structural/content
   *  probe AND no documented STRUCTURAL_WAIVERS reason — the gate-level
   *  rule added STOP-SHIP 2026-07-10 (see parity-gate.ts's STRUCTURAL_PROBES
   *  / STRUCTURAL_WAIVERS header comments). */
  blockedReason?: string;
}

/**
 * The gate's evidence rule: a scenario may not report an overall PASS on
 * visual evidence alone. "Alone" means neither the structural nor content
 * check ran a real probe. A documented STRUCTURAL_WAIVERS entry (its
 * skipReason starting with "WAIVED:") is treated as sufficient evidence to
 * still allow a visual-only PASS — it's an explicit, human-reviewed record
 * that a literal-class/marker probe genuinely can't apply to this surface,
 * not silence. An UNDOCUMENTED skip (no probe, no waiver — skipReason
 * starting "no structural probe defined... (undocumented...)", see
 * parity-gate.ts's runStructuralCheck) does NOT count as a waiver: that's
 * exactly the confirmed false-pass pattern STOP-SHIP 2026-07-10 found (the
 * coarse, copy-tolerant downscaled visual diff alone passing a page that
 * isn't actually built to match yet) — see parity-gate.ts's
 * DEFAULT_MAX_DIFF_RATIO doc comment for why the visual check is
 * deliberately too coarse to stand on its own as gate evidence.
 */
export function computeVerdict(r: GateResultLike): GateVerdict {
  if (r.captureError) {
    return { pass: false, evidence: [] };
  }
  const evidence: EvidenceBasis[] = [];
  if (r.structural.ran) evidence.push("structural");
  if (r.content.ran) evidence.push("content");
  if (r.visual.ran) evidence.push("visual");
  if (evidence.length === 0) return { pass: null, evidence: [] };

  const structuralOk = !r.structural.ran || r.structural.pass === true;
  const contentOk = !r.content.ran || r.content.pass === true;
  const visualOk = !r.visual.ran || r.visual.pass === true;
  const wouldPass = structuralOk && contentOk && visualOk;

  const hasStrongEvidence = r.structural.ran || r.content.ran;
  const hasDocumentedWaiver =
    !r.structural.ran && (r.structural.skipReason ?? "").startsWith("WAIVED:");

  if (wouldPass && r.visual.ran && !hasStrongEvidence && !hasDocumentedWaiver) {
    return {
      pass: false,
      evidence,
      blockedReason:
        "would PASS on visual evidence alone, with no structural/content probe and no " +
        "documented STRUCTURAL_WAIVERS reason — add a STRUCTURAL_PROBES/CONTENT_PROBES entry " +
        "or a STRUCTURAL_WAIVERS reason (see parity-gate.ts)",
    };
  }
  return { pass: wouldPass, evidence };
}
