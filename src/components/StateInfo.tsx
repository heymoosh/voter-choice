"use client";

import { StateData, Election } from "@/lib/types";
import { formatDate, allDeadlinesPassed } from "@/lib/deadlineUtils";
import { useLanguage } from "@/lib/i18n";
import DeadlineStatus from "./DeadlineStatus";

interface StateInfoProps {
  stateData: StateData;
  election: Election | null;
  today: Date;
  registrationCheckUrl: string;
}

export default function StateInfo({
  stateData,
  election,
  today,
  registrationCheckUrl,
}: StateInfoProps) {
  const { lang, t } = useLanguage();
  const reg = stateData.registration;
  const ev = stateData.earlyVoting;
  const rules = stateData.votingRules;
  const resources = stateData.resources;

  const deadlines = [
    reg.online.available ? reg.online.deadline : null,
    reg.byMail.deadline,
    reg.inPerson.deadline,
  ];
  const deadlinesPassed = allDeadlinesPassed(deadlines, today);

  return (
    <section
      data-testid="state-info"
      aria-label={t("stateInfoAriaLabel", { state: stateData.stateName })}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="bg-blue-600 text-white px-6 py-4">
        <h2 className="text-xl font-bold">{stateData.stateName}</h2>
        {election ? (
          <>
            <p
              data-testid="election-name"
              className="text-blue-100 text-sm mt-1"
            >
              {election.name}
            </p>
            <p
              data-testid="election-date"
              className="text-white font-semibold text-base mt-0.5"
            >
              {formatDate(election.date, lang)}
            </p>
          </>
        ) : (
          <>
            <p
              data-testid="election-name"
              className="text-blue-100 text-sm mt-1"
            >
              {t("noElectionFound")}
            </p>
            <p data-testid="election-date" className="sr-only">
              N/A
            </p>
          </>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* No upcoming election message */}
        {!election && (
          <div
            data-testid="no-election-message"
            role="alert"
            className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700"
          >
            {lang === "es" ? (
              <>
                No se encontraron elecciones próximas para {stateData.stateName}
                . Consulta el{" "}
                <a
                  href={resources.stateElectionWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  sitio web electoral de {stateData.stateName}
                </a>{" "}
                para más información.
              </>
            ) : (
              <>
                No upcoming elections found for {stateData.stateName}. Check the{" "}
                <a
                  href={resources.stateElectionWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  {stateData.stateName} election website
                </a>{" "}
                for updates.
              </>
            )}
          </div>
        )}

        {/* All deadlines passed alert */}
        {deadlinesPassed && election && (
          <div
            role="alert"
            className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800"
          >
            <strong>{t("deadlinePassedMessage")}</strong>{" "}
            {lang === "es" ? (
              <>
                Verifica{" "}
                <a
                  href={registrationCheckUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-orange-900"
                >
                  {t("deadlinePassedLink")}
                </a>{" "}
                para confirmar que estás registrado/a.
              </>
            ) : (
              <>
                Check{" "}
                <a
                  href={registrationCheckUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-orange-900"
                >
                  {t("deadlinePassedLink")}
                </a>{" "}
                to confirm you&apos;re registered.
              </>
            )}
          </div>
        )}

        {/* Registration deadlines */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            {t("registrationDeadlinesHeading")}
          </h3>
          <div
            data-testid="registration-status"
            className="space-y-2"
            aria-label="Voter registration deadlines"
          >
            {reg.online.available && (
              <DeadlineStatus
                label={t("onlineRegistrationLabel")}
                isoDate={reg.online.deadline}
                today={today}
                additionalInfo={reg.online.url ? undefined : undefined}
              />
            )}
            {!reg.online.available && (
              <div className="p-3 rounded-lg border bg-gray-50 border-gray-200">
                <span className="text-sm font-semibold text-gray-600">
                  {t("onlineRegistrationLabel")}
                </span>
                <p className="text-sm text-gray-500 mt-0.5">
                  {t("onlineRegistrationNotAvailable")}
                </p>
              </div>
            )}
            <DeadlineStatus
              label={t("byMailLabel")}
              isoDate={reg.byMail.deadline}
              today={today}
              additionalInfo={
                reg.byMail.sincePostmarked
                  ? t("postmarkNote")
                  : t("receivedNote")
              }
            />
            <DeadlineStatus
              label={t("inPersonLabel")}
              isoDate={reg.inPerson.deadline}
              today={today}
            />
            {reg.sameDayRegistration && (
              <div className="p-3 rounded-lg border bg-green-50 border-green-200">
                <span className="text-sm font-semibold text-green-800">
                  {t("sameDayAvailable")}
                </span>
                <p className="text-sm text-green-700 mt-0.5">
                  {t("sameDayDetail")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Early voting */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            {t("earlyVotingHeading")}
          </h3>
          {ev.available && ev.startDate && ev.endDate ? (
            <div className="p-3 rounded-lg border bg-green-50 border-green-200">
              <p className="text-sm font-semibold text-green-800">
                {formatDate(ev.startDate, lang)} –{" "}
                {formatDate(ev.endDate, lang)}
              </p>
              {ev.notes && (
                <p className="text-sm text-green-700 mt-0.5">{ev.notes}</p>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-lg border bg-gray-50 border-gray-200">
              <p className="text-sm text-gray-600">
                {ev.notes ?? t("earlyVotingFallback")}
              </p>
            </div>
          )}
        </div>

        {/* Voting rules */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            {t("votingRulesHeading")}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="p-3 rounded-lg border bg-gray-50 border-gray-200">
              <span className="font-semibold text-gray-800">
                {t("photoIdLabel")}
              </span>
              <span className="text-gray-700">
                {rules.idRequired
                  ? t("photoIdRequired")
                  : t("photoIdNotRequired")}
              </span>
              {rules.idRequired && rules.acceptedIds.length > 0 && (
                <p className="text-gray-600 mt-1 text-xs">
                  Accepted: {rules.acceptedIds.slice(0, 3).join(", ")}
                  {rules.acceptedIds.length > 3 ? ", and more" : ""}
                </p>
              )}
            </div>
            <div className="p-3 rounded-lg border bg-gray-50 border-gray-200">
              <span className="font-semibold text-gray-800">
                {t("phonesAtPollsLabel")}
              </span>
              <span className="text-gray-700">{rules.phonesAtPolls}</span>
              <p className="text-gray-600 mt-1 text-xs">
                {rules.phonesAtPollsDetail}
              </p>
            </div>
          </div>
        </div>

        {/* Resources */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            {t("officialResourcesHeading")}
          </h3>
          <div className="space-y-2">
            <a
              href={resources.stateElectionWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium transition-colors min-h-[44px]"
            >
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              {t("stateElectionWebsiteLink", { state: stateData.stateName })}
            </a>
            <a
              href={resources.sampleBallotLookup}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium transition-colors min-h-[44px]"
            >
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {t("sampleBallotLink")}
            </a>
            <a
              href={resources.countyElectionLookup}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium transition-colors min-h-[44px]"
            >
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
              </svg>
              {t("countyElectionLink")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
