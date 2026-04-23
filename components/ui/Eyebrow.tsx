import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLSpanElement> & {
  icon?: ReactNode;
  children?: ReactNode;
};

export function Eyebrow({ icon = "✦", className = "", children, ...rest }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-2 h-7 px-3.5 rounded-sw-pill border border-[#e7d28a] text-sw-caption font-medium text-sw-gold-600 ${className}`}
      {...rest}
    >
      <span aria-hidden>{icon}</span>
      {children}
    </span>
  );
}
