"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const MAX_PROFILE_SIZE = 10 * 1024; // 10KB

interface VoterProfileProps {
  onProfileLoaded: (content: string) => void;
  uploadedProfile: string | null;
  generatedProfile: string | null;
}

export function VoterProfile({
  onProfileLoaded,
  uploadedProfile,
  generatedProfile,
}: VoterProfileProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (!file.name.endsWith(".txt")) {
      setUploadError(t.profileUploadTypeError);
      return;
    }

    if (file.size > MAX_PROFILE_SIZE) {
      setUploadError(t.profileUploadSizeError);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onProfileLoaded(content);
    };
    reader.readAsText(file);
  }

  function downloadProfile(content: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-voter-profile.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  return (
    <div className="voter-profile-section">
      {/* Upload section (for returning voters) */}
      {!uploadedProfile && (
        <div className="profile-upload-area">
          <label className="profile-upload-label" htmlFor="profile-upload">
            {t.uploadProfileLabel}
          </label>
          <input
            accept=".txt"
            data-testid="upload-profile-input"
            id="profile-upload"
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
          {uploadError && (
            <p className="notice notice-error" role="alert">
              {uploadError}
            </p>
          )}
          <p className="muted small">{t.profileSessionNote}</p>
        </div>
      )}

      {/* Uploaded profile confirmation */}
      {uploadedProfile && (
        <div
          className="profile-confirmation"
          data-testid="profile-confirmation"
        >
          <p className="notice notice-success">{t.uploadProfileConfirm}</p>
          <pre className="profile-preview">{uploadedProfile.slice(0, 300)}</pre>
        </div>
      )}

      {/* Generated profile download */}
      {generatedProfile && (
        <div className="profile-download-area">
          <p>{t.profileDownloadNote}</p>
          <button
            className="button button-secondary"
            data-testid="download-profile-btn"
            onClick={() => downloadProfile(generatedProfile)}
            type="button"
          >
            {t.downloadProfileBtn}
          </button>
        </div>
      )}
    </div>
  );
}
