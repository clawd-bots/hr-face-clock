"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { User, Session, SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile, SystemRole } from "@/lib/types/database";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: SystemRole | null;
  companyId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  role: null,
  companyId: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const clientRef = useRef<SupabaseClient | null>(null);

  // Lazy-init supabase to avoid build-time errors when env vars are placeholders
  const getClient = useCallback((): SupabaseClient | null => {
    if (clientRef.current) return clientRef.current;
    try {
      clientRef.current = getSupabaseBrowser() as unknown as SupabaseClient;
      return clientRef.current;
    } catch {
      return null;
    }
  }, []);

  // Fetch profile — called outside of auth lock via separate useEffect
  const fetchProfile = useCallback(
    async (userId: string) => {
      const client = getClient();
      if (!client) return;
      try {
        const { data } = await client
          .from("user_profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (data) {
          setProfile(data as UserProfile);
        }
      } catch (err) {
        console.error("[auth] Failed to fetch profile:", err);
      }
    },
    [getClient]
  );

  // When user changes, fetch their profile (outside of auth lock)
  useEffect(() => {
    if (user) {
      fetchProfile(user.id);
    } else {
      setProfile(null);
    }
  }, [user, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const client = getClient();
    if (!client) {
      setLoading(false);
      return;
    }

    // Get initial session
    client.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      console.error("[auth] getSession failed:", err);
      setLoading(false);
    });

    // Listen for auth changes — keep this callback SYNCHRONOUS
    // Do NOT do async work (like fetchProfile) here — it holds the auth lock
    // and blocks signInWithPassword from completing
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(
      (_event: string, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        // Profile fetch is triggered by the useEffect watching `user` above
      }
    );

    return () => subscription.unsubscribe();
  }, [getClient]);

  const signOut = useCallback(async () => {
    const client = getClient();
    if (client) {
      await client.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  }, [getClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: profile?.system_role ?? null,
        companyId: profile?.company_id ?? null,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
