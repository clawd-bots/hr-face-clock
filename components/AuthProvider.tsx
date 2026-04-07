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

  const fetchProfile = useCallback(
    async (userId: string) => {
      const client = getClient();
      if (!client) return;
      const { data } = await client
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) {
        setProfile(data as UserProfile);
      }
    },
    [getClient]
  );

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

    const initAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await client.auth.getSession();

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        }
      } catch (err) {
        console.error("Auth init failed:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(
      async (_event: string, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [getClient, fetchProfile]);

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
