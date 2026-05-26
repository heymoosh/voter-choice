"use client";

import React from "react";
import Link from "next/link";
import { LanguageToggle } from "../components/LanguageToggle";
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

/* ── Prototype AppNav — used on every surface, EN + ES ──
   Mirrors prototype-components.jsx AppNav: V mark + Voter Choice wordmark
   on the left, center links (How it works · The record · About), EN/ES
   pill on the right. Per PR A2 the center anchors are placeholders — no
   target routes yet (deferred to PR B). */
function AppNav() {
  return (
    <header
      role="banner"
      className="flex items-center justify-between px-4 md:px-14 py-5 w-full bg-paper border-b border-rule-2"
    >
      <Link
        href="/"
        className="flex items-center gap-[10px] font-serif font-semibold text-[19px] tracking-[-0.01em] text-ink cursor-pointer no-underline"
        aria-label="Voter Choice — home"
      >
        <span
          aria-hidden="true"
          className="inline-grid place-items-center w-[22px] h-[22px] bg-civic text-paper-2 rounded-[4px] font-serif font-semibold text-[14px]"
        >
          V
        </span>
        <span>Voter Choice</span>
      </Link>
      <nav
        aria-label="Primary"
        className="hidden md:flex items-center gap-7 text-[14px] text-ink-2"
      >
        <a href="#how-it-works" className="hover:text-ink transition-colors">
          How it works
        </a>
        <a href="#the-record" className="hover:text-ink transition-colors">
          The record
        </a>
        <a href="#about" className="hover:text-ink transition-colors">
          About
        </a>
      </nav>
      <LanguageToggle variant="inline" />
    </header>
  );
}

/* ── EN prototype-spec landing (PR A2) ──
   Mirrors LandingView in docs/design-source-of-truth/2026-redesign/
   prototype/prototype-views.jsx. The address card (children, rendered by
   BallotToolClient) sits in the left column of the hero grid; the right
   column hosts the 2-row stat-stack. Below the hero comes a single-row
   `.hp-foot`. The 5 legacy sections (returning-user upload, resource
   cards, How-it-works steps, green CTA banner, mission statement) are
   intentionally removed per PR A2. */
