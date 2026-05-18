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
import { dollarsToCents, formatCents, centsToDollars } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, DollarSign, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Turnover, Deduction, DeductionCategory, Room, WithId } from '@/types';

const CATEGORIES: { value: DeductionCategory; label: string }[] = [
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'repair', label: 'Repair' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'damage', label: 'Damage' },
  { value: 'other', label: 'Other' },
];

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
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
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
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(`/turnovers/${id}`)} className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-xl font-semibold">Deductions</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      {/* Summary card */}
      <Card>
        <CardContent className="py-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Deposit</span>
            <span>{formatCents(totalDeposit)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Deductions</span>
            <span className="text-destructive">-{formatCents(totalDeductionsCents)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 font-medium">
            <span>Refund Due</span>
            <span className={overDeducted ? 'text-destructive' : 'text-success'}>
              {formatCents(refundAmount)}
            </span>
          </div>
        </CardContent>
      </Card>

      {overDeducted && (
        <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm">
            Deductions exceed the total deposit. You may need to send a balance-due invoice.
          </p>
        </div>
      )}

      {/* Deduction list */}
      {activeDeductions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-8">
            <DollarSign className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No deductions yet. Add deductions for damages, cleaning, or repairs.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {activeDeductions.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{d.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{d.roomName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatCents(d.amount)}</span>
                  <button
                    onClick={() => handleRemove(d.id)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Finalize button */}
      <Button className="w-full" onClick={handleFinalize}>
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
              <Label htmlFor="dedDesc">Description</Label>
              <Input id="dedDesc" placeholder="Carpet stain in bedroom" {...form.register('description')} />
              {form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dedAmount">Amount ($)</Label>
              <Input id="dedAmount" type="number" step="0.01" min="0" placeholder="150.00" {...form.register('amount')} />
              {form.formState.errors.amount && <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dedCategory">Category</Label>
              <select id="dedCategory" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register('category')}>
                <option value="">Select...</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {form.formState.errors.category && <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dedRoom">Room</Label>
              <select id="dedRoom" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register('roomName')}>
                <option value="">Select...</option>
                {rooms.map((r) => <option key={r.id} value={r.roomName}>{r.roomName}</option>)}
                <option value="General">General / Whole Unit</option>
              </select>
              {form.formState.errors.roomName && <p className="text-sm text-destructive">{form.formState.errors.roomName.message}</p>}
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Adding...' : 'Add Deduction'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
