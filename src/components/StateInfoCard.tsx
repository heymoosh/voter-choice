"use client";

import type { StateData, Election, DeadlineStatus } from "@/types";
import {
  getDeadlineStatus,
  formatDate,
  allDeadlinesPassed,
} from "@/lib/deadlineUtils";

interface Props {
  stateData: StateData;
  nextElection: Election | null;
}

const tierStyles: Record<DeadlineStatus["tier"], string> = {
  green: "text-green-700 bg-green-50 border-green-200",
  yellow: "text-amber-800 bg-amber-50 border-amber-200",
  red: "text-red-800 bg-red-50 border-red-200",
  passed: "text-gray-600 bg-gray-50 border-gray-200",
};

function DeadlineBadge({
  deadline,
  label,
}: {
  deadline: string | null;
  label: string;
}) {
  if (!deadline)
    return <span className="text-gray-500 text-sm">Not available</span>;
  const status = getDeadlineStatus(deadline);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${tierStyles[status.tier]}`}
    >
      <span>{label}:</span>
      <span>{formatDate(deadline)}</span>
      <span aria-label={`Status: ${status.label}`}>({status.label})</span>
    </span>
  );
}

// eslint-disable-next-line complexity
export default function StateInfoCard({ stateData, nextElection }: Props) {
  const { stateName, registration, earlyVoting, votingRules, resources } =
    stateData;

  const deadlinesPassed = nextElection
    ? allDeadlinesPassed(registration)
    : false;

  return (
    <article
      data-testid="state-info"
      aria-label={`Election information for ${stateName}`}
      className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {stateName} Election Info
      </h2>

      {/* No upcoming election */}
      {!nextElection && (
        <div
          data-testid="no-election-message"
          role="alert"
          className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 mb-4"
        >
          <p className="font-semibold">
            No upcoming elections found for {stateName}.
          </p>
          <p className="text-sm mt-1">
            Check{" "}
            <a
              href={resources.stateElectionWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-yellow-700"
            >
              {stateName}&apos;s election website
            </a>{" "}
            for updates.
          </p>
        </div>
      )}

      {/* Election details */}
      {nextElection && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Upcoming Election
            </span>
            <span
              data-testid="election-name"
              className="text-lg font-semibold text-gray-800"
            >
              {nextElection.name}
            </span>
            <span data-testid="election-date" className="text-gray-600">
              {formatDate(nextElection.date)}
            </span>
          </div>

          {/* All deadlines passed alert */}
          {deadlinesPassed && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
            >
              <strong>
                Registration deadlines for this election have passed.
              </strong>{" "}
              <a
                href={registration.registrationCheckUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-red-700"
              >
                Check your registration status
              </a>
              .
            </div>
          )}

          {/* Registration deadlines */}
          <div>
            <h3 className="text-base font-semibold text-gray-700 mb-2">
              Voter Registration
            </h3>
            <div
              data-testid="registration-status"
              className="flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600 w-16 shrink-0">
                  Online:
                </span>
                <DeadlineBadge
                  deadline={
                    registration.online.available
                      ? registration.online.deadline
                      : null
                  }
                  label="Online"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600 w-16 shrink-0">
                  By mail:
                </span>
                <DeadlineBadge
                  deadline={registration.byMail.deadline}
                  label="Mail"
                />
                {registration.byMail.sincePostmarked && (
                  <span className="text-xs text-gray-500">(by postmark)</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600 w-16 shrink-0">
                  In person:
                </span>
                <DeadlineBadge
                  deadline={registration.inPerson.deadline}
                  label="In person"
                />
              </div>
              {registration.sameDayRegistration && (
                <p className="text-sm text-green-700 font-medium">
                  Same-day registration available
                </p>
              )}
            </div>
          </div>

          {/* Early voting */}
          {earlyVoting.available &&
            earlyVoting.startDate &&
            earlyVoting.endDate && (
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">
                  Early Voting
                </h3>
                <p className="text-sm text-gray-600">
                  {formatDate(earlyVoting.startDate)} –{" "}
                  {formatDate(earlyVoting.endDate)}
                  {earlyVoting.notes && (
                    <span className="text-gray-500">
                      {" "}
                      ({earlyVoting.notes})
                    </span>
                  )}
                </p>
              </div>
            )}

          {/* Voting rules */}
          <div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">
              Voting Rules
            </h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              {votingRules.idRequired ? (
                <li>
                  <strong>Photo ID required.</strong>{" "}
                  {votingRules.acceptedIds.length > 0 && (
                    <span>{votingRules.acceptedIds[0]}, and others.</span>
                  )}
                </li>
              ) : (
                <li>Photo ID not required.</li>
              )}
              <li>{votingRules.phonesAtPollsDetail}</li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">
              Resources
            </h3>
            <ul className="text-sm space-y-1">
              <li>
                <a
                  href={resources.sampleBallotLookup}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline"
                >
                  Sample ballot lookup
                </a>
              </li>
              <li>
                <a
                  href={resources.countyElectionLookup}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline"
                >
                  County election office
                </a>
              </li>
              <li>
                <a
                  href={resources.stateElectionWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline"
                >
                  {stateName} election website
                </a>
              </li>
            </ul>
          </div>
        </div>
      )}
    </article>
  );
}
