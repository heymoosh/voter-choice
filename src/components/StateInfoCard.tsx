"use client";

import { useLanguage } from "@/lib/i18n";
import type { StateData, DeadlineInfo, Election } from "@/lib/types";
import { getDeadlineStatus, formatDate } from "@/lib/date-utils";

interface DeadlineBadgeProps {
  info: DeadlineInfo;
}

function DeadlineBadge({ info }: DeadlineBadgeProps) {
  const styles: Record<string, string> = {
    green: "bg-green-100 text-green-800 border-green-300",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
    red: "bg-red-100 text-red-800 border-red-300",
    passed: "bg-gray-100 text-gray-600 border-gray-300",
    unavailable: "bg-gray-50 text-gray-500 border-gray-200",
  };
  const icons: Record<string, string> = {
    green: "\u2713",
    yellow: "!",
    red: "\u26a0",
    passed: "\u2717",
    unavailable: "\u2014",
  };

  const cls = styles[info.status] ?? styles.unavailable;
  const icon = icons[info.status] ?? "\u2014";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
      aria-label={info.label}
    >
      <span aria-hidden="true">{icon}</span>
      {info.label}
    </span>
  );
}

interface StateInfoCardProps {
  stateData: StateData;
  election: Election;
  today?: Date;
}

export function StateInfoCard({
  stateData,
  election,
  today = new Date(),
}: StateInfoCardProps) {
  const { language, t } = useLanguage();
  const { registration, earlyVoting, votingRules, resources } = stateData;

  const onlineStatus = getDeadlineStatus(
    registration.online.available ? registration.online.deadline : null,
    today,
    language,
  );
  const byMailStatus = getDeadlineStatus(
    registration.byMail.deadline,
    today,
    language,
  );
  const inPersonStatus = getDeadlineStatus(
    registration.inPerson.deadline,
    today,
    language,
  );

  return (
    <section
      data-testid="state-info"
      aria-label={t.accessibility.electionInfoFor(stateData.stateName)}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-4 text-xl font-bold text-gray-900">
        {stateData.stateName} — {t.stateInfo.titleSuffix}
      </h2>

      {/* Election */}
      <div className="mb-4 rounded-lg bg-blue-50 p-4">
        <p
          data-testid="election-name"
          className="text-base font-semibold text-blue-900"
        >
          {election.name}
        </p>
        <p data-testid="election-date" className="text-sm text-blue-700">
          {formatDate(election.date, language)}
        </p>
      </div>

      {/* Registration deadlines */}
      <div data-testid="registration-status" className="mb-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t.stateInfo.registrationDeadlines}
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          {registration.online.available ? (
            <li className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 font-medium whitespace-nowrap">
                {t.stateInfo.online}
              </span>
              <span>{formatDate(registration.online.deadline, language)}</span>
              <DeadlineBadge info={onlineStatus} />
            </li>
          ) : (
            <li className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 font-medium whitespace-nowrap">
                {t.stateInfo.online}
              </span>
              <span className="text-gray-500">{t.stateInfo.notAvailable}</span>
            </li>
          )}
          <li className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 font-medium whitespace-nowrap">
              {t.stateInfo.byMail}
            </span>
            <span>
              {formatDate(registration.byMail.deadline, language)}
              {registration.byMail.sincePostmarked
                ? ` ${t.stateInfo.postmarkNote}`
                : ` ${t.stateInfo.receivedNote}`}
            </span>
            <DeadlineBadge info={byMailStatus} />
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 font-medium whitespace-nowrap">
              {t.stateInfo.inPerson}
            </span>
            <span>{formatDate(registration.inPerson.deadline, language)}</span>
            <DeadlineBadge info={inPersonStatus} />
          </li>
          {registration.sameDayRegistration && (
            <li className="text-green-700">{t.stateInfo.sameDayAvailable}</li>
          )}
        </ul>
      </div>

      {/* Early voting */}
      <div className="mb-4">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t.stateInfo.earlyVoting}
        </h3>
        {earlyVoting.available ? (
          <p className="text-sm text-gray-700">
            {formatDate(earlyVoting.startDate, language)} –{" "}
            {formatDate(earlyVoting.endDate, language)}
            {earlyVoting.notes && (
              <span className="ml-1 text-gray-500">({earlyVoting.notes})</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            {t.stateInfo.earlyVotingNotAvailable}
            {earlyVoting.notes && ` — ${earlyVoting.notes}`}
          </p>
        )}
      </div>

      {/* Voter ID */}
      <div className="mb-4">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t.stateInfo.voterId}
        </h3>
        {votingRules.idRequired ? (
          <div className="text-sm text-gray-700">
            <p className="font-medium text-orange-700">
              {t.stateInfo.idRequired}
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-gray-600">
              {votingRules.acceptedIds.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-green-700">{t.stateInfo.idNotRequired}</p>
        )}
      </div>

      {/* Phones */}
      <div className="mb-4">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t.stateInfo.phonesAtPolls}
        </h3>
        <p className="text-sm text-gray-700">
          {votingRules.phonesAtPollsDetail}
        </p>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
        <a
          href={resources.sampleBallotLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 underline hover:text-blue-800"
        >
          {t.stateInfo.sampleBallot}
        </a>
        <a
          href={resources.countyElectionLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 underline hover:text-blue-800"
        >
          {t.stateInfo.countyOffice}
        </a>
        <a
          href={stateData.registration.registrationCheckUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 underline hover:text-blue-800"
        >
          {t.stateInfo.checkRegistration}
        </a>
      </div>
    </section>
  );
}
