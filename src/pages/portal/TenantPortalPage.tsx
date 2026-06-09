import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { formatCents } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, DollarSign, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { Turnover, Deduction, WithId } from '@/types';

type PortalView = 'loading' | 'invalid' | 'expired' | 'overview' | 'dispute' | 'acknowledged';

export function TenantPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<PortalView>('loading');
  const [turnover, setTurnover] = useState<WithId<Turnover> | null>(null);
  const [deductions, setDeductions] = useState<WithId<Deduction>[]>([]);
  const [disputeDeductionId, setDisputeDeductionId] = useState<string | null>(null);
  const [disputeText, setDisputeText] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const snap = await getDocs(
        query(collection(db, 'turnovers'), where('portalToken', '==', token)),
      );
      if (snap.empty) {
        setView('invalid');
        return;
      }
      const t = { id: snap.docs[0].id, ...snap.docs[0].data() } as WithId<Turnover>;

      // Check expiry
      if (t.portalExpiresAt.toDate() < new Date()) {
        setView('expired');
        return;
      }

      setTurnover(t);
      setTenantName(t.tenantName);

      // Load deductions
      const dSnap = await getDocs(
        collection(db, 'turnovers', t.id, 'deductions'),
      );
      setDeductions(
        dSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as WithId<Deduction>))
          .filter((d) => !d.removed),
      );

      // Check existing acknowledgment
      const rSnap = await getDocs(
        query(
          collection(db, 'turnovers', t.id, 'tenantResponses'),
          where('type', '==', 'acknowledgment'),
        ),
      );
      if (!rSnap.empty) {
        setView('acknowledged');
      } else {
        setView('overview');
      }
    })();
  }, [token]);

  const handleAcknowledge = async () => {
    if (!turnover) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'turnovers', turnover.id, 'tenantResponses'), {
        type: 'acknowledgment',
        tenantName,
        status: 'submitted',
        createdAt: serverTimestamp(),
      });
      setView('acknowledged');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispute = async () => {
    if (!turnover || !disputeDeductionId || !disputeText.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'turnovers', turnover.id, 'tenantResponses'), {
        type: 'dispute',
        tenantName,
        deductionId: disputeDeductionId,
        explanation: disputeText.trim(),
        status: 'submitted',
        createdAt: serverTimestamp(),
      });
      setDisputeDeductionId(null);
      setDisputeText('');
      setView('overview');
    } finally {
      setSubmitting(false);
    }
  };

  if (view === 'loading') {
    return (
      <div className="mx-auto flex min-h-svh max-w-[640px] flex-col items-center justify-center gap-3 px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5">
          <Loader2 className="h-6 w-6 animate-spin text-emerald" />
        </div>
      </div>
    );
  }

  if (view === 'invalid') {
    return (
      <div className="mx-auto flex min-h-svh max-w-[640px] flex-col items-center justify-center px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <AlertCircle className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="mt-4 font-heading text-xl font-700 tracking-tight">Invalid Link</h2>
        <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
          This portal link is not valid. Please check the link or contact your landlord.
        </p>
      </div>
    );
  }

  if (view === 'expired') {
    return (
      <div className="mx-auto flex min-h-svh max-w-[640px] flex-col items-center justify-center px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <AlertCircle className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="mt-4 font-heading text-xl font-700 tracking-tight">Link Expired</h2>
        <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
          This portal link has expired. Contact your landlord for a new link.
        </p>
      </div>
    );
  }

  if (view === 'acknowledged') {
    return (
      <div className="mx-auto flex min-h-svh max-w-[640px] flex-col items-center justify-center px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/10">
          <CheckCircle2 className="h-7 w-7 text-emerald" />
        </div>
        <h2 className="mt-4 font-heading text-xl font-700 tracking-tight">Acknowledged</h2>
        <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
          Your acknowledgment has been recorded. Your landlord will process your deposit return.
        </p>
        <p className="mt-3 max-w-xs text-center text-xs text-muted-foreground/70">
          Your landlord has been notified. If you have questions about your deposit, contact them directly.
        </p>
      </div>
    );
  }

  if (!turnover) return null;

  const totalDeposit = turnover.depositAmount + turnover.petDeposit;
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const refundAmount = Math.max(0, totalDeposit - totalDeductions);

  if (view === 'dispute' && disputeDeductionId) {
    const deduction = deductions.find((d) => d.id === disputeDeductionId);
    return (
      <div className="mx-auto min-h-svh max-w-[640px] px-4 py-6">
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-700 tracking-tight">Dispute Deduction</h2>
          {deduction && (
            <Card className="border-border/60">
              <CardContent className="py-3">
                <p className="font-medium">{deduction.description}</p>
                <p className="text-sm tabular-nums text-muted-foreground">{formatCents(deduction.amount)}</p>
              </CardContent>
            </Card>
          )}
          <div className="space-y-2">
            <Label className="text-xs font-500 text-muted-foreground">Your Name</Label>
            <Input className="h-11" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-500 text-muted-foreground">Explanation</Label>
            <textarea
              value={disputeText}
              onChange={(e) => setDisputeText(e.target.value)}
              placeholder="Explain why you disagree with this deduction..."
              className="min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="h-11 flex-1 font-600" onClick={() => setView('overview')}>
              Cancel
            </Button>
            <Button
              className="h-11 flex-1 font-600"
              onClick={handleDispute}
              disabled={submitting || !disputeText.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit Dispute'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-svh max-w-[640px] px-4 py-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Shield className="h-5 w-5 text-emerald" />
          </div>
          <div className="text-center">
            <h1 className="font-heading text-lg font-700 tracking-tight text-foreground">TurnoverKit</h1>
            <p className="text-xs font-500 text-muted-foreground">Tenant Portal</p>
          </div>
        </div>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Move-Out Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tenant</span>
              <span className="font-medium">{turnover.tenantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Move-out Date</span>
              <span>{format(turnover.moveOutDate.toDate(), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deposit Return Deadline</span>
              <span>{format(turnover.depositDueDate.toDate(), 'MMM d, yyyy')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Deposit breakdown */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-emerald" /> Deposit Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Security Deposit</span>
              <span className="tabular-nums">{formatCents(turnover.depositAmount)}</span>
            </div>
            {turnover.petDeposit > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pet Deposit</span>
                <span className="tabular-nums">{formatCents(turnover.petDeposit)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 font-medium">
              <span>Total Held</span>
              <span className="tabular-nums">{formatCents(totalDeposit)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Deductions */}
        {deductions.length > 0 && (
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Deductions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {deductions.map((d) => (
                <div key={d.id} className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{d.description}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{d.roomName} -- {d.category}</p>
                    </div>
                    <span className="text-sm font-600 tabular-nums">{formatCents(d.amount)}</span>
                  </div>
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs font-500"
                      onClick={() => {
                        setDisputeDeductionId(d.id);
                        setView('dispute');
                      }}
                    >
                      Dispute
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2 text-sm">
                <span className="font-medium">Total Deductions</span>
                <span className="font-medium tabular-nums text-destructive">-{formatCents(totalDeductions)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">Refund Amount</span>
                <span className="font-heading font-700 tabular-nums text-emerald">{formatCents(refundAmount)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legal info */}
        <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/50 p-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
          <p className="text-xs text-muted-foreground">
            Your landlord is required to return your deposit (minus lawful deductions) within{' '}
            {turnover.stateRules.returnDeadlineDays} {turnover.stateRules.deadlineType} days of move-out.
            {turnover.stateRules.itemizationRequired && ' An itemized statement of deductions is required by law.'}
          </p>
        </div>

        {/* Acknowledge button */}
        {deductions.length > 0 && (
          <div className="space-y-3 pb-6">
            <div className="space-y-2">
              <Label className="text-xs font-500 text-muted-foreground">Your Name (to acknowledge)</Label>
              <Input className="h-11" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
            </div>
            <Button className="h-11 w-full font-600" onClick={handleAcknowledge} disabled={submitting || !tenantName.trim()}>
              {submitting ? 'Submitting...' : 'Acknowledge & Accept'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Acknowledging does not waive your right to dispute individual deductions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
