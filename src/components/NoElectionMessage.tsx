import type { StateData } from "@/types";

interface NoElectionMessageProps {
  stateData: StateData;
}

export function NoElectionMessage({ stateData }: NoElectionMessageProps) {
  return (
    <div
      data-testid="no-election-message"
      role="alert"
      className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900"
    >
      <h2 className="text-base font-semibold mb-1">No upcoming elections</h2>
      <p className="text-sm">
        No upcoming elections found for <strong>{stateData.stateName}</strong>.{" "}
        <a
          href={stateData.resources.stateElectionWebsite}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Check the {stateData.stateName} election website
        </a>{" "}
        for updates on upcoming elections.
      </p>
    </div>
  );
}
