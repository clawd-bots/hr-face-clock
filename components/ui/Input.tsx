import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

const base =
  "h-11 w-full rounded-[12px] border border-sw-ink-200 bg-sw-white px-4 " +
  "text-sw-body text-sw-ink-900 placeholder:text-sw-ink-300 " +
  "transition-[border,box-shadow] duration-sw-fast ease-sw-std " +
  "focus:outline-none focus:border-sw-gold-500 focus:shadow-sw-ring-accent " +
  "disabled:bg-sw-cream-25 disabled:text-sw-ink-300 disabled:cursor-not-allowed";

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className = "", ...rest },
  ref,
) {
  return <input ref={ref} className={`${base} ${className}`} {...rest} />;
});
