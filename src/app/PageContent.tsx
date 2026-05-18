"use client";

import React from "react";
import { useLanguage } from "../lib/i18n";
import { useResearchMode } from "../lib/researchMode";
import { translations } from "../lib/translations";

interface PageContentProps {
  children?: React.ReactNode;
}

/* ── Inline SVG icons (no icon library needed) ── */

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
    </svg>
  );
}

function PersonOffIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path d="M8.65 5.82a3.999 3.999 0 015.53 5.53L8.65 5.82zM20 17.17c-.02-1.1-.63-2.11-1.61-2.62a9.16 9.16 0 00-4.48-1.16L20 19.48v-2.31zM2.39 1.73L1.11 3l3.09 3.09A4 4 0 0012 10c0 .36-.05.71-.15 1.04l2.09 2.09c-1.07-.35-2.2-.53-3.39-.53-2.74 0-5.02 1.15-6 2.85-.3.51-.5 1.06-.5 1.65v2.1h13.17l2.3 2.3 1.27-1.27L2.39 1.73z" />
    </svg>
  );
}

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z" />
    </svg>
  );
}

function PinDropIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <path d="M18 8c0-3.31-2.69-6-6-6S6 4.69 6 8c0 4.5 6 11 6 11s6-6.5 6-11zm-8 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zM5 20v2h14v-2H5z" />
    </svg>
  );
}

function ForumIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" />
    </svg>
  );
}

function TaskAltIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <path d="M22 5.18L10.59 16.6l-4.24-4.24 1.41-1.41 2.83 2.83 10-10L22 5.18zM12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8c1.57 0 3.04.46 4.28 1.25l1.45-1.45A10.02 10.02 0 0012 2C6.48 2 2 6.48 2 12s4.48 10 10 10c2.76 0 5.26-1.12 7.07-2.93l-1.42-1.42A7.94 7.94 0 0112 20z" />
    </svg>
  );
}

function UploadFileIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="36"
      height="36"
      aria-hidden="true"
    >
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11 8 15.01z" />
    </svg>
  );
}

function ArrowForwardIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
    </svg>
  );
}

function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z" />
    </svg>
  );
}

function BalanceIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="48"
      height="48"
      aria-hidden="true"
    >
      <path d="M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm8.5 9H2v2h19v-2zm-2.5-9h-2v7h2v-7zM11.5 1L2 6v2h19V6l-9.5-5z" />
    </svg>
  );
}

function CheckCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
}

