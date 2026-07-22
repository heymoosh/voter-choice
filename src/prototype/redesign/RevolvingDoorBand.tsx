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
import { useI18n, escapeHtml } from "../VoterChoiceApp";

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
  const { t } = useI18n() as {
    t: (key: string, vars?: Record<string, unknown>) => string;
  };
  if (!record) return null;
  return (
    <div className="rd-band" style={{ marginTop: 12 }} data-testid="rd-band">
      <span className="ic" aria-hidden="true">
        ⟳
      </span>
      <span>
        <b>{t("repCard.revolvingDoorLead")}</b>{" "}
        <span
          dangerouslySetInnerHTML={{
            __html: t("repCard.revolvingDoorSentence", {
              role: escapeHtml(record.role),
              org: escapeHtml(record.org),
            }),
          }}
        />
        <span className="src">
          {" "}
          {t("repCard.revolvingDoorDocumented", {
            date: record.dateDocumented,
          })}{" "}
          <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">
            {t("repCard.sourceArrowLink")}
          </a>
        </span>
      </span>
    </div>
  );
}
