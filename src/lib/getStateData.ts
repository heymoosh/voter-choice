import type { StateElectionData, Election } from "../types/election";

type JsonImport = () => Promise<{ default: unknown }>;

const stateModules: Record<string, JsonImport> = {
  TX: () => import("../data/states/TX.json"),
  CA: () => import("../data/states/CA.json"),
  NH: () => import("../data/states/NH.json"),
  AZ: () => import("../data/states/AZ.json"),
  NM: () => import("../data/states/NM.json"),
};

function findUpcomingElection(elections: Election[]): Election | null {
  const today = new Date().toISOString().split("T")[0];
  const upcoming = elections.filter((e) => e.date >= today);
  if (upcoming.length > 0) {
    return upcoming.reduce((min, e) => (e.date < min.date ? e : min));
  }
  return elections.length > 0 ? elections[elections.length - 1] : null;
}

function resolveStateData(raw: Record<string, unknown>): StateElectionData {
  const data = raw as unknown as StateElectionData;

  // If top-level registration/earlyVoting already exist, return as-is
  if (data.registration && data.earlyVoting) {
    return data;
  }

  // Resolve from the next upcoming election's per-election data
  const election = findUpcomingElection(data.elections);
  if (election?.registration && election?.earlyVoting) {
    return {
      ...data,
      registration: election.registration,
      earlyVoting: election.earlyVoting,
    };
  }

  return data;
}

export async function getStateData(
  stateCode: string,
): Promise<StateElectionData | null> {
  if (!stateCode) return null;
  const loader = stateModules[stateCode.toUpperCase()];
  if (!loader) return null;
  try {
    const mod = await loader();
    return resolveStateData(mod.default as Record<string, unknown>);
  } catch {
    return null;
  }
}
