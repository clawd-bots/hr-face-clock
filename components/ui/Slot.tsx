import { Children, cloneElement, isValidElement } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";

type SlotProps = HTMLAttributes<HTMLElement> & { children?: ReactNode };

export function Slot({ children, ...parentProps }: SlotProps) {
  if (!isValidElement(children)) return null;
  const child = Children.only(children) as ReactElement<HTMLAttributes<HTMLElement>>;
  const childProps = child.props;
  return cloneElement(child, {
    ...parentProps,
    ...childProps,
    className: [parentProps.className, childProps.className].filter(Boolean).join(" "),
    style: { ...parentProps.style, ...childProps.style },
  });
}
