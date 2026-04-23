import { Slot } from "./Slot";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "onDark";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  children?: ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-sw-pill font-medium tracking-sw-body " +
  "transition-[background,color,box-shadow] duration-sw-fast ease-sw-std " +
  "focus-visible:outline-none focus-visible:shadow-sw-ring-accent " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-sw-gold-500 text-sw-white hover:bg-sw-gold-600 active:bg-sw-gold-600",
  secondary:
    "bg-sw-white text-sw-ink-900 border border-sw-ink-200 hover:bg-sw-cream-25 hover:border-sw-ink-300",
  ghost:
    "bg-transparent text-sw-ink-900 hover:bg-sw-ink-100",
  onDark:
    "bg-sw-white text-sw-ink-900 hover:bg-sw-cream-50",
};

const sizes: Record<Size, string> = {
  sm: "h-[34px] px-4 text-sw-caption",
  md: "h-11 px-[22px] text-sw-body",
  lg: "h-[50px] px-7 text-sw-body",
};

export function Button({
  variant = "primary",
  size = "md",
  asChild,
  className = "",
  children,
  ...rest
}: Props) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}
