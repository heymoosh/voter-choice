/**
 * Generates printable HTML for the downloadable ballot document.
 * Opens in a new browser tab for printing.
 */

import type { BallotData } from "@/types/chat";
import type { Locale } from "@/lib/i18n/types";

const SITE_NAME = "Voter Choice";
const SITE_URL = "https://voter-choice.vercel.app";

// Translation map for ballot labels
const LABELS: Record<
  Locale,
  {
    title: string;
    propositions: string;
    reminder: string;
    generated: string;
    disclaimer: string;
  }
> = {
  en: {
    title: "MY BALLOT",
    propositions: "Propositions",
    reminder: "REMINDER",
    generated: "Generated with",
    disclaimer: "This document is your personal notes, not an official ballot.",
  },
  es: {
    title: "MI BOLETA",
    propositions: "Propuestas",
    reminder: "RECORDATORIO",
    generated: "Generado con",
    disclaimer:
      "Este documento es tu referencia personal, no es una boleta oficial.",
  },
  vi: {
    title: "PHIẾU BẦU CỦA TÔI",
    propositions: "Đề xuất",
    reminder: "NHẮC NHỞ",
    generated: "Được tạo bởi",
    disclaimer:
      "Tài liệu này là ghi chú cá nhân của bạn, không phải phiếu bầu chính thức.",
  },
  zh: {
    title: "我的选票",
    propositions: "提案",
    reminder: "提醒",
    generated: "由以下生成：",
    disclaimer: "本文件是您的个人参考，而非官方选票。",
  },
  ar: {
    title: "ورقة اقتراعي",
    propositions: "الاقتراحات",
    reminder: "تذكير",
    generated: "تم الإنشاء بواسطة",
    disclaimer: "هذه الوثيقة ملاحظاتك الشخصية، وليست ورقة اقتراع رسمية.",
  },
};

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateBallotHTML(
  ballot: BallotData,
  locale: Locale = "en",
): string {
  const labels = LABELS[locale] ?? LABELS.en;
  const dir = locale === "ar" ? "rtl" : "ltr";

  const headerParts = [
    labels.title,
    ballot.county,
    ballot.electionName,
    ballot.date,
  ].filter(Boolean);
  const header = headerParts.join(" — ");

  const entriesHtml = ballot.entries
    .map(
      (e) =>
        `<tr><td class="race">${esc(e.race)}</td><td class="pick">${esc(e.pick)}</td></tr>`,
    )
    .join("\n");

  const propositionsHtml =
    ballot.propositions.length > 0
      ? `
    <h2>${esc(labels.propositions)}</h2>
    <table>
      ${ballot.propositions
        .map(
          (p) =>
            `<tr><td class="race">${esc(p.number)}</td><td class="pick">${esc(p.vote)}</td></tr>`,
        )
        .join("\n")}
    </table>`
      : "";

  const reminderHtml = ballot.phonePolicy
    ? `<p class="reminder"><strong>${esc(labels.reminder)}:</strong> ${esc(ballot.phonePolicy)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(header)}</title>
  <style>
    body {
      font-family: Georgia, serif;
      max-width: 700px;
      margin: 40px auto;
      padding: 20px;
      color: #000;
      background: #fff;
      direction: ${dir};
    }
    h1 { font-size: 1.3em; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
    h2 { font-size: 1.1em; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    td { padding: 6px 4px; border-bottom: 1px solid #ddd; vertical-align: top; }
    .race { width: 60%; font-weight: bold; }
    .pick { width: 40%; }
    .reminder { font-size: 0.9em; border: 1px solid #ccc; padding: 10px; margin-top: 20px; }
    .footer { font-size: 0.8em; color: #666; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
    @media print {
      body { margin: 0; }
      .footer { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${esc(header)}</h1>
  <table>${entriesHtml}</table>
  ${propositionsHtml}
  ${reminderHtml}
  <div class="footer">
    <p>${esc(labels.generated)} <a href="${SITE_URL}">${esc(SITE_NAME)}</a> — ${esc(SITE_URL)}</p>
    <p>${esc(labels.disclaimer)}</p>
  </div>
</body>
</html>`;
}

/**
 * Trigger a browser download of the ballot as a printable HTML page.
 * Opens in a new tab.
 */
export function downloadBallotHTML(
  ballot: BallotData,
  locale: Locale = "en",
): void {
  const html = generateBallotHTML(ballot, locale);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.addEventListener("load", () => {
      URL.revokeObjectURL(url);
    });
  }
}
