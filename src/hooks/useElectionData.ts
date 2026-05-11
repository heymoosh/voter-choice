"use client";
import { useState, useCallback } from "react";
import { lookupZip } from "@/lib/zipLookup";
import { buildFullPrompt } from "@/lib/promptBuilder";
import type { StateData } from "@/types/state";

export type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "multi-state"; stateCodes: string[]; zip: string }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "loaded"; stateData: StateData; zip: string; prompt: string };

async function loadStateData(
  code: string,
  zip: string,
): Promise<{ stateData: StateData; prompt: string }> {
  const res = await fetch(`/api/state/${code}`);
  if (!res.ok) throw new Error("State data unavailable");
  const stateData: StateData = await res.json();
  const prompt = buildFullPrompt(stateData, zip);
  return { stateData, prompt };
}

export function useElectionData() {
  const [state, setState] = useState<AppState>({ status: "idle" });

  const lookup = useCallback(async (zip: string) => {
    const stateCodes = lookupZip(zip);
    if (!stateCodes) {
      setState({ status: "not-found" });
      return;
    }
    if (stateCodes.length > 1) {
      setState({ status: "multi-state", stateCodes, zip });
      return;
    }
    setState({ status: "loading" });
    try {
      const { stateData, prompt } = await loadStateData(stateCodes[0], zip);
      setState({ status: "loaded", stateData, zip, prompt });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, []);

  const selectState = useCallback(async (code: string, zip: string) => {
    setState({ status: "loading" });
    try {
      const { stateData, prompt } = await loadStateData(code, zip);
      setState({ status: "loaded", stateData, zip, prompt });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return { state, lookup, selectState, reset };
}
