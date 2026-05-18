import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthContext } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { US_STATES } from '@/config/us-states';

const onboardingSchema = z.object({
  state: z.string().min(2, 'Select your state'),
  unitCount: z.string().min(1, 'Enter the number of units').transform((val, ctx) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter at least 1 unit' });
      return z.NEVER;
    }
    if (num > 999) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Maximum 999 units' });
      return z.NEVER;
    }
    return num;
  }),
});

type OnboardingInput = { state: string; unitCount: string };
type OnboardingOutput = z.output<typeof onboardingSchema>;

export function OnboardingPage() {
  const { completeOnboarding } = useAuthContext();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingInput, unknown, OnboardingOutput>({ resolver: zodResolver(onboardingSchema) });

  const onSubmit = async (data: OnboardingOutput) => {
    setLoading(true);
    try {
      await completeOnboarding(data.state, data.unitCount);
    } catch {
      // Will redirect automatically via auth state
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-xl">Welcome to TurnoverKit</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Tell us a bit about your properties so we can tailor the experience.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="state">Your State</Label>
              <select
                id="state"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register('state')}
              >
                <option value="">Select a state...</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.state && (
                <p className="text-sm text-destructive">{errors.state.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitCount">Number of Units</Label>
              <Input
                id="unitCount"
                type="number"
                min={1}
                placeholder="e.g., 2"
                {...register('unitCount')}
              />
              {errors.unitCount && (
                <p className="text-sm text-destructive">{errors.unitCount.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                'Get Started'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
