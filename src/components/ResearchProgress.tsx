"use client";

import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import type { ResearchProgress } from "../lib/chatParser";

interface ResearchProgressBarProps {
  progress: ResearchProgress;
}

export function ResearchProgressBar({ progress }: ResearchProgressBarProps) {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <div className="sticky top-0 z-40 bg-surface border-b border-outline-variant/10">
      <div className="max-w-3xl mx-auto px-4 py-3">
        {/* Progress + Selections row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-primary">
              {t.research.progressLabel}: {progress.percent}%
            </span>
            <div className="h-1.5 w-32 bg-surface-high overflow-hidden rounded-full">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
          {progress.selections.length > 0 && (
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-muted">
              {t.research.selectionsLabel} ({progress.selections.length})
            </span>
          )}
        </div>

        {/* Selection pills */}
        {progress.selections.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {progress.selections.map((sel) => (
              <div
                key={sel.race}
                className="flex-shrink-0 px-3 py-1 bg-primary/5 border border-primary/20 rounded-full flex items-center gap-2"
              >
                <span className="text-[10px] font-bold text-primary">
                  {sel.race}:
                </span>
                <span className="text-[10px] font-bold">{sel.pick}</span>
                <svg
                  className="text-primary"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
