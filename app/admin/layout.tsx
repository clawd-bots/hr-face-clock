"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SweldoLogo } from "@/components/ui/SweldoLogo";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { ADMIN_ROLES } from "@/lib/types/database";
import { SidebarNav, type SidebarItem } from "@/components/ui/SidebarNav";
import {
  Grid,
  Users,
  Building2,
  Clock,
  Calendar,
  Edit,
  Wallet,
  List,
  Star,
  LineChart,
  LogIn,
  UserPlus,
} from "@/components/ui/icons";

const navItems: SidebarItem[] = [
  { href: "/admin", label: "Dashboard", icon: Grid, exact: true },
  { href: "/admin/employees", label: "Employees", icon: Users },
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/attendance", label: "Attendance", icon: Clock },
  { href: "/admin/leaves", label: "Leaves", icon: Calendar },
  { href: "/admin/overtime", label: "Overtime", icon: Clock },
  { href: "/admin/declarations", label: "Declarations", icon: Edit },
  { href: "/admin/payroll", label: "Payroll", icon: Wallet },
  { href: "/admin/schedules", label: "Schedules", icon: List },
  { href: "/admin/holidays", label: "Holidays", icon: Star },
  { href: "/admin/reports", label: "Reports", icon: LineChart },
  { href: "/admin/devices", label: "Devices", icon: LogIn },
  { href: "/admin/users", label: "Users", icon: UserPlus },
];

const extraLinks: SidebarItem[] = [
  { href: "/", label: "Kiosk Mode", icon: LogIn },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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

  useEffect(() => {
    if (!loading && role && !ADMIN_ROLES.includes(role)) {
      router.push("/employee");
    }
  }, [loading, role, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-sw-cream-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sw-ink-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sw-gold-500" />
          <span className="text-sw-caption font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  const brand = (
    <Link href="/admin" className="flex items-center gap-3 overflow-hidden text-sw-ink-900">
      {collapsed ? (
        <SweldoLogo variant="glyph" width={28} height={28} className="shrink-0" />
      ) : (
        <SweldoLogo width={84} height={22} className="shrink-0" />
      )}
      <span className="sr-only">&you</span>
    </Link>
  );

  const footer = (
    <>
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] hover:bg-sw-ink-100 transition-colors ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="w-8 h-8 rounded-sw-full bg-sw-gold-100 flex items-center justify-center text-sw-micro font-semibold text-sw-gold-600 shrink-0">
          {(profile?.display_name || "U")[0].toUpperCase()}
        </div>
        {!collapsed && (
          <div className="text-left overflow-hidden">
            <p className="text-sw-caption font-medium text-sw-ink-900 truncate">
              {profile?.display_name || "User"}
            </p>
            <p className="text-[11px] text-sw-ink-500 truncate">
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
            className={`absolute bottom-full mb-2 w-56 bg-sw-white rounded-[16px] shadow-sw-3 border border-sw-ink-100 z-50 py-2 ${
              collapsed ? "left-full ml-2" : "left-3"
            }`}
          >
            <div className="px-4 py-2 border-b border-sw-ink-100">
              <p className="text-sw-caption font-medium text-sw-ink-900 truncate">
                {profile?.display_name}
              </p>
              <p className="text-sw-micro text-sw-ink-500 truncate">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-sw-gold-50 text-sw-gold-600 rounded-sw-pill">
                {role?.replace("_", " ")}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sw-caption font-medium text-sw-danger-500 hover:bg-sw-cream-25 transition-colors duration-sw-fast"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-sw-cream-50 flex">
      <SidebarNav
        brand={brand}
        items={navItems}
        activeHref={pathname}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        extraLinks={extraLinks}
        footer={footer}
      />

      <main
        className={`flex-1 transition-all duration-200 ${
          collapsed ? "ml-[68px]" : "ml-[240px]"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-10 py-10">{children}</div>
      </main>
    </div>
  );
}
