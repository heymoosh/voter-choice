import React from "react";

type BadgeVariant = "primary" | "accent";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: "bg-primary text-on-primary",
  accent: "bg-accent text-on-accent",
};

export function Badge({
  variant = "primary",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
