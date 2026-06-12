/**
 * src/lib/server/race-data.ts
 *
 * Deterministic assembly of a race's candidate-card data — NO LLM.
 *
 * This is the data source the cards-first workspace renders from. It calls
 * the same backend lookups the chat tools used (`resolveCandidateId`,
 * `lookupDonorCoalition`, `lookupAlignment`) and maps their results into the
 * exact `RacePatternsBlock` + `AlignmentScoresBlock` shapes the existing
 * `<RacePatterns>` / `<AlignmentScoreBanner>` components consume.
 *
 * Per the prototype's portability contract (COMPONENT_MAP.md §1): "Porting
 * becomes 'swap the mock literal for a fetch + parse step.'" This module is
 * that fetch — the workspace stops scraping cards out of an LLM chat message
 * and reads them from here instead.
 *
 * Coverage reality: `lookupDonorCoalition` + `lookupAlignment` cover federal
 * House/Senate and state House/Senate candidates. Non-legislative offices
 * (governor, AG, judges, county, municipal) and propositions return no data —
 * those candidates still get a card, with the prototype's "no record"
 * backstop notes. Endorsements + retrospective are always null here (the
 * prototype itself nulls them for every candidate; no canonical DB source).
 *
 * Server-only. Never import from a client component.
 */

import {
  resolveCandidateId,
  lookupAlignment,
  attachLimitedDataNotice,
  type AlignmentLookupResult,
} from "./alignment";
import {
  lookupDonorCoalition,
  FUNDING_MIX_LABELS,
  isSectorBucket,
  isIssuePacBucket,
} from "./donors";
import { lookupCandidateData, buildCandidateKey } from "./candidate-data";
import { getIssueLabel } from "../canonicalIssues";
import {
  ISSUE_PAC_LABEL_PREFIX,
  issueFromIssuePacLabel,
  ruleNameFromIssuePacLabel,
  issuePacDisplayFromRuleName,
} from "../issuePacRules";
import type {
  RacePatternsBlock,
  RacePatternsCandidate,
  AlignmentScoresBlock,
  AlignmentScoresEntry,
  AlignmentScore,
} from "../structured-blocks";

/** One ranked issue, carrying the canonical id + stance threaded from cold-open. */
export interface RaceDataIssue {
  canonicalIssue: string;
  /** Human-readable label (falls back to a title-cased id if absent). */
  issueLabel?: string;
  stance: "in_favor" | "opposed";
}

export interface RaceDataInput {
  raceId: string;
  raceLabel: string;
  /** Section bucket from the deriver: "Federal" | "State" | "County" | … */
  section: string;
  /** 2-letter state code, uppercase (e.g. "NJ"). */
  stateCode: string;
  /**
   * `candidateId` is the caller's already-resolved DB candidate id. The
   * delegation flow passes it (delegation.ts resolves each sitting member
   * authoritatively by state + district + incumbency); we then look up that id
   * DIRECTLY instead of re-resolving by name — name re-resolution can mis-hit a
   * same-name FEC-roster duplicate that carries no votes. Other callers (chat
   * tools, ballot upload) omit it and keep the name-resolution path.
   */
  candidates: { name: string; party?: string; candidateId?: string }[];
  /** Ranked issues with canonical ids; empty when the voter skipped ranking. */
  issues: RaceDataIssue[];
  electionCycle?: string;
}

export interface RaceData {
  racePatterns: RacePatternsBlock;
  /** Null when there are no ranked issues to score against. */
  alignmentScores: AlignmentScoresBlock | null;
  /**
   * Whether this race is covered by our legislative DB. False for governor,
   * judges, county, municipal, propositions — the UI can use this to phrase
   * the backstop ("no voting record for this office") accurately.
   */
  legislativeCoverage: boolean;
}

/**
 * Stable per-candidate id keyed off ROSTER ORDER (A, B, C, …), not the DB
 * UUID and not the render-time blind-mode alias. Both the RacePatterns
 * candidate and its sibling AlignmentScores entry use this same id so the
 * renderer can join them. Order-keyed so a refetch can't reassign B's data
 * to A.
 */
export function rosterIdForIndex(index: number): string {
  // A–Z, then A1, B1, … for the (vanishingly rare) >26-candidate race.
  if (index < 26) return String.fromCharCode(65 + index);
  return `${String.fromCharCode(65 + (index % 26))}${Math.floor(index / 26)}`;
}

