const MAX_PROFILE_SIZE = 10 * 1024; // 10KB

export interface VoterProfileData {
  date: string;
  location: string;
  values: string[];
  decisionStyle: string[];
  personalContext: string[];
  votingHistory: string[];
  notes: string[];
}

export function isValidProfile(text: string): boolean {
  if (!text || text.length > MAX_PROFILE_SIZE) return false;
  return (
    text.includes("=== MY VOTER PROFILE") &&
    text.includes("=== END VOTER PROFILE ===")
  );
}

export function parseVoterProfile(text: string): VoterProfileData {
  const getSection = (header: string): string[] => {
    const regex = new RegExp(`${header}[:\\s]*\\n((?:- .+\\n?)*)`, "i");
    const match = text.match(regex);
    if (!match) return [];
    return match[1]
      .split("\n")
      .filter((l) => l.trim().startsWith("- "))
      .map((l) => l.replace(/^- /, "").trim());
  };

  const locationMatch = text.match(/LOCATION:\s*(.+)/i);

  return {
    date: new Date().toISOString().split("T")[0],
    location: locationMatch?.[1]?.trim() ?? "",
    values: getSection("WHAT I CARE ABOUT"),
    decisionStyle: getSection("HOW I MAKE DECISIONS"),
    personalContext: getSection("WHAT AFFECTS ME PERSONALLY"),
    votingHistory: getSection("MY VOTING HISTORY WITH THIS TOOL"),
    notes: getSection("NOTES"),
  };
}

export function generateProfileText(data: VoterProfileData): string {
  const formatList = (items: string[]) =>
    items.length > 0
      ? items.map((i) => `- ${i}`).join("\n")
      : "- (none recorded)";

  return `=== MY VOTER PROFILE — ${data.date} ===

LOCATION: ${data.location}

WHAT I CARE ABOUT:
${formatList(data.values)}

HOW I MAKE DECISIONS:
${formatList(data.decisionStyle)}

WHAT AFFECTS ME PERSONALLY:
${formatList(data.personalContext)}

MY VOTING HISTORY WITH THIS TOOL:
${formatList(data.votingHistory)}

NOTES:
${formatList(data.notes)}

=== END VOTER PROFILE ===`;
}
