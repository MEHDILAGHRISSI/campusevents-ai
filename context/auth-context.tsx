import { getSession, logoutUser, setSession } from '@/database/session';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

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
      console.error('❌ Erreur lecture session SQLite:', error);
      return { userId: null, role: null, isAuthenticated: false, ready: true };
    }
  });

  const login = useCallback((userId: string, role: Role) => {
    try {
      console.log('✅ Connexion:', { userId, role });
      setSession(userId, role);
      setState({ userId, role, isAuthenticated: true, ready: true });
    } catch (error) {
      console.error('❌ Erreur écriture session:', error);
    }
  }, []);

  const logout = useCallback(() => {
    console.log('🚪 Déconnexion');
    try {
      logoutUser();
    } catch (error) {
      console.error('❌ Erreur logout SQLite:', error);
    } finally {
      setState({ userId: null, role: null, isAuthenticated: false, ready: true });
    }
  }, []);

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}