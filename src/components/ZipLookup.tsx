"use client";

import { useState } from "react";
import type { StateData, Election } from "@/types";
import { lookupZip } from "@/lib/zipLookup";
import { getStateData } from "@/lib/stateData";
import { findNextElection } from "@/lib/deadlineUtils";
import { buildCustomizedPrompt } from "@/lib/promptBuilder";
import StateInfoCard from "./StateInfoCard";
import PromptOutput from "./PromptOutput";

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "multistate"; zip: string; states: string[] }
  | { status: "notfound"; zip: string }
  | {
      status: "loaded";
      zip: string;
      stateData: StateData;
      nextElection: Election | null;
      prompt: string;
    }
  | { status: "nostate"; stateCode: string };

// eslint-disable-next-line complexity
export default function ZipLookup() {
  const [zipValue, setZipValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lookupState, setLookupState] = useState<LookupState>({
    status: "idle",
  });

  function validateZip(value: string): string | null {
    if (!value.trim()) return "Please enter a zip code";
    if (!/^\d{5}$/.test(value.trim()))
      return "Please enter a valid 5-digit zip code";
    return null;
  }

  async function handleSubmit(zip: string) {
    const trimmed = zip.trim();
    const validationError = validateZip(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLookupState({ status: "loading" });

    const states = lookupZip(trimmed);
    if (!states) {
      setLookupState({ status: "notfound", zip: trimmed });
      return;
    }
    if (states.length > 1) {
      setLookupState({ status: "multistate", zip: trimmed, states });
      return;
    }
    await loadState(trimmed, states[0]);
  }

  async function loadState(zip: string, stateCode: string) {
    setLookupState({ status: "loading" });
    const stateData = await getStateData(stateCode);
    if (!stateData) {
      setLookupState({ status: "nostate", stateCode });
      return;
    }
    const nextElection = findNextElection(stateData.elections);
    const prompt = nextElection
      ? buildCustomizedPrompt(stateData, zip, nextElection)
      : "";
    setLookupState({ status: "loaded", zip, stateData, nextElection, prompt });
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSubmit(zipValue);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleSubmit(zipValue);
    }
  }

  return (
    <section
      aria-label="Zip code lookup"
      className="w-full max-w-2xl mx-auto px-4"
    >
      <form
        onSubmit={handleFormSubmit}
        noValidate
        className="flex flex-col gap-3"
      >
        <label
          htmlFor="zip-input"
          className="text-lg font-semibold text-gray-800"
        >
          Enter your zip code
        </label>
        <div className="flex gap-2 flex-col sm:flex-row">
          <input
            id="zip-input"
            data-testid="zip-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={5}
            placeholder="e.g., 73301"
            value={zipValue}
            onChange={(e) => {
              setZipValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            aria-label="5-digit zip code"
            aria-describedby={error ? "zip-error" : undefined}
            aria-invalid={error ? "true" : undefined}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
          <button
            type="submit"
            data-testid="zip-submit"
            className="bg-blue-700 text-white rounded-lg px-6 py-3 text-base font-semibold min-h-[44px] min-w-[120px] hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors"
          >
            Look up
          </button>
        </div>

        {error && (
          <p
            id="zip-error"
            data-testid="zip-error"
            role="alert"
            className="text-red-700 text-sm font-medium"
          >
            {error}
          </p>
        )}
      </form>

      {/* Loading state */}
      {lookupState.status === "loading" && (
        <div
          role="status"
          aria-live="polite"
          className="mt-6 text-center text-gray-600"
        >
          <span className="inline-block animate-pulse">
            Looking up your zip code…
          </span>
        </div>
      )}

      {/* Not found */}
      {lookupState.status === "notfound" && (
        <div
          data-testid="not-found-message"
          role="alert"
          className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800"
        >
          <p className="font-semibold">Zip code not found</p>
          <p className="mt-1 text-sm">
            We don&apos;t have data for zip code {lookupState.zip} yet.
            We&apos;re working on adding all U.S. zip codes.{" "}
            <a
              href="https://www.usa.gov/election-office"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-yellow-900 hover:text-yellow-700"
            >
              Find your state election website
            </a>
            .
          </p>
        </div>
      )}

      {/* Multi-state selector */}
      {lookupState.status === "multistate" && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-semibold text-blue-900 mb-3">
            This zip code spans multiple states. Which state are you voting in?
          </p>
          <div
            data-testid="state-selector"
            className="flex flex-col sm:flex-row gap-2"
          >
            {lookupState.states.map((stateCode) => (
              <button
                key={stateCode}
                onClick={() => loadState(lookupState.zip, stateCode)}
                className="flex-1 bg-white border border-blue-300 text-blue-800 rounded-lg px-4 py-3 text-base font-medium min-h-[44px] hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
              >
                {stateCode}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No state data */}
      {lookupState.status === "nostate" && (
        <div
          data-testid="not-found-message"
          role="alert"
          className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800"
        >
          <p className="font-semibold">State data not available</p>
          <p className="mt-1 text-sm">
            We don&apos;t have data for {lookupState.stateCode} yet. We&apos;re
            working on expanding coverage.{" "}
            <a
              href="https://www.usa.gov/election-office"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-yellow-900 hover:text-yellow-700"
            >
              Find your state election website
            </a>
            .
          </p>
        </div>
      )}

      {/* Loaded: show state info card and prompt */}
      {lookupState.status === "loaded" && (
        <div className="mt-6 flex flex-col gap-6">
          <StateInfoCard
            stateData={lookupState.stateData}
            nextElection={lookupState.nextElection}
          />
          {lookupState.nextElection && lookupState.prompt && (
            <PromptOutput prompt={lookupState.prompt} />
          )}
        </div>
      )}
    </section>
  );
}
