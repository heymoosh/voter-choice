"use client";

import type { StateElectionData, Election } from "../lib/types";
import {
  formatDate,
  getDeadlineStatus,
  getDeadlineLabel,
} from "../lib/date-utils";

interface StateInfoCardProps {
  stateData: StateElectionData;
  today?: Date;
}

function getNextElection(
  stateData: StateElectionData,
  today: Date,
): Election | null {
  const todayStr = today.toISOString().split("T")[0];
  return stateData.elections.find((e) => e.date >= todayStr) ?? null;
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const colors: Record<string, string> = {
    safe: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    urgent: "bg-red-100 text-red-800",
    passed: "bg-gray-100 text-gray-500",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.passed}`}
    >
      {label}
    </span>
  );
}

function RegistrationDeadlines({
  stateData,
  today,
}: {
  stateData: StateElectionData;
  today: Date;
}) {
  const { registration } = stateData;
  const methods = [
    { name: "Online", method: registration.online },
    { name: "By mail", method: registration.byMail },
    { name: "In person", method: registration.inPerson },
  ];

  return (
    <div data-testid="registration-status" className="space-y-2">
      <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
        Registration Deadlines
      </h4>
      {methods.map(({ name, method }) => {
        if (!method.deadline) return null;
        const status = getDeadlineStatus(method.deadline, today);
        const label = getDeadlineLabel(method.deadline, today);
        return (
          <div key={name} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {name}: {formatDate(method.deadline)}
            </span>
            <StatusBadge status={status} label={label} />
          </div>
        );
      })}
      {registration.sameDayRegistration && (
        <div className="text-sm text-green-700 font-medium">
          Same-day registration available
        </div>
      )}
    </div>
  );
}

function EarlyVotingSection({ stateData }: { stateData: StateElectionData }) {
  const { earlyVoting } = stateData;
  return (
    <div>
      <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
        Early Voting
      </h4>
      <p className="text-sm text-gray-600 mt-1">
        {earlyVoting.available && earlyVoting.startDate && earlyVoting.endDate
          ? `${formatDate(earlyVoting.startDate)} — ${formatDate(earlyVoting.endDate)}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
          : "Not available — absentee voting only"}
      </p>
    </div>
  );
}

function VoterIdSection({ stateData }: { stateData: StateElectionData }) {
  const { votingRules } = stateData;
  return (
    <div>
      <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
        Voter ID
      </h4>
      <p className="text-sm text-gray-600 mt-1">
        {votingRules.idRequired ? "Required" : "Not required"}
      </p>
      {votingRules.idRequired && votingRules.acceptedIds.length > 0 && (
        <ul className="text-xs text-gray-500 mt-1 list-disc list-inside">
          {votingRules.acceptedIds.map((id) => (
            <li key={id}>{id}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function StateInfoCard({
  stateData,
  today = new Date(),
}: StateInfoCardProps) {
  const election = getNextElection(stateData, today);

  if (!election) {
    return (
      <div
        data-testid="no-election-message"
        className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 my-4"
      >
        <p className="text-yellow-800">
          No upcoming elections found for {stateData.stateName}. Check{" "}
          <a
            href={stateData.resources.stateElectionWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-teal-700 hover:text-teal-900"
          >
            {stateData.stateName} election website
          </a>{" "}
          for updates.
        </p>
      </div>
    );
  }

  return (
    <section
      data-testid="state-info"
      className="bg-white rounded-xl shadow-md p-6 my-4 border border-gray-200"
    >
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold text-[#1e3a5f]">
          {stateData.stateName}
        </h2>
        <span className="text-sm text-gray-400">
          Last updated: {stateData.lastUpdated}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-gray-800">
          <span data-testid="election-name" className="font-semibold">
            {election.name}
          </span>
          {" · "}
          <span data-testid="election-date">{formatDate(election.date)}</span>
        </p>
        {election.isPrimary && election.primaryType && (
          <p className="text-sm text-gray-500 mt-1">
            {election.primaryType} primary
          </p>
        )}
      </div>

      <div className="space-y-4">
        <RegistrationDeadlines stateData={stateData} today={today} />
        <EarlyVotingSection stateData={stateData} />
        <VoterIdSection stateData={stateData} />

        <div>
          <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
            Phones at Polls
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            {stateData.votingRules.phonesAtPollsDetail}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href={stateData.resources.stateElectionWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-teal-700 hover:text-teal-900 underline"
          >
            Election Website ↗
          </a>
          <a
            href={stateData.resources.sampleBallotLookup}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-teal-700 hover:text-teal-900 underline"
          >
            Sample Ballot ↗
          </a>
        </div>
      </div>
    </section>
  );
}
