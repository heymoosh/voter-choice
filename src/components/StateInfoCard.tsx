"use client";

import type { StateData, Election } from "@/lib/types";
import { getDeadlineStatus } from "@/lib/deadlineStatus";

type StateInfoCardProps = {
  stateData: StateData;
  today?: Date;
};

function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "N/A";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

type DeadlineRowProps = {
  label: string;
  isoDate: string | null | undefined;
  today: Date;
  note?: string;
};

function DeadlineRow({ label, isoDate, today, note }: DeadlineRowProps) {
  const status = getDeadlineStatus(isoDate, today);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-1">
      <span className="text-sm text-gray-600 min-w-[100px] font-medium">
        {label}
      </span>
      <span className="text-sm text-gray-800">{formatDate(isoDate)}</span>
      <span className={`text-sm font-semibold ${status.colorClass}`}>
        {status.label}
        {note && (
          <span className="text-gray-500 font-normal text-xs ml-1">
            ({note})
          </span>
        )}
      </span>
    </div>
  );
}

function ElectionSection({
  nextElection,
  stateName,
  stateElectionWebsite,
}: {
  nextElection: Election | null;
  stateName: string;
  stateElectionWebsite: string;
}) {
  return (
    <section aria-labelledby="election-heading">
      <h3
        id="election-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        Next Election
      </h3>
      {nextElection ? (
        <div className="space-y-1">
          <p data-testid="election-name" className="text-gray-900 font-medium">
            {nextElection.name}
          </p>
          <p data-testid="election-date" className="text-gray-600 text-sm">
            {formatDate(nextElection.date)}
          </p>
        </div>
      ) : (
        <p data-testid="no-election-message" className="text-gray-500 text-sm">
          No upcoming elections found for {stateName}. Check{" "}
          <a
            href={stateElectionWebsite}
            className="text-blue-600 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {stateElectionWebsite}
          </a>{" "}
          for updates.
        </p>
      )}
    </section>
  );
}

function RegistrationSection({
  registration,
  today,
}: {
  registration: StateData["registration"];
  today: Date;
}) {
  return (
    <section aria-labelledby="reg-heading" data-testid="registration-status">
      <h3
        id="reg-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        Registration Deadlines
      </h3>
      <div className="space-y-1">
        {registration.online.available && (
          <DeadlineRow
            label="Online"
            isoDate={registration.online.deadline}
            today={today}
          />
        )}
        <DeadlineRow
          label="By Mail"
          isoDate={registration.byMail.deadline}
          today={today}
          note={
            registration.byMail.sincePostmarked ? "postmark date" : "received"
          }
        />
        <DeadlineRow
          label="In Person"
          isoDate={registration.inPerson.deadline}
          today={today}
        />
      </div>
      {registration.sameDayRegistration && (
        <p className="text-sm text-green-700 mt-2 font-medium">
          ✓ Same-day registration available
        </p>
      )}
      <p className="text-xs text-gray-500 mt-2">
        Check your registration:{" "}
        <a
          href={registration.registrationCheckUrl}
          className="text-blue-600 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {registration.registrationCheckUrl}
        </a>
      </p>
    </section>
  );
}

function VotingRulesSection({
  votingRules,
}: {
  votingRules: StateData["votingRules"];
}) {
  return (
    <section aria-labelledby="rules-heading">
      <h3
        id="rules-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        Voting Rules
      </h3>
      <div className="space-y-1 text-sm text-gray-700">
        <p>
          <span className="font-medium">Voter ID: </span>
          {votingRules.idRequired ? "Required" : "Not required"}
        </p>
        {votingRules.idRequired && votingRules.acceptedIds.length > 0 && (
          <ul className="list-disc list-inside ml-2 space-y-1">
            {votingRules.acceptedIds.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        )}
        <p>
          <span className="font-medium">Phones at polls: </span>
          {votingRules.phonesAtPollsDetail}
        </p>
      </div>
    </section>
  );
}

function ResourcesSection({
  resources,
}: {
  resources: StateData["resources"];
}) {
  return (
    <section aria-labelledby="resources-heading">
      <h3
        id="resources-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        Resources
      </h3>
      <ul className="space-y-1 text-sm">
        <li>
          <a
            href={resources.stateElectionWebsite}
            className="text-blue-600 underline hover:text-blue-800"
            target="_blank"
            rel="noopener noreferrer"
          >
            State election website
          </a>
        </li>
        <li>
          <a
            href={resources.countyElectionLookup}
            className="text-blue-600 underline hover:text-blue-800"
            target="_blank"
            rel="noopener noreferrer"
          >
            Find your county election office
          </a>
        </li>
        <li>
          <a
            href={resources.sampleBallotLookup}
            className="text-blue-600 underline hover:text-blue-800"
            target="_blank"
            rel="noopener noreferrer"
          >
            Look up your sample ballot
          </a>
        </li>
      </ul>
    </section>
  );
}

export function StateInfoCard({
  stateData,
  today = new Date(),
}: StateInfoCardProps) {
  const {
    stateName,
    elections,
    registration,
    earlyVoting,
    votingRules,
    resources,
  } = stateData;

  const todayMs = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  const nextElection =
    elections.find((e) => {
      const [y, m, d] = e.date.split("-").map(Number);
      return Date.UTC(y, m - 1, d) >= todayMs;
    }) ?? null;

  return (
    <div
      data-testid="state-info"
      className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5"
    >
      <div>
        <h2 className="text-xl font-bold text-gray-900">{stateName}</h2>
        <p className="text-sm text-gray-500">
          Data last updated: {formatDate(stateData.lastUpdated)}
        </p>
      </div>

      <ElectionSection
        nextElection={nextElection}
        stateName={stateName}
        stateElectionWebsite={resources.stateElectionWebsite}
      />

      <RegistrationSection registration={registration} today={today} />

      {earlyVoting.available && (
        <section aria-labelledby="early-voting-heading">
          <h3
            id="early-voting-heading"
            className="text-base font-semibold text-gray-800 mb-1"
          >
            Early Voting
          </h3>
          <p className="text-sm text-gray-700">
            {formatDate(earlyVoting.startDate)} —{" "}
            {formatDate(earlyVoting.endDate)}
            {earlyVoting.notes && (
              <span className="text-gray-500 ml-1">({earlyVoting.notes})</span>
            )}
          </p>
        </section>
      )}

      <VotingRulesSection votingRules={votingRules} />

      <ResourcesSection resources={resources} />
    </div>
  );
}
