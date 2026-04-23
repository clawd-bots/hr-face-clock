import type { ReactNode } from "react";
import { Chip } from "./Chip";

type Tone = "gold" | "lilac" | "success" | "neutral";

type Props = {
  label: string;
  value: ReactNode;
  tone?: Tone;
  delta?: { value: string; direction?: "up" | "down" };
  footer?: ReactNode;
  className?: string;
};

const toneStyles: Record<Tone, string> = {
  gold:    "bg-sw-gold-500 text-sw-white border-transparent",
  lilac:   "bg-sw-lilac-100 text-sw-ink-900 border-transparent",
  success: "bg-sw-success-100 text-sw-ink-900 border-transparent",
  neutral: "bg-sw-white text-sw-ink-900 border border-sw-ink-200",
};

const valueStyles: Record<Tone, string> = {
  gold:    "text-sw-white",
  lilac:   "text-sw-ink-900",
  success: "text-sw-ink-900",
  neutral: "text-sw-ink-900",
};

const labelStyles: Record<Tone, string> = {
  gold:    "text-sw-white",
  lilac:   "text-sw-ink-700",
  success: "text-sw-ink-700",
  neutral: "text-sw-ink-700",
};

export function StatCard({ label, value, tone = "neutral", delta, footer, className = "" }: Props) {
  return (
    <div className={`rounded-sw-lg p-5 shadow-sw-1 ${toneStyles[tone]} ${className}`}>
      <div className={`text-sw-caption font-medium ${labelStyles[tone]}`}>{label}</div>
      <div className="mt-2 flex items-baseline gap-3">
        <div className={`text-[40px] font-semibold leading-sw-tight tracking-sw-display ${valueStyles[tone]}`}>
          {value}
        </div>
        {delta && (
          <Chip tone={delta.direction === "down" ? "danger" : "success"}>
            {delta.direction === "down" ? "↓" : "↑"} {delta.value}
          </Chip>
        )}
      </div>
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}
