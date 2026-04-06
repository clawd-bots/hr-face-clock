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
    <div className="min-h-screen bg-andyou-cream">
      <nav className="bg-andyou-white border-b border-andyou-border-default shadow-andyou-card">
        <div className="max-w-andyou-content mx-auto px-spacing-andyou-page-x">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-spacing-andyou-8">
              <Link href="/admin" className="text-andyou-heading-h3-primary text-andyou-text-primary">
                HR Face Clock
              </Link>
              <div className="flex gap-spacing-andyou-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-spacing-andyou-4 py-spacing-andyou-2 rounded-andyou-full text-andyou-ui-label transition-colors duration-andyou-fast ${
                      pathname === item.href
                        ? "bg-andyou-accent/20 text-andyou-card-dark-bg"
                        : "text-andyou-text-secondary hover:text-andyou-text-primary hover:bg-andyou-warm-light"
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
                className="text-andyou-ui-label text-andyou-text-secondary hover:text-andyou-text-primary px-spacing-andyou-4 py-spacing-andyou-2 rounded-andyou-full border border-andyou-border-default hover:border-andyou-border-strong transition-colors duration-andyou-fast"
              >
                Kiosk Mode
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-andyou-content mx-auto px-spacing-andyou-page-x py-spacing-andyou-8">
        {children}
      </main>
    </div>
  );
}
