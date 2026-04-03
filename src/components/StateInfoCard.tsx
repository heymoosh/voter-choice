import type {
  StateData,
  Election,
  EarlyVoting,
  RegistrationStatuses,
  DeadlineUrgency,
  DeadlineStatus,
} from "../types/election";
import { formatDate } from "../lib/date-utils";
import { useLanguage } from "../lib/i18n";
import type { Translations } from "../lib/translations";

function EarlyVotingSection({
  earlyVoting,
  t,
  lang,
}: {
  earlyVoting: EarlyVoting;
  t: Translations;
  lang: string;
}) {
  const locale = lang === "es" ? "es-US" : "en-US";
  return (
    <div className="mb-4">
      <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">
        {t.stateInfo.earlyVoting}
      </div>
      {earlyVoting.available && earlyVoting.startDate && earlyVoting.endDate ? (
        <p className="text-sm">
          {formatDate(earlyVoting.startDate, locale)} –{" "}
          {formatDate(earlyVoting.endDate, locale)}
          {earlyVoting.notes && (
            <span className="text-gray-500"> ({earlyVoting.notes})</span>
          )}
        </p>
      ) : (
        <p className="text-sm text-gray-500">{t.stateInfo.noEarlyVoting}</p>
      )}
    </div>
  );
}

interface StateInfoCardProps {
  stateData: StateData;
  nextElection: Election | null;
  regStatuses: RegistrationStatuses;
  today: Date;
}

const urgencyClasses: Record<DeadlineUrgency, string> = {
  ok: "text-green-700 bg-green-50 border-green-200",
  warning: "text-yellow-700 bg-yellow-50 border-yellow-200",
  urgent: "text-red-700 bg-red-50 border-red-200",
  passed: "text-gray-500 bg-gray-50 border-gray-200",
  na: "text-gray-400 bg-gray-50 border-gray-100",
};

function DeadlineRow({
  label,
  status,
  detail,
  t,
  lang,
}: {
  label: string;
  status: DeadlineStatus;
  detail?: string;
  t: Translations;
  lang: string;
}) {
  const locale = lang === "es" ? "es-US" : "en-US";
  const statusLabel = t.stateInfo.deadlineStatusLabel(status);
  return (
    <div
      className={`flex justify-between items-center px-3 py-2 rounded border text-sm ${urgencyClasses[status.urgency]}`}
    >
      <span className="font-medium">{label}</span>
      <span>
        {status.date ? formatDate(status.date, locale) : "N/A"} —{" "}
        <strong>{statusLabel}</strong>
        {detail && <span className="text-xs ml-1">({detail})</span>}
      </span>
    </div>
  );
}

export function StateInfoCard({
  stateData,
  nextElection,
  regStatuses,
}: StateInfoCardProps) {
  const reg = stateData.registration;
  const { t, lang } = useLanguage();
  const locale = lang === "es" ? "es-US" : "en-US";

  return (
    <section
      data-testid="state-info"
      className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
    >
      <h2 className="text-xl font-bold mb-4">
        {t.stateInfo.stateInfoTitle(stateData.stateName)}
      </h2>

      {/* Election */}
      {nextElection ? (
        <div className="mb-4">
          <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">
            {t.stateInfo.nextElection}
          </div>
          <div data-testid="election-name" className="font-semibold text-lg">
            {nextElection.name}
          </div>
          <div data-testid="election-date" className="text-gray-600">
            {formatDate(nextElection.date, locale)}
          </div>
          {nextElection.primaryType && (
            <div className="text-sm text-gray-500 mt-1">
              {t.stateInfo.primaryLabel(nextElection.primaryType)}
            </div>
          )}
        </div>
      ) : (
        <div
          data-testid="no-election-message"
          role="alert"
          className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm"
        >
          {t.stateInfo.noElectionFound(stateData.stateName)}{" "}
          <a
            href={stateData.resources.stateElectionWebsite}
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.stateInfo.checkStateWebsite}
          </a>
        </div>
      )}

      {/* Registration Deadlines */}
      <div data-testid="registration-status" className="mb-4">
        <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
          {t.stateInfo.registrationDeadlines}
        </div>

        {regStatuses.allPassed && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-2 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm"
          >
            {t.stateInfo.registrationDeadlinesPassed}{" "}
            <a
              href={reg.registrationCheckUrl}
              className="underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.stateInfo.checkRegistration}
            </a>
            .
          </div>
        )}

        <div className="flex flex-col gap-2">
          {reg.online.available && (
            <DeadlineRow
              label={t.stateInfo.onlineLabel}
              status={regStatuses.online}
              t={t}
              lang={lang}
            />
          )}
          <DeadlineRow
            label={t.stateInfo.byMailLabel}
            status={regStatuses.byMail}
            detail={
              reg.byMail.sincePostmarked
                ? t.stateInfo.postmarkDetail
                : t.stateInfo.receivedDetail
            }
            t={t}
            lang={lang}
          />
          <DeadlineRow
            label={t.stateInfo.inPersonLabel}
            status={regStatuses.inPerson}
            t={t}
            lang={lang}
          />
        </div>

        {reg.sameDayRegistration && (
          <p className="text-sm text-green-700 mt-2">
            {t.stateInfo.sameDayRegistration}
          </p>
        )}
      </div>

      {/* Early Voting */}
      <EarlyVotingSection
        earlyVoting={stateData.earlyVoting}
        t={t}
        lang={lang}
      />

      {/* Voting Rules */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">
          {t.stateInfo.votingRules}
        </div>
        <p className="text-sm">
          <strong>{t.stateInfo.voterIdLabel}</strong>{" "}
          {stateData.votingRules.idRequired
            ? t.stateInfo.voterIdRequired
            : t.stateInfo.voterIdNotRequired}
        </p>
        <p className="text-sm mt-1">
          <strong>{t.stateInfo.phonesAtPollsLabel}</strong>{" "}
          {stateData.votingRules.phonesAtPollsDetail}
        </p>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
        <a
          href={stateData.resources.countyElectionLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          {t.stateInfo.countyElectionLink}
        </a>
        <a
          href={stateData.resources.sampleBallotLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          {t.stateInfo.sampleBallotLink}
        </a>
      </div>
    </section>
  );
}
