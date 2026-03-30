"use client";

import { getDeadlineStatus } from "../lib/getDeadlineStatus";
import type { StateElectionData, DeadlineStatus } from "../types/election";

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
}: {
  earlyVoting: StateElectionData["earlyVoting"];
}) {
  if (earlyVoting.available && earlyVoting.startDate && earlyVoting.endDate) {
    return (
      <p className="text-sm">
        {earlyVoting.startDate} through {earlyVoting.endDate}
        {earlyVoting.notes && ` — ${earlyVoting.notes}`}
      </p>
    );
  }
  return (
    <p className="text-sm text-gray-600">
      Not available — absentee voting only
    </p>
  );
}

function VoterIdSection({
  votingRules,
}: {
  votingRules: StateElectionData["votingRules"];
}) {
  if (!votingRules.idRequired) {
    return <p className="text-sm">Not required</p>;
  }
  return (
    <div className="text-sm">
      <p className="font-medium">Required. Accepted IDs:</p>
      <ul className="list-disc list-inside mt-1 space-y-0.5">
        {votingRules.acceptedIds.map((id) => (
          <li key={id}>{id}</li>
        ))}
      </ul>
    </div>
  );
}

export function StateInfoCard({ state }: StateInfoCardProps) {
  const today = new Date().toISOString().split("T")[0];

  // Find next upcoming election
  const upcoming =
    state.elections.find((e) => e.date >= today) ?? state.elections[0];

  // Deadline statuses
  const onlineStatus = state.registration.online.available
    ? getDeadlineStatus(state.registration.online.deadline!, today)
    : null;
  const byMailStatus = getDeadlineStatus(
    state.registration.byMail.deadline,
    today,
  );
  const inPersonStatus = getDeadlineStatus(
    state.registration.inPerson.deadline,
    today,
  );

  // All-deadlines-passed check (exclude online if not available)
  const relevantStatuses = [
    ...(onlineStatus ? [onlineStatus] : []),
    byMailStatus,
    inPersonStatus,
  ];
  const allPassed = relevantStatuses.every((s) => s.color === "passed");

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

      {allPassed && (
        <div
          role="alert"
          className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800"
        >
          Registration deadlines for this election have passed. Check{" "}
          <a
            href={state.registration.registrationCheckUrl}
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            your registration status
          </a>
          .
        </div>
      )}

      <div>
        <h3 className="font-semibold text-sm mb-2">
          Voter Registration Deadlines
        </h3>
        <div data-testid="registration-status" className="space-y-1">
          {onlineStatus && <DeadlineRow label="Online" status={onlineStatus} />}
          {!state.registration.online.available && (
            <div className="text-sm text-gray-500">
              Online registration: Not available
            </div>
          )}
          <DeadlineRow label="By mail" status={byMailStatus} />
          <DeadlineRow label="In person" status={inPersonStatus} />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-1">Early Voting</h3>
        <EarlyVotingSection earlyVoting={state.earlyVoting} />
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-1">Voter ID</h3>
        <VoterIdSection votingRules={state.votingRules} />
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-1">Phones at Polls</h3>
        <p className="text-sm">{state.votingRules.phonesAtPollsDetail}</p>
      </div>

      <div className="flex gap-4 text-sm">
        <a
          href={state.resources.countyElectionLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          County election office
        </a>
        <a
          href={state.resources.sampleBallotLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          Sample ballot
        </a>
      </div>
    </div>
  );
}
