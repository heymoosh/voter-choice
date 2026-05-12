"use client";

import React, { useState, useRef } from "react";

const MAX_FILE_SIZE_BYTES = 10 * 1024; // 10KB

interface VoterProfilePanelLabels {
  uploadLabel?: string;
  uploadPrivacyNotice?: string;
  confirmationMessage?: string;
  downloadButton?: string;
  downloadNote?: string;
  sizeError?: string;
  typeError?: string;
}

interface VoterProfilePanelProps {
  onProfileLoaded: (profile: string | undefined) => void;
  labels?: VoterProfilePanelLabels;
}

export default function VoterProfilePanel({
  onProfileLoaded,
  labels,
}: VoterProfilePanelProps) {
  const [profileContent, setProfileContent] = useState<string | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(undefined);

    if (!file) return;

    // Type check
    if (!file.name.endsWith(".txt") && file.type !== "text/plain") {
      setError(labels?.typeError ?? "Please upload a .txt file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Size check
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(
        labels?.sizeError ??
          "File is too large. Voter profiles must be under 10KB.",
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setProfileContent(content);
      onProfileLoaded(content);
    };
    reader.readAsText(file);
  };

  const handleRemove = () => {
    setProfileContent(undefined);
    onProfileLoaded(undefined);
    setError(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-sm">
      {/* Upload input */}
      {!profileContent && (
        <div className="space-y-2">
          <label
            htmlFor="upload-profile-input"
            className="block font-medium text-gray-700 dark:text-gray-300"
          >
            {labels?.uploadLabel ??
              "Returning voter? Upload your voter profile"}
          </label>
          <input
            ref={fileInputRef}
            id="upload-profile-input"
            data-testid="upload-profile-input"
            type="file"
            accept=".txt,text/plain"
            onChange={handleFileChange}
            className="block text-xs text-gray-600 dark:text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-700 dark:file:text-gray-300 cursor-pointer"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {labels?.uploadPrivacyNotice ??
              "Your profile is used for this session only and is not stored on our servers."}
          </p>
          {error && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Profile confirmation */}
      {profileContent && (
        <div data-testid="profile-confirmation" className="space-y-2">
          <p className="text-green-700 dark:text-green-400 font-medium">
            {labels?.confirmationMessage ??
              "Voter profile loaded. This will be included in your AI conversation."}
          </p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs font-mono text-gray-700 dark:text-gray-300 max-h-24 overflow-y-auto">
            {profileContent.slice(0, 300)}
            {profileContent.length > 300 && "..."}
          </div>
          <button
            onClick={handleRemove}
            className="text-xs text-red-600 dark:text-red-400 underline hover:no-underline focus:outline-none"
          >
            Remove profile
          </button>
        </div>
      )}
    </div>
  );
}
