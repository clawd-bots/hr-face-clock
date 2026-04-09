"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/employee", label: "Dashboard", icon: "grid" },
  { href: "/employee/profile", label: "Profile", icon: "user" },
  { href: "/employee/leaves", label: "Leaves", icon: "calendar" },
  { href: "/employee/payslips", label: "Payslips", icon: "wallet" },
  { href: "/employee/attendance", label: "Attendance", icon: "clock" },
];

function NavIcon({ name, className }: { name: string; className?: string }) {
  const c = className || "w-5 h-5";
  switch (name) {
    case "grid":
      return (
        <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      );
    case "user":
      return (
        <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      );
    case "wallet":
      return (
        <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110 6h3.75A2.25 2.25 0 0021 13.5V12zm0 0V9.75a2.25 2.25 0 00-2.25-2.25h-13.5A2.25 2.25 0 003 9.75v10.5A2.25 2.25 0 005.25 22.5h13.5A2.25 2.25 0 0021 20.25V12zM3 9.75V6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v3" />
        </svg>
      );
    case "clock":
      return (
        <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, role, loading, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=" + pathname);
    }
  }, [loading, user, router, pathname]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#fafaf2] flex items-center justify-center">
        <div className="flex items-center gap-2 text-[rgba(0,0,0,0.4)]">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#cf9358]" />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/employee" ? pathname === "/employee" : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-[#fafaf2] flex">
      {/* Side Navigation */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-white border-r border-[rgba(0,0,0,0.08)] flex flex-col transition-all duration-200 z-30 ${
          collapsed ? "w-[68px]" : "w-[240px]"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-[rgba(0,0,0,0.06)] shrink-0">
          <Link
            href="/employee"
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-[#61474c]" style={{ background: "linear-gradient(135deg, #ffc671, #cf9358)" }}>
              &y
            </div>
            {!collapsed && (
              <span className="text-[15px] font-semibold tracking-[-0.5px] text-[rgba(0,0,0,0.88)] whitespace-nowrap">
                &you HR
              </span>
            )}
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                isActive(item.href)
                  ? "bg-[rgba(255,198,113,0.15)] text-[#9a6d2a]"
                  : "text-[rgba(0,0,0,0.55)] hover:text-[rgba(0,0,0,0.88)] hover:bg-[rgba(0,0,0,0.03)]"
              }`}
            >
              <NavIcon
                name={item.icon}
                className={`w-5 h-5 shrink-0 ${
                  isActive(item.href) ? "text-[#9a6d2a]" : ""
                }`}
              />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="px-3 py-2 border-t border-[rgba(0,0,0,0.06)]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[rgba(0,0,0,0.35)] hover:text-[rgba(0,0,0,0.65)] hover:bg-[rgba(0,0,0,0.03)] transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
            </svg>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* User section */}
        <div className="px-3 pb-4 border-t border-[rgba(0,0,0,0.06)] pt-3 relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(0,0,0,0.03)] transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-[rgba(255,198,113,0.3)] flex items-center justify-center text-xs font-semibold text-[#9a6d2a] shrink-0">
              {(profile?.display_name || "U")[0].toUpperCase()}
            </div>
            {!collapsed && (
              <div className="text-left overflow-hidden">
                <p className="text-sm font-medium text-[rgba(0,0,0,0.88)] truncate">
                  {profile?.display_name || "User"}
                </p>
                <p className="text-[11px] text-[rgba(0,0,0,0.35)] truncate">
                  {role?.replace("_", " ")}
                </p>
              </div>
            )}
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div
                className={`absolute bottom-full mb-2 w-56 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-[rgba(0,0,0,0.08)] z-50 py-2 ${
                  collapsed ? "left-full ml-2" : "left-3"
                }`}
              >
                <div className="px-4 py-2 border-b border-[rgba(0,0,0,0.06)]">
                  <p className="text-sm font-medium text-[rgba(0,0,0,0.88)] truncate">
                    {profile?.display_name}
                  </p>
                  <p className="text-xs text-[rgba(0,0,0,0.4)] truncate">
                    {user.email}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-[rgba(255,198,113,0.2)] text-[#9a6d2a] rounded-full">
                    {role?.replace("_", " ")}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-[#8a3a34] hover:bg-[#f4f1e6] transition-colors duration-150"
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-200 ${
          collapsed ? "ml-[68px]" : "ml-[240px]"
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-10 py-10">{children}</div>
      </main>
    </div>
  );
}
