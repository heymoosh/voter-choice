"use client";

import { useState } from "react";
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
    <div className="space-y-4">
      <label className="block text-xs font-black uppercase tracking-widest text-primary">
        {t.ballot.pasteLabel}
      </label>
      <textarea
        data-testid="ballot-paste-input"
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        placeholder={t.ballot.pastePlaceholder}
        rows={6}
        className="w-full bg-surface-high px-4 py-3 text-sm text-on-surface border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none transition-colors placeholder:text-on-surface-muted/50 resize-y font-mono"
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
    <div data-testid="ballot-manual-entry" className="space-y-5">
      <div>
        <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-1">
          {t.ballot.manualEntry}
        </h4>
        <p className="text-sm text-on-surface-muted">
          {t.ballot.manualEntryDesc}
        </p>
      </div>

      {/* Race entries */}
      <div className="space-y-2">
        {races.map((r, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={r.race}
              onChange={(e) => updateRace(i, "race", e.target.value)}
              placeholder={t.ballot.raceName}
              className="bg-surface-high px-3 py-3 text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none transition-colors min-h-[44px]"
            />
            <input
              type="text"
              value={r.pick}
              onChange={(e) => updateRace(i, "pick", e.target.value)}
              placeholder={t.ballot.candidateName}
              className="bg-surface-high px-3 py-3 text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none transition-colors min-h-[44px]"
            />
          </div>
        ))}
        <button
          onClick={() => setRaces((prev) => [...prev, { race: "", pick: "" }])}
          className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
        >
          + {t.ballot.addRace}
        </button>
      </div>

      {/* Proposition entries */}
      <div className="space-y-2">
        {propositions.map((p, i) => (
          <div
            key={i}
            className="grid grid-cols-[5rem_1fr] sm:grid-cols-[6rem_1fr] gap-2"
          >
            <input
              type="text"
              value={p.number}
              onChange={(e) => updateProp(i, "number", e.target.value)}
              placeholder={t.ballot.propNumber}
              className="bg-surface-high px-3 py-3 text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none transition-colors min-h-[44px]"
            />
            <input
              type="text"
              value={p.vote}
              onChange={(e) => updateProp(i, "vote", e.target.value)}
              placeholder={t.ballot.propVote}
              className="bg-surface-high px-3 py-3 text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none transition-colors min-h-[44px]"
            />
          </div>
        ))}
        <button
          onClick={() =>
            setPropositions((prev) => [...prev, { number: "", vote: "" }])
          }
          className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
        >
          + {t.ballot.addProposition}
        </button>
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
    <div className="bg-surface-lowest border-l-4 border-accent p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <svg
          className="text-accent shrink-0"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 17h8v-2H8v2zm0-4h8v-2H8v2z" />
        </svg>
        <h3 className="font-black text-xl tracking-tight text-on-surface uppercase">
          {t.ballot.buildBallot}
        </h3>
      </div>
      <div className="space-y-8">
        <PasteSection />
        <div className="h-px bg-outline-variant/20" />
        <ManualEntrySection />
      </div>
    </div>
  );
}