/**
 * Map a race (office label + section + state) to the jurisdiction string the
 * DB lookups expect: "federal-house" | "federal-senate" | "state-XX-house" |
 * "state-XX-senate". Returns null for offices our DB doesn't cover (governor,
 * AG, judges, county, municipal, propositions) — the caller renders a
 * backstop card for those.
 *
 * Pure function — exhaustively unit-tested in race-data.test.ts.
 */
export function deriveLegislativeJurisdiction(
  raceLabel: string,
  section: string,
  stateCode: string,
): string | null {
  const label = (raceLabel || "").toLowerCase();
  const st = (stateCode || "").toUpperCase();
  if (!st) return null;

  const hasFederalMarker =
    /\bu\.?\s?s\.?\b/.test(label) ||
    /\bunited states\b/.test(label) ||
    /\bfederal\b/.test(label) ||
    /\bcongress(ional)?\b/.test(label) ||
    section === "Federal";
  const isSenate = /\bsenate\b/.test(label);
  const isHouse =
    /\bhouse\b/.test(label) ||
    /\brepresentative\b/.test(label) ||
    /\bassembly\b/.test(label) ||
    /\bdelegate\b/.test(label) ||
    /\bcongress(ional)?\b/.test(label) ||
    /\bcd[-\s]?\d/.test(label); // "CD-1", "CD 12"

  // Federal takes precedence: "U.S. Senate" / "U.S. House — CD-1".
  if (hasFederalMarker && section !== "State") {
    if (isSenate) return "federal-senate";
    if (isHouse) return "federal-house";
  }

  // State legislature.
  if (section === "State") {
    if (isSenate) return `state-${st}-senate`;
    // State lower chamber goes by many names: House, Assembly (NY/NJ/CA/NV/WI),
    // House of Delegates (VA/MD/WV), General Assembly. Treat any non-senate
    // legislative label in the State section as the lower house.
    if (isHouse) return `state-${st}-house`;
  }

  return null;
}

/**
 * The other federal chamber, for prior-role record fallback. Returns null for
 * non-federal jurisdictions — we only cross House↔Senate, where a candidate
 * commonly serves in one chamber then runs for the other. State-chamber
 * cross-matching is too collision-prone (redistricting, common names) to risk.
 */
export function siblingFederalChamber(jurisdiction: string): string | null {
  if (jurisdiction === "federal-senate") return "federal-house";
  if (jurisdiction === "federal-house") return "federal-senate";
  return null;
}

/** Human label for a card whose record came from the candidate's prior chamber. */
export function priorRoleLabelFor(jurisdiction: string): string {
  if (jurisdiction === "federal-house")
    return "Record shown from U.S. House service";
  if (jurisdiction === "federal-senate")
    return "Record shown from U.S. Senate service";
  return "Record shown from prior office";
}

/**
 * Map a `lookupDonorCoalition` result onto the donor-related fields of a
 * RacePatternsCandidate. Pure — no DB access.
 */
/**
 * Compute the small/large/PAC funding mix from a found donor lookup. Reads the
 * three totals-derived buckets by their canonical labels and expresses each as a
 * share of their sum. `total` is deliberately `small + large + pac` (NOT the
 * sum of ALL buckets) so the mix and its headline stay internally consistent and
 * immune to any industry/aggregate double-count in `totalRaised`. Returns
 * undefined when none of the three buckets are present (e.g. a candidate still
 * on the legacy single `total_receipts` row) so the card shows its fallback.
 */
function computeFundingMix(
  result: Extract<
    Awaited<ReturnType<typeof lookupDonorCoalition>>,
    { found: true }
  >,
): RacePatternsCandidate["fundingMix"] | undefined {
  const amountFor = (label: string) =>
    result.buckets.find((b) => b.label === label)?.amount ?? 0;
  const small = amountFor(FUNDING_MIX_LABELS.small);
  const large = amountFor(FUNDING_MIX_LABELS.large);
  const pac = amountFor(FUNDING_MIX_LABELS.pac);
  const total = small + large + pac;
  if (total <= 0) return undefined;
  const pct = (v: number) => Math.round((v / total) * 100);
  return {
    small: pct(small),
    large: pct(large),
    pac: pct(pac),
    total,
    cycle: result.chamberSwitchLabel ?? `${result.electionCycle} cycle`,
    ...(result.chamberSwitchLabel
      ? { chamberSwitchLabel: result.chamberSwitchLabel }
      : {}),
  };
}

