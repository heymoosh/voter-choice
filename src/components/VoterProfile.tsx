"use client";

import { useRef, useState } from "react";
import type { Language } from "@/lib/i18n";
import { tStr } from "@/lib/i18n";
import {
  parseProfileDate,
  validateProfileContent,
  validateProfileSize,
} from "@/lib/profileParser";

type VoterProfileProps = {
  language?: Language;
  onProfileLoaded: (content: string | null) => void;
  profileContent: string | null;
};

export function VoterProfile({
  language = "en",
  onProfileLoaded,
  profileContent,
}: VoterProfileProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileDate, setProfileDate] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Check file type
    if (!file.name.endsWith(".txt") && file.type !== "text/plain") {
      setError(tStr(language, "profileUploadError"));
      onProfileLoaded(null);
      return;
    }

    // Check file size before reading content
    const sizeCheck = validateProfileSize(file.size);
    if (!sizeCheck.valid) {
      setError(tStr(language, "profileUploadError"));
      onProfileLoaded(null);
      return;
    }

    const text = await file.text();
    const sizeValidation = validateProfileContent(
      text,
      new TextEncoder().encode(text).length,
    );
    if (!sizeValidation.valid) {
      setError(tStr(language, "profileUploadError"));
      onProfileLoaded(null);
      return;
    }

    const date = parseProfileDate(text);
    setProfileDate(date);
    onProfileLoaded(text);
  }

  function handleRemove() {
    onProfileLoaded(null);
    setProfileDate(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  if (profileContent) {
    return (
      <div
        data-testid="profile-confirmation"
        className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm"
      >
        <p className="font-semibold text-blue-900 mb-1">
          {tStr(language, "profileConfirmationPrefix")}{" "}
          {profileDate ?? "a previous session"}.
        </p>
        <p className="text-blue-700">
          {tStr(language, "profileConfirmationSuffix")}
        </p>
        <p className="text-blue-600 text-xs mt-1">
          {tStr(language, "profileSessionOnly")}
        </p>
        <button
          onClick={handleRemove}
          className="mt-2 text-xs text-red-500 underline hover:text-red-700"
        >
          Remove profile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {tStr(language, "uploadProfile")}
      </label>
      <input
        ref={fileInputRef}
        data-testid="upload-profile-input"
        type="file"
        accept=".txt,text/plain"
        onChange={handleFileChange}
        className="block text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-4 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        aria-label={tStr(language, "uploadProfile")}
      />
      {error && (
        <p
          data-testid="profile-upload-error"
          role="alert"
          className="text-red-600 text-sm"
        >
          {error}
        </p>
      )}
    </div>
  );
}

type ProfileDownloadProps = {
  profileContent: string;
  language?: Language;
};

export function ProfileDownloadButton({
  profileContent,
  language = "en",
}: ProfileDownloadProps) {
  function handleDownload() {
    const blob = new Blob([profileContent], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-voter-profile.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-1">
      <button
        data-testid="download-profile-btn"
        onClick={handleDownload}
        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg px-5 py-2 text-sm"
      >
        {tStr(language, "downloadProfile")}
      </button>
      <p className="text-xs text-gray-500">
        {tStr(language, "profileDownloadNote")}
      </p>
    </div>
  );
}
