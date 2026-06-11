/* Rich portable scorecard prompt — the restored "take your research with
   you" contract, rebuilt for the assess-congress flow.

   Deterministic and client-built on purpose: the LLM handoff builder
   (src/lib/prompts/handoff.ts) costs budget exactly when the handoff is most
   needed (exhaustion). This carries everything a chatbot needs to continue:
   ranked priorities with direction, per-seat verdicts WITH the evidence
   basis, what's still unreviewed, and the seat's 2026 FEC filers.

   Names: real names are included regardless of blind-mode reveal state —
   the export is the voter's deliberate action and continuing research
   elsewhere requires them (the blind mechanic is an in-app judging device;
   this matches the shipped buildScorecardProfileText behavior). The address
   NEVER appears — districts are enough. */

import type {
  DelegationSeatVM,
  UserIssue,
  SeatResearch,
} from "./delegationData";
import { seatAlignmentPct } from "./delegationData";

const STANCE_TEXT: Record<string, string> = {
  in_favor: "in favor",
  opposed: "opposed",
};

function levelTag(level: string): string {
  return level === "federal" ? "FED" : level === "state" ? "STATE" : "BOTH";
}

/** One-line evidence basis for a seat — what the verdict (or future review)
 *  stands on. Honest gaps stay honest. */
function evidenceLine(
  seat: DelegationSeatVM,
  research: SeatResearch | undefined,
): string {
  const scores = seat.alignmentEntry?.scores;
  if (Array.isArray(scores) && scores.length > 0) {
    const pct = seatAlignmentPct(seat);
    let kept = 0;
    let total = 0;
    for (const row of scores as Array<Record<string, unknown>>) {
      if (
        row &&
        typeof row.kept === "number" &&
        typeof row.total === "number"
      ) {
        kept += row.kept;
        total += row.total;
      }
    }
    if (total > 0 && pct !== null) {
      return `voting record: aligned with me on ${kept} of ${total} scored votes (${pct}%)`;
    }
  }
  if (research?.status === "done")
    return "researched positions (web search, cited sources — no roll-call record)";
  return "no scoreable record on my issues yet — treat as an open question";
}

function formatRaised(totalReceipts: unknown): string {
  if (typeof totalReceipts !== "number" || totalReceipts <= 0)
    return "no funds reported";
  return `$${Math.round(totalReceipts).toLocaleString("en-US")} raised`;
}

export interface ScorecardHandoffInput {
  seats: DelegationSeatVM[];
  issues: UserIssue[];
  verdicts: Record<string, "keep" | "replace">;
  districtsLine: string;
  stateName?: string | null;
  /** getSeatResearch — evidence basis for members without a DB record. */
  researchFor?: (seatId: string) => SeatResearch | undefined;
}

export function buildScorecardHandoffPrompt(
  input: ScorecardHandoffInput,
): string {
  const { seats, issues, verdicts, districtsLine, stateName, researchFor } =
    input;
  const reviewed = seats.filter((s) => verdicts[s.id]);
  const remaining = seats.filter((s) => !verdicts[s.id]);

  const priorities = issues
    .map((i, idx) => {
      const stance = i.stance ? STANCE_TEXT[i.stance] || i.stance : null;
      return `  ${idx + 1}. ${i.interpretation}${stance ? ` — ${stance}` : ""} [${levelTag(i.level)}]`;
    })
    .join("\n");

  const verdictLines = reviewed
    .map((s) => {
      const v = verdicts[s.id] === "keep" ? "WORTH KEEPING" : "TIME TO REPLACE";
      const name = s.candidate?.name ?? s.blindLabel;
      return [
        `  • ${s.office} · ${s.districtLabel}: ${name} — ${v}`,
        `    Basis: ${evidenceLine(s, researchFor?.(s.id))}`,
      ].join("\n");
    })
    .join("\n");

  const remainingLines = remaining
    .map((s) => {
      const name = s.candidate?.name ?? s.blindLabel;
      return `  • ${s.office} · ${s.districtLabel}: ${name} — ${evidenceLine(s, researchFor?.(s.id))}`;
    })
    .join("\n");

  const challengerLines = seats
    .filter((s) => (s.challengers || []).length > 0)
    .map((s) =>
      [
        `  ${s.office} · ${s.districtLabel}:`,
        ...(s.challengers || []).map(
          (c) =>
            `    • ${c.name}${c.party ? ` (${c.party})` : ""} — ${formatRaised(c.totalReceipts)}`,
        ),
      ].join("\n"),
    )
    .join("\n");

  return [
    "MY CONGRESSIONAL SCORECARD — Voter Choice (voterchoice.app)",
    "",
    `CONTEXT: ${districtsLine}${stateName ? ` — ${stateName}` : ""}.`,
    "I assessed my sitting members of Congress against my own priorities,",
    "using their actual voting records, donor data, and cited research.",
    "",
    "MY PRIORITIES (ranked, with the direction I want):",
    priorities || "  (none locked yet)",
    "",
    `MY VERDICTS SO FAR (${reviewed.length} of ${seats.length} reviewed):`,
    verdictLines || "  (none yet)",
    ...(remaining.length > 0 ? ["", "STILL TO REVIEW:", remainingLines] : []),
    ...(challengerLines
      ? [
          "",
          "ON THE 2026 BALLOT FOR THESE SEATS (FEC filers, public record):",
          challengerLines,
        ]
      : []),
    "",
    "CONTINUE FROM HERE:",
    "- Help me keep assessing: pull voting records, donor breakdowns, and cited evidence for whatever I ask next.",
    "- Be explicit when data is missing or uncertain — never fill gaps with guesses.",
    "- Don't ask me to re-enter my address; the districts above are enough.",
    "- Stay neutral: show me records and receipts, never tell me who to vote for.",
  ].join("\n");
}
