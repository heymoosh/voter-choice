import type { StateData, Election, RegistrationStatuses, DeadlineUrgency, DeadlineStatus } from "../types/election";
import { formatDate } from "../lib/date-utils";

interface StateInfoCardProps {
  stateData: StateData;
  nextElection: Election | null;
  regStatuses: RegistrationStatuses;
  today: Date;
}

const urgencyClasses: Record<DeadlineUrgency, string> = {
  ok: "text-green-700 bg-green-50 border-green-200",
  warning: "text-yellow-700 bg-yellow-50 border-yellow-200",
  urgent: "text-red-700 bg-red-50 border-red-200",
  passed: "text-gray-500 bg-gray-50 border-gray-200",
  na: "text-gray-400 bg-gray-50 border-gray-100",
};

function DeadlineRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: DeadlineStatus;
  detail?: string;
}) {
  return (
    <div className={`flex justify-between items-center px-3 py-2 rounded border text-sm ${urgencyClasses[status.urgency]}`}>
      <span className="font-medium">{label}</span>
      <span>
        {status.date ? formatDate(status.date) : "N/A"} — <strong>{status.label}</strong>
        {detail && <span className="text-xs ml-1">({detail})</span>}
      </span>
    </div>
  );
}

export function StateInfoCard({
  stateData,
  nextElection,
  regStatuses,
}: StateInfoCardProps) {
  const reg = stateData.registration;

  return (
    <section data-testid="state-info" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-4">{stateData.stateName} Election Info</h2>

      {/* Election */}
      {nextElection ? (
        <div className="mb-4">
          <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Next Election</div>
          <div data-testid="election-name" className="font-semibold text-lg">{nextElection.name}</div>
          <div data-testid="election-date" className="text-gray-600">{formatDate(nextElection.date)}</div>
          {nextElection.primaryType && (
            <div className="text-sm text-gray-500 mt-1">
              {nextElection.primaryType.charAt(0).toUpperCase() + nextElection.primaryType.slice(1)} primary
            </div>
          )}
        </div>
      ) : (
        <div
          data-testid="no-election-message"
          role="alert"
          className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm"
        >
          No upcoming elections found for {stateData.stateName}.{" "}
          <a href={stateData.resources.stateElectionWebsite} className="underline" target="_blank" rel="noopener noreferrer">
            Check the state election website
          </a>{" "}
          for updates.
        </div>
      )}

      {/* Registration Deadlines */}
      <div data-testid="registration-status" className="mb-4">
        <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">Registration Deadlines</div>

        {regStatuses.allPassed && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-2 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm"
          >
            Registration deadlines for this election have passed.{" "}
            <a href={reg.registrationCheckUrl} className="underline font-medium" target="_blank" rel="noopener noreferrer">
              Check your registration status
            </a>.
          </div>
        )}

        <div className="flex flex-col gap-2">
          {reg.online.available && (
            <DeadlineRow label="Online" status={regStatuses.online} />
          )}
          <DeadlineRow
            label="By mail"
            status={regStatuses.byMail}
            detail={reg.byMail.sincePostmarked ? "postmark" : "received"}
          />
          <DeadlineRow label="In person" status={regStatuses.inPerson} />
        </div>

        {reg.sameDayRegistration && (
          <p className="text-sm text-green-700 mt-2">✓ Same-day registration available</p>
        )}
      </div>

      {/* Early Voting */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Early Voting</div>
        {stateData.earlyVoting.available && stateData.earlyVoting.startDate ? (
          <p className="text-sm">
            {formatDate(stateData.earlyVoting.startDate)} – {formatDate(stateData.earlyVoting.endDate!)}
            {stateData.earlyVoting.notes && (
              <span className="text-gray-500"> ({stateData.earlyVoting.notes})</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-gray-500">Not available — absentee voting only</p>
        )}
      </div>

      {/* Voting Rules */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Voting Rules</div>
        <p className="text-sm">
          <strong>Voter ID:</strong>{" "}
          {stateData.votingRules.idRequired ? "Required" : "Not required"}
        </p>
        <p className="text-sm mt-1">
          <strong>Phones at polls:</strong> {stateData.votingRules.phonesAtPollsDetail}
        </p>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
        <a
          href={stateData.resources.countyElectionLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          County Election Office →
        </a>
        <a
          href={stateData.resources.sampleBallotLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          Sample Ballot Lookup →
        </a>
      </div>
    </section>
  );
}
