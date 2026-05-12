import type {
  CandidateContext,
  DerivedOpenStatesData,
  RawOpenStatesRecord,
} from "@/lib/openstates/types";

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function deriveOpenStatesData(
  records: RawOpenStatesRecord[],
  generatedAt = new Date().toISOString(),
): DerivedOpenStatesData {
  const candidates = records.map<CandidateContext>((record) => {
    const votes = [...(record.votes ?? [])]
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 5)
      .map((vote) => ({
        billId: vote.billId,
        billTitle: vote.billTitle,
        date: vote.date,
        option: vote.option,
        sourceUrl: vote.sourceUrl ?? null,
      }));

    return {
      personId: record.person.id,
      name: record.person.name,
      normalizedName: normalizeName(record.person.name),
      party: record.person.party ?? null,
      state: record.office?.state?.toUpperCase() ?? null,
      jurisdiction: record.office?.jurisdiction ?? null,
      officeTitle: record.office?.title ?? null,
      district: record.office?.district ?? null,
      isIncumbent: record.office?.isIncumbent ?? false,
      sourceLinks: record.person.links ?? [],
      recentVotes: votes,
    };
  });

  return {
    generatedAt,
    candidates,
  };
}