// eslint-disable-next-line complexity
export function PageContent({ children }: PageContentProps) {
  const { lang } = useLanguage();
  const { isResearch } = useResearchMode();
  const t = translations[lang];

  return (
    <>
      {/* Skip to main content link */}
      {!isResearch && (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-14 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:rounded-sm"
        >
          {t.a11y.skipToContent}
        </a>
      )}

      {/* Header — adapts to mode */}
      <header
        className={
          isResearch
            ? "flex justify-between items-center px-4 md:px-6 py-3 md:py-4 w-full bg-surface-low tracking-tight sticky top-0 z-50"
            : "flex justify-between items-center px-6 py-4 w-full bg-surface-low tracking-tight"
        }
      >
        <div className="flex items-center gap-4 md:gap-8">
          <span
            className={
              isResearch
                ? "text-xl md:text-2xl font-black text-primary"
                : "text-2xl font-black text-primary"
            }
          >
            {t.landing.brandName}
          </span>
          {isResearch && (
            <nav className="hidden md:flex gap-6 items-center h-full">
              <span className="text-primary font-bold border-b-2 border-primary py-1">
                {t.research.navResearch}
              </span>
              <span className="text-on-surface-muted py-1">
                {t.research.navResources}
              </span>
            </nav>
          )}
        </div>
      </header>

      {/* Children wrapper — ALWAYS at this tree position to preserve React state */}
      <div
        id="main-content"
        className={isResearch ? "flex-1 flex flex-col overflow-hidden" : ""}
      >
        {!isResearch && (
          <section
            className="relative px-4 md:px-6 pt-10 md:pt-16 pb-12 md:pb-20 max-w-3xl"
            aria-labelledby="hero-heading"
          >
            <h1
              id="hero-heading"
              className="text-4xl md:text-[3.5rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-on-surface mb-4 md:mb-6"
            >
              {t.landing.heroHeadline}
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant mb-8 md:mb-10 leading-relaxed">
              {t.landing.heroSubtext}
            </p>
          </section>
        )}

        {children}

        {!isResearch && (
          <section className="px-4 md:px-6 max-w-3xl pb-12 md:pb-20">
            {/* Trust Signals */}
            <div className="flex flex-wrap gap-3 md:gap-4 text-[12px] md:text-[13px] font-medium text-on-surface-variant">
              <div className="flex items-center gap-1">
                <ShieldIcon className="text-primary" />
                {t.landing.trustNoData}
              </div>
              <div className="flex items-center gap-1">
                <PersonOffIcon className="text-primary" />
                {t.landing.trustNoAccounts}
              </div>
              <div className="flex items-center gap-1">
                <LockIcon className="text-primary" />
                {t.landing.trustPrivate}
              </div>
            </div>
            <p className="text-[11px] text-on-surface-muted mt-3 leading-relaxed">
              * Bipartisan Policy Center / OpenSecrets research. Members of
              Congress report spending 30–70% of their time in DC on
              fundraising-related activities.
            </p>
          </section>
        )}
      </div>

      {!isResearch && (
        <>
          <main>
            {/* ── 2. Returning User (Profile Upload) ── */}
            <section className="bg-surface-low py-10 md:py-16 px-4 md:px-6">
              <div className="max-w-3xl space-y-4 md:space-y-6">
                <span className="inline-block px-4 py-1 bg-secondary-container text-on-secondary-container rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {t.landing.returningBadge}
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-on-surface leading-tight">
                  {t.landing.returningHeadline}
                </h2>
                <p className="text-base text-on-surface-variant">
                  {t.landing.returningSubtext}
                </p>
                <p className="text-sm text-on-surface-variant leading-relaxed opacity-80">
                  {t.landing.returningNote}
                </p>
                <div className="bg-surface-lowest p-5 md:p-8 border-l-4 border-accent mt-6 md:mt-8">
                  <h3 className="text-xl font-bold text-on-surface mb-4">
                    {t.landing.returningUploadTitle}
                  </h3>
                  <p className="text-on-surface-variant mb-6 text-sm leading-relaxed">
                    {t.landing.returningUploadHint}
                  </p>
                  <div className="border-2 border-dashed border-outline-variant p-8 flex flex-col items-center justify-center gap-4 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group rounded-lg">
                    <UploadFileIcon className="text-outline group-hover:text-primary transition-colors" />
                    <div className="text-center">
                      <span className="block text-xs font-bold uppercase tracking-widest text-on-surface group-hover:text-primary transition-colors">
                        {t.landing.returningSelectFile}
                      </span>
                      <span className="text-[10px] text-outline">
                        {t.landing.returningDragDrop}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 3. Resource Cards ── */}
            <section className="px-4 md:px-6 py-8 md:py-12 max-w-3xl space-y-4">
              {/* Polling Places */}
              <div className="bg-surface-high p-5 md:p-8 flex flex-col justify-between min-h-[160px] md:min-h-[200px]">
                <div>
                  <h3 className="text-xl font-bold mb-3">
                    {t.landing.resourcePollingTitle}
                  </h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {t.landing.resourcePollingDesc}
                  </p>
                </div>
                <div className="mt-6">
                  <button
                    className="text-primary text-sm font-bold flex items-center gap-2 group"
                    onClick={() =>
                      document
                        .getElementById("main-content")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    {t.landing.resourcePollingCta}
                    <ArrowForwardIcon className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Election Dates */}
              <div className="bg-primary p-5 md:p-8 text-on-primary min-h-[140px] md:min-h-[160px] flex flex-col justify-between">
                <CalendarIcon className="text-on-primary mb-4" />
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    {t.landing.resourceDatesTitle}
                  </h3>
                  <p className="opacity-80 text-xs leading-relaxed">
                    {t.landing.resourceDatesDesc}
                  </p>
                </div>
              </div>

              {/* ID Rules */}
              <div className="bg-surface-lowest p-5 md:p-8">
                <h3 className="text-sm font-bold mb-3 uppercase tracking-widest text-primary">
                  {t.landing.resourceIdTitle}
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {t.landing.resourceIdDesc}
                </p>
              </div>
            </section>

            {/* ── 4. How it Works ── */}
            <section className="bg-surface pt-10 md:pt-16">
              <div className="px-4 md:px-6 mb-8 md:mb-12 max-w-3xl">
                <h2 className="font-extrabold text-3xl md:text-5xl tracking-tight text-on-surface leading-[1.1] mb-4">
                  {t.landing.howItWorksTitle}
                </h2>
                <p className="text-lg text-on-surface-variant leading-relaxed">
                  {t.landing.howItWorksSubtext}
                </p>
              </div>

              {/* Step 1 */}
              <section className="bg-surface-low px-4 md:px-6 py-8 md:py-12">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="font-black text-5xl md:text-6xl text-primary leading-none">
                      01
                    </span>
                    <div className="bg-primary/10 p-3 rounded-full">
                      <PinDropIcon className="text-primary" />
                    </div>
                  </div>
                  <div className="mb-8">
                    <h3 className="font-bold text-2xl text-on-surface mb-2">
                      {t.landing.step1Title}
                    </h3>
                    <p className="text-base text-on-surface-variant leading-snug">
                      {t.landing.step1Desc}
                    </p>
                  </div>
                  {/* Visual: mini zip input mockup */}
                  <div className="bg-surface-lowest p-6 shadow-sm border border-outline-variant/20 max-w-sm">
                    <div className="flex gap-2">
                      <div className="w-full bg-surface-low border-0 border-b-2 border-primary p-3 font-bold text-xl text-on-surface-variant">
                        77001
                      </div>
                      <div className="bg-primary text-on-primary px-5 py-2 font-bold flex items-center justify-center rounded-sm">
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          width="20"
                          height="20"
                          aria-hidden="true"
                        >
                          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="14"
                        height="14"
                        className="text-primary"
                        aria-hidden="true"
                      >
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      </svg>
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">
                        Your County &middot; Your State
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Step 2 */}
              <section className="bg-surface px-4 md:px-6 py-8 md:py-12">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="font-black text-5xl md:text-6xl text-primary leading-none">
                      02
                    </span>
                    <div className="bg-primary/10 p-3 rounded-full">
                      <ForumIcon className="text-primary" />
                    </div>
                  </div>
                  <div className="mb-8">
                    <h3 className="font-bold text-2xl text-on-surface mb-2">
                      {t.landing.step2Title}
                    </h3>
                    <p className="text-base text-on-surface-variant leading-snug">
                      {t.landing.step2Desc}
                    </p>
                  </div>
                  {/* Visual: chat bubble snippet */}
                  <div className="space-y-4 max-w-sm mx-auto">
                    <div className="flex justify-end">
                      <div className="bg-surface-highest px-4 py-3 rounded-2xl rounded-tr-none shadow-sm border border-outline-variant/20">
                        <p className="text-sm font-medium text-on-surface">
                          {lang === "en"
                            ? "\u201cWhat propositions are on my ballot?\u201d"
                            : "\u201c\u00bfQu\u00e9 proposiciones est\u00e1n en mi boleta?\u201d"}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-primary px-4 py-4 rounded-2xl rounded-tl-none shadow-md border-l-4 border-primary-container">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-on-primary/80">
                            {lang === "en" ? "Voter Choice" : "Voter Choice"}
                          </span>
                        </div>
                        <p className="text-sm text-on-primary leading-relaxed">
                          {lang === "en"
                            ? "Your ballot has 14 state constitutional amendments. Want to start with Prop 1 (property tax relief), or jump to one you\u2019ve seen in the news?"
                            : "Tu boleta tiene 14 enmiendas constitucionales estatales. \u00bfQuieres empezar con la Proposici\u00f3n 1 (alivio de impuestos a la propiedad), o saltar a una que hayas visto en las noticias?"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Step 3 */}
              <section className="bg-surface-low px-4 md:px-6 py-8 md:py-12">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="font-black text-5xl md:text-6xl text-primary leading-none">
                      03
                    </span>
                    <div className="bg-primary/10 p-3 rounded-full">
                      <TaskAltIcon className="text-primary" />
                    </div>
                  </div>
                  <div className="mb-8">
                    <h3 className="font-bold text-2xl text-on-surface mb-2">
                      {t.landing.step3Title}
                    </h3>
                    <p className="text-base text-on-surface-variant leading-snug">
                      {t.landing.step3Desc}
                    </p>
                  </div>
                  {/* Visual: mini ballot mockup */}
                  <div className="relative max-w-xs mx-auto pb-8">
                    <div className="bg-white p-5 shadow-lg border border-outline-variant/20 -rotate-2">
                      <div className="border-b-2 border-primary/20 pb-3 mb-3">
                        <div className="flex justify-between items-start">
                          <span className="font-black text-lg tracking-tighter text-primary">
                            VOTER CHOICE
                          </span>
                          <span className="text-[10px] font-bold text-on-surface-variant">
                            2026
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center border-b border-surface-high pb-2">
                          <span className="text-xs font-bold">Governor</span>
                          <CheckCircleIcon className="text-primary" />
                        </div>
                        <div className="flex justify-between items-center border-b border-surface-high pb-2">
                          <span className="text-xs font-bold">
                            State Senate
                          </span>
                          <CheckCircleIcon className="text-primary" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold">Prop 1</span>
                          <CheckCircleIcon className="text-primary" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Ready to choose CTA */}
              <section className="px-4 md:px-6 py-10 md:py-16 text-center bg-primary text-on-primary mt-8 md:mt-12">
                <h2 className="font-bold text-2xl md:text-3xl mb-4 tracking-tight">
                  {t.landing.ctaHeadline}
                </h2>
                <p className="text-on-primary/90 mb-8 max-w-xs mx-auto text-base">
                  {t.landing.ctaSubtext}
                </p>
                <button
                  className="w-full max-w-md bg-white text-primary py-4 font-black text-lg tracking-tighter uppercase shadow-xl"
                  onClick={() =>
                    document
                      .getElementById("main-content")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  {t.landing.ctaButton}
                </button>
              </section>
            </section>

            {/* ── 5. Mission Statement ── */}
            <section className="py-14 md:py-24 px-4 md:px-6">
              <div className="max-w-4xl mx-auto text-center">
                <BalanceIcon className="text-primary mx-auto mb-6 md:mb-8" />
                <h2 className="text-3xl md:text-4xl font-extrabold text-on-surface mb-6 md:mb-8 tracking-tight">
                  {t.landing.missionTitle}
                </h2>
                <p className="text-xl leading-relaxed text-on-surface font-light">
                  {t.landing.missionQuote}
                </p>
                <div className="mt-12 h-1 w-24 bg-accent mx-auto" />
              </div>
            </section>
          </main>

          {/* ── 6. Footer ── */}
          <footer
            role="contentinfo"
            className="bg-surface-high py-10 md:py-16 px-4 md:px-6"
          >
            <div className="max-w-7xl mx-auto flex flex-col gap-10">
              <div className="max-w-xs">
                <div className="text-xl font-black text-primary mb-4">
                  {t.landing.brandName}
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {t.landing.footerTagline} &copy; {new Date().getFullYear()}.
                </p>
                <p className="text-xs text-on-surface-muted mt-3">
                  {t.footer.copyright}
                </p>
                <p className="text-xs text-on-surface-muted mt-1">
                  {t.footer.dataLastUpdated("2026-04-12")}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">
                    {t.landing.footerResources}
                  </h4>
                  <ul className="space-y-2 text-sm text-on-surface-variant">
                    <li>
                      <button
                        className="hover:text-primary transition-colors"
                        onClick={() =>
                          document
                            .getElementById("main-content")
                            ?.scrollIntoView({ behavior: "smooth" })
                        }
                      >
                        {t.landing.footerBallotData}
                      </button>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">
                    {t.landing.footerLegal}
                  </h4>
                  <ul className="space-y-2 text-sm text-on-surface-variant">
                    <li>
                      <a
                        href="/privacy"
                        className="hover:text-primary transition-colors"
                      >
                        {t.footer.privacyPolicy}
                      </a>
                    </li>
                    <li>
                      <a
                        href="/terms"
                        className="hover:text-primary transition-colors"
                      >
                        {t.footer.termsOfUse}
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">
                    {t.landing.footerConnect}
                  </h4>
                  <ul className="space-y-2 text-sm text-on-surface-variant">
                    <li>
                      <span className="text-on-surface-variant">
                        {t.landing.footerSupport}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </footer>
        </>
      )}
    </>
  );
}
