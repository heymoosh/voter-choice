/**
 * Client-side hook for fetching live election data.
 * Calls /api/election-data and manages loading/error state.
 * Progressive: data is shown as soon as it arrives.
 */

import { useState, useCallback } from "react";
import type { LiveElectionData } from "./api-types";

export type FetchStatus = "idle" | "loading" | "done" | "error";

export interface ElectionDataState {
  status: FetchStatus;
  data: LiveElectionData | null;
  partial: boolean;
  fallback: boolean;
  error: string | null;
}

// Client-side session cache (zip → data)
const sessionCache = new Map<string, LiveElectionData>();

export function useElectionData() {
  const [state, setState] = useState<ElectionDataState>({
    status: "idle",
    data: null,
    partial: false,
    fallback: false,
    error: null,
  });

  const fetchData = useCallback(async (zip: string) => {
    // Check session cache first (instant response, no loading state)
    const cached = sessionCache.get(zip);
    if (cached) {
      setState({
        status: "done",
        data: cached,
        partial: false,
        fallback: false,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, status: "loading", error: null }));

    try {
      const resp = await fetch(
        `/api/election-data?zip=${encodeURIComponent(zip)}`,
      );
      const json = (await resp.json()) as {
        data: LiveElectionData | null;
        error: string | null;
        partial: boolean;
        fallback: boolean;
      };

      if (json.data) {
        sessionCache.set(zip, json.data);
      }

      setState({
        status: "done",
        data: json.data,
        partial: json.partial,
        fallback: json.fallback,
        error: json.error,
      });
    } catch (err) {
      setState({
        status: "error",
        data: null,
        partial: false,
        fallback: true,
        error: "Could not load election data. Please try again.",
      });
      console.error("Election data fetch error:", err);
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      status: "idle",
      data: null,
      partial: false,
      fallback: false,
      error: null,
    });
  }, []);

  return { state, fetchData, reset };
}
