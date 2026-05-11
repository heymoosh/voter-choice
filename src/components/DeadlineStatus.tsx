import { getDeadlineInfo } from "@/lib/deadlineUtils";

const statusStyles: Record<string, string> = {
  green: "bg-green-100 text-green-800 border-green-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  red: "bg-red-100 text-red-800 border-red-200",
  passed: "bg-gray-100 text-gray-600 border-gray-200",
};

interface DeadlineStatusProps {
  label: string;
  deadline: string | null | undefined;
  today?: Date;
}

export function DeadlineStatus({
  label,
  deadline,
  today,
}: DeadlineStatusProps) {
  const info = getDeadlineInfo(deadline, today);
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-600">{label}</span>
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[info.status]}`}
      >
        {deadline && info.status !== "passed" ? `${deadline} · ` : ""}
        {info.label}
      </span>
    </div>
  );
}
