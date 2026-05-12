import type { CandidateContext } from "@/lib/openstates/types";
import type { Election, StateData } from "@/types/state";

export function getNextElection(
  stateData: StateData,
  today = new Date(),
): Election | null {
  if (stateData.elections.length === 0) {
    return null;
  }

  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const upcoming = stateData.elections
    .filter((election) => new Date(`${election.date}T00:00:00`) >= startOfToday)
    .sort((left, right) => left.date.localeCompare(right.date));

  return upcoming[0] ?? stateData.elections[0];
}

function formatDate(date: string | null): string {
  if (!date) {
    return "not listed";
  }

  return date;
}

function buildCandidateContext(candidate?: CandidateContext | null): string {
  if (!candidate) {
    return "No matched OpenStates candidate or incumbent context is available yet. Do not infer missing voting records.";
  }

  const voteSummary =
    candidate.recentVotes.length > 0
      ? candidate.recentVotes
          .map((vote) => {
            const source = vote.sourceUrl ? ` Source: ${vote.sourceUrl}` : "";
            return `- ${vote.billTitle}: ${vote.option} on ${vote.date}.${source}`;
          })
          .join("\n")
      : "- No recent votes in the derived OpenStates data.";

  const sourceLinks =
    candidate.sourceLinks.length > 0
      ? candidate.sourceLinks.map((source) => `- ${source}`).join("\n")
      : "- No source links available.";

  return [
    `OpenStates candidate context:`,
    `- Name: ${candidate.name}`,
    `- Party: ${candidate.party ?? "unknown"}`,
    `- Incumbent: ${candidate.isIncumbent ? "yes" : "no"}`,
    `- Office: ${candidate.officeTitle ?? "unknown"}`,
    `- District: ${candidate.district ?? "unknown"}`,
    `Recent voting record:`,
    voteSummary,
    `Sources:`,
    sourceLinks,
  ].join("\n");
}

export function buildFullPrompt(
  stateData: StateData,
  zipCode: string,
  candidate?: CandidateContext | null,
): string {
  const election = getNextElection(stateData);
  const registration = stateData.registration;
  const earlyVoting = stateData.earlyVoting;
  const votingRules = stateData.votingRules;

  return [
    `Help me research my ballot for ${stateData.stateName} (${stateData.stateCode}) ZIP code ${zipCode}.`,
    ``,
    `Election context:`,
    `- Election: ${election?.name ?? "No upcoming election listed"}`,
    `- Election date: ${election?.date ?? "not listed"}`,
    `- Election type: ${election?.type ?? "not listed"}`,
    ``,
    `Registration context:`,
    `- Online registration: ${registration.online.available ? "available" : "not available"}`,
    `- Online deadline: ${formatDate(registration.online.deadline)}`,
    `- Mail deadline: ${formatDate(registration.byMail.deadline)}`,
    `- In-person deadline: ${formatDate(registration.inPerson.deadline)}`,
    `- Same-day registration: ${registration.sameDayRegistration ? "yes" : "no"}`,
    `- Registration check: ${registration.registrationCheckUrl}`,
    ``,
    `Voting rules:`,
    `- Early voting: ${earlyVoting.available ? `${earlyVoting.startDate} to ${earlyVoting.endDate}` : "not available"}`,
    `- Early voting notes: ${earlyVoting.notes}`,
    `- Photo ID required: ${votingRules.idRequired ? "yes" : "no"}`,
    `- Phones at polls: ${votingRules.phonesAtPolls}. ${votingRules.phonesAtPollsDetail}`,
    `- Accepted IDs: ${votingRules.acceptedIds.length > 0 ? votingRules.acceptedIds.join("; ") : "not required or not listed"}`,
    ``,
    buildCandidateContext(candidate),
    ``,
    `Use the state resources below to verify current official information before making recommendations:`,
    `- State election website: ${stateData.resources.stateElectionWebsite}`,
    `- County election lookup: ${stateData.resources.countyElectionLookup}`,
    `- Sample ballot lookup: ${stateData.resources.sampleBallotLookup}`,
    `- Polling place lookup: ${stateData.resources.pollingPlaceLookup}`,
    ``,
    `Return a concise voter research checklist, questions I should answer for each contest, and a neutral comparison framework for candidates and ballot measures.`,
  ].join("\n");
}
