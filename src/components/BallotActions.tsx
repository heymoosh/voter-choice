"use client";

import { Button } from "./ui/Button";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import {
  extractBallot,
  extractVoterProfile,
  openPrintableBallot,
  downloadProfileAsText,
} from "../lib/ballot-utils";

interface BallotActionsProps {
  content: string;
}

/**
 * Detects MY BALLOT / MY VOTER PROFILE markers in an assistant message
 * and renders download action buttons inline.
 */
export function BallotActions({ content }: BallotActionsProps) {
  const { lang } = useLanguage();
  const t = translations[lang];

  const ballot = extractBallot(content);
  const profile = extractVoterProfile(content);

  if (!ballot && !profile) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4 pt-4">
      {ballot && (
        <Button
          data-testid="download-ballot-btn"
          variant="cta"
          size="sm"
          onClick={() => openPrintableBallot(ballot)}
        >
          {t.ballot.downloadBallot}
        </Button>
      )}
      {profile && (
        <Button
          data-testid="download-profile-btn"
          variant="primary"
          size="sm"
          onClick={() => downloadProfileAsText(profile)}
        >
          {t.ballot.downloadProfile}
        </Button>
      )}
    </div>
  );
}
