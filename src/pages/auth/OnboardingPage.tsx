import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthContext } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { US_STATES } from '@/config/us-states';
import { MapPin, Building2, ArrowRight } from 'lucide-react';

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
  const navigate = useNavigate();
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
      navigate('/setup', { replace: true });
    } catch (err) {
      console.error('[Onboarding] error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Almost there" subtitle="Tell us about your properties to get started">
      <Card className="border-border/60 shadow-md">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="state" className="flex items-center gap-1.5 text-xs font-500 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                Your State
              </Label>
              <select
                id="state"
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <p className="text-xs text-destructive">{errors.state.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                We use this to apply your state's deposit return rules.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unitCount" className="flex items-center gap-1.5 text-xs font-500 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                Number of Units
              </Label>
              <Input
                id="unitCount"
                type="number"
                min={1}
                placeholder="e.g., 2"
                className="h-11"
                {...register('unitCount')}
              />
              {errors.unitCount && (
                <p className="text-xs text-destructive">{errors.unitCount.message}</p>
              )}
            </div>

            <Button type="submit" className="h-11 w-full gap-2 font-600" disabled={loading}>
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  Launch Dashboard
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