export function donorFieldsFromResult(
  result: Awaited<ReturnType<typeof lookupDonorCoalition>>,
): Pick<
  RacePatternsCandidate,
  | "donorCoalition"
  | "donorSource"
  | "donorUnavailable"
  | "totalRaised"
  | "donorDataSource"
  | "fundingMix"
> {
  if (!result.found) {
    const reason =
      result.reason === "non_legislative_candidate"
        ? "No campaign-finance record for this office in our data"
        : result.reason === "candidate_not_resolved"
          ? "Couldn't match this candidate in our campaign-finance data"
          : "No donor data available for this candidate yet";
    return { donorCoalition: null, donorUnavailable: { reason } };
  }
  // donorCoalition feeds the UI's "Industry breakdown" (sector slices) and the
  // issue-PAC teaser, so it must carry ONLY sector + issue-PAC buckets. The
  // funding mix (small/large/PAC) is surfaced separately via `fundingMix`, and
  // the non-sector buckets (Self-funded, Party committees, Other, total_receipts)
  // form the implicit "outside named sectors" remainder the UI computes as
  // totalRaised − Σ(sector amounts). Including them here made the breakdown's
  // percentages — which are shares of totalRaised — sum past 100%.
  const coalition = result.buckets
    .filter((b) => isSectorBucket(b.label) || isIssuePacBucket(b.label))
    .map((b) => {
      if (!isIssuePacBucket(b.label)) {
        return { label: b.label, percent: b.percent, amount: b.amount };
      }
      // Issue-PAC display fields: prefer DB metadata, then fall back to the
      // editorial mapping (keyed by the ruleName embedded in the bucket label),
      // then to a humanized last resort. This keeps cards correct even when a
      // donor_aggregates row predates the rawMetadata.issuePac fields, and never
      // leaks the raw "Issue-aligned PACs — issue — ruleName" DB key to the UI.
      const ruleName = ruleNameFromIssuePacLabel(b.label);
      const mapping = ruleName ? issuePacDisplayFromRuleName(ruleName) : null;
      const displayName = b.displayName ?? mapping?.displayName;
      const fullName = b.fullName ?? mapping?.fullName;
      const advocates = b.advocates ?? mapping?.advocates;
      const mappedStance =
        mapping && mapping.stance !== "mixed" ? mapping.stance : undefined;
      const issuePacStance = b.issuePacStance ?? mappedStance;
      const alignsWith =
        b.canonicalIssue ??
        mapping?.canonicalIssue ??
        issueFromIssuePacLabel(b.label) ??
        undefined;
      return {
        label: displayName ?? humanizeIssuePacLabel(b.label),
        percent: b.percent,
        amount: b.amount,
        isIssuePAC: true,
        ...(alignsWith ? { alignsWith } : {}),
        ...(issuePacStance ? { issuePacStance } : {}),
        ...(fullName ? { fullName } : {}),
        ...(advocates ? { advocates } : {}),
      };
    });
  return {
    donorCoalition: coalition,
    totalRaised: result.totalRaised,
    donorDataSource: "voting_record",
    donorSource: { name: result.source, url: result.sourceUrl },
    fundingMix: computeFundingMix(result),
  };
}

/**
 * Last-resort readable label for an issue-PAC bucket whose ruleName isn't in the
 * mapping (e.g. a legacy 2-segment label or a since-removed rule). Turns the
 * machine key into Title Case so the raw "Issue-aligned PACs — …" string is
 * never shown. Known rules use the mapping's displayName instead.
 */
