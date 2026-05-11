import type { Registration, DeadlineStatus } from "@/types";
import { getDeadlineStatus } from "@/lib/deadline-status";

interface RegistrationStatusProps {
  registration: Registration;
  today: Date;
}

const LABEL_STYLES: Record<DeadlineStatus["label"], string> = {
  green: "bg-green-100 text-green-800 border-green-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  red: "bg-red-100 text-red-800 border-red-200",
  passed: "bg-gray-100 text-gray-600 border-gray-200",
  na: "bg-gray-100 text-gray-500 border-gray-200",
};

const INDICATOR_COLORS: Record<DeadlineStatus["label"], string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  passed: "bg-gray-400",
  na: "bg-gray-300",
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
    <div className="flex items-start gap-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-700">{label}</div>
        {status.date && (
          <div className="text-sm text-gray-600">
            {status.date}
            {detail ? ` (${detail})` : ""}
          </div>
        )}
      </div>
      <span
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
          shrink-0 ${LABEL_STYLES[status.label]}
        `}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${INDICATOR_COLORS[status.label]}`}
          aria-hidden="true"
        />
        {status.text}
      </span>
    </div>
  );
}

export function RegistrationStatus({
  registration,
  today,
}: RegistrationStatusProps) {
  const onlineStatus = registration.online.available
    ? getDeadlineStatus(registration.online.deadline, today)
    : { label: "na" as const, text: "Not available", date: null };

  const byMailStatus = getDeadlineStatus(registration.byMail.deadline, today);
  const inPersonStatus = getDeadlineStatus(
    registration.inPerson.deadline,
    today,
  );

  const allPassed =
    onlineStatus.label === "passed" &&
    byMailStatus.label === "passed" &&
    inPersonStatus.label === "passed";

  return (
    <div data-testid="registration-status" className="space-y-1">
      <h3 className="text-sm font-semibold text-gray-800 mb-2">
        Registration Deadlines
      </h3>

      {allPassed && (
        <div
          role="alert"
          className="mb-3 rounded-md bg-orange-50 border border-orange-200 px-3 py-2 text-sm text-orange-800"
        >
          <strong>Registration deadlines have passed.</strong>{" "}
          <a
            href={registration.registrationCheckUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-orange-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            Check your registration status
          </a>
          .
        </div>
      )}

      <div className="divide-y divide-gray-100">
        <DeadlineRow label="Online" status={onlineStatus} />
        <DeadlineRow
          label="By Mail"
          status={byMailStatus}
          detail={
            registration.byMail.sincePostmarked ? "by postmark" : "by receipt"
          }
        />
        <DeadlineRow label="In Person" status={inPersonStatus} />
      </div>

      {registration.sameDayRegistration && (
        <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full bg-green-500 inline-block"
            aria-hidden="true"
          />
          Same-day registration available
        </p>
      )}
    </div>
  );
}
