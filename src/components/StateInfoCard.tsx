"use client";

import type { StateData, Election } from "@/lib/types";
import { getDeadlineStatus } from "@/lib/deadlineStatus";
import type { Language } from "@/lib/i18n";
import { tStr } from "@/lib/i18n";

type StateInfoCardProps = {
  stateData: StateData;
  today?: Date;
  language?: Language;
};

function formatDate(
  isoDate: string | null | undefined,
  language: Language = "en",
): string {
  if (!isoDate) return "N/A";
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

type DeadlineRowProps = {
  label: string;
  isoDate: string | null | undefined;
  today: Date;
  note?: string;
  language?: Language;
};

function DeadlineRow({
  label,
  isoDate,
  today,
  note,
  language = "en",
}: DeadlineRowProps) {
  const status = getDeadlineStatus(isoDate, today, language);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-1">
      <span className="text-sm text-gray-600 min-w-[100px] font-medium">
        {label}
      </span>
      <span className="text-sm text-gray-800">
        {formatDate(isoDate, language)}
      </span>
      <span className={`text-sm font-semibold ${status.colorClass}`}>
        {status.label}
        {note && (
          <span className="text-gray-500 font-normal text-xs ml-1">
            ({note})
          </span>
        )}
      </span>
    </div>
  );
}

function ElectionSection({
  nextElection,
  stateName,
  stateElectionWebsite,
  language = "en",
}: {
  nextElection: Election | null;
  stateName: string;
  stateElectionWebsite: string;
  language?: Language;
}) {
  return (
    <section aria-labelledby="election-heading">
      <h3
        id="election-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        {tStr(language, "nextElection")}
      </h3>
      {nextElection ? (
        <div className="space-y-1">
          <p data-testid="election-name" className="text-gray-900 font-medium">
            {nextElection.name}
          </p>
          <p data-testid="election-date" className="text-gray-600 text-sm">
            {formatDate(nextElection.date, language)}
          </p>
        </div>
      ) : (
        <p data-testid="no-election-message" className="text-gray-500 text-sm">
          {tStr(language, "noElection")} {stateName}.{" "}
          {tStr(language, "noElectionSuffix")}{" "}
          <a
            href={stateElectionWebsite}
            className="text-blue-600 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {stateElectionWebsite}
          </a>{" "}
          {tStr(language, "noElectionSuffix2")}
        </p>
      )}
    </section>
  );
}

function RegistrationSection({
  registration,
  today,
  language = "en",
}: {
  registration: StateData["registration"];
  today: Date;
  language?: Language;
}) {
  return (
    <section aria-labelledby="reg-heading" data-testid="registration-status">
      <h3
        id="reg-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        {tStr(language, "registrationDeadlines")}
      </h3>
      <div className="space-y-1">
        {registration.online.available && (
          <DeadlineRow
            label={tStr(language, "onlineLabel")}
            isoDate={registration.online.deadline}
            today={today}
            language={language}
          />
        )}
        <DeadlineRow
          label={tStr(language, "byMailLabel")}
          isoDate={registration.byMail.deadline}
          today={today}
          note={
            registration.byMail.sincePostmarked
              ? language === "es"
                ? "fecha de matasellos"
                : "postmark date"
              : language === "es"
                ? "fecha de recepción"
                : "received"
          }
          language={language}
        />
        <DeadlineRow
          label={tStr(language, "inPersonLabel")}
          isoDate={registration.inPerson.deadline}
          today={today}
          language={language}
        />
      </div>
      {registration.sameDayRegistration && (
        <p className="text-sm text-green-700 mt-2 font-medium">
          ✓ {tStr(language, "sameDayReg")}
        </p>
      )}
      <p className="text-xs text-gray-500 mt-2">
        {tStr(language, "checkRegistration")}{" "}
        <a
          href={registration.registrationCheckUrl}
          className="text-blue-600 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {registration.registrationCheckUrl}
        </a>
      </p>
    </section>
  );
}

