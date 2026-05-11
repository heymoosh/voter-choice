export type DeadlineStatus = "green" | "yellow" | "red" | "passed";

export interface DeadlineInfo {
  status: DeadlineStatus;
  label: string;
  daysLeft: number | null;
}

export function getDeadlineInfo(
  deadlineIso: string | null | undefined,
  today: Date = new Date(),
): DeadlineInfo {
  if (!deadlineIso) {
    return { status: "passed", label: "Not available", daysLeft: null };
  }
  // Use ISO date strings to avoid timezone offset issues
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayTime = new Date(todayIso + "T00:00:00").getTime();
  const deadlineTime = new Date(deadlineIso + "T00:00:00").getTime();
  const diffMs = deadlineTime - todayTime;
  const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { status: "passed", label: "Passed", daysLeft: null };
  }
  if (daysLeft === 0) {
    return { status: "red", label: "Today", daysLeft: 0 };
  }
  if (daysLeft <= 3) {
    return {
      status: "red",
      label: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
      daysLeft,
    };
  }
  if (daysLeft <= 14) {
    return { status: "yellow", label: `${daysLeft} days left`, daysLeft };
  }
  return { status: "green", label: `${daysLeft} days left`, daysLeft };
}
