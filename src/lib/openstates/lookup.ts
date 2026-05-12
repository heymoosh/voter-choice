import { normalizeName } from "@/lib/openstates/derive";
import type {
  CandidateContext,
  CandidateLookupInput,
  DerivedOpenStatesData,
} from "@/lib/openstates/types";

function normalizedIncludes(value: string | null | undefined, query: string) {
  return Boolean(value && normalizeName(value).includes(normalizeName(query)));
}

export function lookupCandidateContext(
  data: DerivedOpenStatesData,
  input: CandidateLookupInput,
): CandidateContext | null {
  const candidateName = normalizeName(input.candidateName);
  const state = input.state?.toUpperCase() ?? null;

  return (
    data.candidates.find((candidate) => {
      if (candidate.normalizedName !== candidateName) {
        return false;
      }

      if (state && candidate.state !== state) {
        return false;
      }

      if (
        input.officeTitle &&
        !normalizedIncludes(candidate.officeTitle, input.officeTitle)
      ) {
        return false;
      }

      if (input.district && candidate.district !== input.district) {
        return false;
      }

      return true;
    }) ?? null
  );
}
