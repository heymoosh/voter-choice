"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";

const MAX_PROFILE_SIZE = 10 * 1024; // 10KB

interface VoterProfileUploadProps {
  onProfileLoaded: (content: string) => void;
  uploadedProfile: string | null;
  onDismiss: () => void;
}

export default function VoterProfileUpload({
  onProfileLoaded,
  uploadedProfile,
  onDismiss,
}: VoterProfileUploadProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Extract profile date from content
  const profileDate = uploadedProfile
    ? (uploadedProfile.match(
        /=== (?:MY VOTER PROFILE|[^=]+) — ([^=]+) ===/,
      )?.[1] ?? null)
    : null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".txt")) {
      setError(t("uploadProfileWrongType"));
      return;
    }

    if (file.size > MAX_PROFILE_SIZE) {
      setError(t("uploadProfileTooBig"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (!content) {
        setError(t("uploadProfileError"));
        return;
      }
      onProfileLoaded(content);
    };
    reader.onerror = () => setError(t("uploadProfileError"));
    reader.readAsText(file);
  }

  if (uploadedProfile) {
    return (
      <div
        data-testid="profile-confirmation"
        className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm"
        role="status"
      >
        <svg
          className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-blue-800">
            {t("profileConfirmationTitle")}
          </p>
          {profileDate && (
            <p className="text-blue-600 mt-0.5">
              Profile from {profileDate}. This will be included in your AI
              conversation.
            </p>
          )}
          <p className="text-blue-600 mt-0.5 text-xs">
            {t("uploadProfileHint").replace(
              "Upload a .txt voter profile from a previous session",
              "Your profile is used for this session only and is not stored on our servers.",
            )}
          </p>
        </div>
        <button
          onClick={onDismiss}
          aria-label={t("profileConfirmationDismiss")}
          className="flex-shrink-0 text-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <label
        htmlFor="upload-profile-input"
        className="text-sm text-gray-600 cursor-pointer"
      >
        {t("uploadProfileLabel")}
      </label>
      <input
        ref={fileInputRef}
        id="upload-profile-input"
        data-testid="upload-profile-input"
        type="file"
        accept=".txt"
        onChange={handleFileChange}
        className="text-sm text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
        aria-label={t("uploadProfileHint")}
        aria-describedby={error ? "profile-upload-error" : undefined}
      />
      {error && (
        <p
          id="profile-upload-error"
          role="alert"
          className="text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}
