import type { StateData, Election, BallotData } from "./types";
import { BALLOT_PROMPT_TEXT } from "./ballotPromptText";
import { BALLOT_PROMPT_TEXT_ES } from "./ballotPromptTextEs";
import type { Language } from "./i18n";
import { translations } from "./i18n";

function findNextElection(elections: Election[], today: Date): Election | null {
  const todayMs = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  const upcoming = elections.filter((e) => {
    const [y, m, d] = e.date.split("-").map(Number);
    return Date.UTC(y, m - 1, d) >= todayMs;
  });

  if (upcoming.length === 0) return null;

  // Return the earliest upcoming election
  return upcoming.reduce((a, b) => {
    const aMs = new Date(a.date + "T00:00:00Z").getTime();
    const bMs = new Date(b.date + "T00:00:00Z").getTime();
    return aMs <= bMs ? a : b;
  });
}

function formatDate(isoDate: string, language: Language = "en"): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const locale = language === "es" ? "es" : "en-US";
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatElectionType(
  election: Election,
  language: Language = "en",
): string {
  const tr = translations[language];
  const parts: string[] = [election.type];
  if (election.isPrimary && election.primaryType) {
    const primaryLabel =
      typeof tr.contextElectionTypePrimary === "function"
        ? tr.contextElectionTypePrimary(election.primaryType)
        : `${election.primaryType} primary`;
    parts.push(primaryLabel);
  }
  return parts.join(", ");
}

