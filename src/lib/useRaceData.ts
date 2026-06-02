"use client";

import { useEffect, useRef, useState } from "react";
// Type-only import — erased at compile time, so the server-only race-data
// module (which imports the DB client) never reaches the client bundle.
import type { RaceData } from "./server/race-data";

export interface UseRaceDataInput {
  raceId: string;
  raceLabel: string;
  section: string;
  stateCode: string;
  candidates: { name: string; party?: string }[];
  issues: {
    canonicalIssue: string;
    issueLabel?: string;
    stance: "in_favor" | "opposed";
  }[];
  electionCycle?: string;
}

export interface UseRaceDataResult {
  data: RaceData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetch the deterministic, LLM-free candidate-card data for a race from
 * `POST /api/race-data`. This is the cards-first data source — the workspace
 * renders candidate cards from THIS, not from a parsed chat message.
 *
 * Refetches whenever the keyed inputs (race id, candidate roster, ranked
 * issues, state) change. The caller is re-keyed per race upstream, but we
 * also guard internally so a stale response can't overwrite a newer race's
 * data (the `requestId` ref).
 *
 * On error or empty DB the endpoint still returns a well-formed RaceData with
 * backstop cards (see race-data.ts), so consumers can render unconditionally
 * once `loading` is false and `data` is non-null.
 */
export function useRaceData(input: UseRaceDataInput | null): UseRaceDataResult {
  const [data, setData] = useState<RaceData | null>(null);
  const [loading, setLoading] = useState<boolean>(input !== null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // Serialize the inputs that should trigger a refetch into a stable key.
  const key = input
    ? JSON.stringify({
        raceId: input.raceId,
        raceLabel: input.raceLabel,
        section: input.section,
        stateCode: input.stateCode,
        candidates: input.candidates.map((c) => c.name),
        issues: input.issues.map((i) => `${i.canonicalIssue}:${i.stance}`),
        electionCycle: input.electionCycle ?? null,
      })
    : null;

  useEffect(() => {
    if (!input || key === null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const myRequestId = ++requestIdRef.current;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch("/api/race-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          throw new Error(`race-data ${res.status}`);
        }
        const json = (await res.json()) as RaceData;
        // Ignore if a newer request superseded this one or we unmounted.
        if (cancelled || myRequestId !== requestIdRef.current) return;
        setData(json);
        setLoading(false);
      } catch (err) {
        if (cancelled || myRequestId !== requestIdRef.current) return;
        setError(
          err instanceof Error ? err.message : "Failed to load race data",
        );
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // `key` captures every input field that should trigger a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, error };
}
