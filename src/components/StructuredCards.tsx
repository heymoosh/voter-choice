"use client";

import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import type {
  CandidatesBlock,
  PropositionBlock,
  StructuredBlock,
} from "../lib/chatParser";

/* ── Candidate Card Grid ────────────────────────────────────── */

function statusLabel(
  status: "incumbent" | "challenger" | "newcomer",
  lang: "en" | "es",
): string {
  const labels: Record<string, Record<string, string>> = {
    incumbent: { en: "Incumbent", es: "Titular" },
    challenger: { en: "Challenger", es: "Retador" },
    newcomer: { en: "Newcomer", es: "Nuevo" },
  };
  return labels[status]?.[lang] ?? status;
}

function statusColor(status: string): string {
  if (status === "incumbent") return "text-primary";
  if (status === "challenger") return "text-accent";
  return "text-on-surface-muted";
}

function statusBorder(status: string): string {
  if (status === "incumbent") return "hover:border-b-primary";
  if (status === "challenger") return "hover:border-b-accent";
  return "hover:border-b-on-surface-muted";
}

function CandidateCard({ block }: { block: CandidatesBlock }) {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <div className="my-6">
      {/* Race title */}
      <h3 className="text-xl md:text-2xl font-black text-on-surface tracking-tight mb-4">
        {block.race}
      </h3>

      {/* Candidate grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {block.candidates.map((candidate) => (
          <div
            key={candidate.name}
            className={`bg-surface-low p-4 md:p-5 border-b-2 border-transparent transition-all group cursor-default ${statusBorder(candidate.status)}`}
          >
            <span
              className={`text-[10px] font-black uppercase tracking-widest ${statusColor(candidate.status)} mb-2 block`}
            >
              {statusLabel(candidate.status, lang)}
            </span>
            <h4 className="text-lg font-extrabold text-on-surface">
              {candidate.name}
            </h4>
            {candidate.party && (
              <span className="text-xs text-on-surface-muted">
                {candidate.party}
              </span>
            )}
            <p className="text-sm text-on-surface-variant mt-2 leading-snug">
              {candidate.focus}
            </p>
            <div
              className={`mt-4 flex items-center ${statusColor(candidate.status)} font-black text-[10px] uppercase tracking-widest gap-1 group-hover:translate-x-1 transition-transform`}
            >
              {t.research.viewLedger}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Proposition Card ───────────────────────────────────────── */

function recColor(rec: string): string {
  if (rec === "yes") return "bg-primary text-on-primary";
  if (rec === "no") return "bg-accent text-white";
  return "bg-surface-high text-on-surface-muted";
}

function recLabel(rec: string, lang: "en" | "es"): string {
  if (rec === "yes") return lang === "es" ? "SÍ" : "YES";
  if (rec === "no") return "NO";
  return lang === "es" ? "INDECISO" : "UNDECIDED";
}

function PropositionCard({ block }: { block: PropositionBlock }) {
  const { lang } = useLanguage();

  return (
    <div className="my-6 bg-surface-low p-4 md:p-5 border-b-2 border-transparent hover:border-b-primary transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 block">
            {block.number}
          </span>
          <h4 className="text-lg font-extrabold text-on-surface mb-1">
            {block.title}
          </h4>
          <p className="text-sm text-on-surface-variant leading-snug">
            {block.description}
          </p>
          {block.reasoning && (
            <p className="text-xs text-on-surface-muted mt-2 italic">
              {block.reasoning}
            </p>
          )}
        </div>
        <div
          className={`px-3 py-1.5 text-xs font-black uppercase tracking-widest shrink-0 ${recColor(block.recommendation)}`}
        >
          {recLabel(block.recommendation, lang)}
        </div>
      </div>
    </div>
  );
}

/* ── Render all blocks ──────────────────────────────────────── */

export function StructuredBlocks({ blocks }: { blocks: StructuredBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <div className="mt-6 space-y-2">
      {blocks.map((block, i) => {
        if (block.type === "candidates") {
          return <CandidateCard key={`c-${i}`} block={block} />;
        }
        return <PropositionCard key={`p-${i}`} block={block} />;
      })}
    </div>
  );
}
