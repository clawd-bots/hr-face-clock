"use client";

import { useAuth } from "./AuthProvider";
import type { SystemRole } from "@/lib/types/database";
import type { ReactNode } from "react";

type RoleGateProps = {
  allow: SystemRole[];
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Conditionally render children based on the current user's role.
 * Shows nothing (or fallback) if the user doesn't have the required role.
 */
export default function RoleGate({ allow, children, fallback }: RoleGateProps) {
  const { role, loading } = useAuth();

  if (loading) return null;
  if (!role || !allow.includes(role)) return fallback ?? null;

  return <>{children}</>;
}
