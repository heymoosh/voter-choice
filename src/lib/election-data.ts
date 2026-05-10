import {
  StateData,
  StateInfoResult,
  DeadlineInfo,
  DeadlineStatus,
  Election,
} from "@/types/election";
import zipToState from "@/data/zip-to-state.json";

const TODAY = new Date("2026-05-10");

function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function deadlineStatus(dateStr: string): DeadlineInfo {
  const deadline = parseDate(dateStr);
  const diffDays = Math.ceil(
    (deadline.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24),
  );
  let status: DeadlineStatus;
  let label: string;

  if (diffDays < 0) {
    status = "passed";
    label = `Passed (${dateStr})`;
  } else if (diffDays === 0) {
    status = "open";
    label = `Today (${dateStr})`;
  } else if (diffDays <= 7) {
    status = "upcoming";
    label = `${diffDays} days left (${dateStr})`;
  } else {
    status = "open";
    label = `Deadline: ${dateStr}`;
  }

  return { status, label, date: dateStr };
}

function getNextElection(elections: Election[]): Election | null {
  const future = elections
    .map((e) => ({ ...e, parsedDate: parseDate(e.date) }))
    .filter((e) => e.parsedDate >= TODAY)
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  return future[0] ?? elections[elections.length - 1] ?? null;
}

async function loadStateData(stateCode: string): Promise<StateData | null> {
  try {
    const data = await import(`@/data/states/${stateCode}.json`);
    return data.default as StateData;
  } catch {
    return null;
  }
}

export async function getStateInfo(
  stateCode: string,
): Promise<StateInfoResult | null> {
  const stateData = await loadStateData(stateCode);
  if (!stateData) return null;

  const nextElection = getNextElection(stateData.elections);
  const regDeadline = stateData.registration.online.deadline;
  const registrationDeadline = deadlineStatus(regDeadline);

  return { stateData, nextElection, registrationDeadline };
}

export function getStatesForZip(zip: string): string[] {
  const map = zipToState as Record<string, string[]>;
  return map[zip] ?? [];
}

export function isMultiStateZip(zip: string): boolean {
  return getStatesForZip(zip).length > 1;
}

export function formatElectionDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
