import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevated?: boolean;
}

export function Card({
  children,
  elevated = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-surface-lowest rounded-sm p-4 ${elevated ? "shadow-[0_4px_32px_rgba(27,28,27,0.04)]" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
