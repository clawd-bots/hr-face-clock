import type { LabelHTMLAttributes, ReactNode } from "react";

type Props = LabelHTMLAttributes<HTMLLabelElement> & { children?: ReactNode };

export function Label({ className = "", children, ...rest }: Props) {
  return (
    <label
      className={`block mb-1.5 text-sw-caption font-medium text-sw-ink-700 ${className}`}
      {...rest}
    >
      {children}
    </label>
  );
}
