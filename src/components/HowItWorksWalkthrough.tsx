"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n";
import { translations } from "@/lib/translations";

/**
 * HowItWorksWalkthrough
 *
 * Three-step explainer pulled from translations.landing.step{1,2,3}.
 * Renders below the hero section, above the footer on the home page.
 *
 * Intended mount point: src/app/page.tsx — inline section below ResumeNudge /
 * AddressInput area, above the page footer. No new file required per
 * COMPONENT_MAP §2.
 *
 * All translation keys already exist in src/lib/translations.ts:
 *   landing.howItWorksTitle, landing.howItWorksSubtext,
 *   landing.step1Title, landing.step1Desc,
 *   landing.step2Title, landing.step2Desc,
 *   landing.step3Title, landing.step3Desc
 */
export function HowItWorksWalkthrough() {
  const { lang } = useLanguage();
  const t = translations[lang];

  const steps = [
    { num: 1, title: t.landing.step1Title, desc: t.landing.step1Desc },
    { num: 2, title: t.landing.step2Title, desc: t.landing.step2Desc },
    { num: 3, title: t.landing.step3Title, desc: t.landing.step3Desc },
  ];

  return (
    <section
      className="border-t border-rule-2 border-b border-b-rule-2 py-[72px] px-14 bg-paper-2 max-md:py-14 max-md:px-6"
      aria-labelledby="hiw-title"
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <header className="mb-11 max-w-[720px]">
          {/* Eyebrow: mono uppercase civic, matching .eyebrow in prototype.css */}
          <div className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-civic mb-[22px]">
            {t.landing.howItWorksTitle}
          </div>
          <h2
            id="hiw-title"
            className="font-serif font-semibold text-[42px] leading-[1.05] tracking-[-0.02em] text-ink m-0 mb-3.5 max-md:text-[32px] max-sm:text-[28px]"
          >
            {/* Hardcoded per prototype — no translation key for this exact line */}
            {lang === "es"
              ? "De tu dirección a la urna en tres pasos."
              : "From address to printed ballot in three steps."}
          </h2>
          <p className="font-serif text-[18px] text-ink-2 m-0">
            {t.landing.howItWorksSubtext}
          </p>
        </header>

        {/* Steps */}
        <ol
          className="list-none p-0 m-0 grid grid-cols-3 gap-10 max-md:grid-cols-1 max-md:gap-7"
          role="list"
        >
          {steps.map(({ num, title, desc }) => (
            <li
              key={num}
              className="border-t border-ink pt-[18px]"
            >
              {/* Step number: zero-padded mono */}
              <div className="font-mono text-[11px] tracking-[0.18em] text-civic mb-3.5 uppercase">
                {String(num).padStart(2, "0")}
              </div>
              <h4 className="font-serif font-semibold text-[24px] leading-[1.15] tracking-[-0.01em] text-ink m-0 mb-2.5">
                {title}
              </h4>
              <p className="text-[14.5px] leading-[1.6] text-ink-2 m-0 text-pretty">
                {desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
