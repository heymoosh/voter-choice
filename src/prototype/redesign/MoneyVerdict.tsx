"use client";
/**
 * src/prototype/redesign/MoneyVerdict.tsx
 *
 * "Follow the money" verdict block (whiteboard `.mny-verdict`, work order
 * Frames 2+3 §2 item 3). Renders the shared money-influence read that
 * DelegationOverview's `cd-influence` block and this card both pull from the
 * SAME helper (`deriveMoneyInfluence` in delegationData.ts) — so the two
 * surfaces can never disagree on the number (GAPS-AND-DATA-AUDIT.md §E).
 *
 * Wording is the GAPS §B1 honest proxy — NOT the whiteboard's mock
 * "donor-lobbied votes … across 18 lobbied votes" copy, which cites LDA
 * lobbying-filing data this repo doesn't ingest. `deriveMoneyInfluence`'s own
 * doc comment is the wording contract; this component just renders it.
 *
 * Honest-null: `influence === null` (no PAC data, or no user issue scoreable
 * against a PAC stance) renders nothing — never a blank shell.
 */

import React from "react";
import { formatDollars, useI18n, escapeHtml } from "../VoterChoiceApp";
import type { MoneyInfluence } from "./delegationData";

export interface MoneyVerdictProps {
  influence: MoneyInfluence | null;
}

export function MoneyVerdict({ influence }: MoneyVerdictProps) {
  const { t } = useI18n() as {
    t: (key: string, vars?: Record<string, unknown>) => string;
  };
  if (!influence) return null;
  const { pct, k, n, yourWayPct, topDollarAgainst } = influence;

  return (
    <div className="mny-verdict" data-testid="money-verdict">
      <div className="mvd-head">
        <b className="pct">{pct}%</b>
        <span
          dangerouslySetInnerHTML={{
            __html:
              t("repCard.moneyVerdictSentence", { k, n }) +
              (topDollarAgainst
                ? t("repCard.moneyVerdictTopDollarClause", {
                    amount: escapeHtml(formatDollars(topDollarAgainst.amount)),
                    issue: escapeHtml(topDollarAgainst.issue),
                  })
                : "") +
              ".",
          }}
        />
      </div>
      <div className="mvd-bars">
        <div className="mvd-row">
          <span className="k">{t("repCard.moneyVerdictDonorsWay")}</span>
          <div className="bar">
            <i className="bad" style={{ width: pct + "%" }} />
          </div>
          <span className="v bad">{pct}%</span>
        </div>
        <div className="mvd-row">
          <span className="k">{t("repCard.moneyVerdictYourWay")}</span>
          <div className="bar">
            <i className="you" style={{ width: yourWayPct + "%" }} />
          </div>
          <span className="v">{yourWayPct}%</span>
        </div>
      </div>
    </div>
  );
}
