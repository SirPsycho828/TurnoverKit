import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { useSetupWizard } from '@/hooks/useSetupWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { US_STATES } from '@/config/us-states';
import { DEFAULT_ROOMS } from '@/config/room-defaults';
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  Building2,
  MapPin,
  SkipForward,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react';

const STEPS = ['welcome', 'property', 'done'] as const;

export function SetupWizardPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();
  const { markStepCompleted, markStepSkipped, completeWizard } = useSetupWizard();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [createdProperty, setCreatedProperty] = useState<string | null>(null);

  // Property form state
  const [propertyName, setPropertyName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [propState, setPropState] = useState(profile?.state ?? '');
  const [zip, setZip] = useState('');
  const [depositAmount, setDepositAmount] = useState('');

  const stepId = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleCreateProperty = async () => {
    if (!user || !street || !city || !propState || !zip) return;
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'properties'), {
        landlordId: user.uid,
        name: propertyName || `${street}`,
        address: { street, city, state: propState, zip },
        rooms: DEFAULT_ROOMS.map((name, i) => ({ name, order: i })),
        depositAmount: depositAmount ? Math.round(parseFloat(depositAmount) * 100) : 0,
        petDeposit: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCreatedProperty(docRef.id);
      await markStepCompleted('property');
      setCurrentStep(2);
    } catch (err) {
      console.error('Failed to create property:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSkipProperty = async () => {
    await markStepSkipped('property');
    setCurrentStep(2);
  };

  const handleFinish = async () => {
    await completeWizard();
    // Set tour pending so it auto-starts on dashboard
    localStorage.setItem('turnoverkit-tour-pending', 'true');
    localStorage.removeItem('turnoverkit-tour-completed');
    navigate('/dashboard', { replace: true });
  };

  const handleExit = () => {
    completeWizard();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-[640px] flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-3.5 w-3.5 text-emerald" />
          </div>
          <span className="font-heading text-sm font-700">TurnoverKit</span>
        </div>
        <button
          onClick={handleExit}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Skip setup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] font-500 text-muted-foreground/60">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-center px-4 py-8">
        {/* Step 1: Welcome */}
        {stepId === 'welcome' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/10">
                <Sparkles className="h-7 w-7 text-emerald" />
              </div>
              <h1 className="mt-4 font-heading text-2xl font-800 tracking-tight">
                Welcome to TurnoverKit
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Let's get you set up in about 2 minutes. We'll add your first property so you're ready to manage turnovers.
              </p>
            </div>

            <Card className="border-border/60">
              <CardContent className="py-4">
                <p className="text-xs font-600 uppercase tracking-wide text-muted-foreground">
                  Here's how TurnoverKit works
                </p>
                <div className="mt-3 space-y-2.5">
                  {[
                    { icon: Building2, label: 'Add your rental properties' },
                    { icon: MapPin, label: 'Inspect units when tenants move out' },
                    { icon: CheckCircle2, label: 'Itemize deductions and return deposits on time' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <p className="text-sm">{label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button className="h-11 w-full gap-2 font-600" onClick={() => setCurrentStep(1)}>
              Let's go
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Add First Property */}
        {stepId === 'property' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <h2 className="font-heading text-xl font-700 tracking-tight">
                Add your first property
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the address of a rental you manage. You can add more later.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-500 text-muted-foreground">
                  Property Name (optional)
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Oak Street Duplex"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="street" className="text-xs font-500 text-muted-foreground">
                  Street Address *
                </Label>
                <Input
                  id="street"
                  placeholder="123 Main St"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-500 text-muted-foreground">
                    City *
                  </Label>
                  <Input
                    id="city"
                    placeholder="Austin"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="propState" className="text-xs font-500 text-muted-foreground">
                    State *
                  </Label>
                  <select
                    id="propState"
                    value={propState}
                    onChange={(e) => setPropState(e.target.value)}
                    className="flex h-11 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">...</option>
                    {US_STATES.map((s) => (
                      <option key={s.code} value={s.code}>{s.code}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="zip" className="text-xs font-500 text-muted-foreground">
                    ZIP *
                  </Label>
                  <Input
                    id="zip"
                    placeholder="78701"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deposit" className="text-xs font-500 text-muted-foreground">
                  Security Deposit ($)
                </Label>
                <Input
                  id="deposit"
                  type="number"
                  placeholder="1500"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="h-11"
                />
                <p className="text-[11px] text-muted-foreground">
                  Default rooms (Kitchen, Living Room, Bathroom, Bedroom) will be added automatically.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-11"
                onClick={() => setCurrentStep(0)}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button
                className="h-11 flex-1 gap-2 font-600"
                onClick={handleCreateProperty}
                disabled={saving || !street || !city || !propState || !zip}
              >
                {saving ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    Create Property
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            <button
              onClick={handleSkipProperty}
              className="flex w-full items-center justify-center gap-1 text-xs font-500 text-muted-foreground transition-colors hover:text-foreground"
            >
              <SkipForward className="h-3 w-3" />
              Skip for now
            </button>
          </div>
        )}

        {/* Step 3: Done */}
        {stepId === 'done' && (
          <div className="space-y-6 text-center animate-in fade-in duration-300">
            <div>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/10">
                <CheckCircle2 className="h-7 w-7 text-emerald" />
              </div>
              <h2 className="mt-4 font-heading text-2xl font-800 tracking-tight">
                You're all set!
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {createdProperty
                  ? 'Your first property is ready. When a tenant gives notice, start a turnover from the property page.'
                  : 'You can add properties anytime from your dashboard.'}
              </p>
            </div>

            {createdProperty && (
              <Card className="border-border/60">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald/8">
                    <Building2 className="h-4.5 w-4.5 text-emerald" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-600">{propertyName || street}</p>
                    <p className="text-xs text-muted-foreground">
                      {city}, {propState} {zip}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button className="h-11 w-full gap-2 font-600" onClick={handleFinish}>
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
