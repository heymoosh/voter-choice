"use client";

import { useState, useCallback, useRef } from "react";
import ZipForm from "./ZipForm";
import StateSelectorModal from "./StateSelectorModal";
import StateInfoCard from "./StateInfoCard";
import PromptOutput from "./PromptOutput";
import { lookupZip } from "../lib/lookupZip";
import { getStateData } from "../lib/getStateData";
import { generatePrompt } from "../lib/generatePrompt";
import type { StateElectionData } from "../lib/types";

export default function BallotToolClient() {
  const [error, setError] = useState<string | null>(null);
  const [stateCodes, setStateCodes] = useState<string[]>([]);
  const [stateData, setStateData] = useState<StateElectionData | null>(null);
  const [promptText, setPromptText] = useState<string>("");
  const [zip, setZip] = useState<string>("");
  const [showSelector, setShowSelector] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const loadState = useCallback(async (stateCode: string, zipCode: string) => {
    const data = await getStateData(stateCode);
    if (data) {
      setStateData(data);
      setPromptText(generatePrompt(data, zipCode));
      setShowSelector(false);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
        const heading = resultsRef.current?.querySelector("h2");
        if (heading) (heading as HTMLElement).focus();
      }, 100);
    }
  }, []);

  const handleSubmit = useCallback(
    async (inputZip: string) => {
      setStateData(null);
      setPromptText("");
      setStateCodes([]);
      setShowSelector(false);
      setNotFound(false);

      if (!inputZip.trim()) {
        setError("errors.zipEmpty");
        return;
      }

      if (!/^\d{5}$/.test(inputZip)) {
        setError("errors.zipInvalid");
        return;
      }

      setError(null);
      setZip(inputZip);

      const codes = lookupZip(inputZip);
      if (!codes || codes.length === 0) {
        setNotFound(true);
        return;
      }

      setStateCodes(codes);

      if (codes.length === 1) {
        await loadState(codes[0], inputZip);
      } else {
        setShowSelector(true);
      }
    },
    [loadState],
  );

  const handleStateSelect = useCallback(
    async (stateCode: string) => {
      await loadState(stateCode, zip);
    },
    [loadState, zip],
  );

  return (
    <div className="w-full">
      <div className="relative">
        <ZipForm
          onSubmit={handleSubmit}
          error={error}
          onClearError={() => setError(null)}
        />
      </div>

      {notFound && (
        <div
          data-testid="not-found-message"
          className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 my-4"
        >
          <p className="text-yellow-800">
            We don&apos;t have data for this zip code yet. We&apos;re working on
            adding all U.S. zip codes.
          </p>
          <a
            href="https://www.usa.gov/election-office"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-700 hover:text-teal-900 underline text-sm mt-2 inline-block"
          >
            Find your state election website →
          </a>
        </div>
      )}

      {showSelector && (
        <StateSelectorModal
          stateCodes={stateCodes}
          onSelect={handleStateSelect}
        />
      )}

      <div ref={resultsRef}>
        {stateData && <StateInfoCard stateData={stateData} />}
        {promptText && <PromptOutput promptText={promptText} />}
      </div>
    </div>
  );
}
