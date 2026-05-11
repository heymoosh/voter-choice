"use client";

import type { StateElectionData } from "@/lib/types";
import {
  getDeadlineStatus,
  formatDate,
  findNextElection,
} from "@/lib/deadlineStatus";
import { DeadlineStatus } from "./DeadlineStatus";

interface StateInfoCardProps {
  stateData: StateElectionData;
}

export function StateInfoCard({ stateData }: StateInfoCardProps) {
  const today = new Date();
  const nextElection = findNextElection(stateData.elections, today);

  const onlineStatus = getDeadlineStatus(
    stateData.registration.online.available
      ? stateData.registration.online.deadline
      : null,
    today,
  );
  const byMailStatus = getDeadlineStatus(
    stateData.registration.byMail.deadline,
    today,
  );
  const inPersonStatus = getDeadlineStatus(
    stateData.registration.inPerson.deadline,
    today,
  );

  const allDeadlinesPassed =
    stateData.registration.online.deadline &&
    stateData.registration.byMail.deadline &&
    stateData.registration.inPerson.deadline &&
    onlineStatus.status === "passed" &&
    byMailStatus.status === "passed" &&
    inPersonStatus.status === "passed";

  return (
    <div
      data-testid="state-info"
      className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {stateData.stateName} Election Information
      </h2>

      {!nextElection ? (
        <p
          data-testid="no-election-message"
          className="text-gray-600"
          role="alert"
        >
          No upcoming elections found for {stateData.stateName}. Check{" "}
          <a
            href={stateData.resources.stateElectionWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            the {stateData.stateName} election website
          </a>{" "}
          for updates.
        </p>
      ) : (
        <>
          {/* Election Details */}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Next Election
            </h3>
            <p
              data-testid="election-name"
              className="text-lg font-medium text-gray-900"
            >
              {nextElection.name}
            </p>
            <p data-testid="election-date" className="text-gray-600 mt-1">
              {formatDate(nextElection.date)}
              {nextElection.isPrimary && nextElection.primaryType && (
                <span className="ml-2 text-sm text-gray-500">
                  ({nextElection.primaryType} primary)
                </span>
              )}
            </p>
          </div>

          {/* Registration Deadlines */}
          <div
            data-testid="registration-status"
            className="mb-4 pb-4 border-b border-gray-100"
          >
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Registration Deadlines
            </h3>

            {allDeadlinesPassed && (
              <div
                className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800"
                role="alert"
              >
                Registration deadlines for this election have passed. Check{" "}
                <a
                  href={stateData.registration.registrationCheckUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  here
                </a>{" "}
                to confirm your registration status.
              </div>
            )}

            {stateData.registration.online.available ? (
              <DeadlineStatus
                label="Online registration"
                deadline={stateData.registration.online.deadline}
                result={onlineStatus}
              />
            ) : (
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="text-sm text-gray-700">
                  Online registration
                </span>
                <span className="text-xs text-gray-500 px-2 py-0.5 rounded-full bg-gray-100">
                  Not available
                </span>
              </div>
            )}

            <DeadlineStatus
              label={`Register by mail${stateData.registration.byMail.sincePostmarked ? " (postmark)" : ""}`}
              deadline={stateData.registration.byMail.deadline}
              result={byMailStatus}
            />

            <DeadlineStatus
              label="Register in person"
              deadline={stateData.registration.inPerson.deadline}
              result={inPersonStatus}
            />

            {stateData.registration.sameDayRegistration && (
              <p className="text-xs text-green-700 mt-1">
                Same-day registration available
              </p>
            )}
          </div>

          {/* Early Voting */}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Early Voting
            </h3>
            {stateData.earlyVoting.available &&
            stateData.earlyVoting.startDate &&
            stateData.earlyVoting.endDate ? (
              <p className="text-sm text-gray-700">
                {formatDate(stateData.earlyVoting.startDate)} –{" "}
                {formatDate(stateData.earlyVoting.endDate)}
                {stateData.earlyVoting.notes && (
                  <span className="block text-xs text-gray-500 mt-1">
                    {stateData.earlyVoting.notes}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-gray-700">
                {stateData.earlyVoting.notes ||
                  "Not available — absentee voting only"}
              </p>
            )}
          </div>

          {/* Voting Rules */}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Voting Rules
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-medium">Voter ID:</span>{" "}
                {stateData.votingRules.idRequired ? "Required" : "Not required"}
              </p>
              <p>
                <span className="font-medium">Phones at polls:</span>{" "}
                {stateData.votingRules.phonesAtPollsDetail}
              </p>
              {stateData.votingRules.additionalRules.map((rule, i) => (
                <p key={i}>{rule}</p>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Official Resources
            </h3>
            <div className="space-y-1">
              <a
                href={stateData.resources.countyElectionLookup}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-600 underline hover:text-blue-800"
              >
                County election office
              </a>
              <a
                href={stateData.resources.sampleBallotLookup}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-600 underline hover:text-blue-800"
              >
                Sample ballot lookup
              </a>
              <a
                href={stateData.resources.stateElectionWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-600 underline hover:text-blue-800"
              >
                {stateData.stateName} election website
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
