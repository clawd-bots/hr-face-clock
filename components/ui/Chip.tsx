import type { HTMLAttributes, ReactNode } from "react";

type Tone = "neutral" | "success" | "warn" | "danger" | "lilac" | "gold";

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  children?: ReactNode;
};

const tones: Record<Tone, string> = {
  neutral: "bg-sw-ink-100 text-sw-ink-700",
  success: "bg-sw-success-100 text-[#1b7a43]",
  warn:    "bg-sw-warn-100 text-[#7a5800]",
  danger:  "bg-sw-danger-100 text-[#a11b35]",
  lilac:   "bg-sw-lilac-100 text-[#4a3fbe]",
  gold:    "bg-sw-gold-500 text-sw-white",
};

export function Chip({ tone = "neutral", className = "", children, ...rest }: Props) {
  return (
    <span
      className={`inline-flex items-center h-[26px] px-3 rounded-sw-pill text-sw-micro font-medium leading-none ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
