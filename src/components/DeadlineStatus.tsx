"use client";

import { DeadlineStatus as StatusEnum } from "@/lib/types";
import {
  getDeadlineStatus,
  getDeadlineLabel,
  formatDate,
} from "@/lib/deadlineUtils";

interface DeadlineStatusProps {
  label: string;
  isoDate: string | null;
  today: Date;
  additionalInfo?: string;
}

const statusConfig: Record<
  StatusEnum,
  { textColor: string; bgColor: string; borderColor: string; label: string }
> = {
  [StatusEnum.GREEN]: {
    textColor: "text-green-800",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    label: "Open",
  },
  [StatusEnum.YELLOW]: {
    textColor: "text-yellow-800",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    label: "Closing Soon",
  },
  [StatusEnum.RED]: {
    textColor: "text-red-800",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "Urgent",
  },
  [StatusEnum.PASSED]: {
    textColor: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    label: "Passed",
  },
};

export default function DeadlineStatus({
  label,
  isoDate,
  today,
  additionalInfo,
}: DeadlineStatusProps) {
  const status = getDeadlineStatus(isoDate, today);
  const relativeLabel = getDeadlineLabel(isoDate, today);
  const config = statusConfig[status];

  return (
    <div
      className={`flex items-start justify-between p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${config.textColor}`}>
            {label}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}
          >
            {config.label}
          </span>
        </div>
        {isoDate && (
          <p className={`text-sm mt-0.5 ${config.textColor}`}>
            {formatDate(isoDate)}
          </p>
        )}
        {!isoDate && (
          <p className={`text-sm mt-0.5 ${config.textColor}`}>Not available</p>
        )}
        {additionalInfo && (
          <p className="text-xs text-gray-500 mt-0.5">{additionalInfo}</p>
        )}
      </div>
      <span
        className={`text-sm font-medium ml-3 whitespace-nowrap ${config.textColor}`}
      >
        {relativeLabel}
      </span>
    </div>
  );
}
