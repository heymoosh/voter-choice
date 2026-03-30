import zipToStateRaw from "../data/zip-to-state.json";
import txData from "../data/states/TX.json";
import caData from "../data/states/CA.json";
import nhData from "../data/states/NH.json";
import type {
  StateData,
  Registration,
  RegistrationStatuses,
} from "../types/election";
import { computeDeadlineStatus } from "./date-utils";

const zipToState = zipToStateRaw as Record<string, string[]>;

const STATE_DATA: Record<string, StateData> = {
  TX: txData as StateData,
  CA: caData as StateData,
  NH: nhData as StateData,
};

/** Returns array of state codes for a zip, or null if not found. */
export function lookupZip(zip: string): string[] | null {
  if (!zip) return null;
  return zipToState[zip] ?? null;
}

/** Returns StateData for a state code, or null if not found. */
export function loadStateData(stateCode: string): StateData | null {
  return STATE_DATA[stateCode] ?? null;
}

/** Computes deadline statuses for all three registration methods. */
export function computeRegistrationStatuses(
  registration: Registration,
  today: Date,
): RegistrationStatuses {
  const online = computeDeadlineStatus(
    registration.online.available ? registration.online.deadline : null,
    today,
  );
  const byMail = computeDeadlineStatus(registration.byMail.deadline, today);
  const inPerson = computeDeadlineStatus(registration.inPerson.deadline, today);

  const allPassed =
    online.urgency === "passed" &&
    byMail.urgency === "passed" &&
    inPerson.urgency === "passed";

  return { online, byMail, inPerson, allPassed };
}
