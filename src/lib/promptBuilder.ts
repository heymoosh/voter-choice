import type { StateData } from "@/types/state";
import type { OpenStatesCandidateContext } from "@/lib/openstates/types";
import type { CivicElectionInfo } from "@/lib/civic/types";
import type { VoterIdInfo } from "@/data/voter-id/index";
import { getBallotPrompt } from "@/lib/i18n/prompts";
import type { Language } from "@/lib/i18n/translations";

function formatDate(date: string, language: Language = "en"): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  const locale = language === "es" ? "es-ES" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function getNextElection(
  stateData: StateData,
): StateData["elections"][number] | null {
  const today = new Date();
  const upcoming = stateData.elections
    .map((election) => ({
      election,
      time: new Date(`${election.date}T00:00:00`).getTime(),
    }))
    .filter(
      ({ time }) => !Number.isNaN(time) && time >= today.setHours(0, 0, 0, 0),
    )
    .sort((left, right) => left.time - right.time);

  return upcoming[0]?.election ?? stateData.elections[0] ?? null;
}

function describeDeadline(label: string, deadline: string | null): string {
  if (!deadline) {
    return `${label}: not available`;
  }

  return `${label}: ${formatDate(deadline)}`;
}

function describeDeadlineDate(
  deadline: string | null,
  language: Language,
): string {
  if (!deadline) {
    return language === "es" ? "no disponible" : "not available";
  }

  return formatDate(deadline, language);
}

