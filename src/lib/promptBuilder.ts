import type { StateData, Election } from "@/types/election";
import { BALLOT_PROMPT_TEXT } from "./ballotPrompt";
import { BALLOT_PROMPT_TEXT_ES } from "./ballotPrompt.es";
import { findNextElection, getDeadlineStatus } from "./electionUtils";
import { formatDateLocale } from "./i18n/formatDate";
import type { Locale } from "./i18n/types";

/**
 * Build the full customized prompt for a voter.
 * Combines the locale-appropriate ballot prompt with a locale-aware context block.
 */
export function buildPrompt(
  stateData: StateData,
  zip: string,
  locale: Locale = "en",
): string {
  const promptText =
    locale === "es" ? BALLOT_PROMPT_TEXT_ES : BALLOT_PROMPT_TEXT;
  const contextBlock = buildContextBlock(stateData, zip, locale);
  return `${promptText}\n\n---\n\n${contextBlock}`;
}

/**
 * Build the state-specific pre-filled context block.
 * Labels are in the specified locale; injected data values remain in English.
 */
export function buildContextBlock(
  stateData: StateData,
  zip: string,
  locale: Locale = "en",
): string {
  const nextElection = findNextElection(stateData.elections);
  const { registration, earlyVoting, votingRules, resources } = stateData;

  if (locale === "es") {
    return buildContextBlockEs(
      stateData,
      zip,
      nextElection,
      registration,
      earlyVoting,
      votingRules,
      resources,
    );
  }

  return buildContextBlockEn(
    stateData,
    zip,
    nextElection,
    registration,
    earlyVoting,
    votingRules,
    resources,
  );
}

// ---------------------------------------------------------------------------
// English context block
// ---------------------------------------------------------------------------

function buildContextBlockEn(
  stateData: StateData,
  zip: string,
  nextElection: Election | null,
  registration: StateData["registration"],
  earlyVoting: StateData["earlyVoting"],
  votingRules: StateData["votingRules"],
  resources: StateData["resources"],
): string {
  const locale: Locale = "en";

  const electionInfo = nextElection
    ? formatElectionInfo(nextElection, locale)
    : "No upcoming elections found — check your state election website for updates.";

  const onlineReg = registration.online.available
    ? formatDeadlineLabel(registration.online.deadline, locale)
    : "Not available";

  const byMailReg =
    formatDeadlineLabel(registration.byMail.deadline, locale) +
    (registration.byMail.sincePostmarked
      ? " — postmark date"
      : " — received date");

  const inPersonReg = formatDeadlineLabel(
    registration.inPerson.deadline,
    locale,
  );

  const earlyVotingInfo =
    earlyVoting.available && earlyVoting.startDate && earlyVoting.endDate
      ? `${formatDateLocale(earlyVoting.startDate, locale)} through ${formatDateLocale(earlyVoting.endDate, locale)}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
      : "Not available — absentee voting only";

  const voterIdInfo = votingRules.idRequired
    ? `Required. Accepted IDs: ${votingRules.acceptedIds.join(", ")}`
    : "Not required";

  return `Hi! I'm voting in **${stateData.stateName}**. My zip code is **${zip}**.

Here's what I know about my upcoming election:
- **Election:** ${electionInfo}
- **Registration deadlines:** Online by ${onlineReg}, by mail by ${byMailReg}, in person by ${inPersonReg}
- **Early voting:** ${earlyVotingInfo}
- **Voter ID:** ${voterIdInfo}
- **Phones at polls:** ${votingRules.phonesAtPollsDetail}
- **My sample ballot:** ${resources.sampleBallotLookup}
- **My county election office:** ${resources.countyElectionLookup}

Help me with my ballot.`;
}

// ---------------------------------------------------------------------------
// Spanish context block
// ---------------------------------------------------------------------------

function buildContextBlockEs(
  stateData: StateData,
  zip: string,
  nextElection: Election | null,
  registration: StateData["registration"],
  earlyVoting: StateData["earlyVoting"],
  votingRules: StateData["votingRules"],
  resources: StateData["resources"],
): string {
  const locale: Locale = "es";

  const electionInfo = nextElection
    ? formatElectionInfo(nextElection, locale)
    : "No se encontraron elecciones próximas — consulta el sitio web electoral de tu estado.";

  const onlineReg = registration.online.available
    ? formatDeadlineLabel(registration.online.deadline, locale)
    : "No disponible";

  const byMailReg =
    formatDeadlineLabel(registration.byMail.deadline, locale) +
    (registration.byMail.sincePostmarked
      ? " — fecha de matasellos"
      : " — fecha de recepción");

  const inPersonReg = formatDeadlineLabel(
    registration.inPerson.deadline,
    locale,
  );

  const earlyVotingInfo =
    earlyVoting.available && earlyVoting.startDate && earlyVoting.endDate
      ? `del ${formatDateLocale(earlyVoting.startDate, locale)} al ${formatDateLocale(earlyVoting.endDate, locale)}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
      : "No disponible — solo voto en ausencia";

  const voterIdInfo = votingRules.idRequired
    ? `Requerida. [accepted IDs in English: ${votingRules.acceptedIds.join(", ")}]`
    : "No requerida";

  return `¡Hola! Voy a votar en **${stateData.stateName}**. Mi código postal es **${zip}**.

Esto es lo que sé sobre mi próxima elección:
- **Elección:** ${electionInfo}
- **Fechas límite de registro:** En línea antes del ${onlineReg}, por correo antes del ${byMailReg}, en persona antes del ${inPersonReg}
- **Votación anticipada:** ${earlyVotingInfo}
- **Identificación para votar:** ${voterIdInfo}
- **Teléfonos en las casillas:** ${votingRules.phonesAtPollsDetail}
- **Mi boleta de muestra:** ${resources.sampleBallotLookup}
- **Mi oficina electoral del condado:** ${resources.countyElectionLookup}

Ayúdame con mi boleta.`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatElectionInfo(election: Election, locale: Locale): string {
  const dateStr = formatDateLocale(election.date, locale);
  const typeStr =
    election.isPrimary && election.primaryType
      ? `${election.primaryType} primary`
      : election.type;
  return `${election.name} on ${dateStr} (${typeStr})`;
}

function formatDeadlineLabel(deadline: string | null, locale: Locale): string {
  if (!deadline) return locale === "es" ? "No disponible" : "Not available";
  const info = getDeadlineStatus(deadline);
  return `${info.label} (${formatDateLocale(deadline, locale)})`;
}
