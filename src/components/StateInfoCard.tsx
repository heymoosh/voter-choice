import type {
  StateElectionData,
  Election,
  DeadlineStatus,
} from "@/types/election";
import { TEST_IDS } from "@/types/testids";
import { formatDate, formatDeadline } from "@/lib/date-utils";

interface StateInfoCardProps {
  state: StateElectionData;
  election: Election | null;
}

const statusColors: Record<DeadlineStatus, string> = {
  safe: "text-green-700 bg-green-50 border-green-200",
  warning: "text-yellow-700 bg-yellow-50 border-yellow-200",
  urgent: "text-red-700 bg-red-50 border-red-200",
  passed: "text-gray-500 bg-gray-50 border-gray-200",
};

function DeadlineBadge({
  isoDate,
  label,
}: {
  isoDate: string | null;
  label: string;
}) {
  if (!isoDate) return null;
  const info = formatDeadline(isoDate);
  if (!info) return null;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div
        className={`inline-flex items-center gap-2 text-sm px-2 py-1 rounded border ${statusColors[info.status]}`}
      >
        <span>{info.formatted}</span>
        <span className="font-semibold">{info.label}</span>
      </div>
    </div>
  );
}

function ElectionSection({
  election,
  stateElectionWebsite,
}: {
  election: Election | null;
  stateElectionWebsite: string;
}) {
  if (!election) {
    return (
      <p data-testid={TEST_IDS.NO_ELECTION_MESSAGE} className="text-gray-600">
        No upcoming elections found. Check{" "}
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
    );
  }
  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
        Next Election
      </h3>
      <p
        data-testid={TEST_IDS.ELECTION_NAME}
        className="text-lg font-semibold text-gray-900"
      >
        {election.name}
      </p>
      <p data-testid={TEST_IDS.ELECTION_DATE} className="text-gray-600">
        {formatDate(election.date)}
        {election.isPrimary && election.primaryType && (
          <span className="ml-2 text-sm text-gray-500">
            ({election.primaryType} primary)
          </span>
        )}
      </p>
    </div>
  );
}

function RegistrationSection({
  reg,
}: {
  reg: StateElectionData["registration"];
}) {
  return (
    <div data-testid={TEST_IDS.REGISTRATION_STATUS} className="space-y-2">
      <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
        Registration Deadlines
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reg.online.available && reg.online.deadline && (
          <DeadlineBadge isoDate={reg.online.deadline} label="Online" />
        )}
        {reg.byMail.deadline && (
          <DeadlineBadge
            isoDate={reg.byMail.deadline}
            label={`By Mail (${reg.byMail.sincePostmarked ? "postmarked" : "received"})`}
          />
        )}
        {reg.inPerson.deadline && (
          <DeadlineBadge isoDate={reg.inPerson.deadline} label="In Person" />
        )}
      </div>
      {reg.sameDayRegistration && (
        <p className="text-sm text-green-700 font-medium">
          ✓ Same-day registration available on election day
        </p>
      )}
      {reg.registrationCheckUrl && (
        <a
          href={reg.registrationCheckUrl}
          className="text-sm text-blue-600 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Check your registration status →
        </a>
      )}
    </div>
  );
}

function EarlyVotingSection({ ev }: { ev: StateElectionData["earlyVoting"] }) {
  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
        Early Voting
      </h3>
      {ev.available && ev.startDate && ev.endDate ? (
        <p className="text-gray-700">
          {formatDate(ev.startDate)} – {formatDate(ev.endDate)}
          {ev.notes && <span className="text-gray-500 ml-1">({ev.notes})</span>}
        </p>
      ) : (
        <p className="text-gray-600">
          Not available — absentee/mail voting only
        </p>
      )}
    </div>
  );
}

function VoterIdSection({
  rules,
}: {
  rules: StateElectionData["votingRules"];
}) {
  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
        Voter ID
      </h3>
      {rules.idRequired ? (
        <div className="text-gray-700">
          <p className="font-medium">ID Required</p>
          {rules.acceptedIds.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {rules.acceptedIds.slice(0, 3).join(", ")}
              {rules.acceptedIds.length > 3
                ? ` +${rules.acceptedIds.length - 3} more`
                : ""}
            </p>
          )}
        </div>
      ) : (
        <p className="text-gray-700">No ID required</p>
      )}
    </div>
  );
}

function ResourcesSection({
  resources,
}: {
  resources: StateElectionData["resources"];
}) {
  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
        Resources
      </h3>
      <div className="flex flex-col gap-1">
        <a
          href={resources.sampleBallotLookup}
          className="text-sm text-blue-600 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sample ballot lookup →
        </a>
        <a
          href={resources.countyElectionLookup}
          className="text-sm text-blue-600 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          County election office →
        </a>
        <a
          href={resources.stateElectionWebsite}
          className="text-sm text-blue-600 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          State election website →
        </a>
      </div>
    </div>
  );
}

export function StateInfoCard({ state, election }: StateInfoCardProps) {
  return (
    <div
      data-testid={TEST_IDS.STATE_INFO}
      className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5"
      tabIndex={-1}
    >
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">{state.stateName}</h2>
        <p className="text-sm text-gray-500 mt-1">
          Updated {formatDate(state.lastUpdated)}
        </p>
      </div>

      <ElectionSection
        election={election}
        stateElectionWebsite={state.resources.stateElectionWebsite}
      />
      <RegistrationSection reg={state.registration} />
      <EarlyVotingSection ev={state.earlyVoting} />
      <VoterIdSection rules={state.votingRules} />
      <ResourcesSection resources={state.resources} />
    </div>
  );
}
