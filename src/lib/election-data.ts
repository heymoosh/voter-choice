import type { StateElectionData, ZipToStateMap } from "@/types/election";

import txData from "@/data/states/TX.json";
import caData from "@/data/states/CA.json";
import nhData from "@/data/states/NH.json";
import zipToStateMap from "@/data/zip-to-state.json";

const stateDataMap: Record<string, StateElectionData> = {
  TX: txData as StateElectionData,
  CA: caData as StateElectionData,
  NH: nhData as StateElectionData,
};

export function getStatesForZip(zipCode: string): string[] | null {
  const map = zipToStateMap as ZipToStateMap;
  return map[zipCode] || null;
}

export function getStateData(stateCode: string): StateElectionData | null {
  return stateDataMap[stateCode] || null;
}

export function getNextElection(
  stateData: StateElectionData,
): StateElectionData["elections"][0] | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const election of stateData.elections) {
    const electionDate = new Date(election.date);
    electionDate.setHours(0, 0, 0, 0);

    if (electionDate >= today) {
      return election;
    }
  }

  return null;
}

export function calculateDaysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

export function getDeadlineStatus(deadline: string | null): {
  daysRemaining: number | null;
  status: "passed" | "urgent" | "warning" | "upcoming";
  label: string;
} {
  const days = calculateDaysRemaining(deadline);

  if (days === null) {
    return {
      daysRemaining: null,
      status: "passed",
      label: "Not available",
    };
  }

  if (days < 0) {
    return {
      daysRemaining: days,
      status: "passed",
      label: "Deadline passed",
    };
  }

  if (days <= 3) {
    return {
      daysRemaining: days,
      status: "urgent",
      label: `${days} day${days === 1 ? "" : "s"} left`,
    };
  }

  if (days <= 14) {
    return {
      daysRemaining: days,
      status: "warning",
      label: `${days} days left`,
    };
  }

  return {
    daysRemaining: days,
    status: "upcoming",
    label: `${days} days left`,
  };
}
