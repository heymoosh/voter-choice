import React from "react";

type NoticeVariant = "info" | "warning" | "success";

interface NoticeProps {
  variant?: NoticeVariant;
  children: React.ReactNode;
  className?: string;
}

const accentColors: Record<NoticeVariant, string> = {
  info: "border-l-primary",
  warning: "border-l-accent",
  success: "border-l-primary-light",
};

export function Notice({
  variant = "info",
  children,
  className = "",
}: NoticeProps) {
  return (
    <div
      className={`bg-surface-low border-l-4 ${accentColors[variant]} rounded-sm p-4 text-sm text-on-surface ${className}`}
    >
      {children}
    </div>
  );
}