export function generatePrompt(
  stateData: StateData,
  zip: string,
  today: Date = new Date(),
  language: Language = "en",
  ballotData?: BallotData,
): string {
  const nextElection = findNextElection(stateData.elections, today);
  const { registration, earlyVoting, votingRules, resources, stateName } =
    stateData;
  const tr = translations[language];

  // Election block
  let electionBlock: string;
  if (nextElection) {
    const electionLabel =
      typeof tr.contextElection === "string" ? tr.contextElection : "Election";
    const electionTypeLabel =
      typeof tr.contextElectionType === "string"
        ? tr.contextElectionType
        : "Election type";
    electionBlock =
      `- **${electionLabel}:** ${nextElection.name} on ${formatDate(nextElection.date, language)}\n` +
      `- **${electionTypeLabel}:** ${formatElectionType(nextElection, language)}`;
  } else {
    const electionLabel =
      typeof tr.contextElection === "string" ? tr.contextElection : "Election";
    const noElectionText =
      typeof tr.contextNoElection === "function"
        ? tr.contextNoElection(resources.stateElectionWebsite)
        : `No upcoming elections found. Check ${resources.stateElectionWebsite} for updates.`;
    electionBlock = `- **${electionLabel}:** ${noElectionText}`;
  }

  // Registration block
  let regOnline: string;
  if (registration.online.available) {
    regOnline =
      typeof tr.contextOnline === "function"
        ? tr.contextOnline(
            formatDate(registration.online.deadline!, language),
            registration.online.url,
          )
        : `Online by ${formatDate(registration.online.deadline!, language)} (${registration.online.url})`;
  } else {
    regOnline =
      typeof tr.contextOnlineNA === "string"
        ? tr.contextOnlineNA
        : "Online registration not available";
  }

  const postmarkLabel = registration.byMail.sincePostmarked
    ? typeof tr.contextByMailPostmark === "string"
      ? tr.contextByMailPostmark
      : "postmark date"
    : typeof tr.contextByMailReceived === "string"
      ? tr.contextByMailReceived
      : "received date";

  const regByMail =
    typeof tr.contextByMail === "function"
      ? tr.contextByMail(
          formatDate(registration.byMail.deadline, language),
          postmarkLabel,
        )
      : `By mail by ${formatDate(registration.byMail.deadline, language)} (${postmarkLabel})`;

  const regInPerson =
    typeof tr.contextInPerson === "function"
      ? tr.contextInPerson(formatDate(registration.inPerson.deadline, language))
      : `In person by ${formatDate(registration.inPerson.deadline, language)}`;

  // Early voting block
  let earlyVotingBlock: string;
  if (earlyVoting.available) {
    const dates =
      typeof tr.contextEarlyVotingDates === "function"
        ? tr.contextEarlyVotingDates(
            formatDate(earlyVoting.startDate!, language),
            formatDate(earlyVoting.endDate!, language),
          )
        : `${formatDate(earlyVoting.startDate!, language)} through ${formatDate(earlyVoting.endDate!, language)}`;
    earlyVotingBlock = earlyVoting.notes
      ? `${dates} — ${earlyVoting.notes}`
      : dates;
  } else {
    earlyVotingBlock =
      typeof tr.contextEarlyVotingNA === "string"
        ? tr.contextEarlyVotingNA
        : "Not available — absentee voting only";
  }

  // Voter ID block
  const voterIdBlock = votingRules.idRequired
    ? typeof tr.contextVoterIdRequired === "function"
      ? tr.contextVoterIdRequired(votingRules.acceptedIds.join(", "))
      : `Required. Accepted IDs: ${votingRules.acceptedIds.join(", ")}`
    : typeof tr.contextVoterIdNA === "string"
      ? tr.contextVoterIdNA
      : "Not required";

  // Label getters
  // Phase 3: enrich with districts if available
  let districtSuffix = "";
  if (ballotData?.districts) {
    const parts: string[] = [];
    if (ballotData.districts.county) parts.push(ballotData.districts.county);
    if (ballotData.districts.congressionalDistrict)
      parts.push(`CD-${ballotData.districts.congressionalDistrict}`);
    if (ballotData.districts.stateSenateDistrict)
      parts.push(`SD-${ballotData.districts.stateSenateDistrict}`);
    if (parts.length > 0) districtSuffix = ` (${parts.join(", ")})`;
  }

  const greeting =
    typeof tr.contextGreeting === "function"
      ? tr.contextGreeting(stateName, zip + districtSuffix)
      : `Hi! I'm voting in **${stateName}**. My zip code is **${zip}**.`;
  const intro =
    typeof tr.contextIntro === "string"
      ? tr.contextIntro
      : "Here's what I know about my upcoming election:";
  const regLabel =
    typeof tr.contextRegistration === "string"
      ? tr.contextRegistration
      : "Registration deadlines";
  const evLabel =
    typeof tr.contextEarlyVoting === "string"
      ? tr.contextEarlyVoting
      : "Early voting";
  const voterIdLabel =
    typeof tr.contextVoterId === "string" ? tr.contextVoterId : "Voter ID";
  const phonesLabel =
    typeof tr.contextPhones === "string" ? tr.contextPhones : "Phones at polls";
  const sampleBallotLabel =
    typeof tr.contextSampleBallot === "string"
      ? tr.contextSampleBallot
      : "My sample ballot";
  const countyLabel =
    typeof tr.contextCounty === "string"
      ? tr.contextCounty
      : "My county election office";
  const closing =
    typeof tr.contextClosing === "string"
      ? tr.contextClosing
      : "Help me with my ballot.";

  // Phase 3: polling place + ballot contests blocks
  let pollingPlaceBlock = "";
  if (ballotData?.pollingLocation) {
    const pollingPlaceLabel =
      typeof tr.contextPollingPlace === "string"
        ? tr.contextPollingPlace
        : "My polling place";
    pollingPlaceBlock = `- **${pollingPlaceLabel}:** ${ballotData.pollingLocation.name}, ${ballotData.pollingLocation.address}`;
    if (ballotData.pollingLocation.hours) {
      pollingPlaceBlock += ` (${ballotData.pollingLocation.hours})`;
    }
    pollingPlaceBlock += "\n";
  }

  let ballotContestsBlock = "";
  if (ballotData?.ballotContests && ballotData.ballotContests.length > 0) {
    const ballotContestsLabel =
      typeof tr.contextBallotContests === "string"
        ? tr.contextBallotContests
        : "Races on my ballot";
    const contestList = ballotData.ballotContests
      .map((c) => {
        const candidateNames = c.candidates.map((cand) => cand.name).join(", ");
        return `${c.office}: ${candidateNames}`;
      })
      .join("; ");
    ballotContestsBlock = `- **${ballotContestsLabel}:** ${contestList}\n`;
  }

  const contextBlock =
    `${greeting}\n\n` +
    `${intro}\n` +
    `${electionBlock}\n` +
    `- **${regLabel}:** ${regOnline}, ${regByMail}, ${regInPerson}\n` +
    `- **${evLabel}:** ${earlyVotingBlock}\n` +
    `- **${voterIdLabel}:** ${voterIdBlock}\n` +
    `- **${phonesLabel}:** ${votingRules.phonesAtPollsDetail}\n` +
    pollingPlaceBlock +
    ballotContestsBlock +
    `- **${sampleBallotLabel}:** ${resources.sampleBallotLookup}\n` +
    `- **${countyLabel}:** ${resources.countyElectionLookup}\n\n` +
    `${closing}`;

  const promptText =
    language === "es" ? BALLOT_PROMPT_TEXT_ES : BALLOT_PROMPT_TEXT;
  return promptText + "\n\n" + contextBlock;
}
