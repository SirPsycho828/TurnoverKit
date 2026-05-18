import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, doc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { getStateRules, isStateSupported } from '@/config/state-rules';
import { generateMilestones } from '@/lib/timeline';
import { dollarsToCents, formatCents, centsToDollars } from '@/lib/currency';
import { addDays, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, AlertCircle, Shield } from 'lucide-react';
import type { Property, WithId, FrozenStateRules } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const tenantSchema = z.object({
  tenantName: z.string().min(1, 'Tenant name is required'),
  moveOutDate: z.string().min(1, 'Move-out date is required'),
});

type TenantInput = z.input<typeof tenantSchema>;

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function TurnoverCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('propertyId');
  const { user } = useAuthContext();

  const [step, setStep] = useState(1);
  const [properties, setProperties] = useState<WithId<Property>[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<WithId<Property> | null>(null);
  const [tenantData, setTenantData] = useState<{ name: string; moveOutDate: string } | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [petDeposit, setPetDeposit] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const totalSteps = 4;

  const tenantForm = useForm<TenantInput>({
    resolver: zodResolver(tenantSchema),
    defaultValues: { moveOutDate: format(addDays(new Date(), 30), 'yyyy-MM-dd') },
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDocs(
        query(collection(db, 'properties'), where('landlordId', '==', user.uid)),
      );
      const props = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<Property>));

      // Check which have active turnovers
      const turnoverSnap = await getDocs(
        query(collection(db, 'turnovers'), where('landlordId', '==', user.uid)),
      );
      const activePropIds = new Set(
        turnoverSnap.docs
          .filter((d) => d.data().status !== 'archived')
          .map((d) => d.data().propertyId),
      );

      const eligible = props.filter((p) => !activePropIds.has(p.id));
      setProperties(eligible);

      if (preselectedId) {
        const pre = eligible.find((p) => p.id === preselectedId);
        if (pre) {
          setSelectedProperty(pre);
          setStep(2);
        }
      } else if (eligible.length === 1) {
        setSelectedProperty(eligible[0]);
        setStep(2);
      }
      setLoading(false);
    })();
  }, [user, preselectedId]);

  useEffect(() => {
    if (selectedProperty) {
      setDepositAmount(centsToDollars(selectedProperty.leaseDepositAmount).toString());
      setPetDeposit(centsToDollars(selectedProperty.petDeposit).toString());
    }
  }, [selectedProperty]);

  const handleTenantSubmit = tenantForm.handleSubmit((data) => {
    const moveOut = new Date(data.moveOutDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (moveOut < today) {
      tenantForm.setError('moveOutDate', { message: 'Move-out date cannot be in the past' });
      return;
    }
    setTenantData({ name: data.tenantName, moveOutDate: data.moveOutDate });
    setStep(3);
  });

  const handleCreate = async () => {
    if (!user || !selectedProperty || !tenantData) return;
    setSaving(true);

    const moveOutDate = new Date(tenantData.moveOutDate + 'T00:00:00');
    const stateCode = selectedProperty.address.state;
    const rules = getStateRules(stateCode);

    const frozenRules: FrozenStateRules = {
      returnDeadlineDays: rules.deposit.returnDeadlineDays,
      deadlineType: rules.deposit.deadlineType,
      itemizationRequired: rules.deposit.itemizationRequired,
      interestRequired: rules.deposit.interestRequired,
      inspectionNoticeDays: rules.inspection.noticeDays,
      tenantRightToAttend: rules.inspection.tenantRightToAttend,
      requiredDisclosures: rules.disclosures,
      letterTemplateId: rules.letterTemplate.id,
      receiptRequired: rules.deposit.receiptRequired,
    };

    const depositCents = dollarsToCents(parseFloat(depositAmount) || 0);
    const petCents = dollarsToCents(parseFloat(petDeposit) || 0);
    const depositDueDate = addDays(moveOutDate, rules.deposit.returnDeadlineDays);

    try {
      const batch = writeBatch(db);
      const turnoverRef = doc(collection(db, 'turnovers'));

      batch.set(turnoverRef, {
        landlordId: user.uid,
        propertyId: selectedProperty.id,
        tenantName: tenantData.name,
        moveOutDate: Timestamp.fromDate(moveOutDate),
        status: 'notice_received',
        depositAmount: depositCents,
        petDeposit: petCents,
        stateRules: frozenRules,
        portalToken: generateToken(),
        portalExpiresAt: Timestamp.fromDate(addDays(new Date(), 365)),
        inspectionComplete: false,
        depositDueDate: Timestamp.fromDate(depositDueDate),
        totalDeductions: 0,
        refundAmount: depositCents + petCents,
        relistReady: false,
        relistChecklist: [
          { label: 'Keys changed', checked: false },
          { label: 'Unit cleaned', checked: false },
          { label: 'Repairs complete', checked: false },
          { label: 'Listing photos updated', checked: false },
        ],
        wizardComplete: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create room subcollections from property room list
      for (let i = 0; i < selectedProperty.rooms.length; i++) {
        const roomRef = doc(collection(db, 'turnovers', turnoverRef.id, 'rooms'));
        batch.set(roomRef, {
          roomName: selectedProperty.rooms[i],
          order: i,
          notes: '',
          photos: [],
          checklistItems: [],
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      navigate(`/turnovers/${turnoverRef.id}`);
    } catch {
      setSaving(false);
    }
  };

  const stateRulesPreview = selectedProperty
    ? getStateRules(selectedProperty.address.state)
    : null;

  const moveOutDateObj = tenantData ? new Date(tenantData.moveOutDate + 'T00:00:00') : null;
  const depositDueDatePreview = moveOutDateObj && stateRulesPreview
    ? addDays(moveOutDateObj, stateRulesPreview.deposit.returnDeadlineDays)
    : null;

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (properties.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">All your properties have active turnovers. Finish or archive one to start a new turnover.</p>
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))} className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-semibold">Start Turnover</h2>
      </div>

      <Progress value={(step / totalSteps) * 100} className="h-1" />
      <p className="text-xs text-muted-foreground">Step {step} of {totalSteps}</p>

      {/* Step 1: Select Property */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Select a property</p>
          {properties.map((p) => (
            <Card
              key={p.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedProperty?.id === p.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => { setSelectedProperty(p); setStep(2); }}
            >
              <CardContent className="py-3">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.address.street}, {p.address.city}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Tenant Details */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Tenant Details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleTenantSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenantName">Tenant Name</Label>
                <Input id="tenantName" placeholder="John Smith" {...tenantForm.register('tenantName')} />
                {tenantForm.formState.errors.tenantName && <p className="text-sm text-destructive">{tenantForm.formState.errors.tenantName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="moveOutDate">Move-Out Date</Label>
                <Input id="moveOutDate" type="date" {...tenantForm.register('moveOutDate')} />
                <p className="text-xs text-muted-foreground">When is the tenant's last day in the unit?</p>
                {tenantForm.formState.errors.moveOutDate && <p className="text-sm text-destructive">{tenantForm.formState.errors.moveOutDate.message}</p>}
              </div>
              <Button type="submit" className="w-full">Next</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Deposit Confirmation */}
      {step === 3 && selectedProperty && (
        <Card>
          <CardHeader><CardTitle>Confirm Deposit</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Confirm the deposit amounts for this tenant's lease.</p>
            <div className="space-y-2">
              <Label>Security Deposit ($)</Label>
              <Input type="number" step="0.01" min="0" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pet Deposit ($)</Label>
              <Input type="number" step="0.01" min="0" value={petDeposit} onChange={(e) => setPetDeposit(e.target.value)} />
            </div>
            <Button className="w-full" onClick={() => setStep(4)}>Next</Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review & Generate */}
      {step === 4 && selectedProperty && tenantData && stateRulesPreview && (
        <Card>
          <CardHeader><CardTitle>Review & Generate Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Property</span><span className="font-medium">{selectedProperty.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tenant</span><span className="font-medium">{tenantData.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Move-out</span><span className="font-medium">{format(new Date(tenantData.moveOutDate + 'T00:00:00'), 'MMM d, yyyy')}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Deposit</span><span className="font-medium">{formatCents(dollarsToCents(parseFloat(depositAmount) || 0))}</span></div>
              {parseFloat(petDeposit) > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Pet Deposit</span><span className="font-medium">{formatCents(dollarsToCents(parseFloat(petDeposit) || 0))}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">State</span><span className="font-medium">{selectedProperty.address.state}</span></div>
            </div>

            {depositDueDatePreview && (
              <div className="flex items-start gap-2 rounded-lg border-l-4 border-primary bg-secondary/30 p-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm">
                  Deposit must be returned by <span className="font-semibold">{format(depositDueDatePreview, 'MMM d, yyyy')}</span> per {selectedProperty.address.state} law.
                </p>
              </div>
            )}

            {!stateRulesPreview.supported && (
              <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <p className="text-sm text-foreground">
                  Legal templates for {selectedProperty.address.state} are limited. Verify deadlines with your local statutes.
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Based on {stateRulesPreview.stateName} statute as of {stateRulesPreview.lastUpdated}. This is not legal advice. Consult an attorney for your specific situation.
            </p>

            <Button className="w-full" onClick={handleCreate} disabled={saving}>
              {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : 'Generate Timeline'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
