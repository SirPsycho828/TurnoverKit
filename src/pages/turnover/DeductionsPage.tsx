import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { dollarsToCents, formatCents } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ArrowLeft, Plus, Trash2, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GuidanceTip } from '@/components/ux/GuidanceTip';
import type { Turnover, Deduction, DeductionCategory, Room, WithId } from '@/types';

const CATEGORIES: { value: DeductionCategory; label: string }[] = [
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'repair', label: 'Repair' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'damage', label: 'Damage' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_BORDER_COLORS: Record<string, string> = {
  cleaning: 'border-l-emerald',
  repair: 'border-l-blue-500',
  replacement: 'border-l-amber-500',
  damage: 'border-l-red-500',
  other: 'border-l-gray-400',
};

const deductionSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.string().min(1, 'Amount is required'),
  category: z.string().min(1, 'Select a category'),
  roomName: z.string().min(1, 'Select a room'),
});

type DeductionInput = z.input<typeof deductionSchema>;

export function DeductionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [turnover, setTurnover] = useState<WithId<Turnover> | null>(null);
  const [deductions, setDeductions] = useState<WithId<Deduction>[]>([]);
  const [rooms, setRooms] = useState<WithId<Room>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<DeductionInput>({
    resolver: zodResolver(deductionSchema),
    defaultValues: { category: '', roomName: '' },
  });

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const tSnap = await getDoc(doc(db, 'turnovers', id));
      if (tSnap.exists()) {
        setTurnover({ id: tSnap.id, ...tSnap.data() } as WithId<Turnover>);
      }

      const dSnap = await getDocs(query(collection(db, 'turnovers', id, 'deductions')));
      setDeductions(dSnap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<Deduction>)));

      const rSnap = await getDocs(query(collection(db, 'turnovers', id, 'rooms')));
      setRooms(
        rSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as WithId<Room>))
          .sort((a, b) => a.order - b.order),
      );

      setLoading(false);
    })();
  }, [id, user]);

  const handleAdd = form.handleSubmit(async (data) => {
    if (!id) return;
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'turnovers', id, 'deductions'), {
        description: data.description,
        amount: dollarsToCents(parseFloat(data.amount)),
        category: data.category as DeductionCategory,
        roomName: data.roomName,
        photoUrls: [],
        createdAt: serverTimestamp(),
      });
      setDeductions((prev) => [
        ...prev,
        {
          id: docRef.id,
          description: data.description,
          amount: dollarsToCents(parseFloat(data.amount)),
          category: data.category as DeductionCategory,
          roomName: data.roomName,
          photoUrls: [],
          createdAt: null as unknown as Deduction['createdAt'],
        },
      ]);
      form.reset({ category: '', roomName: '' });
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  });

  const handleRemove = async (deductionId: string) => {
    if (!id) return;
    await deleteDoc(doc(db, 'turnovers', id, 'deductions', deductionId));
    setDeductions((prev) => prev.filter((d) => d.id !== deductionId));
  };

  const handleFinalize = async () => {
    if (!id || !turnover) return;
    const activeDeductions = deductions.filter((d) => !d.removed);
    const totalDeductions = activeDeductions.reduce((sum, d) => sum + d.amount, 0);
    const totalDeposit = turnover.depositAmount + turnover.petDeposit;
    await updateDoc(doc(db, 'turnovers', id), {
      totalDeductions,
      refundAmount: Math.max(0, totalDeposit - totalDeductions),
      status: 'deductions_drafted',
      updatedAt: serverTimestamp(),
    });
    navigate(`/turnovers/${id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5">
          <Loader2 className="h-6 w-6 animate-spin text-emerald" />
        </div>
      </div>
    );
  }

  if (!turnover) {
    return <p className="text-center text-muted-foreground">Turnover not found.</p>;
  }

  const activeDeductions = deductions.filter((d) => !d.removed);
  const totalDeductionsCents = activeDeductions.reduce((sum, d) => sum + d.amount, 0);
  const totalDeposit = turnover.depositAmount + turnover.petDeposit;
  const refundAmount = Math.max(0, totalDeposit - totalDeductionsCents);
  const overDeducted = totalDeductionsCents > totalDeposit;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/turnovers/${id}`)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          aria-label="Back to turnover"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="flex-1 font-heading text-xl font-700 tracking-tight">Deductions</h2>
        <Button className="h-9 font-600" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      <GuidanceTip id="deductions-categories">
        Only deduct for damage beyond normal wear and tear. Cleaning, repairs, and replacements must be itemized with specific amounts.
      </GuidanceTip>

      {/* Summary card */}
      <Card className="border-border/60 bg-muted/30">
        <CardContent className="py-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-xs font-500 text-muted-foreground">Total Deposit</span>
            <span className="tabular-nums">{formatCents(totalDeposit)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs font-500 text-muted-foreground">Total Deductions</span>
            <span className="tabular-nums text-destructive">-{formatCents(totalDeductionsCents)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Refund Due</span>
            <span className={cn(
              'text-lg font-heading font-700 tabular-nums',
              overDeducted ? 'text-destructive' : 'text-emerald',
            )}>
              {formatCents(refundAmount)}
            </span>
          </div>
        </CardContent>
      </Card>

      {overDeducted && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm">
            Deductions exceed the total deposit. You may need to send a balance-due invoice.
          </p>
        </div>
      )}

      {/* Deduction list */}
      {activeDeductions.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No deductions yet"
          description="Add deductions for damages, cleaning, or repairs."
          actionLabel="Add Deduction"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <div className="space-y-2">
          {activeDeductions.map((d) => (
            <Card key={d.id} className={cn(
              'border-border/60 border-l-[3px]',
              CATEGORY_BORDER_COLORS[d.category] || 'border-l-gray-400',
            )}>
              <CardContent className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{d.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-500 text-muted-foreground">
                      {CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category}
                    </span>
                    <span className="text-xs text-muted-foreground">{d.roomName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-600 tabular-nums">{formatCents(d.amount)}</span>
                  <button
                    onClick={() => handleRemove(d.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Finalize button */}
      <Button className="h-11 w-full font-600" onClick={handleFinalize}>
        Save & Update Turnover
      </Button>

      {/* Add Deduction Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Deduction</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dedDesc" className="text-xs font-500 text-muted-foreground">Description</Label>
              <Input id="dedDesc" className="h-11" placeholder="Carpet stain in bedroom" {...form.register('description')} />
              {form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dedAmount" className="text-xs font-500 text-muted-foreground">Amount ($)</Label>
              <Input id="dedAmount" className="h-11" type="number" step="0.01" min="0" placeholder="150.00" {...form.register('amount')} />
              {form.formState.errors.amount && <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dedCategory" className="text-xs font-500 text-muted-foreground">Category</Label>
              <select id="dedCategory" className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register('category')}>
                <option value="">Select...</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {form.formState.errors.category && <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dedRoom" className="text-xs font-500 text-muted-foreground">Room</Label>
              <select id="dedRoom" className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register('roomName')}>
                <option value="">Select...</option>
                {rooms.map((r) => <option key={r.id} value={r.roomName}>{r.roomName}</option>)}
                <option value="General">General / Whole Unit</option>
              </select>
              {form.formState.errors.roomName && <p className="text-sm text-destructive">{form.formState.errors.roomName.message}</p>}
            </div>
            <DialogFooter>
              <Button type="submit" className="h-11 w-full font-600" disabled={saving}>
                {saving ? 'Adding...' : 'Add Deduction'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
