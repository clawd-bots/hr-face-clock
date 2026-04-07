/**
 * Backward-compatible Supabase client export.
 * New code should use:
 *   - getSupabaseBrowser() for client components
 *   - getSupabaseServer() for server components / route handlers
 *   - getSupabaseService() for service-role operations (kiosk, admin setup)
 *
 * This file re-exports the browser client for existing client components
 * and keeps the old type exports.
 */

import { getSupabaseBrowser } from "./supabase-browser";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy proxy for backward compat — existing client components import `supabase`
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getClient(): SupabaseClient {
  // In browser context, use the SSR-aware browser client
  if (typeof window !== "undefined") {
    return getSupabaseBrowser() as unknown as SupabaseClient;
  }
  // In server context (shouldn't be used — prefer getSupabaseServer), fallback
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

// Re-export types from the new types file
export type { Employee, TimeLog } from "./types/database";
