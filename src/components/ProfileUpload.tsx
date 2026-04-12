"use client";

import { useState, useRef } from "react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Notice } from "./ui/Notice";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import { extractProfileDate } from "../lib/ballot-utils";

const MAX_FILE_SIZE = 10 * 1024; // 10KB

interface ProfileUploadProps {
  onProfileLoaded: (profile: string) => void;
}

export function ProfileUpload({ onProfileLoaded }: ProfileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { lang } = useLanguage();
  const t = translations[lang];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.name.endsWith(".txt")) {
      setError(t.profile.uploadInvalidType);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(t.profile.uploadTooLarge);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const date = extractProfileDate(content);
      setConfirmationMsg(
        date ? t.profile.uploadConfirmation(date) : t.profile.uploadGeneric,
      );
      setLoaded(true);
      onProfileLoaded(content);
    };
    reader.readAsText(file);
  }

  if (loaded) {
    return (
      <div data-testid="profile-confirmation">
        <Notice variant="success">
          <p className="font-semibold mb-1">{confirmationMsg}</p>
          <p className="text-xs text-on-surface-muted">
            {t.profile.includeInPrompt}
          </p>
        </Notice>
      </div>
    );
  }

  return (
    <Card>
      <label className="block text-sm font-medium mb-2">
        {t.profile.uploadLabel}
      </label>
      <div className="flex items-center gap-3">
        <input
          data-testid="upload-profile-input"
          ref={fileInputRef}
          type="file"
          accept=".txt"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          {t.profile.uploadButton}
        </Button>
        <span className="text-xs text-on-surface-muted">
          {t.profile.uploadAccept}
        </span>
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}
