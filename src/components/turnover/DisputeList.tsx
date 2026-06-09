import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatCents } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { TenantResponse, Deduction, DisputeResolution, WithId } from '@/types';

interface Props {
  turnoverId: string;
  disputes: WithId<TenantResponse>[];
  deductions: WithId<Deduction>[];
  onResolved?: () => void;
}

export function DisputeList({ turnoverId, disputes, deductions, onResolved }: Props) {
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolution, setResolution] = useState<DisputeResolution>('upheld');
  const [newAmount, setNewAmount] = useState('');
  const [landlordNote, setLandlordNote] = useState('');
  const [saving, setSaving] = useState(false);

  const pendingDisputes = disputes.filter((d) => d.type === 'dispute' && d.status === 'submitted');
  const resolvedDisputes = disputes.filter((d) => d.type === 'dispute' && d.status === 'resolved');

  const handleResolve = async () => {
    if (!resolving) return;
    setSaving(true);

    const dispute = disputes.find((d) => d.id === resolving);
    const deduction = dispute?.deductionId
      ? deductions.find((d) => d.id === dispute.deductionId)
      : null;

    const updates: Record<string, unknown> = {
      status: 'resolved',
      resolution,
      landlordNote: landlordNote.trim() || null,
      resolvedAt: serverTimestamp(),
    };

    if (resolution === 'adjusted' && deduction) {
      updates.originalAmount = deduction.amount;
      updates.newAmount = Math.round(parseFloat(newAmount) * 100) || 0;
    } else if (resolution === 'removed' && deduction) {
      updates.originalAmount = deduction.amount;
      updates.newAmount = 0;
    }

    try {
      await updateDoc(
        doc(db, 'turnovers', turnoverId, 'tenantResponses', resolving),
        updates,
      );

      // Update deduction if adjusted or removed
      if (deduction && (resolution === 'adjusted' || resolution === 'removed')) {
        if (resolution === 'removed') {
          await updateDoc(
            doc(db, 'turnovers', turnoverId, 'deductions', deduction.id),
            { removed: true },
          );
        } else if (resolution === 'adjusted') {
          await updateDoc(
            doc(db, 'turnovers', turnoverId, 'deductions', deduction.id),
            { amount: Math.round(parseFloat(newAmount) * 100) || 0 },
          );
        }
      }

      setResolving(null);
      setLandlordNote('');
      setNewAmount('');
      onResolved?.();
    } finally {
      setSaving(false);
    }
  };

  if (pendingDisputes.length === 0 && resolvedDisputes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {pendingDisputes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-warning" />
              Pending Disputes ({pendingDisputes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingDisputes.map((dispute) => {
              const deduction = dispute.deductionId
                ? deductions.find((d) => d.id === dispute.deductionId)
                : null;
              return (
                <div key={dispute.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {deduction?.description ?? 'Unknown deduction'}
                      </p>
                      {deduction && (
                        <p className="text-xs text-muted-foreground">
                          {formatCents(deduction.amount)}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-warning">
                      Pending
                    </Badge>
                  </div>
                  <div className="mt-2 rounded bg-muted p-2">
                    <p className="text-xs font-medium text-muted-foreground">Tenant says:</p>
                    <p className="text-sm">{dispute.explanation}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => {
                      setResolving(dispute.id);
                      setResolution('upheld');
                      if (deduction) {
                        setNewAmount((deduction.amount / 100).toString());
                      }
                    }}
                  >
                    Resolve
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {resolvedDisputes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Resolved ({resolvedDisputes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resolvedDisputes.map((dispute) => (
              <div key={dispute.id} className="flex items-center justify-between rounded-lg border p-2">
                <span className="text-sm">
                  {deductions.find((d) => d.id === dispute.deductionId)?.description ?? 'Deduction'}
                </span>
                <Badge
                  variant={
                    dispute.resolution === 'upheld'
                      ? 'secondary'
                      : dispute.resolution === 'removed'
                        ? 'destructive'
                        : 'outline'
                  }
                >
                  {dispute.resolution}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Resolve Dialog */}
      <Dialog open={!!resolving} onOpenChange={() => setResolving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Resolution</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'upheld', label: 'Uphold' },
                  { value: 'adjusted', label: 'Adjust' },
                  { value: 'removed', label: 'Remove' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setResolution(opt.value)}
                    className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                      resolution === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-transparent bg-muted text-muted-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {resolution === 'adjusted' && (
              <div className="space-y-2">
                <Label>New Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Note to Tenant (optional)</Label>
              <textarea
                value={landlordNote}
                onChange={(e) => setLandlordNote(e.target.value)}
                placeholder="Explain your decision..."
                className="min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={handleResolve} disabled={saving}>
              {saving ? 'Saving...' : 'Confirm Resolution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
