"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/reports", label: "Reports" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#fafaf2]">
      <nav className="bg-white border-b border-[rgba(0,0,0,0.1)] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-[1392px] mx-auto px-12">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-10">
              <Link href="/admin" className="text-xl font-medium tracking-[-1px] text-[rgba(0,0,0,0.88)]">
                &you HR System
              </Link>
              <div className="flex gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 ${
                      pathname === item.href
                        ? "bg-[rgba(255,198,113,0.2)] text-[#9a6d2a]"
                        : "text-[rgba(0,0,0,0.65)] hover:text-[rgba(0,0,0,0.88)] hover:bg-[#f4f1e6]"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <Link
                href="/"
                className="text-sm font-medium text-[rgba(0,0,0,0.65)] hover:text-[rgba(0,0,0,0.88)] px-4 py-2 rounded-full border border-[rgba(0,0,0,0.1)] hover:border-[rgba(0,0,0,0.2)] transition-colors duration-150"
              >
                Kiosk Mode
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-[1392px] mx-auto px-12 py-10">
        {children}
      </main>
    </div>
  );
}
