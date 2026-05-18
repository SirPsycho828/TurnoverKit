import { useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/types';

export type AuthState =
  | 'loading'
  | 'unauthenticated'
  | 'unverified'
  | 'needs_onboarding'
  | 'authenticated';

interface UseAuthReturn {
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

const googleProvider = new GoogleAuthProvider();

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setProfile(null);
        setAuthState('unauthenticated');
        return;
      }

      if (!firebaseUser.emailVerified) {
        setProfile(null);
        setAuthState('unverified');
        return;
      }

      // Check for user profile in Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setProfile(userData);
        setAuthState(userData.onboardingComplete ? 'authenticated' : 'needs_onboarding');
      } else {
        setProfile(null);
        setAuthState('needs_onboarding');
      }
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(credential.user);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const resendVerification = useCallback(async () => {
    if (user && !user.emailVerified) {
      await sendEmailVerification(user);
    }
  }, [user]);

  const completeOnboarding = useCallback(
    async (state: string, unitCount: number) => {
      if (!user) return;

      const userData: User = {
        email: user.email!,
        state,
        unitCount,
        onboardingComplete: true,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      setProfile(userData);
      setAuthState('authenticated');
    },
    [user],
  );

  return {
    user,
    profile,
    authState,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    resendVerification,
    completeOnboarding,
  };
}
