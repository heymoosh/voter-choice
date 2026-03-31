import type { StateData, DeadlineInfo, Election } from "@/lib/types";
import { getDeadlineStatus, formatDate } from "@/lib/date-utils";

interface DeadlineBadgeProps {
  info: DeadlineInfo;
}

function DeadlineBadge({ info }: DeadlineBadgeProps) {
  const styles: Record<string, string> = {
    green: "bg-green-100 text-green-800 border-green-300",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
    red: "bg-red-100 text-red-800 border-red-300",
    passed: "bg-gray-100 text-gray-600 border-gray-300",
    unavailable: "bg-gray-50 text-gray-500 border-gray-200",
  };
  const icons: Record<string, string> = {
    green: "✓",
    yellow: "!",
    red: "⚠",
    passed: "✗",
    unavailable: "—",
  };

  const cls = styles[info.status] ?? styles.unavailable;
  const icon = icons[info.status] ?? "—";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
      aria-label={info.label}
    >
      <span aria-hidden="true">{icon}</span>
      {info.label}
    </span>
  );
}

interface StateInfoCardProps {
  stateData: StateData;
  election: Election;
  today?: Date;
}

export function StateInfoCard({
  stateData,
  election,
  today = new Date(),
}: StateInfoCardProps) {
  const { registration, earlyVoting, votingRules, resources } = stateData;

  const onlineStatus = getDeadlineStatus(
    registration.online.available ? registration.online.deadline : null,
    today,
  );
  const byMailStatus = getDeadlineStatus(registration.byMail.deadline, today);
  const inPersonStatus = getDeadlineStatus(
    registration.inPerson.deadline,
    today,
  );

  return (
    <section
      data-testid="state-info"
      aria-label={`Election information for ${stateData.stateName}`}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-4 text-xl font-bold text-gray-900">
        {stateData.stateName} — Upcoming Election
      </h2>

      {/* Election */}
      <div className="mb-4 rounded-lg bg-blue-50 p-4">
        <p
          data-testid="election-name"
          className="text-base font-semibold text-blue-900"
        >
          {election.name}
        </p>
        <p data-testid="election-date" className="text-sm text-blue-700">
          {formatDate(election.date)}
        </p>
      </div>

      {/* Registration deadlines */}
      <div data-testid="registration-status" className="mb-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Voter Registration Deadlines
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          {registration.online.available ? (
            <li className="flex flex-wrap items-center gap-2">
              <span className="w-20 shrink-0 font-medium">Online:</span>
              <span>{formatDate(registration.online.deadline)}</span>
              <DeadlineBadge info={onlineStatus} />
            </li>
          ) : (
            <li className="flex flex-wrap items-center gap-2">
              <span className="w-20 shrink-0 font-medium">Online:</span>
              <span className="text-gray-500">Not available</span>
            </li>
          )}
          <li className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 font-medium">By mail:</span>
            <span>
              {formatDate(registration.byMail.deadline)}
              {registration.byMail.sincePostmarked
                ? " (postmark date counts)"
                : " (must be received)"}
            </span>
            <DeadlineBadge info={byMailStatus} />
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 font-medium">In person:</span>
            <span>{formatDate(registration.inPerson.deadline)}</span>
            <DeadlineBadge info={inPersonStatus} />
          </li>
          {registration.sameDayRegistration && (
            <li className="text-green-700">
              ✓ Same-day registration available on Election Day
            </li>
          )}
        </ul>
      </div>

      {/* Early voting */}
      <div className="mb-4">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Early Voting
        </h3>
        {earlyVoting.available ? (
          <p className="text-sm text-gray-700">
            {formatDate(earlyVoting.startDate)} –{" "}
            {formatDate(earlyVoting.endDate)}
            {earlyVoting.notes && (
              <span className="ml-1 text-gray-500">({earlyVoting.notes})</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            Not available
            {earlyVoting.notes && ` — ${earlyVoting.notes}`}
          </p>
        )}
      </div>

      {/* Voter ID */}
      <div className="mb-4">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Voter ID
        </h3>
        {votingRules.idRequired ? (
          <div className="text-sm text-gray-700">
            <p className="font-medium text-orange-700">Photo ID required</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-gray-600">
              {votingRules.acceptedIds.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-green-700">No photo ID required</p>
        )}
      </div>

      {/* Phones */}
      <div className="mb-4">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Phones at Polls
        </h3>
        <p className="text-sm text-gray-700">
          {votingRules.phonesAtPollsDetail}
        </p>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
        <a
          href={resources.sampleBallotLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 underline hover:text-blue-800"
        >
          Sample ballot →
        </a>
        <a
          href={resources.countyElectionLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 underline hover:text-blue-800"
        >
          County election office →
        </a>
        <a
          href={stateData.registration.registrationCheckUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 underline hover:text-blue-800"
        >
          Check your registration →
        </a>
      </div>
    </section>
  );
}
