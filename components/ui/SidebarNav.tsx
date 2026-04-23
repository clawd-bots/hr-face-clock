"use client";

import Link from "next/link";
import { ChevronLeft } from "./icons";
import type { ComponentType, ReactNode } from "react";

export type SidebarItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
};

type Props = {
  brand: ReactNode;
  items: SidebarItem[];
  activeHref: string;
  collapsed: boolean;
  onToggle: () => void;
  footer?: ReactNode;
  extraLinks?: SidebarItem[];
};

export function SidebarNav({
  brand,
  items,
  activeHref,
  collapsed,
  onToggle,
  footer,
  extraLinks,
}: Props) {
  const isActive = (item: SidebarItem) =>
    item.exact ? activeHref === item.href : activeHref === item.href || activeHref.startsWith(item.href + "/");

  return (
    <aside
      className={`fixed top-0 left-0 h-screen glass-sidebar flex flex-col transition-all duration-200 z-30 ${
        collapsed ? "w-[68px]" : "w-[240px]"
      }`}
    >
      <div className="h-16 flex items-center px-5 border-b border-sw-ink-100 shrink-0">
        {brand}
      </div>

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sw-body font-medium transition-colors duration-sw-fast ${
                active
                  ? "glass-nav-active"
                  : "text-sw-ink-900 hover:bg-sw-ink-100"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-2 border-t border-sw-ink-100">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[12px] text-sw-micro font-medium text-sw-ink-300 hover:text-sw-ink-500 hover:bg-sw-ink-100 transition-colors"
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {extraLinks && extraLinks.length > 0 && (
        <div className="px-3 pb-2 space-y-0.5">
          {extraLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sw-body font-medium text-sw-ink-500 hover:text-sw-ink-900 hover:bg-sw-ink-100 transition-colors"
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      )}

      {footer && (
        <div className="px-3 pb-4 border-t border-sw-ink-100 pt-3 relative">
          {footer}
        </div>
      )}
    </aside>
  );
}