function EnglishLanding({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-14 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:rounded-sm"
      >
        Skip to main content
      </a>
      <AppNav />
      <section
        id="main-content"
        className="px-4 md:px-14 pt-12 md:pt-20 pb-10 md:pb-14 max-w-[1280px] mx-auto grid gap-10 md:gap-16 md:grid-cols-[1.05fr_0.95fr] items-center"
        aria-labelledby="hero-heading"
      >
        {/* Left column — eyebrow, headline, lede, address card (children) */}
        <div>
          <div className="inline-flex items-center gap-[10px] font-mono text-[11px] uppercase tracking-[0.14em] text-civic mb-[22px]">
            <span aria-hidden="true" className="text-vote-red">
              ★
            </span>
            <span>November 3, 2026 · America&apos;s 250th election</span>
          </div>
          <h1
            id="hero-heading"
            className="font-serif font-semibold text-[44px] md:text-[76px] leading-[0.96] tracking-[-0.025em] text-ink mb-[22px] text-balance"
          >
            Hold Congress to its <em className="italic text-civic">record.</em>
          </h1>
          <p className="font-serif text-[18px] md:text-[20px] leading-[1.45] text-ink-2 mb-8 md:mb-8 max-w-[520px] text-pretty">
            All 435 House seats and 34 Senate seats are on the ballot. Before
            you vote, see how your incumbents actually voted — and who paid for
            the campaign.
          </p>
          {/* AddressInput renders here (children). Wrapped in addr-card
              framing to match the prototype's grouped input + CTA + hints. */}
          <div className="max-w-[560px]">{children}</div>
        </div>

        {/* Right column — 2-row stat-stack */}
        <aside
          aria-label="Why this matters"
          className="md:border-l md:border-rule md:pl-9 flex flex-col gap-[18px]"
        >
          <div className="flex flex-col">
            <div className="font-serif font-semibold text-[58px] leading-none tracking-[-0.02em] text-ink">
              6
              <small className="font-serif text-[28px] text-ink-2 ml-1 font-semibold">
                hrs / day
              </small>
            </div>
            <div className="mt-2 text-[13.5px] leading-[1.4] text-ink-2 max-w-[340px]">
              average time a member of Congress spends fundraising, per training
              materials shown to incoming freshmen.
            </div>
            <div className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3">
              Source · Issue One, 2024 · CBS 60 Minutes
            </div>
          </div>
          <div className="flex flex-col">
            <div className="font-serif font-semibold text-[58px] leading-none tracking-[-0.02em] text-vote-red">
              94
              <small className="font-serif text-[28px] text-ink-2 ml-1 font-semibold">
                %
              </small>
            </div>
            <div className="mt-2 text-[13.5px] leading-[1.4] text-ink-2 max-w-[340px]">
              of House incumbents who ran for re-election in 2024 won. Without a
              record check, every November is a coin flip.
            </div>
            <div className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3">
              Source · OpenSecrets · FEC filings
            </div>
          </div>
        </aside>
      </section>

      {/* Single-row prototype-spec hp-foot */}
      <footer
        role="contentinfo"
        className="px-4 md:px-14 py-9 border-t border-rule grid gap-9 md:grid-cols-[1fr_auto_auto] items-center text-[13px] text-ink-3 max-w-[1280px] mx-auto mt-16"
      >
        <div className="font-serif font-semibold text-[15px] text-ink">
          Voter Choice
        </div>
        <ul className="list-none m-0 p-0 flex gap-5">
          <li>
            <a href="#ballot-data" className="hover:text-ink transition-colors">
              Ballot data
            </a>
          </li>
          <li>
            <a href="#methodology" className="hover:text-ink transition-colors">
              Methodology
            </a>
          </li>
          <li>
            <a href="/privacy" className="hover:text-ink transition-colors">
              Privacy
            </a>
          </li>
          <li>
            <a href="#support" className="hover:text-ink transition-colors">
              Support
            </a>
          </li>
        </ul>
        <div>© 2026 · Gray Bird LLC</div>
      </footer>
    </>
  );
}

/* ── ES landing — legacy translated structure, unchanged by PR A2 ──
   Kept verbatim from pre-PR-A2 PageContent so the Spanish locale renders
   the same bloat-sections it always has. PR A2 only swaps the EN landing
   to the prototype-spec composition; Spanish copy work is out of scope. */
