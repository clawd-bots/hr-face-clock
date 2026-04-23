import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement>;

const base =
  "h-11 w-full rounded-[12px] border border-sw-ink-200 bg-sw-white px-4 pr-10 " +
  "text-sw-body text-sw-ink-900 appearance-none bg-no-repeat " +
  "transition-[border,box-shadow] duration-sw-fast ease-sw-std " +
  "focus:outline-none focus:border-sw-gold-500 focus:shadow-sw-ring-accent " +
  "disabled:bg-sw-cream-25 disabled:text-sw-ink-300 disabled:cursor-not-allowed";

const chevron =
  "bg-[right_14px_center] bg-[length:14px] " +
  "bg-[url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23b9b5ad' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]";

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { className = "", children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={`${base} ${chevron} ${className}`} {...rest}>
      {children}
    </select>
  );
});