function humanizeIssuePacLabel(label: string): string {
  const rest = label.startsWith(ISSUE_PAC_LABEL_PREFIX)
    ? label.slice(ISSUE_PAC_LABEL_PREFIX.length)
    : label;
  const parts = rest.split(" — ");
  const pick = parts.length >= 2 ? parts[parts.length - 1]! : rest;
  return pick
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Build a single candidate's AlignmentScoresEntry from the per-issue lookup
 * results. Pure — no DB access. `perIssue` is the issue + its resolved
 * lookup result, in ranked order.
 *
 * - Each issue that returned `found:true` (and isn't flagged unavailable)
 *   becomes a voting_record AlignmentScore.
 * - If NO issue produced a usable score, the entry is `scores: null` with an
 *   unavailable reason so the card shows the backstop instead of an empty bar.
 */
export function alignmentEntryFromResults(
  candidateId: string,
  perIssue: Array<{
    issue: RaceDataIssue;
    result: AlignmentLookupResult;
  }>,
): AlignmentScoresEntry {
  const scores: AlignmentScore[] = [];
  for (const { issue, result } of perIssue) {
    if (!result.found) continue;
    if (result.unavailable) continue; // DB-not-configured / internal-error path
    scores.push({
      canonicalIssue: issue.canonicalIssue,
      issueLabel: issue.issueLabel || getIssueLabel(issue.canonicalIssue),
      resolvedStance: issue.stance,
      sourceType: "voting_record",
      kept: result.kept,
      total: result.total,
      contributingVotes: result.contributingVotes,
    });
  }
  if (scores.length === 0) {
    return {
      candidateId,
      scores: null,
      unavailable: {
        reason: "No voting record found for this candidate on your issues",
      },
    };
  }
  return { candidateId, scores };
}

/**
 * Assemble the full race-data payload by fanning out to the DB lookups.
 *
 * Orchestration only — the mapping logic lives in the pure helpers above so
 * it can be unit-tested without a DB. This function performs I/O.
 */
export async function assembleRaceData(
  input: RaceDataInput,
): Promise<RaceData> {
  const jurisdiction = deriveLegislativeJurisdiction(
    input.raceLabel,
    input.section,
    input.stateCode,
  );
  const legislativeCoverage = jurisdiction !== null;
  const hasIssues = input.issues.length > 0;

  const candidates: RacePatternsCandidate[] = [];
  const alignmentEntries: AlignmentScoresEntry[] = [];

  for (let i = 0; i < input.candidates.length; i++) {
    const cand = input.candidates[i];
    const id = rosterIdForIndex(i);

    // Resolve a candidate name within `jur`, falling back to the sibling
    // federal chamber for a prior-office record. A senator who served in the
    // House (e.g. Andy Kim, NJ — House 2019–2024, Senate from Dec 2024) may
    // have no scoreable `federal-senate` record; their legislative record lives
    // under `federal-house`. We surface that record and label the card so the
    // voter knows it's from the prior office. Scoped to federal House↔Senate
    // only; state-chamber cross-matching is too collision-prone to risk.
    const resolveByName = async (
      jur: string,
    ): Promise<{
      id: string | null;
      jurisdiction: string;
      priorRoleLabel?: string;
    }> => {
      const primary = await resolveCandidateId(cand.name, jur, input.stateCode);
      if (primary) return { id: primary, jurisdiction: jur };
      const sibling = siblingFederalChamber(jur);
      if (sibling) {
        const altId = await resolveCandidateId(
          cand.name,
          sibling,
          input.stateCode,
        );
        if (altId)
          return {
            id: altId,
            jurisdiction: sibling,
            priorRoleLabel: priorRoleLabelFor(sibling),
          };
      }
      return { id: null, jurisdiction: jur };
    };

    // The delegation flow passes the seat's already-resolved DB id
    // (delegation.ts resolves each sitting member authoritatively by
    // state + district + incumbency). Use it DIRECTLY — re-resolving a sitting
    // member by bare name can mis-hit a same-name FEC-roster duplicate that
    // carries no votes, which is why House incumbents fell through to the
    // web_search fallback. Callers without a pre-resolved id (chat tools,
    // ballot upload) keep the name-resolution path.
    let effectiveJurisdiction = jurisdiction;
    let candidateId: string | null = null;
    let priorRoleLabel: string | undefined;
    const usedProvidedId = Boolean(jurisdiction && cand.candidateId);
    if (jurisdiction) {
      if (cand.candidateId) {
        candidateId = cand.candidateId;
      } else {
        const resolved = await resolveByName(jurisdiction);
        candidateId = resolved.id;
        effectiveJurisdiction = resolved.jurisdiction;
        priorRoleLabel = resolved.priorRoleLabel;
      }
    }

    // Donor coalition (independent of issues) — keyed off the chamber the
    // candidate actually resolved in.
    let donorFields: ReturnType<typeof donorFieldsFromResult>;
    if (effectiveJurisdiction) {
      const donorResult = await lookupDonorCoalition(
        cand.name,
        input.stateCode,
        effectiveJurisdiction,
        input.electionCycle,
      );
      donorFields = donorFieldsFromResult(donorResult);
    } else {
      donorFields = {
        donorCoalition: null,
        donorUnavailable: {
          reason: "No campaign-finance record for this office in our data",
        },
      };
    }

    const candidateCard: RacePatternsCandidate = {
      id,
      name: cand.name,
      incumbent: false, // unknown from the roster; the DB doesn't flag it here
      ...(priorRoleLabel ? { priorRole: priorRoleLabel } : {}),
      donorCoalition: donorFields.donorCoalition,
      ...(donorFields.donorSource
        ? { donorSource: donorFields.donorSource }
        : {}),
      ...(donorFields.donorUnavailable
        ? { donorUnavailable: donorFields.donorUnavailable }
        : {}),
      ...(donorFields.totalRaised !== undefined
        ? { totalRaised: donorFields.totalRaised }
        : {}),
      ...(donorFields.donorDataSource
        ? { donorDataSource: donorFields.donorDataSource }
        : {}),
      ...(donorFields.fundingMix ? { fundingMix: donorFields.fundingMix } : {}),
      // Endorsements + retrospective: no canonical DB source. The prototype
      // nulls these for every candidate, so we match it.
      endorsements: null,
      endorsementUnavailable: {
        reason: "Endorsement data not available",
      },
      // platformAlignment (the "Voted in line with platform" ratio) is an
      // LLM-derived metric the deterministic endpoint can't compute. Emit it
      // as explicitly unavailable rather than null — null renders as
      // "Challenger — no voting record yet", which mislabels resolved
      // incumbents shown right above their real votes.
      platformAlignment: null,
      alignmentUnavailable: {
        reason: "Not scored in this view",
      },
      retrospective: null,
      retrospectiveUnavailable: {
        reason: "No performance record available for this office",
      },
      valuesHighlight: null,
    };
    candidates.push(candidateCard);

    // Alignment scores (only when we have issues).
    if (hasIssues) {
      // Score the user's issues against a resolved candidate id.
      const scoreIssues = async (
        cid: string,
      ): Promise<AlignmentScoresEntry> => {
        const perIssue = [];
        for (const issue of input.issues) {
          const result = attachLimitedDataNotice(
            await lookupAlignment(cid, issue.canonicalIssue, issue.stance),
          );
          perIssue.push({ issue, result });
        }
        return alignmentEntryFromResults(id, perIssue);
      };

      // Step 1: attempt voting-record lookup for candidates we can resolve.
      let votingEntry: AlignmentScoresEntry | null = candidateId
        ? await scoreIssues(candidateId)
        : null;

      // Safety net for the provided-id path: a seat id with no tagged votes on
      // the user's issues (e.g. a just-switched-chamber member) would otherwise
      // drop to the web_search fallback. Re-resolve by name (incl. the sibling
      // federal chamber) once and retry so a real prior-office record surfaces.
      if (usedProvidedId && (!votingEntry || votingEntry.scores === null)) {
        const resolved = await resolveByName(jurisdiction as string);
        if (resolved.id && resolved.id !== candidateId) {
          const retried = await scoreIssues(resolved.id);
          if (retried.scores !== null) {
            votingEntry = retried;
            if (resolved.priorRoleLabel)
              candidateCard.priorRole = resolved.priorRoleLabel;
          }
        }
      }

      // Step 2: if no voting record (unresolved candidate OR resolved but
      // no scores), fall back to stored web_search positions.
      if (votingEntry && votingEntry.scores !== null) {
        // Happy path — voting record found.
        alignmentEntries.push(votingEntry);
      } else {
        // Build the candidateKey for the web_search lookup.
        // For non-legislative offices (jurisdiction===null), use the race
        // section + stateCode so the key stays meaningful.
        const webKey = buildCandidateKey(
          cand.name,
          effectiveJurisdiction ??
            `${input.section}-${input.stateCode}`.toLowerCase(),
          input.electionCycle ?? "2026",
        );
        const webScores = await lookupCandidateData(
          webKey,
          input.issues.map((i) => i.canonicalIssue),
        );

        if (webScores.length > 0) {
          // Stored web_search positions available.
          alignmentEntries.push({ candidateId: id, scores: webScores });
        } else {
          // Nothing stored yet — signal that research is pending. The client
          // uses this reason string to trigger a POST /api/research-candidate.
          alignmentEntries.push({
            candidateId: id,
            scores: null,
            unavailable: {
              reason: "research_pending",
            },
          });
        }
      }
    }
  }

  return {
    racePatterns: { race: input.raceLabel, candidates },
    alignmentScores: hasIssues
      ? { race: input.raceLabel, entries: alignmentEntries }
      : null,
    legislativeCoverage,
  };
}