function VotingRulesSection({
  votingRules,
  language = "en",
}: {
  votingRules: StateData["votingRules"];
  language?: Language;
}) {
  return (
    <section aria-labelledby="rules-heading">
      <h3
        id="rules-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        {tStr(language, "votingRules")}
      </h3>
      <div className="space-y-1 text-sm text-gray-700">
        <p>
          <span className="font-medium">{tStr(language, "voterId")} </span>
          {votingRules.idRequired
            ? tStr(language, "voterIdRequired")
            : tStr(language, "voterIdNotRequired")}
        </p>
        {votingRules.idRequired && votingRules.acceptedIds.length > 0 && (
          <ul className="list-disc list-inside ml-2 space-y-1">
            {votingRules.acceptedIds.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        )}
        <p>
          <span className="font-medium">
            {tStr(language, "phonesAtPolls")}{" "}
          </span>
          {votingRules.phonesAtPollsDetail}
        </p>
      </div>
    </section>
  );
}

function ResourcesSection({
  resources,
  language = "en",
}: {
  resources: StateData["resources"];
  language?: Language;
}) {
  return (
    <section aria-labelledby="resources-heading">
      <h3
        id="resources-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        {tStr(language, "resources")}
      </h3>
      <ul className="space-y-1 text-sm">
        <li>
          <a
            href={resources.stateElectionWebsite}
            className="text-blue-600 underline hover:text-blue-800"
            target="_blank"
            rel="noopener noreferrer"
          >
            {tStr(language, "stateElectionWebsite")}
          </a>
        </li>
        <li>
          <a
            href={resources.countyElectionLookup}
            className="text-blue-600 underline hover:text-blue-800"
            target="_blank"
            rel="noopener noreferrer"
          >
            {tStr(language, "countyElectionOffice")}
          </a>
        </li>
        <li>
          <a
            href={resources.sampleBallotLookup}
            className="text-blue-600 underline hover:text-blue-800"
            target="_blank"
            rel="noopener noreferrer"
          >
            {tStr(language, "sampleBallot")}
          </a>
        </li>
      </ul>
    </section>
  );
}

export function StateInfoCard({
  stateData,
  today = new Date(),
  language = "en",
}: StateInfoCardProps) {
  const {
    stateName,
    elections,
    registration,
    earlyVoting,
    votingRules,
    resources,
  } = stateData;

  const todayMs = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  const nextElection =
    elections.find((e) => {
      const [y, m, d] = e.date.split("-").map(Number);
      return Date.UTC(y, m - 1, d) >= todayMs;
    }) ?? null;

  return (
    <div
      data-testid="state-info"
      className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5"
    >
      <div>
        <h2 className="text-xl font-bold text-gray-900">{stateName}</h2>
        <p className="text-sm text-gray-500">
          {tStr(language, "dataLastUpdated")}{" "}
          {formatDate(stateData.lastUpdated, language)}
        </p>
      </div>

      <ElectionSection
        nextElection={nextElection}
        stateName={stateName}
        stateElectionWebsite={resources.stateElectionWebsite}
        language={language}
      />

      <RegistrationSection
        registration={registration}
        today={today}
        language={language}
      />

      {earlyVoting.available && (
        <section aria-labelledby="early-voting-heading">
          <h3
            id="early-voting-heading"
            className="text-base font-semibold text-gray-800 mb-1"
          >
            {tStr(language, "earlyVoting")}
          </h3>
          <p className="text-sm text-gray-700">
            {formatDate(earlyVoting.startDate, language)} —{" "}
            {formatDate(earlyVoting.endDate, language)}
            {earlyVoting.notes && (
              <span className="text-gray-500 ml-1">({earlyVoting.notes})</span>
            )}
          </p>
        </section>
      )}

      <VotingRulesSection votingRules={votingRules} language={language} />

      <ResourcesSection resources={resources} language={language} />
    </div>
  );
}
