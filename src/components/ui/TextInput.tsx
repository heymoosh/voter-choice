import React from "react";

interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
}

export function TextInput({
  label,
  id,
  className = "",
  ...props
}: TextInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium tracking-wide uppercase text-on-surface-muted mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full bg-surface-high border-b-2 border-outline-variant px-3 py-2.5 text-base text-on-surface rounded-sm focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-muted ${className}`}
        {...props}
      />
    </div>
  );
}
