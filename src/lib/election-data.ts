import type {
  StateData,
  ZipToStateMap,
  Election,
  DeadlineInfo,
  DeadlineStatus,
} from "@/types/election";

import zipToStateData from "@/data/zip-to-state.json";
import TX from "@/data/states/TX.json";
import CA from "@/data/states/CA.json";
import NH from "@/data/states/NH.json";

const ZIP_TO_STATE: ZipToStateMap = zipToStateData as ZipToStateMap;

const STATE_DATA: Record<string, StateData> = {
  TX: TX as StateData,
  CA: CA as StateData,
  NH: NH as StateData,
};

/**
 * Look up state code(s) for a given zip code.
 * Returns an empty array if the zip is not found.
 */
export function getStatesForZip(zip: string): string[] {
  return ZIP_TO_STATE[zip] ?? [];
}

/**
 * Get state election data by state code.
 * Returns null if no data for that state.
 */
export function getStateData(stateCode: string): StateData | null {
  return STATE_DATA[stateCode] ?? null;
}

/**
 * Get the next upcoming election from a state's election list.
 * "Upcoming" means election date >= today.
 * Returns null if no upcoming elections found.
 */
export function getNextElection(state: StateData): Election | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = state.elections.filter((e) => {
    const electionDate = new Date(e.date + "T00:00:00");
    return electionDate >= today;
  });

  if (upcoming.length === 0) return null;

  // Sort ascending by date, return first
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0];
}

/**
 * Calculate deadline status relative to today.
 * Returns a DeadlineInfo with status label and days remaining.
 */
export function getDeadlineInfo(isoDate: string | null): DeadlineInfo {
  if (!isoDate) {
    return { date: null, status: "none", daysRemaining: null, label: "N/A" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(isoDate + "T00:00:00");
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.round(
    (deadline.getTime() - today.getTime()) / msPerDay,
  );

  let status: DeadlineStatus;
  let label: string;

  if (daysRemaining < 0) {
    status = "passed";
    label = "Passed";
  } else if (daysRemaining <= 3) {
    status = "urgent";
    label = daysRemaining === 0 ? "Today!" : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`;
  } else if (daysRemaining <= 14) {
    status = "warning";
    label = `${daysRemaining} days left`;
  } else {
    status = "ok";
    label = `${daysRemaining} days left`;
  }

  return { date: isoDate, status, daysRemaining, label };
}

/**
 * Format an ISO date string for display (e.g., "March 3, 2026").
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
