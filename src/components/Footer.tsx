"use client";

import { useTranslation } from "@/lib/i18n/I18nContext";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-gray-200 mt-12 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4 text-center text-sm text-gray-500">
        <div>
          <p className="font-medium text-gray-700 mb-1">
            {t.footer.shareHeading}
          </p>
          <p>
            <span className="text-gray-600">{t.footer.shareText}</span>
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-xs">
          <a
            href="https://claude.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700 focus:text-gray-700 focus:outline-2 focus:outline-blue-500 rounded"
          >
            Try Claude
          </a>
          <a
            href="https://chatgpt.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700 focus:text-gray-700 focus:outline-2 focus:outline-blue-500 rounded"
          >
            Try ChatGPT
          </a>
          <a
            href="https://gemini.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700 focus:text-gray-700 focus:outline-2 focus:outline-blue-500 rounded"
          >
            Try Gemini
          </a>
          <a
            href="https://grok.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700 focus:text-gray-700 focus:outline-2 focus:outline-blue-500 rounded"
          >
            Try Grok
          </a>
        </div>
        <p className="text-xs text-gray-400">{t.footer.attribution}</p>
      </div>
    </footer>
  );
}
