/**
 * POST /api/delegation
 *
 * Address → the voter's sitting federal delegation (House member by
 * congressional district + both Senators), for the congress-assessment flow.
 *
 * Resolution is two-step and deterministic — no LLM involved:
 *   1. US Census geocoder (free, keyless): address → state + county + CD.
 *   2. `resolveDelegation` over the GovTrack-ingested `candidates` table.
 *
 * PRIVACY: the address is used for the one upstream geocoder call and never
 * logged or persisted. The response carries only district-level geography.
 *
 * Response statuses (HTTP 200 unless noted):
 *   { status: "ok", stateCode, stateName, county, districtLabel, seats }
 *   { status: "geocode_failed" }                  — address didn't match
 *   { status: "geocode_failed" } (HTTP 502)       — geocoder down (retryable)
 *   { status: "no_representation", stateCode, territoryName }
 *   { status: "db_unavailable", stateCode, county, districtLabel }
 *
 * Rate-limited by IP (same generous read limiter as /api/race-data).
 */

import { NextRequest } from "next/server";
import { checkRaceDataRateLimit } from "../../../lib/server/race-data-rate-limit";
import { getClientIP } from "../../../lib/server/client-ip";
import { geocodeAddressToDistrict } from "../../../lib/server/census-geocode";
import { resolveDelegation } from "../../../lib/server/delegation";
import {
  lookupChallengers,
  type SeatChallengers,
} from "../../../lib/server/races";
import {
  lookupCanSeatContext,
  type CanSeatContext,
} from "../../../lib/server/can-context";
import { CAN_ATTRIBUTION } from "../../../lib/canAttribution";
import { isCan2026DisplayEnabled } from "../../../lib/server/can-flag";
import { isPacTransparencyEnabled } from "../../../lib/server/pac-transparency-flag";
import {
  lookupPacSponsors,
  emptyPacSponsors,
  type PacSponsorsResult,
} from "../../../lib/server/pac-sponsors";
import {
  lookupOutsideSpending,
  emptyOutsideSpending,
  type OutsideSpendingResult,
} from "../../../lib/server/outside-spending";
import { isOfficialRosterEnabled } from "../../../lib/server/officialRosterFlag";
import { isIncumbentSeekingReelection } from "../../../lib/server/officialRoster";

