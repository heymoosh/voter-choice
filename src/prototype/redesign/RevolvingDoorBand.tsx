"use client";
/**
 * src/prototype/redesign/RevolvingDoorBand.tsx
 *
 * "Heading for the exit" callout (whiteboard `.rd-band`, work order Frames
 * 2+3 §2 item 4). GAPS-AND-DATA-AUDIT.md §5: no revolving-door dataset or
 * ingestion pipeline exists in this repo — this is editorial, citation-gated
 * content. The component renders ONLY when a curated record is passed; no
 * caller wires one today; it stays absent until an editorial table exists
 * upstream. The same `record` gates the md-grid revolving-door tile in
 * RepCard.tsx, so the two never disagree on whether the fact is shown.
 *
 * It lives in the money section (a money-influence fact), never the card
 * header — the whiteboard is explicit about that placement.
 */

import React from "react";

export interface RevolvingDoorRecord {
  memberId: string;
  org: string;
  role: string;
  dateDocumented: string;
  sourceUrl: string;
}

export interface RevolvingDoorBandProps {
  record?: RevolvingDoorRecord | null;
}

export function RevolvingDoorBand({ record }: RevolvingDoorBandProps) {
  if (!record) return null;
  return (
    <div className="rd-band" style={{ marginTop: 12 }} data-testid="rd-band">
      <span className="ic" aria-hidden="true">
        ⟳
      </span>
      <span>
        <b>Heading for the exit:</b> this incumbent has accepted {record.role}{" "}
        at <b>{record.org}</b> — a company whose PAC funded them.
        <span className="src">
          {" "}
          Documented {record.dateDocumented} ·{" "}
          <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">
            source ↗
          </a>
        </span>
      </span>
    </div>
  );
}
