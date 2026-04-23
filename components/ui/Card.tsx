import type { HTMLAttributes, ReactNode } from "react";

type Variant = "cream" | "gold" | "lilac" | "wheat";

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
  children?: ReactNode;
};

const variants: Record<Variant, string> = {
  cream: "bg-sw-white border border-sw-ink-200 text-sw-ink-900",
  gold:  "bg-sw-gold-500 text-sw-white",
  lilac: "bg-sw-lilac-100 text-sw-ink-900",
  wheat: "bg-sw-cream-25 border border-sw-ink-200 text-sw-ink-900",
};

export function Card({ variant = "cream", className = "", children, ...rest }: Props) {
  return (
    <div
      className={`rounded-sw-lg p-6 shadow-sw-1 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