const MIN_ADDRESS = 4;
const MAX_ADDRESS = 300;

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  if (!(await checkRaceDataRateLimit(ip))) {
    return Response.json(
      { error: "Too many requests", code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const address =
    typeof (body as Record<string, unknown>)?.address === "string"
      ? ((body as Record<string, unknown>).address as string).trim()
      : "";
  if (address.length < MIN_ADDRESS || address.length > MAX_ADDRESS) {
    return Response.json({ error: "Invalid address" }, { status: 400 });
  }

  const geo = await geocodeAddressToDistrict(address);
  if (geo.status === "error") {
    return Response.json({ status: "geocode_failed" }, { status: 502 });
  }
  if (geo.status === "no_match") {
    return Response.json({ status: "geocode_failed" });
  }

  const { stateCode, stateName, county, district } = geo.result;

  // DC + territories: no voting representation in Congress — an honest
  // first-class state, not an error.
  if (district === null && isNonVotingArea(stateCode)) {
    return Response.json({
      status: "no_representation",
      stateCode,
      territoryName: stateName,
    });
  }

  let delegation;
  try {
    delegation = await resolveDelegation(stateCode, stateName, district);
  } catch (err) {
    // A DB failure mid-query degrades to the same honest state as no-DB.
    console.error("[delegation] resolver failed:", err);
    delegation = { status: "db_unavailable" as const };
  }
  if (delegation.status === "db_unavailable") {
    return Response.json({
      status: "db_unavailable",
      stateCode,
      county,
      districtLabel:
        district !== null ? districtLabel(stateCode, district) : null,
    });
  }

  // 2026 challengers for the voter's seats (FEC roster ingest). Best-effort:
  // a failure here never degrades the delegation itself.
  let challengers: SeatChallengers = { house: [], senate: [] };
  try {
    challengers = await lookupChallengers(stateCode, district);
  } catch (err) {
    console.error("[delegation] challenger lookup failed:", err);
  }
  // CAN2026 curated context (race ratings, donor trails, key-vote prose) —
  // display-side only, never a scoring input. Empty until the CAN ingest
  // runs; failures degrade to no context. Gated off until attribution terms
  // are confirmed — when disabled, skip the DB lookups entirely.
  const canContexts = isCan2026DisplayEnabled()
    ? await Promise.all(
        delegation.seats.map(async (seat): Promise<CanSeatContext | null> => {
          try {
            const ctx = await lookupCanSeatContext(
              stateCode,
              seat.chamber,
              district,
              seat.candidate?.id ?? null,
            );
            const empty =
              ctx.ratings.length === 0 &&
              !ctx.donorTrail &&
              ctx.keyVotes.length === 0;
            return empty ? null : ctx;
          } catch (err) {
            console.error("[delegation] CAN context lookup failed:", err);
            return null;
          }
        }),
      )
    : delegation.seats.map(() => null);

  // Open-seat override (e.g. AZ-01/AZ-05 2026 — the incumbent filed for a
  // different office): when an official state roster covers this seat and
  // shows no incumbent row, the sitting member is not actually running for
  // re-election even though the seat itself is up. Flag-gated + best-effort:
  // a failure here never degrades the delegation itself. Keyed by seatId so
  // the seats.map below can attach it without re-querying.
  const notSeekingReelectionSeatIds = new Set<string>();
  if (isOfficialRosterEnabled()) {
    await Promise.all(
      delegation.seats.map(async (seat) => {
        if (!seat.candidate) return;
        try {
          const seatDistrict =
            seat.chamber === "house" && district !== null
              ? String(district).padStart(2, "0")
              : null;
          const seeking = await isIncumbentSeekingReelection(
            stateCode,
            seat.chamber,
            seatDistrict,
            2026,
            seat.candidate.name,
          );
          if (seeking === false) {
            notSeekingReelectionSeatIds.add(seat.seatId);
          }
        } catch (err) {
          console.error(
            "[delegation] official-roster reelection check failed:",
            err,
          );
        }
      }),
    );
  }

  // Part 6 PAC transparency — TWO independent display blocks, one flag:
  //   topPacs        — names the PAC committees inside the funding mix's
  //                    "PACs" slice. A BREAKDOWN of money already counted;
  //                    it is never added to totalRaised or the mix.
  //   outsideSpending — independent expenditures FOR and AGAINST. NOT the
  //                    candidate's money, legally uncoordinated with the
  //                    campaign; rendered as its own block, with "for" and
  //                    "against" as two figures that are never summed,
  //                    netted, or mingled with the funding mix.
  // Both are attached here, not inside race-data.ts, so the funding-mix
  // assembly path never learns about either table (the isolation guarantee
  // in scripts/ingest/independent-expenditure-isolation.test.ts).
  // Flag-gated + best-effort: when OFF, no query runs and both fields are
  // null ("we didn't look" — distinct from the empty object below, which is
  // the honest "we looked and there is nothing on file" state the UI must
  // render as an explicit no-data line rather than a blank).
  const pacTransparencyOn = isPacTransparencyEnabled();
  const seatCandidateIds = delegation.seats
    .map((seat) => seat.candidate?.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  let pacSponsorsByCandidate = new Map<string, PacSponsorsResult>();
  let outsideSpendingByCandidate = new Map<string, OutsideSpendingResult>();
  if (pacTransparencyOn && seatCandidateIds.length > 0) {
    try {
      [pacSponsorsByCandidate, outsideSpendingByCandidate] = await Promise.all([
        lookupPacSponsors(seatCandidateIds),
        lookupOutsideSpending(seatCandidateIds),
      ]);
    } catch (err) {
      console.error("[delegation] PAC transparency lookup failed:", err);
    }
  }

  const seats = delegation.seats.map((seat, i) => ({
    ...seat,
    candidate:
      seat.candidate && notSeekingReelectionSeatIds.has(seat.seatId)
        ? { ...seat.candidate, seekingReelection2026: false }
        : seat.candidate,
    challengers:
      seat.chamber === "house"
        ? challengers.house
        : // Senate filers are statewide — only attach to seats actually up.
          seat.onBallot2026 === true
          ? challengers.senate
          : [],
    canContext: canContexts[i]
      ? { ...canContexts[i], attribution: CAN_ATTRIBUTION }
      : null,
    topPacs:
      pacTransparencyOn && seat.candidate
        ? (pacSponsorsByCandidate.get(seat.candidate.id) ?? emptyPacSponsors())
        : null,
    outsideSpending:
      pacTransparencyOn && seat.candidate
        ? (outsideSpendingByCandidate.get(seat.candidate.id) ??
          emptyOutsideSpending())
        : null,
  }));

  return Response.json({
    status: "ok",
    stateCode,
    stateName,
    county,
    districtLabel:
      district !== null ? districtLabel(stateCode, district) : null,
    seats,
  });
}

const NON_VOTING_AREAS = new Set(["DC", "PR", "GU", "VI", "AS", "MP"]);

function isNonVotingArea(stateCode: string): boolean {
  return NON_VOTING_AREAS.has(stateCode);
}

function districtLabel(stateCode: string, district: number): string {
  return district === 0
    ? `${stateCode} — At-large`
    : `${stateCode}-${String(district).padStart(2, "0")}`;
}
