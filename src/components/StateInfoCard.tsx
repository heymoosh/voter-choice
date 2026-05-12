"use client";

import type {
  StateData,
  DeadlineInfo,
  DeadlineStatus,
  Election,
  Registration,
  EarlyVoting,
  VotingRules,
  Resources,
} from "@/types/election";
import type { LiveElectionData } from "@/types/liveElection";
import { findNextElection, getDeadlineStatus } from "@/lib/electionUtils";
import { useTranslation } from "@/lib/i18n/I18nContext";
import { formatDateLocale } from "@/lib/i18n/formatDate";
import type { Locale } from "@/lib/i18n/types";
import { PollingLocation } from "./PollingLocation";
import { BallotContests } from "./BallotContests";
import { ApiErrorBanner } from "./ApiErrorBanner";
import { DataAttribution } from "./DataAttribution";

interface StateInfoCardProps {
  stateData: StateData | LiveElectionData;
}

const STATUS_COLORS: Record<DeadlineStatus, string> = {
  green: "text-green-700 bg-green-50 border-green-200",
  yellow: "text-yellow-700 bg-yellow-50 border-yellow-200",
  red: "text-red-700 bg-red-50 border-red-200",
  passed: "text-gray-500 bg-gray-50 border-gray-200",
};

function DeadlineBadge({ info }: { info: DeadlineInfo }) {
  const { t } = useTranslation();

  let label: string;
  if (info.status === "passed") {
    label = t.deadline.passed;
  } else if (info.daysLeft !== null && info.daysLeft !== undefined) {
    if (info.daysLeft === 0) {
      label = t.deadline.today;
    } else {
      label = t.deadline.daysLeft(info.daysLeft);
    }
  } else {
    label = info.label;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${STATUS_COLORS[info.status]}`}
    >
      {label}
    </span>
  );
}

function ElectionSection({
  election,
  locale,
}: {
  election: Election;
  locale: Locale;
}) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="election-heading">
      <h3
        id="election-heading"
        className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
      >
        {t.stateInfo.election}
      </h3>
      <div className="text-gray-900">
        <p data-testid="election-name" className="font-semibold text-lg">
          {election.name}
        </p>
        <p data-testid="election-date" className="text-gray-600 mt-0.5">
          {formatDateLocale(election.date, locale)}
          {election.isPrimary && election.primaryType && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">
              {election.primaryType} primary
            </span>
          )}
        </p>
      </div>
    </section>
  );
}

function NoElectionMessage({
  stateName,
  websiteUrl,
}: {
  stateName: string;
  websiteUrl: string;
}) {
  const { t } = useTranslation();

  return (
    <div
      data-testid="no-election-message"
      role="alert"
      className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-600 text-sm"
    >
      {t.errors.noElections(stateName)}{" "}
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-800 focus:outline-2 focus:outline-blue-500 rounded"
      >
        {t.errors.zipNotFound.linkText}
      </a>
    </div>
  );
}

function RegistrationSection({
  registration,
  locale,
}: {
  registration: Registration;
  locale: Locale;
}) {
  const { t } = useTranslation();
  const onlineStatus = getDeadlineStatus(registration.online.deadline);
  const byMailStatus = getDeadlineStatus(registration.byMail.deadline);
  const inPersonStatus = getDeadlineStatus(registration.inPerson.deadline);

  const allDeadlinesPassed =
    onlineStatus.status === "passed" &&
    byMailStatus.status === "passed" &&
    inPersonStatus.status === "passed";

  return (
    <>
      {allDeadlinesPassed && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm"
        >
          <strong>{t.errors.deadlinesPassed}</strong>{" "}
          <a
            href={registration.registrationCheckUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-900 focus:text-amber-900 focus:outline-2 focus:outline-amber-500 rounded"
          >
            Check your registration status
          </a>
        </div>
      )}
      <section
        aria-labelledby="registration-heading"
        data-testid="registration-status"
      >
        <h3
          id="registration-heading"
          className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3"
        >
          {t.stateInfo.registrationDeadlines}
        </h3>
        <div className="space-y-2.5">
          {registration.online.available && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-medium text-gray-800 text-sm">
                  {t.stateInfo.online}
                </span>
                {registration.online.deadline && (
                  <span className="text-gray-500 text-xs ml-2">
                    {formatDateLocale(registration.online.deadline, locale)}
                  </span>
                )}
              </div>
              <DeadlineBadge info={onlineStatus} />
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="font-medium text-gray-800 text-sm">
                {t.stateInfo.byMail}
              </span>
              <span className="text-gray-500 text-xs ml-2">
                {formatDateLocale(registration.byMail.deadline, locale)} (
                {registration.byMail.sincePostmarked
                  ? t.stateInfo.postmark
                  : t.stateInfo.received}
                )
              </span>
            </div>
            <DeadlineBadge info={byMailStatus} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="font-medium text-gray-800 text-sm">
                {t.stateInfo.inPerson}
              </span>
              <span className="text-gray-500 text-xs ml-2">
                {formatDateLocale(registration.inPerson.deadline, locale)}
              </span>
            </div>
            <DeadlineBadge info={inPersonStatus} />
          </div>
          {registration.sameDayRegistration && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1.5">
              Same-day registration available
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function EarlyVotingSection({
  earlyVoting,
  locale,
}: {
  earlyVoting: EarlyVoting;
  locale: Locale;
}) {
  const { t } = useTranslation();

  if (!earlyVoting.available || !earlyVoting.startDate || !earlyVoting.endDate)
    return null;
  return (
    <section aria-labelledby="early-voting-heading">
      <h3
        id="early-voting-heading"
        className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1"
      >
        {t.stateInfo.earlyVoting}
      </h3>
      <p className="text-gray-800 text-sm">
        {t.stateInfo.earlyVotingFrom}{" "}
        {formatDateLocale(earlyVoting.startDate, locale)} –{" "}
        {t.stateInfo.earlyVotingThrough}{" "}
        {formatDateLocale(earlyVoting.endDate, locale)}
      </p>
      {earlyVoting.notes && (
        <p className="text-gray-500 text-xs mt-0.5">{earlyVoting.notes}</p>
      )}
    </section>
  );
}

function VotingRulesSection({ votingRules }: { votingRules: VotingRules }) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="voting-rules-heading">
      <h3
        id="voting-rules-heading"
        className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
      >
        {t.stateInfo.phonesAtPolls}
      </h3>
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium text-gray-800">
            {t.stateInfo.voterId}:
          </span>{" "}
          <span className="text-gray-600">
            {votingRules.idRequired
              ? t.stateInfo.voterIdRequired
              : t.stateInfo.voterIdNotRequired}
          </span>
        </div>
        {votingRules.idRequired && votingRules.acceptedIds.length > 0 && (
          <div>
            <span className="font-medium text-gray-800">
              {t.stateInfo.acceptedIds}:
            </span>
            <ul className="mt-1 ml-4 space-y-0.5 list-disc text-gray-600 text-xs">
              {votingRules.acceptedIds.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <span className="font-medium text-gray-800">
            {t.stateInfo.phonesAtPolls}:
          </span>{" "}
          <span className="text-gray-600">
            {votingRules.phonesAtPollsDetail}
          </span>
        </div>
      </div>
    </section>
  );
}

function ResourcesSection({ resources }: { resources: Resources }) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="resources-heading">
      <h3
        id="resources-heading"
        className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
      >
        Helpful Links
      </h3>
      <div className="flex flex-wrap gap-2">
        {[
          {
            href: resources.stateElectionWebsite,
            label: "State election website",
          },
          {
            href: resources.sampleBallotLookup,
            label: t.stateInfo.sampleBallot,
          },
          {
            href: resources.countyElectionLookup,
            label: t.stateInfo.countyOffice,
          },
        ].map(({ href, label }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors focus:outline-2 focus:outline-blue-500 min-h-[44px]"
          >
            {label}
          </a>
        ))}
      </div>
    </section>
  );
}

function isLiveElectionData(
  data: StateData | LiveElectionData,
): data is LiveElectionData {
  return (
    "pollingLocation" in data ||
    "ballotContests" in data ||
    "apiErrors" in data ||
    "fetchedAt" in data
  );
}

export function StateInfoCard({ stateData }: StateInfoCardProps) {
  const { locale, t } = useTranslation();
  const nextElection = findNextElection(stateData.elections);
  const { registration, earlyVoting, votingRules, resources } = stateData;

  const live = isLiveElectionData(stateData) ? stateData : null;
  const hasApiErrors = live?.apiErrors && live.apiErrors.length > 0;
  // Full failure: all APIs failed AND we only have minimal static fallback data (no elections data)
  const isFullFailure =
    hasApiErrors &&
    !live?.pollingLocation &&
    !live?.ballotContests &&
    stateData.elections.length === 0;

  return (
    <div
      data-testid="state-info"
      className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
      aria-label={`${t.stateInfo.title} — ${stateData.stateName}`}
    >
      <div className="bg-blue-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white">{stateData.stateName}</h2>
        <p className="text-blue-100 text-sm mt-0.5">{t.stateInfo.title}</p>
      </div>

      <div className="p-6 space-y-5">
        {/* API Error Banners */}
        {hasApiErrors && (
          <ApiErrorBanner
            errors={live!.apiErrors!}
            isFullFailure={isFullFailure}
            stateElectionWebsite={resources.stateElectionWebsite || undefined}
            stateName={stateData.stateName}
          />
        )}

        <RegistrationSection registration={registration} locale={locale} />
        {nextElection ? (
          <ElectionSection election={nextElection} locale={locale} />
        ) : (
          <NoElectionMessage
            stateName={stateData.stateName}
            websiteUrl={resources.stateElectionWebsite}
          />
        )}
        <EarlyVotingSection earlyVoting={earlyVoting} locale={locale} />

        {/* Polling Location — Phase 3 */}
        {live?.pollingLocation && (
          <PollingLocation location={live.pollingLocation} />
        )}

        {/* Ballot Contests — Phase 3 */}
        {live?.ballotContests && (
          <BallotContests
            contests={live.ballotContests}
            stateCode={stateData.stateCode}
          />
        )}

        <VotingRulesSection votingRules={votingRules} />
        <ResourcesSection resources={resources} />

        {/* Data Attribution — Phase 3 */}
        {live && (
          <DataAttribution
            fetchedAt={live.fetchedAt}
            stateElectionWebsite={resources.stateElectionWebsite || undefined}
          />
        )}
      </div>
    </div>
  );
}