function SpanishLanding({ children }: { children?: React.ReactNode }) {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-14 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:rounded-sm"
      >
        {t.a11y.skipToContent}
      </a>

      <AppNav />

      <div id="main-content">
        <section
          className="relative px-4 md:px-6 pt-10 md:pt-20 pb-12 md:pb-14 max-w-3xl"
          aria-labelledby="hero-heading-es"
        >
          <h1
            id="hero-heading-es"
            className="font-serif text-4xl md:text-[3.5rem] font-semibold leading-[1.02] tracking-[-0.025em] text-ink mb-5 md:mb-6 text-balance"
          >
            {t.landing.heroHeadline}
          </h1>
          <p className="font-serif text-lg md:text-xl text-ink-2 mb-8 md:mb-10 leading-[1.45] max-w-[520px]">
            {t.landing.heroSubtext}
          </p>
        </section>

        {children}

        <section className="px-4 md:px-6 max-w-3xl pb-12 md:pb-20">
          <div className="flex flex-wrap gap-4 md:gap-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
            <div className="flex items-center gap-2">
              <ShieldIcon className="text-civic" />
              {t.landing.trustNoData}
            </div>
            <div className="flex items-center gap-2">
              <PersonOffIcon className="text-civic" />
              {t.landing.trustNoAccounts}
            </div>
            <div className="flex items-center gap-2">
              <LockIcon className="text-civic" />
              {t.landing.trustPrivate}
            </div>
          </div>
          <p className="text-[11px] text-ink-3 mt-4 leading-relaxed italic">
            * Bipartisan Policy Center / OpenSecrets research. Members of
            Congress report spending 30–70% of their time in DC on
            fundraising-related activities.
          </p>
        </section>
      </div>

      <main>
        {/* Returning User (Profile Upload) */}
        <section className="bg-paper-2 py-10 md:py-16 px-4 md:px-6 border-y border-rule-2">
          <div className="max-w-3xl space-y-4 md:space-y-6">
            <span className="inline-block px-4 py-1 bg-civic-soft text-civic-2 rounded-full font-mono text-[10px] font-semibold uppercase tracking-[0.14em]">
              {t.landing.returningBadge}
            </span>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold tracking-[-0.015em] text-ink leading-tight">
              {t.landing.returningHeadline}
            </h2>
            <p className="text-base text-ink-2 leading-relaxed">
              {t.landing.returningSubtext}
            </p>
            <p className="text-sm text-ink-3 leading-relaxed italic">
              {t.landing.returningNote}
            </p>
            <div className="bg-paper p-5 md:p-8 border border-rule rounded-[10px] mt-6 md:mt-8 shadow-[0_1px_0_var(--rule-2),0_10px_30px_-20px_oklch(0.18_0.018_240/0.12)]">
              <h3 className="font-serif text-xl font-semibold text-ink mb-3 tracking-[-0.005em]">
                {t.landing.returningUploadTitle}
              </h3>
              <p className="text-ink-2 mb-6 text-sm leading-relaxed">
                {t.landing.returningUploadHint}
              </p>
              <div className="border-2 border-dashed border-rule p-8 flex flex-col items-center justify-center gap-4 hover:border-civic hover:bg-civic-soft/30 transition-all cursor-pointer group rounded-lg">
                <UploadFileIcon className="text-ink-3 group-hover:text-civic transition-colors" />
                <div className="text-center">
                  <span className="block font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink group-hover:text-civic transition-colors">
                    {t.landing.returningSelectFile}
                  </span>
                  <span className="text-[10px] text-ink-3 mt-1">
                    {t.landing.returningDragDrop}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Resource Cards */}
        <section className="px-4 md:px-6 py-8 md:py-12 max-w-3xl space-y-4">
          <div className="bg-paper-2 border border-rule rounded-[10px] p-5 md:p-8 flex flex-col justify-between min-h-[160px] md:min-h-[200px] shadow-[0_1px_0_var(--rule-2),0_10px_30px_-20px_oklch(0.18_0.018_240/0.12)]">
            <div>
              <h3 className="font-serif text-xl font-semibold text-ink mb-3 tracking-[-0.005em]">
                {t.landing.resourcePollingTitle}
              </h3>
              <p className="text-sm text-ink-2 leading-relaxed">
                {t.landing.resourcePollingDesc}
              </p>
            </div>
            <div className="mt-6">
              <button
                className="text-civic font-mono text-[11px] font-semibold uppercase tracking-[0.14em] flex items-center gap-2 group hover:text-civic-2 transition-colors"
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

          <div className="bg-civic p-5 md:p-8 text-paper-2 min-h-[140px] md:min-h-[160px] flex flex-col justify-between rounded-[10px]">
            <CalendarIcon className="text-paper-2 mb-4" />
            <div>
              <h3 className="font-serif text-xl font-semibold mb-2 tracking-[-0.005em]">
                {t.landing.resourceDatesTitle}
              </h3>
              <p className="opacity-90 text-xs leading-relaxed">
                {t.landing.resourceDatesDesc}
              </p>
            </div>
          </div>

          <div className="bg-paper-2 border border-rule rounded-[10px] p-5 md:p-8">
            <h3 className="font-mono text-[11px] font-semibold mb-3 uppercase tracking-[0.14em] text-civic">
              {t.landing.resourceIdTitle}
            </h3>
            <p className="text-sm text-ink-2 leading-relaxed">
              {t.landing.resourceIdDesc}
            </p>
          </div>
        </section>

        {/* How it Works */}
        <section className="bg-paper pt-10 md:pt-20">
          <div className="px-4 md:px-6 mb-8 md:mb-12 max-w-3xl">
            <h2 className="font-serif text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-ink leading-[1.02] mb-4 text-balance">
              {t.landing.howItWorksTitle}
            </h2>
            <p className="font-serif text-lg text-ink-2 leading-[1.45]">
              {t.landing.howItWorksSubtext}
            </p>
          </div>

          <section className="bg-paper-2 px-4 md:px-6 py-8 md:py-12 border-y border-rule-2">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4 mb-6">
                <span className="font-serif italic text-5xl md:text-6xl font-semibold text-civic leading-none tracking-[-0.02em]">
                  01
                </span>
                <div className="bg-civic-soft p-3 rounded-full">
                  <PinDropIcon className="text-civic" />
                </div>
              </div>
              <div className="mb-8">
                <h3 className="font-serif font-semibold text-2xl text-ink mb-2 tracking-[-0.005em]">
                  {t.landing.step1Title}
                </h3>
                <p className="text-base text-ink-2 leading-relaxed">
                  {t.landing.step1Desc}
                </p>
              </div>
              <div className="bg-paper p-6 border border-rule rounded-[10px] max-w-sm shadow-[0_1px_0_var(--rule-2),0_10px_30px_-20px_oklch(0.18_0.018_240/0.12)]">
                <div className="flex gap-2">
                  <div className="w-full bg-paper-2 border-0 border-b-2 border-civic p-3 font-serif font-semibold text-xl text-ink">
                    77001
                  </div>
                  <div className="bg-civic text-paper-2 px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] flex items-center justify-center rounded-lg">
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
                    className="text-civic"
                    aria-hidden="true"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  </svg>
                  <span className="font-mono text-[10px] font-semibold text-civic uppercase tracking-[0.14em]">
                    Your County &middot; Your State
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-paper px-4 md:px-6 py-8 md:py-12">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4 mb-6">
                <span className="font-serif italic text-5xl md:text-6xl font-semibold text-civic leading-none tracking-[-0.02em]">
                  02
                </span>
                <div className="bg-civic-soft p-3 rounded-full">
                  <ForumIcon className="text-civic" />
                </div>
              </div>
              <div className="mb-8">
                <h3 className="font-serif font-semibold text-2xl text-ink mb-2 tracking-[-0.005em]">
                  {t.landing.step2Title}
                </h3>
                <p className="text-base text-ink-2 leading-relaxed">
                  {t.landing.step2Desc}
                </p>
              </div>
              <div className="space-y-4 max-w-sm mx-auto">
                <div className="flex justify-end">
                  <div className="bg-ink text-paper px-4 py-3 rounded-[14px] rounded-br-[4px]">
                    <p className="text-sm leading-relaxed">
                      “¿Qué proposiciones están en mi boleta?”
                    </p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-paper-2 border border-rule px-4 py-4 rounded-[14px] rounded-tl-[4px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                        Voter Choice · AI
                      </span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed">
                      Tu boleta tiene 14 enmiendas constitucionales estatales.
                      &iquest;Quieres empezar con la Proposici&oacute;n 1
                      (alivio de impuestos a la propiedad), o saltar a una que
                      hayas visto en las noticias?
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-paper-2 px-4 md:px-6 py-8 md:py-12 border-y border-rule-2">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4 mb-6">
                <span className="font-serif italic text-5xl md:text-6xl font-semibold text-civic leading-none tracking-[-0.02em]">
                  03
                </span>
                <div className="bg-civic-soft p-3 rounded-full">
                  <TaskAltIcon className="text-civic" />
                </div>
              </div>
              <div className="mb-8">
                <h3 className="font-serif font-semibold text-2xl text-ink mb-2 tracking-[-0.005em]">
                  {t.landing.step3Title}
                </h3>
                <p className="text-base text-ink-2 leading-relaxed">
                  {t.landing.step3Desc}
                </p>
              </div>
              <div className="relative max-w-xs mx-auto pb-8">
                <div className="bg-paper p-5 border border-rule rounded-[10px] -rotate-2 shadow-[0_1px_0_var(--rule),0_30px_60px_-30px_oklch(0.18_0.018_240/0.18)]">
                  <div className="border-b-2 border-ink pb-3 mb-3">
                    <div className="flex justify-between items-start">
                      <span className="font-serif text-lg font-semibold tracking-[-0.01em] text-ink">
                        Voter Choice
                      </span>
                      <span className="font-mono text-[10px] font-semibold text-ink-3 uppercase tracking-[0.14em]">
                        2026
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center border-b border-dotted border-rule pb-2">
                      <span className="font-serif text-sm font-semibold text-ink">
                        Governor
                      </span>
                      <CheckCircleIcon className="text-civic" />
                    </div>
                    <div className="flex justify-between items-center border-b border-dotted border-rule pb-2">
                      <span className="font-serif text-sm font-semibold text-ink">
                        State Senate
                      </span>
                      <CheckCircleIcon className="text-civic" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-serif text-sm font-semibold text-ink">
                        Prop 1
                      </span>
                      <CheckCircleIcon className="text-civic" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Ready to choose CTA */}
          <section className="px-4 md:px-6 py-12 md:py-20 text-center bg-civic text-paper-2 mt-8 md:mt-12">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-4 tracking-[-0.025em] text-balance">
              {t.landing.ctaHeadline}
            </h2>
            <p className="opacity-90 mb-8 max-w-md mx-auto text-base leading-relaxed">
              {t.landing.ctaSubtext}
            </p>
            <button
              className="bg-paper-2 text-civic px-12 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] rounded-lg hover:bg-paper transition-colors"
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

        {/* Mission Statement */}
        <section className="py-14 md:py-24 px-4 md:px-6 bg-paper">
          <div className="max-w-4xl mx-auto text-center">
            <BalanceIcon className="text-civic mx-auto mb-6 md:mb-8" />
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-ink mb-6 md:mb-8 tracking-[-0.025em] text-balance">
              {t.landing.missionTitle}
            </h2>
            <p className="font-serif text-xl leading-[1.45] text-ink-2 italic max-w-2xl mx-auto">
              {t.landing.missionQuote}
            </p>
            <div className="mt-12 h-px w-24 bg-civic mx-auto" />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        role="contentinfo"
        className="bg-paper-2 py-10 md:py-16 px-4 md:px-6 border-t border-rule"
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-10">
          <div className="max-w-xs">
            <div className="font-serif text-xl font-semibold text-ink mb-4 tracking-[-0.01em]">
              {t.landing.brandName}
            </div>
            <p className="text-sm text-ink-2 leading-relaxed">
              {t.landing.footerTagline} &copy; {new Date().getFullYear()}.
            </p>
            <p className="text-xs text-ink-3 mt-3">{t.footer.copyright}</p>
            <p className="text-xs text-ink-3 mt-1 font-mono tracking-[0.02em]">
              {t.footer.dataLastUpdated("2026-04-12")}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3 mb-4">
                {t.landing.footerResources}
              </h4>
              <ul className="space-y-2 text-sm text-ink-2">
                <li>
                  <button
                    className="hover:text-civic transition-colors"
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
              <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3 mb-4">
                {t.landing.footerLegal}
              </h4>
              <ul className="space-y-2 text-sm text-ink-2">
                <li>
                  <a
                    href="/privacy"
                    className="hover:text-civic transition-colors"
                  >
                    {t.footer.privacyPolicy}
                  </a>
                </li>
                <li>
                  <a
                    href="/terms"
                    className="hover:text-civic transition-colors"
                  >
                    {t.footer.termsOfUse}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3 mb-4">
                {t.landing.footerConnect}
              </h4>
              <ul className="space-y-2 text-sm text-ink-2">
                <li>
                  <span>{t.landing.footerSupport}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ── Research surface — shared chrome for cold-open / workspace / print ──
   PR A2 unifies the header here: every surface gets the prototype AppNav,
   not the legacy "RESEARCH | RESOURCES" tabs. Body content is whatever
   BallotToolClient renders downstream. */
function ResearchSurface({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <AppNav />
      <div id="main-content" className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </>
  );
}

export function PageContent({ children }: PageContentProps) {
  const { lang } = useLanguage();
  const { isResearch } = useResearchMode();

  if (isResearch) {
    return <ResearchSurface>{children}</ResearchSurface>;
  }

  if (lang === "en") {
    return <EnglishLanding>{children}</EnglishLanding>;
  }

  return <SpanishLanding>{children}</SpanishLanding>;
}
