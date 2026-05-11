export type DeadlineStatus = {
  status: "ok" | "warning" | "urgent" | "passed";
  label: string;
  colorClass: string;
  daysLeft: number | null;
};

export function getDeadlineStatus(
  isoDate: string | null | undefined,
  today: Date = new Date(),
): DeadlineStatus {
  if (!isoDate) {
    return {
      status: "passed",
      label: "N/A",
      colorClass: "text-gray-500",
      daysLeft: null,
    };
  }

  // Parse both dates as UTC day boundaries to avoid timezone drift
  const [year, month, day] = isoDate.split("-").map(Number);
  const deadlineMs = Date.UTC(year, month - 1, day);
  // Normalize today to UTC midnight using UTC date components
  const todayMs = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const diffMs = deadlineMs - todayMs;
  const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 1) {
    return {
      status: "passed",
      label: "Passed",
      colorClass: "text-gray-500",
      daysLeft: 0,
    };
  }
  if (daysLeft <= 3) {
    return {
      status: "urgent",
      label: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
      colorClass: "text-red-600",
      daysLeft,
    };
  }
  if (daysLeft <= 14) {
    return {
      status: "warning",
      label: `${daysLeft} days left`,
      colorClass: "text-yellow-600",
      daysLeft,
    };
  }
  return {
    status: "ok",
    label: `${daysLeft} days left`,
    colorClass: "text-green-600",
    daysLeft,
  };
}
