import type { StateElectionData, ZipToStateMap } from "@/types/election";
import zipToStateData from "@/data/zip-to-state.json";
import txData from "@/data/states/TX.json";
import caData from "@/data/states/CA.json";
import nhData from "@/data/states/NH.json";

const zipToStateMap = zipToStateData as ZipToStateMap;

const stateDataMap: Record<string, StateElectionData> = {
  TX: txData as StateElectionData,
  CA: caData as StateElectionData,
  NH: nhData as StateElectionData,
};

export function lookupStatesByZip(zipCode: string): string[] | null {
  return zipToStateMap[zipCode] || null;
}

export function getStateData(stateCode: string): StateElectionData | null {
  return stateDataMap[stateCode] || null;
}

export function getNextElection(
  stateData: StateElectionData,
): StateElectionData["elections"][0] | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingElections = stateData.elections.filter((election) => {
    const electionDate = new Date(election.date);
    return electionDate >= today;
  });

  if (upcomingElections.length === 0) {
    return null;
  }

  return upcomingElections[0];
}

export function getDeadlineStatus(deadline: string): {
  isPassed: boolean;
  daysRemaining: number;
  status: "passed" | "urgent" | "warning" | "good";
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isPassed = diffDays < 0;

  let status: "passed" | "urgent" | "warning" | "good";
  if (isPassed) {
    status = "passed";
  } else if (diffDays <= 3) {
    status = "urgent";
  } else if (diffDays <= 14) {
    status = "warning";
  } else {
    status = "good";
  }

  return {
    isPassed,
    daysRemaining: Math.max(0, diffDays),
    status,
  };
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
