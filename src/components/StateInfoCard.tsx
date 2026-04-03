"use client";

import { getDeadlineStatus } from "../lib/getDeadlineStatus";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import type { StateElectionData, DeadlineStatus } from "../types/election";
import type { Language } from "../lib/translations";

interface StateInfoCardProps {
  state: StateElectionData;
}

const statusColors: Record<string, string> = {
  green: "text-green-700 bg-green-50",
  yellow: "text-yellow-700 bg-yellow-50",
  red: "text-red-700 bg-red-50",
  passed: "text-gray-500 bg-gray-50",
};

function DeadlineRow({
  label,
  status,
}: {
  label: string;
  status: DeadlineStatus;
}) {
  return (
    <div className="flex justify-between items-center text-sm py-1">
      <span className="font-medium">{label}</span>
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[status.color]}`}
      >
        {status.date} — {status.label}
      </span>
    </div>
  );
}

function EarlyVotingSection({
  earlyVoting,
  notAvailableText,
}: {
  earlyVoting: StateElectionData["earlyVoting"];
  notAvailableText: string;
}) {
  if (earlyVoting.available && earlyVoting.startDate && earlyVoting.endDate) {
    return (
      <p className="text-sm">
        {earlyVoting.startDate} through {earlyVoting.endDate}
        {earlyVoting.notes && ` — ${earlyVoting.notes}`}
      </p>
    );
  }
  return <p className="text-sm text-gray-600">{notAvailableText}</p>;
}

function VoterIdSection({
  votingRules,
  requiredText,
  notRequiredText,
}: {
  votingRules: StateElectionData["votingRules"];
  requiredText: string;
  notRequiredText: string;
}) {
  if (!votingRules.idRequired) {
    return <p className="text-sm">{notRequiredText}</p>;
  }
  return (
    <div className="text-sm">
      <p className="font-medium">{requiredText}</p>
      <ul className="list-disc list-inside mt-1 space-y-0.5">
        {votingRules.acceptedIds.map((id) => (
          <li key={id}>{id}</li>
        ))}
      </ul>
    </div>
  );
}

function RegistrationSection({
  state,
  lang,
  t,
  today,
}: {
  state: StateElectionData;
  lang: Language;
  t: (typeof translations)[Language];
  today: string;
}) {
  const onlineStatus = state.registration.online.available
    ? getDeadlineStatus(state.registration.online.deadline!, today, lang)
    : null;
  const byMailStatus = getDeadlineStatus(
    state.registration.byMail.deadline,
    today,
    lang,
  );
  const inPersonStatus = getDeadlineStatus(
    state.registration.inPerson.deadline,
    today,
    lang,
  );

  return (
    <div data-testid="registration-status" className="space-y-1">
      {onlineStatus && (
        <DeadlineRow
          label={lang === "es" ? "En línea" : "Online"}
          status={onlineStatus}
        />
      )}
      {!state.registration.online.available && (
        <div className="text-sm text-gray-500">
          {lang === "es"
            ? "Registro en línea: No disponible"
            : "Online registration: Not available"}
        </div>
      )}
      <DeadlineRow
        label={lang === "es" ? "Por correo" : "By mail"}
        status={byMailStatus}
      />
      <DeadlineRow
        label={lang === "es" ? "En persona" : "In person"}
        status={inPersonStatus}
      />
      {[
        ...(onlineStatus ? [onlineStatus] : []),
        byMailStatus,
        inPersonStatus,
      ].every((s) => s.color === "passed") && (
        <AllPassedAlert
          registrationCheckUrl={state.registration.registrationCheckUrl}
          lang={lang}
          t={t}
        />
      )}
    </div>
  );
}

function AllPassedAlert({
  registrationCheckUrl,
  lang,
  t,
}: {
  registrationCheckUrl: string;
  lang: Language;
  t: (typeof translations)[Language];
}) {
  return (
    <div
      role="alert"
      className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 mt-2"
    >
      {t.stateInfo.registrationDeadlinePassed}{" "}
      <a
        href={registrationCheckUrl}
        className="underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {lang === "es" ? "tu estado de registro" : "your registration status"}
      </a>
      .
    </div>
  );
}

export function StateInfoCard({ state }: StateInfoCardProps) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const today = new Date().toISOString().split("T")[0];

  const upcoming =
    state.elections.find((e) => e.date >= today) ?? state.elections[0];

  return (
    <div data-testid="state-info" className="rounded-lg border p-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold">{state.stateName}</h2>
        {upcoming && (
          <>
            <p data-testid="election-name" className="font-medium mt-1">
              {upcoming.name}
            </p>
            <p data-testid="election-date" className="text-gray-600 text-sm">
              {upcoming.date}
            </p>
          </>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-2">
          {t.stateInfo.registrationDeadlines}
        </h3>
        <RegistrationSection state={state} lang={lang} t={t} today={today} />
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-1">
          {t.stateInfo.earlyVoting}
        </h3>
        <EarlyVotingSection
          earlyVoting={state.earlyVoting}
          notAvailableText={t.stateInfo.earlyVotingNotAvailable}
        />
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-1">{t.stateInfo.voterId}</h3>
        <VoterIdSection
          votingRules={state.votingRules}
          requiredText={t.stateInfo.voterIdRequired}
          notRequiredText={t.stateInfo.voterIdNotRequired}
        />
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-1">
          {t.stateInfo.phonesAtPolls}
        </h3>
        <p className="text-sm">{state.votingRules.phonesAtPollsDetail}</p>
      </div>

      <div className="flex gap-4 text-sm">
        <a
          href={state.resources.countyElectionLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {t.stateInfo.countyElectionOffice}
        </a>
        <a
          href={state.resources.sampleBallotLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {t.stateInfo.sampleBallot}
        </a>
      </div>
    </div>
  );
}
