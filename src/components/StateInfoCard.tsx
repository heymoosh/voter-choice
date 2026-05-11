import type { StateData, Election } from "@/types/state";
import { DeadlineStatus } from "./DeadlineStatus";

function getNextElection(elections: Election[]): Election | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return elections.find((e) => new Date(e.date + "T00:00:00") >= today) ?? null;
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface StateInfoCardProps {
  stateData: StateData;
}

export function StateInfoCard({ stateData }: StateInfoCardProps) {
  const election = getNextElection(stateData.elections);
  const reg = stateData.registration;

  return (
    <div
      data-testid="state-info"
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
    >
      <h2 className="text-xl font-bold text-gray-900 mb-1">
        {stateData.stateName}
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Last updated: {stateData.lastUpdated}
      </p>

      {election ? (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Next Election
          </h3>
          <p
            data-testid="election-name"
            className="font-semibold text-gray-900"
          >
            {election.name}
          </p>
          <p
            data-testid="election-date"
            className="text-gray-600 text-sm mt-0.5"
          >
            {formatDate(election.date)}
          </p>
        </div>
      ) : (
        <p
          data-testid="no-election-message"
          className="text-amber-700 bg-amber-50 rounded-lg px-4 py-3 mb-4 text-sm"
        >
          No upcoming elections found for {stateData.stateName}.{" "}
          <a
            href={stateData.resources.stateElectionWebsite}
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Check the state election website
          </a>{" "}
          for updates.
        </p>
      )}

      <div data-testid="registration-status" className="mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Registration Deadlines
        </h3>
        <DeadlineStatus label="Online" deadline={reg.online.deadline} />
        <DeadlineStatus label="By mail" deadline={reg.byMail.deadline} />
        <DeadlineStatus label="In person" deadline={reg.inPerson.deadline} />
        {reg.sameDayRegistration && (
          <p className="text-xs text-green-700 mt-1">
            Same-day registration available
          </p>
        )}
        <a
          href={reg.registrationCheckUrl}
          className="text-xs text-blue-600 underline mt-1 inline-block"
          target="_blank"
          rel="noopener noreferrer"
        >
          Check your registration status
        </a>
      </div>

      {stateData.earlyVoting.available && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Early Voting
          </h3>
          <p className="text-sm text-gray-700">
            {stateData.earlyVoting.startDate && stateData.earlyVoting.endDate
              ? `${stateData.earlyVoting.startDate} – ${stateData.earlyVoting.endDate}`
              : "Available"}
          </p>
          {stateData.earlyVoting.notes && (
            <p className="text-xs text-gray-500 mt-0.5">
              {stateData.earlyVoting.notes}
            </p>
          )}
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Voting Rules
        </h3>
        <p className="text-sm text-gray-700">
          <strong>Voter ID:</strong>{" "}
          {stateData.votingRules.idRequired ? "Required" : "Not required"}
        </p>
        {stateData.votingRules.phonesAtPollsDetail && (
          <p className="text-xs text-gray-500 mt-0.5">
            {stateData.votingRules.phonesAtPollsDetail}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <a
          href={stateData.resources.stateElectionWebsite}
          className="text-blue-600 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          State election website
        </a>
        <a
          href={stateData.resources.sampleBallotLookup}
          className="text-blue-600 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sample ballot lookup
        </a>
      </div>
    </div>
  );
}
