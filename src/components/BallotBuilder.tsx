"use client";

import { useState } from "react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import { openPrintableBallot, buildManualBallot } from "../lib/ballot-utils";

interface RaceEntry {
  race: string;
  pick: string;
}

interface PropEntry {
  number: string;
  vote: string;
}

function PasteSection() {
  const [pasteText, setPasteText] = useState("");
  const { lang } = useLanguage();
  const t = translations[lang];

  const canGenerate = pasteText.trim().length > 0;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">{t.ballot.pasteLabel}</label>
      <textarea
        data-testid="ballot-paste-input"
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        placeholder={t.ballot.pastePlaceholder}
        rows={8}
        className="w-full bg-surface-high border-b-2 border-outline-variant px-3 py-2.5 text-sm text-on-surface rounded-sm focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-muted resize-y"
      />
      <Button
        variant="cta"
        size="md"
        disabled={!canGenerate}
        onClick={() => openPrintableBallot(pasteText.trim())}
      >
        {t.ballot.generatePrintable}
      </Button>
    </div>
  );
}

function ManualEntrySection() {
  const [races, setRaces] = useState<RaceEntry[]>([{ race: "", pick: "" }]);
  const [propositions, setPropositions] = useState<PropEntry[]>([]);
  const { lang } = useLanguage();
  const t = translations[lang];

  function updateRace(index: number, field: keyof RaceEntry, value: string) {
    setRaces((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function updateProp(index: number, field: keyof PropEntry, value: string) {
    setPropositions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  const hasEntries =
    races.some((r) => r.race && r.pick) ||
    propositions.some((p) => p.number && p.vote);

  function handleGenerate() {
    const header = lang === "es" ? "MI BOLETA" : "MY BALLOT";
    const text = buildManualBallot(header, races, propositions);
    openPrintableBallot(text);
  }

  return (
    <div data-testid="ballot-manual-entry" className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1">{t.ballot.manualEntry}</p>
        <p className="text-xs text-on-surface-muted mb-3">
          {t.ballot.manualEntryDesc}
        </p>
      </div>

      {/* Race entries */}
      <div className="space-y-2">
        {races.map((r, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={r.race}
              onChange={(e) => updateRace(i, "race", e.target.value)}
              placeholder={t.ballot.raceName}
              className="flex-1 bg-surface-high border-b-2 border-outline-variant px-2 py-1.5 text-sm rounded-sm focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              value={r.pick}
              onChange={(e) => updateRace(i, "pick", e.target.value)}
              placeholder={t.ballot.candidateName}
              className="flex-1 bg-surface-high border-b-2 border-outline-variant px-2 py-1.5 text-sm rounded-sm focus:outline-none focus:border-primary"
            />
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRaces((prev) => [...prev, { race: "", pick: "" }])}
        >
          + {t.ballot.addRace}
        </Button>
      </div>

      {/* Proposition entries */}
      <div className="space-y-2">
        {propositions.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={p.number}
              onChange={(e) => updateProp(i, "number", e.target.value)}
              placeholder={t.ballot.propNumber}
              className="w-24 bg-surface-high border-b-2 border-outline-variant px-2 py-1.5 text-sm rounded-sm focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              value={p.vote}
              onChange={(e) => updateProp(i, "vote", e.target.value)}
              placeholder={t.ballot.propVote}
              className="flex-1 bg-surface-high border-b-2 border-outline-variant px-2 py-1.5 text-sm rounded-sm focus:outline-none focus:border-primary"
            />
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setPropositions((prev) => [...prev, { number: "", vote: "" }])
          }
        >
          + {t.ballot.addProposition}
        </Button>
      </div>

      <Button
        variant="cta"
        size="md"
        disabled={!hasEntries}
        onClick={handleGenerate}
      >
        {t.ballot.generateFromManual}
      </Button>
    </div>
  );
}

export function BallotBuilder() {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <Card>
      <h3 className="font-semibold text-[1.375rem] mb-4">
        {t.ballot.buildBallot}
      </h3>
      <div className="space-y-6">
        <PasteSection />
        <div className="h-px bg-surface-high" />
        <ManualEntrySection />
      </div>
    </Card>
  );
}