function buildContextBlock(
  stateData: StateData,
  zip: string,
  language: Language = "en",
): string {
  const election = getNextElection(stateData);
  const registration = stateData.registration;
  const earlyVoting = stateData.earlyVoting;
  const voterId = stateData.votingRules.idRequired
    ? `Required. ${stateData.votingRules.acceptedIds.join("; ")}`
    : "Not required.";
  const phonePolicy = stateData.votingRules.phonesAtPollsDetail
    ? `${stateData.votingRules.phonesAtPolls}: ${stateData.votingRules.phonesAtPollsDetail}`
    : stateData.votingRules.phonesAtPolls;

  if (language === "es") {
    const electionLine = election
      ? `- **Elección:** ${election.name} el ${formatDate(election.date, "es")}`
      : `- **Elección:** no se encontraron elecciones próximas`;
    const typeLine = election
      ? `- **Tipo de elección:** ${election.type}${election.primaryType ? ` (primaria ${election.primaryType})` : ""}`
      : "- **Tipo de elección:** no disponible";
    const regLine = `- **Fechas límite de registro:** En línea antes del ${describeDeadlineDate(registration.online.deadline, "es")}, por correo antes del ${describeDeadlineDate(registration.byMail.deadline, "es")} (${registration.byMail.sincePostmarked ? "fecha de matasellos" : "fecha de recepción"}), en persona antes del ${describeDeadlineDate(registration.inPerson.deadline, "es")}`;
    const earlyLine = earlyVoting.available
      ? `- **Votación anticipada:** Del ${formatDate(earlyVoting.startDate ?? "", "es")} al ${formatDate(earlyVoting.endDate ?? "", "es")}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
      : "- **Votación anticipada:** No disponible";

    return [
      `¡Hola! Voy a votar en **${stateData.stateName}**. Mi código postal es **${zip}**.`,
      "",
      "Esto es lo que sé sobre mi próxima elección:",
      electionLine,
      typeLine,
      regLine,
      earlyLine,
      `- **Identificación para votar:** ${stateData.votingRules.idRequired ? `Requerida. ${stateData.votingRules.acceptedIds.join("; ")}` : "No requerida."}`,
      `- **Teléfonos en las casillas:** ${phonePolicy}`,
      `- **Mi boleta de muestra:** ${stateData.resources.sampleBallotLookup}`,
      `- **Mi oficina electoral del condado:** ${stateData.resources.countyElectionLookup}`,
      "",
      "Ayúdame con mi boleta.",
    ].join("\n");
  }

  const electionLine = election
    ? `- Election: ${election.name} on ${formatDate(election.date)}`
    : `- Election: no upcoming election found`;
  const typeLine = election
    ? `- Election type: ${election.type}${election.primaryType ? ` (${election.primaryType} primary)` : ""}`
    : "- Election type: not available";

  return [
    `Hi! I'm voting in **${stateData.stateName}**. My zip code is **${zip}**.`,
    "Here's what I know about my upcoming election:",
    electionLine,
    typeLine,
    `- Registration deadlines: ${describeDeadline("online", registration.online.deadline)}, ${describeDeadline("by mail", registration.byMail.deadline)} (sincePostmarked: ${registration.byMail.sincePostmarked ? "postmarked" : "received"}), ${describeDeadline("in person", registration.inPerson.deadline)}`,
    earlyVoting.available
      ? `- Early voting: ${formatDate(earlyVoting.startDate ?? "")} through ${formatDate(earlyVoting.endDate ?? "")}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
      : "- Early voting: not available",
    `- Voter ID: ${voterId}`,
    `- Phones at polls: ${phonePolicy}`,
    `- My sample ballot: ${stateData.resources.sampleBallotLookup}`,
    `- My county election office: ${stateData.resources.countyElectionLookup}`,
    "",
    "Help me with my ballot.",
  ].join("\n");
}

function buildOpenStatesContext(
  candidateContext?: OpenStatesCandidateContext | null,
): string {
  if (!candidateContext) {
    return "";
  }

  const officeBits = [
    candidateContext.officeLabel
      ? `Office: ${candidateContext.officeLabel}`
      : null,
    candidateContext.jurisdictionName
      ? `Jurisdiction: ${candidateContext.jurisdictionName}`
      : null,
    candidateContext.incumbent ? "Incumbent: yes" : "Incumbent: no",
  ].filter(Boolean);
  const voteLine = candidateContext.recentVoteSummary
    ? `Recent voting record: ${candidateContext.recentVoteSummary}`
    : null;
  const sourceLine = candidateContext.sourceUrls.length
    ? `Sources: ${candidateContext.sourceUrls.join(", ")}`
    : null;

  return [
    "OpenStates enrichment:",
    `- Candidate: ${candidateContext.displayName}`,
    `- Identity: ${candidateContext.personId}${candidateContext.primaryParty ? ` (${candidateContext.primaryParty})` : ""}`,
    ...officeBits.map((bit) => `- ${bit}`),
    voteLine ? `- ${voteLine}` : null,
    sourceLine ? `- ${sourceLine}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCivicContextBlock(
  civicData: CivicElectionInfo,
  voterIdInfo: VoterIdInfo | null,
  zip: string,
  language: Language,
): string {
  const lines: string[] = [];

  // Districts
  const districts = civicData.districts;
  const districtParts = [
    civicData.county ? civicData.county : null,
    districts?.congressional
      ? `Congressional: ${districts.congressional}`
      : null,
    districts?.stateSenate ? `State Senate: ${districts.stateSenate}` : null,
    districts?.stateHouse ? `State House: ${districts.stateHouse}` : null,
  ].filter(Boolean);

  const zipLine = districtParts.length
    ? `${zip} (${districtParts.join(", ")})`
    : zip;

  if (language === "es") {
    lines.push(`¡Hola! Voy a votar. Mi código postal es **${zipLine}**.`);
    lines.push("");
  } else {
    lines.push(`Hi! I'm voting. My zip code is **${zipLine}**.`);
    lines.push("Here's what I know about my upcoming election:");
  }

  // Election
  if (civicData.election) {
    const dateStr = civicData.election.date;
    const formattedDate =
      language === "es"
        ? new Intl.DateTimeFormat("es-ES", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${dateStr}T00:00:00`))
        : new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${dateStr}T00:00:00`));
    lines.push(
      language === "es"
        ? `- Elección: ${civicData.election.name} el ${formattedDate}`
        : `- Election: ${civicData.election.name} on ${formattedDate}`,
    );
  }

  // Polling location
  if (civicData.pollingLocation) {
    const loc = civicData.pollingLocation;
    const locationStr = loc.name ? `${loc.name}, ${loc.address}` : loc.address;
    lines.push(
      language === "es"
        ? `- Lugar de votación: ${locationStr}${loc.pollingHours ? ` (${loc.pollingHours})` : ""}`
        : `- Polling place: ${locationStr}${loc.pollingHours ? ` (${loc.pollingHours})` : ""}`,
    );
  }

  // Ballot contests (top 5 to keep prompt manageable)
  const contests = civicData.ballotContests.slice(0, 5);
  if (contests.length > 0) {
    lines.push(
      language === "es" ? "- Mi boleta incluye:" : "- My ballot includes:",
    );
    for (const contest of contests) {
      const candidateNames =
        contest.candidates?.map((c) => c.name).join(", ") ?? "";
      lines.push(
        `  - ${contest.title}${candidateNames ? `: ${candidateNames}` : ""}`,
      );
    }
  }

  // Voter ID
  if (voterIdInfo) {
    const idSummary = voterIdInfo.voterIdRequired
      ? language === "es"
        ? `Requerida. ${voterIdInfo.acceptedIds.slice(0, 3).join("; ")}`
        : `Required. ${voterIdInfo.acceptedIds.slice(0, 3).join("; ")}`
      : language === "es"
        ? "No requerida."
        : "Not required.";
    lines.push(
      language === "es"
        ? `- Identificación para votar: ${idSummary}`
        : `- Voter ID: ${idSummary}`,
    );
  }

  lines.push("");
  lines.push(
    language === "es" ? "Ayúdame con mi boleta." : "Help me with my ballot.",
  );

  return lines.join("\n");
}

export function buildFullPrompt(
  stateData: StateData,
  zip: string,
  candidateContext?: OpenStatesCandidateContext | null,
  language: Language = "en",
  civicData?: CivicElectionInfo | null,
  voterIdInfo?: VoterIdInfo | null,
): string {
  const basePrompt = getBallotPrompt(language);
  const openStatesBlock = buildOpenStatesContext(candidateContext);

  // If civic data is available, use it for a richer prompt
  if (civicData) {
    const civicBlock = buildCivicContextBlock(
      civicData,
      voterIdInfo ?? null,
      zip,
      language,
    );
    return [basePrompt, civicBlock, openStatesBlock]
      .filter(Boolean)
      .join("\n\n");
  }

  return [
    basePrompt,
    buildContextBlock(stateData, zip, language),
    openStatesBlock,
  ]
    .filter(Boolean)
    .join("\n\n");
}
