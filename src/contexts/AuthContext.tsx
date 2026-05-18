import { createContext, useContext, type ReactNode } from 'react';
import { useAuth, type AuthState } from '@/hooks/useAuth';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User } from '@/types';

interface AuthContextValue {
  user: FirebaseUser | null;
  profile: User | null;
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  completeOnboarding: (state: string, unitCount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authValue = useAuth();

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
