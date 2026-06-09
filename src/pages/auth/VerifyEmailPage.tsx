import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, CheckCircle2 } from 'lucide-react';
import { auth } from '@/lib/firebase';

export function VerifyEmailPage() {
  const { resendVerification, user, authState } = useAuthContext();
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

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
    <AuthLayout title="Check your email" subtitle="One last step to get started">
      <Card className="border-border/60 shadow-md">
        <CardContent className="pt-6">
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
              <Mail className="h-7 w-7 text-primary" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                We sent a verification link to
              </p>
              <p className="mt-1 font-heading text-sm font-600 text-foreground">
                {user?.email}
              </p>
            </div>

            <div className="rounded-lg bg-muted/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Click the link in the email to verify your account. This page updates automatically.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleResend}
              disabled={loading || resent}
            >
              {resent ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald" />
                  Email sent
                </>
              ) : (
                'Resend verification email'
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />
              Waiting for verification...
            </div>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
