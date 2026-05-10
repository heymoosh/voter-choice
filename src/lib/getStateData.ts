import type { StateElectionData, Election } from "../types/election";

type JsonImport = () => Promise<{ default: unknown }>;

const stateModules: Record<string, JsonImport> = {
  AK: () => import("../data/states/AK.json"),
  AL: () => import("../data/states/AL.json"),
  AR: () => import("../data/states/AR.json"),
  AZ: () => import("../data/states/AZ.json"),
  CA: () => import("../data/states/CA.json"),
  CO: () => import("../data/states/CO.json"),
  CT: () => import("../data/states/CT.json"),
  DC: () => import("../data/states/DC.json"),
  DE: () => import("../data/states/DE.json"),
  FL: () => import("../data/states/FL.json"),
  GA: () => import("../data/states/GA.json"),
  HI: () => import("../data/states/HI.json"),
  IA: () => import("../data/states/IA.json"),
  ID: () => import("../data/states/ID.json"),
  IL: () => import("../data/states/IL.json"),
  IN: () => import("../data/states/IN.json"),
  KS: () => import("../data/states/KS.json"),
  KY: () => import("../data/states/KY.json"),
  LA: () => import("../data/states/LA.json"),
  MA: () => import("../data/states/MA.json"),
  MD: () => import("../data/states/MD.json"),
  ME: () => import("../data/states/ME.json"),
  MI: () => import("../data/states/MI.json"),
  MN: () => import("../data/states/MN.json"),
  MO: () => import("../data/states/MO.json"),
  MS: () => import("../data/states/MS.json"),
  MT: () => import("../data/states/MT.json"),
  NC: () => import("../data/states/NC.json"),
  ND: () => import("../data/states/ND.json"),
  NE: () => import("../data/states/NE.json"),
  NH: () => import("../data/states/NH.json"),
  NJ: () => import("../data/states/NJ.json"),
  NM: () => import("../data/states/NM.json"),
  NV: () => import("../data/states/NV.json"),
  NY: () => import("../data/states/NY.json"),
  OH: () => import("../data/states/OH.json"),
  OK: () => import("../data/states/OK.json"),
  OR: () => import("../data/states/OR.json"),
  PA: () => import("../data/states/PA.json"),
  RI: () => import("../data/states/RI.json"),
  SC: () => import("../data/states/SC.json"),
  SD: () => import("../data/states/SD.json"),
  TN: () => import("../data/states/TN.json"),
  TX: () => import("../data/states/TX.json"),
  UT: () => import("../data/states/UT.json"),
  VA: () => import("../data/states/VA.json"),
  VT: () => import("../data/states/VT.json"),
  WA: () => import("../data/states/WA.json"),
  WI: () => import("../data/states/WI.json"),
  WV: () => import("../data/states/WV.json"),
  WY: () => import("../data/states/WY.json"),
};

/**
 * Maps state codes to state names for the fallback path.
 * Used when a state isn't in stateModules yet.
 */
const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AR: "Arkansas",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NJ: "New Jersey",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "Washington, D.C.",
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

/**
 * Returns a graceful fallback StateElectionData for states we haven't
 * fully populated yet. Shows federal-deadline guidance and an explicit
 * "we don't have specific deadlines for [state] yet" disposition.
 */
export function getFallbackStateData(stateCode: string): StateElectionData {
  const code = stateCode.toUpperCase();
  const stateName = STATE_NAMES[code] ?? stateCode;
  const today = new Date().toISOString().split("T")[0];
  // Place the general election in the future so the app doesn't treat this as "no election"
  const generalDate = today < "2026-11-03" ? "2026-11-03" : "2027-11-02";

  return {
    stateCode: code,
    stateName,
    lastUpdated: today,
    coverageStatus: "unconfirmed",
    elections: [
      {
        id: `${code.toLowerCase()}-general`,
        name: `${generalDate.slice(0, 4)} General Election`,
        date: generalDate,
        type: "general",
        isPrimary: false,
        primaryType: null,
      },
    ],
    registration: {
      online: {
        available: true,
        deadline: null,
        url: `https://vote.gov/register/`,
      },
      byMail: {
        deadline: "Check your state's election website",
        sincePostmarked: false,
      },
      inPerson: {
        deadline: "Check your state's election website",
        sincePostmarked: false,
      },
      sameDayRegistration: false,
      registrationCheckUrl: "https://vote.gov/",
    },
    earlyVoting: {
      available: false,
      startDate: null,
      endDate: null,
      notes: `We don't have specific early voting dates for ${stateName} yet. Check vote.gov or your state election website for details.`,
    },
    votingRules: {
      idRequired: false,
      acceptedIds: [],
      phonesAtPolls: "varies",
      phonesAtPollsDetail: `Phone rules vary by state. Check your ${stateName} county election office for details.`,
      additionalRules: [
        `We don't have specific election deadlines for ${stateName} yet. Visit vote.gov for federal voter registration guidance and your state's official election website for state-specific rules.`,
      ],
    },
    runoffRules: {
      hasRunoff: false,
      partyLockedToFirstRoundPrimary: false,
    },
    resources: {
      stateElectionWebsite: "https://vote.gov/",
      countyElectionLookup: "https://vote.gov/",
      sampleBallotLookup: "https://vote.gov/",
      pollingPlaceLookup: "https://vote.gov/",
    },
  };
}

export async function getStateData(
  stateCode: string,
): Promise<StateElectionData | null> {
  if (!stateCode) return null;
  const code = stateCode.toUpperCase();
  const loader = stateModules[code];
  if (!loader) {
    // Return a fallback for known U.S. state codes we haven't fully populated yet
    if (STATE_NAMES[code]) {
      return getFallbackStateData(code);
    }
    return null;
  }
  try {
    const mod = await loader();
    return resolveStateData(mod.default as Record<string, unknown>);
  } catch {
    return null;
  }
}
