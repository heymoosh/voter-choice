import type {
  CandidateLookup,
  OpenStatesCandidateContext,
  OpenStatesDerivedData,
} from "@/lib/openstates/types";
import { lookupOpenStatesCandidate } from "@/lib/openstates/derive";

export function getCandidateEnrichment(
  derived: OpenStatesDerivedData | null,
  lookup: CandidateLookup,
): OpenStatesCandidateContext | null {
  if (!derived) {
    return null;
  }

  return lookupOpenStatesCandidate(derived, lookup);
}
