/* Seat-chat system prompt for the delegation workspace.

   Builds the same grounded, non-partisan prompt the shipped per-race Q&A used
   (realData.buildRaceChatSystemPrompt), fed from a DelegationSeatVM instead of
   a ballot race. Blind-mode contract: when the seat is unrevealed, the member's
   real name must be unreachable from the prompt — name fields are replaced
   with the seat's blind label and every serialized string (vote narratives,
   research summaries) is scrubbed of the full name and surname.

   CAN2026 context is deliberately NOT included: it is display-only and always
   attributed in the UI; piping it into a generative surface risks unattributed
   restatement. */

import { buildRaceChatSystemPrompt } from "../realData";
import type {
  DelegationSeatVM,
  UserIssue,
  SeatResearch,
} from "./delegationData";

/** Whole-word replace, mirroring the shipped anonymizeText (VoterChoiceApp) —
 *  local copy so this module stays importable in node tests without the
 *  monolith's window side-effects. Case-insensitive (unlike the original)
 *  because serialized data can carry lowercase name slugs in ids/URLs. */
function replaceWholeWord(text: string, word: string, alias: string): string {
  if (!word) return text;
  const safe = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp("\\b" + safe + "\\b", "gi"), alias);
}

/** Scrub every string field of a JSON-serializable value: replace the member's
 *  full name, then surname, with the blind alias. String-level so unknown
 *  nested shapes (research summaries, vote narratives) can't leak a name. */
function scrubDeep<T>(value: T, fullName: string, alias: string): T {
  const last = (fullName || "").trim().split(/\s+/).pop() || "";
  try {
    let s = JSON.stringify(value);
    s = replaceWholeWord(s, fullName, alias);
    if (last && last !== fullName) s = replaceWholeWord(s, last, alias);
    return JSON.parse(s) as T;
  } catch {
    return value;
  }
}

export interface SeatChatPromptInput {
  seat: DelegationSeatVM;
  /** Already level-filtered for this seat (issuesForLevel). */
  userIssues: UserIssue[];
  stateCode: string;
  isRevealed: boolean;
  /** Web-search fallback scores for members without a DB record. */
  research?: SeatResearch;
}

export function buildSeatChatSystemPrompt(input: SeatChatPromptInput): string {
  const { seat, userIssues, stateCode, isRevealed, research } = input;
  const blind = !isRevealed;
  const raceLabel = `${seat.office} — ${seat.districtLabel}`;
  const cand = seat.candidate;
  const realName = cand?.name || "";
  const alias = seat.blindLabel;

  // Candidate grounding. Blind: alias the name and drop fields that identify
  // on their own (id slug, prior role, donor-source URLs embed the name).
  const candidateRaw = cand
    ? {
        name: blind ? alias : cand.name,
        party: seat.partyName,
        incumbent: true,
        ...(blind ? {} : { priorRole: cand.priorRole }),
        totalRaised: cand.totalRaised,
        fundingMix: cand.fundingMix,
        ...(blind ? {} : { donorSource: cand.donorSource }),
        donorCoalition: cand.donorCoalition,
        attendance: seat.attendance,
      }
    : null;

  // Alignment grounding: the DB-backed entry when present, else the research
  // fallback's structured scores (same surface the card renders).
  const scores =
    seat.alignmentEntry?.scores ??
    (research && research.status === "done" ? research.scores : null);
  const alignmentRaw = scores
    ? { race: raceLabel, entries: [{ scores }] }
    : null;

  const racePatterns = candidateRaw
    ? blind
      ? scrubDeep(
          { race: raceLabel, candidates: [candidateRaw] },
          realName,
          alias,
        )
      : { race: raceLabel, candidates: [candidateRaw] }
    : null;
  const alignmentScores =
    alignmentRaw && blind
      ? scrubDeep(alignmentRaw, realName, alias)
      : alignmentRaw;

  return buildRaceChatSystemPrompt({
    raceLabel,
    stateCode,
    racePatterns,
    alignmentScores,
    issues: userIssues,
    blind,
    blindClause: blind
      ? `BLIND MODE: the voter is judging this sitting member by record, not by name. The member appears ONLY as "${alias}" — their real name is deliberately withheld from you. Never state, guess, hint at, or infer the member's real name or specific identity (including from district, party, or vote history); refer to them only as "${alias}".`
      : undefined,
  });
}
