// context/auth-context.tsx
import { getSession, setSession } from '@/database/session';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type Role = 'admin' | 'student';

type AuthState = {
  userId: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  ready: boolean;
};

type AuthContextValue = AuthState & {
  login: (userId: string, role: Role) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const session = getSession();
      return {
        userId: session.userId,
        role: session.role,
        isAuthenticated: Boolean(session.userId && session.role),
        ready: true,
      };
    } catch (error) {
      console.error('Erreur lecture session SQLite :', error);
      return { userId: null, role: null, isAuthenticated: false, ready: true };
    }
  });

  // Verrou anti-réentrance (appels multiples rapides)
  const isLoggingOutRef = useRef(false);

  const login = useCallback((userId: string, role: Role) => {
    try {
      setSession(userId, role);
    } catch (error) {
      console.error('Erreur écriture session :', error);
    }
    setState({ userId, role, isAuthenticated: true, ready: true });
  }, [state]);

  const logout = useCallback(() => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    console.log('[AUTH/logout:start]', { ts: Date.now(), userId: state.userId, role: state.role, ready: state.ready });
    console.trace('[AUTH/logout:trace]');

    try {
      // logoutUser();
    } catch (error) {
      console.error('Erreur logout SQLite :', error);
    } finally {
      // ✅ On ne navigue PAS ici. Le RootNavigator réagit à ce changement d'état.
      console.log('[AUTH/logout:state_before_update]');
      setState({ userId: null, role: null, isAuthenticated: false, ready: true });
      console.log('[AUTH/logout:state_after_update]');
      isLoggingOutRef.current = false;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout }),
    [state, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}