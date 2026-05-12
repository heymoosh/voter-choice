"use client";

import React, { useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import {
  parseVoterProfile,
  type VoterProfileData,
} from "@/lib/structured-output";

const MAX_PROFILE_SIZE_BYTES = 10 * 1024; // 10KB

// ---- Profile Upload --------------------------------------------------------

interface ProfileUploadProps {
  onProfileLoaded: (content: string) => void;
}

export function ProfileUpload({ onProfileLoaded }: ProfileUploadProps) {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.name.endsWith(".txt")) {
      setError(t.profileWrongType);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > MAX_PROFILE_SIZE_BYTES) {
      setError(t.profileTooLarge);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setLoaded(content);
      onProfileLoaded(content);
    };
    reader.readAsText(file);
  }

  if (loaded) {
    return (
      <div
        data-testid="profile-confirmation"
        className="p-4 rounded-xl border border-green-200 bg-green-50 space-y-2"
      >
        <p className="font-semibold text-green-800 text-sm">
          {t.profileConfirmTitle}
        </p>
        <p className="text-xs text-green-700">{t.profileConfirmNote}</p>
        <details className="text-xs text-green-700">
          <summary className="cursor-pointer hover:underline">
            Preview profile
          </summary>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs bg-green-100 rounded p-2 max-h-32 overflow-y-auto">
            {loaded.slice(0, 500)}
            {loaded.length > 500 ? "…" : ""}
          </pre>
        </details>
        <button
          onClick={() => {
            setLoaded(null);
            onProfileLoaded("");
            if (fileRef.current) fileRef.current.value = "";
          }}
          className="text-xs text-green-700 underline hover:no-underline focus:outline-none"
        >
          Remove profile
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <label className="text-sm text-gray-600">{t.uploadProfileLabel}</label>
      <div className="flex items-center gap-2">
        <label
          htmlFor="upload-profile-file"
          className="cursor-pointer px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition-colors min-h-[44px] flex items-center"
        >
          <input
            id="upload-profile-file"
            ref={fileRef}
            data-testid="upload-profile-input"
            type="file"
            accept=".txt"
            onChange={handleFile}
            className="sr-only"
            aria-label={t.uploadProfileLabel}
          />
          {t.uploadProfileBtn}
        </label>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// ---- Profile Download ------------------------------------------------------

interface ProfileDownloadProps {
  profile: VoterProfileData;
}

export function ProfileDownload({ profile }: ProfileDownloadProps) {
  const { t } = useLanguage();

  function handleDownload() {
    const blob = new Blob([profile.content], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voter-profile-${profile.date ? profile.date.replace(/[^a-z0-9]/gi, "-").toLowerCase() : new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        data-testid="download-profile-btn"
        onClick={handleDownload}
        className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px] transition-colors w-fit"
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
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        {t.downloadProfileBtn}
      </button>
      <p className="text-xs text-gray-500">{t.profileSaveNote}</p>
    </div>
  );
}

// ---- Parse and extract profile from raw AI text -------------------------

export function extractProfileFromText(text: string): VoterProfileData | null {
  const result = parseVoterProfile(text);
  return result.ok ? result.data : null;
}
