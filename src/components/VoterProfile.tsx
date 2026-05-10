"use client";

import { useState, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useLanguage } from "@/lib/language-context";

interface VoterProfileProps {
  profile: string;
  setProfile: Dispatch<SetStateAction<string>>;
}

export function VoterProfile({ profile, setProfile }: VoterProfileProps) {
  const { t } = useLanguage();
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024) {
      setUploadStatus("error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        setProfile(text);
        setUploadStatus("success");
      } else {
        setUploadStatus("error");
      }
    };
    reader.onerror = () => setUploadStatus("error");
    reader.readAsText(file);
  }

  function handleDownload() {
    if (!profile) return;
    const blob = new Blob([profile], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "voter-profile.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <h3 className="font-semibold mb-3">{t.profile.heading}</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm min-h-[44px]"
        >
          {t.profile.upload}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt"
          className="sr-only"
          onChange={handleFileUpload}
          aria-label={t.profile.upload}
        />
        {profile && (
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm min-h-[44px]"
          >
            {t.profile.download}
          </button>
        )}
      </div>
      {uploadStatus === "success" && (
        <p className="mt-2 text-green-600 text-sm" role="status">
          {t.profile.uploadSuccess}
        </p>
      )}
      {uploadStatus === "error" && (
        <p className="mt-2 text-red-600 text-sm" role="alert">
          {t.profile.uploadError}
        </p>
      )}
    </div>
  );
}
