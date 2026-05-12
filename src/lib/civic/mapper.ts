import type {
  CivicVoterInfoResponse,
  CivicRepresentativeResponse,
  BallotContest,
  BallotCandidate,
  PollingLocationInfo,
  CivicElectionInfo,
  CivicAddress,
} from "./types";

function formatCivicAddress(addr: CivicAddress): string {
  const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.zip]
    .filter(Boolean)
    .join(", ");
  return parts;
}

function extractDistricts(repResponse: CivicRepresentativeResponse | null): {
  congressional?: string;
  stateSenate?: string;
  stateHouse?: string;
} {
  if (!repResponse?.divisions) return {};

  const divisions = Object.entries(repResponse.divisions);

  const congressional = divisions.find(([id]) => /cd:\d+/.test(id))?.[1]?.name;
  const stateSenate = divisions.find(([id]) =>
    /sldu:\d+|state_senate/i.test(id),
  )?.[1]?.name;
  const stateHouse = divisions.find(([id]) =>
    /sldl:\d+|state_house/i.test(id),
  )?.[1]?.name;

  return {
    congressional: congressional ?? undefined,
    stateSenate: stateSenate ?? undefined,
    stateHouse: stateHouse ?? undefined,
  };
}

function mapCandidates(
  civicCandidates: NonNullable<
    CivicVoterInfoResponse["contests"]
  >[0]["candidates"],
  contestId: string,
): BallotCandidate[] {
  if (!civicCandidates) return [];
  return civicCandidates.map((c, index) => ({
    id: `${contestId}-candidate-${index}`,
    name: c.name,
    party: c.party,
    candidateUrl: c.candidateUrl,
    photoUrl: c.photoUrl,
    channels: c.channels,
  }));
}

function mapContests(
  contests: CivicVoterInfoResponse["contests"],
): BallotContest[] {
  if (!contests) return [];

  return contests.map((contest, index) => {
    const id = `contest-${index}`;
    const isReferendum = contest.type === "Referendum";
    const title =
      contest.office ??
      contest.referendumTitle ??
      contest.ballotTitle ??
      "Ballot Measure";
    const subtitle = contest.ballotSubTitle ?? contest.referendumSubtitle;
    const level = contest.level?.[0];
    const district = contest.district?.name;

    return {
      id,
      type: isReferendum ? "referendum" : "candidate",
      title,
      subtitle,
      district,
      level,
      candidates: mapCandidates(contest.candidates, id),
      referendumText: contest.referendumText,
      referendumProStatement: contest.referendumProStatement,
      referendumConStatement: contest.referendumConStatement,
    } satisfies BallotContest;
  });
}

function mapPollingLocation(
  locations: CivicVoterInfoResponse["pollingLocations"],
): PollingLocationInfo | undefined {
  const loc = locations?.[0];
  if (!loc) return undefined;

  return {
    name: loc.name,
    address: formatCivicAddress(loc.address),
    pollingHours: loc.pollingHours,
    notes: loc.notes,
  };
}

export function mapCivicResponseToElectionInfo(
  voterInfo: CivicVoterInfoResponse,
  repResponse: CivicRepresentativeResponse | null,
): CivicElectionInfo {
  const election = voterInfo.election
    ? {
        id: voterInfo.election.id,
        name: voterInfo.election.name,
        date: voterInfo.election.electionDay,
      }
    : undefined;

  const pollingLocation = mapPollingLocation(voterInfo.pollingLocations);
  const ballotContests = mapContests(voterInfo.contests);
  const districts = extractDistricts(repResponse);

  // Try to get county from address info
  const normalizedInput = repResponse?.normalizedInput;
  const county = normalizedInput?.city;
  const state =
    normalizedInput?.state ?? voterInfo.state?.[0]?.name ?? undefined;

  const electionInfoUrl =
    voterInfo.state?.[0]?.electionAdministrationBody?.electionInfoUrl ??
    voterInfo.election?.electionInfoUrl ??
    undefined;

  return {
    election,
    pollingLocation,
    ballotContests,
    state,
    county,
    districts,
    dataSourceAttribution:
      "Election data from Google Civic Information API and live web search via Anthropic.",
    fetchedAt: new Date().toISOString(),
    electionInfoUrl,
  };
}
