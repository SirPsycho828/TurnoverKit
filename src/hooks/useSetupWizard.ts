import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';

interface WizardState {
  wizardCompleted: boolean;
  wizardStepsCompleted: string[];
  wizardSkippedSteps: string[];
  completedAt: unknown | null;
}

const DEFAULT_STATE: WizardState = {
  wizardCompleted: false,
  wizardStepsCompleted: [],
  wizardSkippedSteps: [],
  completedAt: null,
};

export function useSetupWizard() {
  const { user } = useAuthContext();
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const ref = doc(db, 'users', user.uid, 'metadata', 'onboarding');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setState(snap.data() as WizardState);
      }
      setLoading(false);
    };

    load();
  }, [user]);

  const markStepCompleted = useCallback(
    async (stepId: string) => {
      if (!user) return;
      const ref = doc(db, 'users', user.uid, 'metadata', 'onboarding');
      const updated = {
        ...state,
        wizardStepsCompleted: [...new Set([...state.wizardStepsCompleted, stepId])],
      };
      setState(updated);
      await setDoc(ref, updated, { merge: true });
    },
    [user, state],
  );

  const markStepSkipped = useCallback(
    async (stepId: string) => {
      if (!user) return;
      const ref = doc(db, 'users', user.uid, 'metadata', 'onboarding');
      const updated = {
        ...state,
        wizardSkippedSteps: [...new Set([...state.wizardSkippedSteps, stepId])],
      };
      setState(updated);
      await setDoc(ref, updated, { merge: true });
    },
    [user, state],
  );

  const completeWizard = useCallback(
    async () => {
      if (!user) return;
      const ref = doc(db, 'users', user.uid, 'metadata', 'onboarding');
      const updated: WizardState = {
        ...state,
        wizardCompleted: true,
        completedAt: serverTimestamp(),
      };
      setState(updated);
      await setDoc(ref, updated, { merge: true });
    },
    [user, state],
  );

  const resetWizard = useCallback(
    async () => {
      if (!user) return;
      const ref = doc(db, 'users', user.uid, 'metadata', 'onboarding');
      await setDoc(ref, DEFAULT_STATE);
      setState(DEFAULT_STATE);
    },
    [user],
  );

  return {
    ...state,
    loading,
    markStepCompleted,
    markStepSkipped,
    completeWizard,
    resetWizard,
  };
}
