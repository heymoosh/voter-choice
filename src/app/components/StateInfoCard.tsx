"use client";

import type { StateData, Election, DeadlineInfo } from "../../types/state";
import { getDeadlineInfo, formatDate } from "../../lib/deadlineStatus";

interface StateInfoCardProps {
  stateData: StateData;
  election: Election | null;
  zip: string;
}

const statusColors: Record<string, string> = {
  green: "text-green-700 bg-green-50 border-green-200",
  yellow: "text-amber-700 bg-amber-50 border-amber-200",
  red: "text-red-700 bg-red-50 border-red-200",
  passed: "text-gray-500 bg-gray-50 border-gray-200",
};

function DeadlineBadge({ info, label }: { info: DeadlineInfo; label: string }) {
  return (
    <div
      className={`rounded border px-3 py-2 text-sm ${statusColors[info.status]}`}
    >
      <span className="font-medium">{label}:</span>{" "}
      {info.date ? formatDate(info.date) : "N/A"}{" "}
      <span className="font-semibold">({info.label})</span>
    </div>
  );
}

function ElectionBlock({
  election,
  stateData,
}: {
  election: Election | null;
  stateData: StateData;
}) {
  if (!election) {
    return (
      <p data-testid="no-election-message" className="text-gray-700">
        No upcoming elections found for {stateData.stateName}. Check{" "}
        <a
          href={stateData.resources.stateElectionWebsite}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-700 hover:text-blue-900"
        >
          {stateData.stateName} election website
        </a>{" "}
        for updates.
      </p>
    );
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-gray-800">Next election:</span>
        <span data-testid="election-name" className="text-gray-900">
          {election.name}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-gray-800">Date:</span>
        <span data-testid="election-date" className="text-gray-900">
          {formatDate(election.date)}
        </span>
        {election.primaryType && (
          <span className="text-sm text-gray-600 capitalize">
            ({election.primaryType} primary)
          </span>
        )}
      </div>
    </div>
  );
}

function RegistrationBlock({ stateData }: { stateData: StateData }) {
  const today = new Date();
  const reg = stateData.registration;
  const onlineDeadline =
    reg.online.available && reg.online.deadline
      ? getDeadlineInfo(reg.online.deadline, today)
      : null;
  const mailDeadline = getDeadlineInfo(reg.byMail.deadline, today);
  const inPersonDeadline = getDeadlineInfo(reg.inPerson.deadline, today);

  return (
    <div data-testid="registration-status" className="space-y-2">
      <h3 className="font-semibold text-gray-800">Registration deadlines</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {onlineDeadline && (
          <DeadlineBadge info={onlineDeadline} label="Online" />
        )}
        {!reg.online.available && (
          <div className="rounded border px-3 py-2 text-sm text-gray-500 bg-gray-50 border-gray-200">
            <span className="font-medium">Online:</span> Not available
          </div>
        )}
        <DeadlineBadge
          info={mailDeadline}
          label={`By mail${reg.byMail.sincePostmarked ? " (postmark)" : ""}`}
        />
        <DeadlineBadge info={inPersonDeadline} label="In person" />
      </div>
      {reg.sameDayRegistration && (
        <p className="text-sm text-green-700 font-medium">
          Same-day registration available
        </p>
      )}
      <a
        href={reg.registrationCheckUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm text-blue-700 underline hover:text-blue-900"
      >
        Check your registration status
      </a>
    </div>
  );
}

export function StateInfoCard({
  stateData,
  election,
  zip,
}: StateInfoCardProps) {
  return (
    <section
      data-testid="state-info"
      className="w-full rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-4"
      aria-label={`Election information for ${stateData.stateName}`}
    >
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-gray-900">
          {stateData.stateName}
        </h2>
        <span className="text-sm text-gray-500">ZIP {zip}</span>
      </div>

      <ElectionBlock election={election} stateData={stateData} />
      <RegistrationBlock stateData={stateData} />

      {stateData.earlyVoting.available &&
        stateData.earlyVoting.startDate &&
        stateData.earlyVoting.endDate && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Early voting</h3>
            <p className="text-sm text-gray-700">
              {formatDate(stateData.earlyVoting.startDate)} through{" "}
              {formatDate(stateData.earlyVoting.endDate)}
              {stateData.earlyVoting.notes && (
                <span className="text-gray-500">
                  {" "}
                  &mdash; {stateData.earlyVoting.notes}
                </span>
              )}
            </p>
          </div>
        )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <h3 className="font-semibold text-gray-800 mb-1">Voter ID</h3>
          <p className="text-sm text-gray-700">
            {stateData.votingRules.idRequired ? "Required" : "Not required"}
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 mb-1">Phones at polls</h3>
          <p className="text-sm text-gray-700 capitalize">
            {stateData.votingRules.phonesAtPolls}
          </p>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap text-sm">
        <a
          href={stateData.resources.stateElectionWebsite}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline hover:text-blue-900"
        >
          State election website
        </a>
        <a
          href={stateData.resources.sampleBallotLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline hover:text-blue-900"
        >
          Sample ballot lookup
        </a>
        <a
          href={stateData.resources.countyElectionLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline hover:text-blue-900"
        >
          County election office
        </a>
      </div>
    </section>
  );
}
