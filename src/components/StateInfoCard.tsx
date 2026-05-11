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
import {
  findNextElection,
  getDeadlineStatus,
  formatDate,
} from "@/lib/electionUtils";

interface StateInfoCardProps {
  stateData: StateData;
}

const STATUS_COLORS: Record<DeadlineStatus, string> = {
  green: "text-green-700 bg-green-50 border-green-200",
  yellow: "text-yellow-700 bg-yellow-50 border-yellow-200",
  red: "text-red-700 bg-red-50 border-red-200",
  passed: "text-gray-500 bg-gray-50 border-gray-200",
};

function DeadlineBadge({ info }: { info: DeadlineInfo }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${STATUS_COLORS[info.status]}`}
    >
      {info.label}
    </span>
  );
}

function ElectionSection({ election }: { election: Election }) {
  return (
    <section aria-labelledby="election-heading">
      <h3
        id="election-heading"
        className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
      >
        Upcoming Election
      </h3>
      <div className="text-gray-900">
        <p data-testid="election-name" className="font-semibold text-lg">
          {election.name}
        </p>
        <p data-testid="election-date" className="text-gray-600 mt-0.5">
          {formatDate(election.date)}
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
  return (
    <div
      data-testid="no-election-message"
      role="alert"
      className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-600 text-sm"
    >
      No upcoming elections found for {stateName}.{" "}
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-800 focus:outline-2 focus:outline-blue-500 rounded"
      >
        Check {stateName} election website
      </a>{" "}
      for updates.
    </div>
  );
}

function RegistrationSection({ registration }: { registration: Registration }) {
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
          <strong>Registration deadlines for this election have passed.</strong>{" "}
          <a
            href={registration.registrationCheckUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-900 focus:text-amber-900 focus:outline-2 focus:outline-amber-500 rounded"
          >
            Check your registration status
          </a>{" "}
          to confirm you&apos;re registered.
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
          Voter Registration Deadlines
        </h3>
        <div className="space-y-2.5">
          {registration.online.available && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-medium text-gray-800 text-sm">
                  Online registration
                </span>
                {registration.online.deadline && (
                  <span className="text-gray-500 text-xs ml-2">
                    by {formatDate(registration.online.deadline)}
                  </span>
                )}
              </div>
              <DeadlineBadge info={onlineStatus} />
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="font-medium text-gray-800 text-sm">By mail</span>
              <span className="text-gray-500 text-xs ml-2">
                by {formatDate(registration.byMail.deadline)}
                {registration.byMail.sincePostmarked
                  ? " (postmark)"
                  : " (received)"}
              </span>
            </div>
            <DeadlineBadge info={byMailStatus} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="font-medium text-gray-800 text-sm">
                In person
              </span>
              <span className="text-gray-500 text-xs ml-2">
                by {formatDate(registration.inPerson.deadline)}
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

function EarlyVotingSection({ earlyVoting }: { earlyVoting: EarlyVoting }) {
  if (!earlyVoting.available || !earlyVoting.startDate || !earlyVoting.endDate)
    return null;
  return (
    <section aria-labelledby="early-voting-heading">
      <h3
        id="early-voting-heading"
        className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1"
      >
        Early Voting
      </h3>
      <p className="text-gray-800 text-sm">
        {formatDate(earlyVoting.startDate)} – {formatDate(earlyVoting.endDate)}
      </p>
      {earlyVoting.notes && (
        <p className="text-gray-500 text-xs mt-0.5">{earlyVoting.notes}</p>
      )}
    </section>
  );
}

function VotingRulesSection({ votingRules }: { votingRules: VotingRules }) {
  return (
    <section aria-labelledby="voting-rules-heading">
      <h3
        id="voting-rules-heading"
        className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
      >
        Voting Rules
      </h3>
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium text-gray-800">Voter ID:</span>{" "}
          <span className="text-gray-600">
            {votingRules.idRequired ? "Required" : "Not required"}
          </span>
        </div>
        {votingRules.idRequired && votingRules.acceptedIds.length > 0 && (
          <div>
            <span className="font-medium text-gray-800">Accepted IDs:</span>
            <ul className="mt-1 ml-4 space-y-0.5 list-disc text-gray-600 text-xs">
              {votingRules.acceptedIds.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <span className="font-medium text-gray-800">Phones at polls:</span>{" "}
          <span className="text-gray-600">
            {votingRules.phonesAtPollsDetail}
          </span>
        </div>
      </div>
    </section>
  );
}

function ResourcesSection({ resources }: { resources: Resources }) {
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
          { href: resources.sampleBallotLookup, label: "Sample ballot lookup" },
          {
            href: resources.countyElectionLookup,
            label: "County election office",
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

export function StateInfoCard({ stateData }: StateInfoCardProps) {
  const nextElection = findNextElection(stateData.elections);
  const { registration, earlyVoting, votingRules, resources } = stateData;

  return (
    <div
      data-testid="state-info"
      className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
      aria-label={`Election information for ${stateData.stateName}`}
    >
      <div className="bg-blue-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white">{stateData.stateName}</h2>
        <p className="text-blue-100 text-sm mt-0.5">Election Information</p>
      </div>

      <div className="p-6 space-y-5">
        <RegistrationSection registration={registration} />
        {nextElection ? (
          <ElectionSection election={nextElection} />
        ) : (
          <NoElectionMessage
            stateName={stateData.stateName}
            websiteUrl={resources.stateElectionWebsite}
          />
        )}
        <EarlyVotingSection earlyVoting={earlyVoting} />
        <VotingRulesSection votingRules={votingRules} />
        <ResourcesSection resources={resources} />
      </div>
    </div>
  );
}
