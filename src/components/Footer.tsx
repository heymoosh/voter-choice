import type { Language } from "@/lib/i18n";
import { tStr } from "@/lib/i18n";

type FooterProps = {
  language?: Language;
};

export function Footer({ language = "en" }: FooterProps) {
  const shareText = encodeURIComponent(
    "Free AI ballot research tool — helps you research your ballot in any state. No accounts, no data collection.",
  );
  const shareUrl = encodeURIComponent(
    typeof window !== "undefined" ? window.location.href : "",
  );

  return (
    <footer className="border-t border-gray-200 pt-8 mt-8 space-y-4 text-sm text-gray-600">
      <div className="flex flex-wrap gap-4 items-center">
        <p className="font-semibold text-gray-800">
          {tStr(language, "shareThis")}
        </p>
        <a
          href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
          aria-label={tStr(language, "shareOnXLabel")}
        >
          {tStr(language, "shareOnX")}
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
          aria-label={tStr(language, "shareOnFacebookLabel")}
        >
          {tStr(language, "shareOnFacebook")}
        </a>
        <a
          href={`mailto:?subject=Free AI Ballot Research Tool&body=${shareText}%20${shareUrl}`}
          className="text-blue-600 underline hover:text-blue-800"
          aria-label={tStr(language, "shareViaEmailLabel")}
        >
          {tStr(language, "shareViaEmail")}
        </a>
      </div>
      <p className="text-gray-500">{tStr(language, "footerAttribution")}</p>
    </footer>
  );
}
