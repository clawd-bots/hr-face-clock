import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

const base =
  "w-full min-h-[96px] rounded-[12px] border border-sw-ink-200 bg-sw-white px-4 py-3 " +
  "text-sw-body text-sw-ink-900 placeholder:text-sw-ink-300 " +
  "transition-[border,box-shadow] duration-sw-fast ease-sw-std " +
  "focus:outline-none focus:border-sw-gold-500 focus:shadow-sw-ring-accent " +
  "disabled:bg-sw-cream-25 disabled:text-sw-ink-300 disabled:cursor-not-allowed";

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { className = "", ...rest },
  ref,
) {
  return <textarea ref={ref} className={`${base} ${className}`} {...rest} />;
});
