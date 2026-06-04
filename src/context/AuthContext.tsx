import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { SomtodayClient } from '../api/client';
import type { Session } from '../api/types';
import { clearSession, loadSession, saveSession } from '../storage/tokens';

interface AuthState {
  /** null tijdens het laden van de opgeslagen sessie. */
  loading: boolean;
  session: Session | null;
  client: SomtodayClient | null;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    loadSession()
      .then((s) => setSession(s))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (s: Session) => {
    await saveSession(s);
    setSession(s);
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setSession(null);
  }, []);

  // Client die updates (na refresh) terugschrijft naar storage + state.
  // Bewust alleen een nieuwe client bij wisselen van account (of in-/uitloggen),
  // niet bij elke token-refresh — die muteert dezelfde client in-place.
  const tenant = session?.tenantUuid;
  const client = useMemo(() => {
    if (!session) return null;
    return new SomtodayClient(session, (next) => {
      setSession(next);
      void saveSession(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  const value: AuthState = {
    loading,
    session,
    client,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth moet binnen <AuthProvider> gebruikt worden');
  return ctx;
}
