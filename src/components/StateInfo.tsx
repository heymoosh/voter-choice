import type { StateData, Election } from "@/types";
import { RegistrationStatus } from "./RegistrationStatus";
import { formatDate } from "@/lib/deadline-status";

interface StateInfoProps {
  stateData: StateData;
  nextElection: Election | null;
  today: Date;
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
    >
      {children}
    </a>
  );
}

export function StateInfo({ stateData, nextElection, today }: StateInfoProps) {
  const { stateName, earlyVoting, votingRules, resources } = stateData;

  const electionTypeFull = nextElection
    ? [
        nextElection.type.charAt(0).toUpperCase() + nextElection.type.slice(1),
        nextElection.isPrimary && nextElection.primaryType
          ? `(${nextElection.primaryType} primary)`
          : null,
      ]
        .filter(Boolean)
        .join(" ")
    : null;

  return (
    <div
      data-testid="state-info"
      className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="bg-blue-600 px-5 py-4">
        <h2 className="text-xl font-bold text-white">{stateName}</h2>
        {nextElection && (
          <p className="text-blue-100 text-sm mt-0.5">
            Election info for your zip code
          </p>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Election info */}
        {nextElection ? (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Next Election
            </h3>
            <div className="space-y-1">
              <div
                data-testid="election-name"
                className="text-base font-semibold text-gray-900"
              >
                {nextElection.name}
              </div>
              <div
                data-testid="election-date"
                className="text-sm text-gray-600"
              >
                {formatDate(nextElection.date)}
                {electionTypeFull && (
                  <span className="ml-2 text-gray-500">
                    &bull; {electionTypeFull}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div data-testid="election-name" className="sr-only">
              No upcoming election
            </div>
            <div data-testid="election-date" className="sr-only">
              N/A
            </div>
          </div>
        )}

        {/* Registration deadlines */}
        <div className="border-t border-gray-100 pt-4">
          <RegistrationStatus
            registration={stateData.registration}
            today={today}
          />
        </div>

        {/* Early voting */}
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Early Voting
          </h3>
          {earlyVoting.available &&
          earlyVoting.startDate &&
          earlyVoting.endDate ? (
            <div className="text-sm text-gray-700">
              <span className="font-medium">
                {formatDate(earlyVoting.startDate)} &ndash;{" "}
                {formatDate(earlyVoting.endDate)}
              </span>
              {earlyVoting.notes && (
                <p className="text-gray-500 mt-0.5">{earlyVoting.notes}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Not available — absentee voting only
            </p>
          )}
        </div>

        {/* Voter ID */}
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Voter ID
          </h3>
          {votingRules.idRequired ? (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Photo ID required
              </p>
              {votingRules.acceptedIds.length > 0 && (
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-0.5">
                  {votingRules.acceptedIds.slice(0, 4).map((id) => (
                    <li key={id}>{id}</li>
                  ))}
                  {votingRules.acceptedIds.length > 4 && (
                    <li className="text-gray-500">
                      + {votingRules.acceptedIds.length - 4} more
                    </li>
                  )}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No photo ID required</p>
          )}
        </div>

        {/* Phones at polls */}
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Phones at Polls
          </h3>
          <p className="text-sm text-gray-700">
            {votingRules.phonesAtPollsDetail}
          </p>
        </div>

        {/* Resources */}
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Official Resources
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ExternalLink href={resources.stateElectionWebsite}>
              State Election Website
            </ExternalLink>
            <ExternalLink href={resources.countyElectionLookup}>
              County Election Office
            </ExternalLink>
            <ExternalLink href={resources.sampleBallotLookup}>
              Sample Ballot Lookup
            </ExternalLink>
            {stateData.registration.online.available &&
              stateData.registration.online.url && (
                <ExternalLink href={stateData.registration.online.url}>
                  Register to Vote Online
                </ExternalLink>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
