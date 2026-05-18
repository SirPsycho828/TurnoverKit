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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, DollarSign, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import type { Turnover, Deduction, WithId } from '@/types';

type PortalView = 'loading' | 'invalid' | 'overview' | 'dispute' | 'acknowledged';

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
        setView('invalid');
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
      <div className="mx-auto flex min-h-svh max-w-[640px] items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (view === 'invalid') {
    return (
      <div className="mx-auto flex min-h-svh max-w-[640px] flex-col items-center justify-center px-4">
        <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Link Expired or Invalid</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This portal link is no longer valid. Contact your landlord for a new link.
        </p>
      </div>
    );
  }

  if (view === 'acknowledged') {
    return (
      <div className="mx-auto flex min-h-svh max-w-[640px] flex-col items-center justify-center px-4">
        <CheckCircle2 className="mb-4 h-12 w-12 text-success" />
        <h2 className="text-xl font-semibold">Acknowledged</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Your acknowledgment has been recorded. Your landlord will process your deposit return.
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
          <h2 className="text-xl font-semibold">Dispute Deduction</h2>
          {deduction && (
            <Card>
              <CardContent className="py-3">
                <p className="font-medium">{deduction.description}</p>
                <p className="text-sm text-muted-foreground">{formatCents(deduction.amount)}</p>
              </CardContent>
            </Card>
          )}
          <div className="space-y-2">
            <Label>Your Name</Label>
            <Input value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Explanation</Label>
            <textarea
              value={disputeText}
              onChange={(e) => setDisputeText(e.target.value)}
              placeholder="Explain why you disagree with this deduction..."
              className="min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setView('overview')}>
              Cancel
            </Button>
            <Button
              className="flex-1"
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
        <div className="text-center">
          <h1 className="text-lg font-bold text-primary">TurnoverKit</h1>
          <p className="text-sm text-muted-foreground">Tenant Portal</p>
        </div>

        <Card>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" /> Deposit Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Security Deposit</span>
              <span>{formatCents(turnover.depositAmount)}</span>
            </div>
            {turnover.petDeposit > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pet Deposit</span>
                <span>{formatCents(turnover.petDeposit)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 font-medium">
              <span>Total Held</span>
              <span>{formatCents(totalDeposit)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Deductions */}
        {deductions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Deductions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {deductions.map((d) => (
                <div key={d.id} className="flex items-start justify-between rounded-lg border p-2">
                  <div>
                    <p className="text-sm font-medium">{d.description}</p>
                    <p className="text-xs text-muted-foreground">{d.roomName} — {d.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatCents(d.amount)}</span>
                    <button
                      onClick={() => {
                        setDisputeDeductionId(d.id);
                        setView('dispute');
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Dispute
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2 text-sm">
                <span className="font-medium">Total Deductions</span>
                <span className="font-medium text-destructive">-{formatCents(totalDeductions)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">Refund Amount</span>
                <span className="font-medium text-success">{formatCents(refundAmount)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legal info */}
        <div className="flex items-start gap-2 rounded-lg bg-secondary/30 p-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
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
              <Label>Your Name (to acknowledge)</Label>
              <Input value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleAcknowledge} disabled={submitting || !tenantName.trim()}>
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
