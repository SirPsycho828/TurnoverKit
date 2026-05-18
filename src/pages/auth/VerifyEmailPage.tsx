import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';
import { auth } from '@/lib/firebase';

export function VerifyEmailPage() {
  const { resendVerification, user, authState } = useAuthContext();
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Poll for email verification
  useEffect(() => {
    if (authState !== 'unverified') return;

    const interval = setInterval(async () => {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        window.location.reload();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [authState]);

  const handleResend = async () => {
    setLoading(true);
    try {
      await resendVerification();
      setResent(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card>
        <CardHeader className="items-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center text-xl">Check Your Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            We sent a verification link to{' '}
            <span className="font-medium text-foreground">{user?.email}</span>.
            Click the link to verify your account.
          </p>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={loading || resent}
          >
            {resent ? 'Email sent' : 'Resend verification email'}
          </Button>

          <p className="text-xs text-muted-foreground">
            This page will update automatically once you verify.
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
