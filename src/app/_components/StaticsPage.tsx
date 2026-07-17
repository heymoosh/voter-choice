import Link from "next/link";
import type { ReactNode } from "react";

// Shared shell for the redesigned statics pages (about, methodology,
// privacy, terms): the back link, eyebrow, title, and article typography
// were being hand-copied into each page.tsx, which is what the
// duplication gate (scripts/quality/duplication-gate.ts) flagged between
// terms.tsx and its siblings. `meta` and `footer` are optional — about/
// methodology have neither; privacy/terms use both for the effective-date
// line and the copyright footer.

export const STATICS_ARTICLE_CLASS =
  "font-serif text-[17px] max-sm:text-[15.5px] leading-[1.65] text-ink " +
  "[&_h2]:font-serif [&_h2]:font-semibold [&_h2]:text-2xl [&_h2]:mt-10 " +
  "[&_h2]:mb-3.5 [&_h2]:tracking-[-0.015em] [&_h2]:text-ink [&_p]:mb-4 " +
  "[&_ul]:mb-4 [&_ul]:pl-[22px] [&_li]:mb-2 [&_a]:text-civic [&_a]:underline " +
  "[&_a]:underline-offset-[3px] [&_code]:font-mono [&_code]:text-[14px] " +
  "[&_code]:bg-tag-bg [&_code]:px-[6px] [&_code]:py-[2px] [&_code]:rounded " +
  "[&_i]:not-italic";

interface StaticsPageProps {
  eyebrow: string;
  title: ReactNode;
  /** Effective-date line rendered between the title and the article —
   *  only privacy/terms need this. */
  meta?: ReactNode;
  articleClassName?: string;
  children: ReactNode;
  /** Copyright footer — only privacy/terms need this. */
  footer?: ReactNode;
}

/** Effective-date meta line, shared by privacy + terms. */
export function StaticsEffectiveDate({ date }: { date: string }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-6">
      Effective {date} &middot; Grey Bird LLC
    </p>
  );
}

/** Copyright footer, shared by privacy + terms. */
export function StaticsCopyrightFooter() {
  return (
    <footer className="font-mono text-[11px] text-ink-3 pt-6 mt-2 border-t border-rule-2">
      <p>&copy; 2026 Grey Bird LLC. All Rights Reserved.</p>
    </footer>
  );
}

export function StaticsPage({
  eyebrow,
  title,
  meta,
  articleClassName,
  children,
  footer,
}: StaticsPageProps) {
  return (
    <main className="min-h-screen bg-paper">
      <div className="max-w-[720px] mx-auto px-8 pt-14 pb-24">
        <Link
          href="/"
          className="inline-block text-[13.5px] text-civic pb-4 hover:underline underline-offset-[3px]"
        >
          ← Back
        </Link>

        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-civic mb-[10px]">
          {eyebrow}
        </div>

        <h1 className="font-serif font-semibold text-[48px] max-sm:text-[36px] leading-none tracking-[-0.025em] text-ink mb-8 text-balance">
          {title}
        </h1>

        {meta}

        <article className={articleClassName ?? STATICS_ARTICLE_CLASS}>
          {children}
        </article>

        {footer}
      </div>
    </main>
  );
}
