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

  const seats = delegation.seats.map((seat, i) => ({
    ...seat,
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
