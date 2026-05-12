import derivedData from "@/data/openstates/derived.json";
import type { DerivedOpenStatesData } from "@/lib/openstates/types";

export function loadDerivedOpenStatesData(): DerivedOpenStatesData {
  return derivedData as DerivedOpenStatesData;
}
