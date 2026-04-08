"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { ADMIN_ROLES } from "@/lib/types/database";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/departments", label: "Departments" },
  { href: "/admin/attendance", label: "Attendance" },
  { href: "/admin/leaves", label: "Leaves" },
  { href: "/admin/schedules", label: "Schedules" },
  { href: "/admin/holidays", label: "Holidays" },
  { href: "/admin/reports", label: "Reports" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, role, loading, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=" + pathname);
    }
  }, [loading, user, router, pathname]);

  useEffect(() => {
    // Redirect non-admin roles to employee portal (when it exists)
    if (!loading && role && !ADMIN_ROLES.includes(role)) {
      router.push("/employee");
    }
  }, [loading, role, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // Show loading while checking auth
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

  return (
    <div className="min-h-screen bg-[#fafaf2]">
      <nav className="bg-white border-b border-[rgba(0,0,0,0.1)] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-[1392px] mx-auto px-12">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-10">
              <Link
                href="/admin"
                className="text-xl font-medium tracking-[-1px] text-[rgba(0,0,0,0.88)]"
              >
                &you HR System
              </Link>
              <div className="flex gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 ${
                      (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href))
                        ? "bg-[rgba(255,198,113,0.2)] text-[#9a6d2a]"
                        : "text-[rgba(0,0,0,0.65)] hover:text-[rgba(0,0,0,0.88)] hover:bg-[#f4f1e6]"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-sm font-medium text-[rgba(0,0,0,0.65)] hover:text-[rgba(0,0,0,0.88)] px-4 py-2 rounded-full border border-[rgba(0,0,0,0.1)] hover:border-[rgba(0,0,0,0.2)] transition-colors duration-150"
              >
                Kiosk Mode
              </Link>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-[#f4f1e6] transition-colors duration-150"
                >
                  <div className="w-7 h-7 rounded-full bg-[rgba(255,198,113,0.3)] flex items-center justify-center text-xs font-medium text-[#9a6d2a]">
                    {(profile?.display_name || "U")[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-[rgba(0,0,0,0.65)] max-w-[120px] truncate">
                    {profile?.display_name || user.email}
                  </span>
                </button>

                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] border border-[rgba(0,0,0,0.1)] z-50 py-2">
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
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-[1392px] mx-auto px-12 py-10">{children}</main>
    </div>
  );
}
