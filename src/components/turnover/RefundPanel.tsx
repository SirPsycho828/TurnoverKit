import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatCents } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DollarSign, CheckCircle2, Send } from 'lucide-react';
import type { Turnover, WithId } from '@/types';

const RETURN_METHODS = [
  { value: 'check', label: 'Check (mailed)' },
  { value: 'ach', label: 'ACH / Direct Deposit' },
  { value: 'venmo', label: 'Venmo / PayPal' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

interface Props {
  turnover: WithId<Turnover>;
  totalDeductions: number;
}

export function RefundPanel({ turnover, totalDeductions }: Props) {
  const [method, setMethod] = useState(turnover.returnMethod ?? '');
  const [details, setDetails] = useState(turnover.returnDetails ?? '');
  const [saving, setSaving] = useState(false);

  const totalDeposit = turnover.depositAmount + turnover.petDeposit;
  const refund = Math.max(0, totalDeposit - totalDeductions);
  const owedByTenant = totalDeductions > totalDeposit ? totalDeductions - totalDeposit : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'turnovers', turnover.id), {
        returnMethod: method,
        returnDetails: details,
        refundAmount: refund,
        totalDeductions,
        updatedAt: serverTimestamp(),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'turnovers', turnover.id), {
        returnMethod: method,
        returnDetails: details,
        refundAmount: refund,
        totalDeductions,
        status: 'finalized',
        finalizedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-accent" />
          {owedByTenant > 0 ? 'Balance Due' : 'Refund'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount summary */}
        <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span>Total Deposit</span>
            <span>{formatCents(totalDeposit)}</span>
          </div>
          <div className="flex justify-between">
            <span>Deductions</span>
            <span className="text-destructive">-{formatCents(totalDeductions)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 font-medium">
            {owedByTenant > 0 ? (
              <>
                <span>Tenant Owes</span>
                <span className="text-destructive">{formatCents(owedByTenant)}</span>
              </>
            ) : (
              <>
                <span>Refund to Tenant</span>
                <span className="text-success">{formatCents(refund)}</span>
              </>
            )}
          </div>
        </div>

        {refund > 0 && (
          <>
            <div className="space-y-2">
              <Label>Return Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {RETURN_METHODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMethod(m.value)}
                    className={`rounded-lg border-2 px-3 py-2 text-sm ${
                      method === m.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-transparent bg-muted text-muted-foreground'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Details (optional)</Label>
              <Input
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Check #, transaction ID, mailing address..."
              />
            </div>
          </>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleSave} disabled={saving}>
            Save
          </Button>
          <Button className="flex-1" onClick={handleFinalize} disabled={saving}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Finalize
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
