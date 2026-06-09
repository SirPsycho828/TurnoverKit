import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Phone, Mail, Trash2, Wrench, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GuidanceTip } from '@/components/ux/GuidanceTip';
import type { Vendor, VendorSpecialty, WithId } from '@/types';

const SPECIALTIES: { value: VendorSpecialty; label: string }[] = [
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'general_repair', label: 'General Repair' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'painting', label: 'Painting' },
  { value: 'other', label: 'Other' },
];

const SPECIALTY_COLORS: Record<VendorSpecialty, string> = {
  cleaning: 'border-l-emerald-500',
  general_repair: 'border-l-blue-500',
  plumbing: 'border-l-cyan-500',
  electrical: 'border-l-amber-500',
  painting: 'border-l-violet-500',
  other: 'border-l-gray-400',
};

const vendorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  specialty: z.string().min(1, 'Select a specialty'),
  notes: z.string().optional(),
});

type VendorInput = z.input<typeof vendorSchema>;

export function VendorsPage() {
  const { user } = useAuthContext();
  const [vendors, setVendors] = useState<WithId<Vendor>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<VendorInput>({
    resolver: zodResolver(vendorSchema),
    defaultValues: { specialty: '' },
  });

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(collection(db, 'vendors'), where('landlordId', '==', user.uid)),
      (snap) => {
        setVendors(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<Vendor>)));
        setLoading(false);
      },
    );
    return unsub;
  }, [user]);

  const handleAdd = form.handleSubmit(async (data) => {
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'vendors'), {
        landlordId: user.uid,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        specialty: data.specialty as VendorSpecialty,
        notes: data.notes || null,
        createdAt: serverTimestamp(),
      });
      form.reset();
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async (vendorId: string) => {
    await deleteDoc(doc(db, 'vendors', vendorId));
    setShowDelete(null);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-700 tracking-tight">Vendors</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add Vendor
        </Button>
      </div>

      <GuidanceTip id="vendors-dispatch">
        Keep your go-to contractors here. During a turnover, you can quickly reference their contact info for repairs and cleaning.
      </GuidanceTip>

      {vendors.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No vendors yet"
          description="Add your preferred vendors for quick dispatch during turnovers."
          actionLabel="Add Your First Vendor"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <div className="space-y-3">
          {vendors.map((v) => (
            <Card
              key={v.id}
              className={`border-border/60 border-l-2 ${SPECIALTY_COLORS[v.specialty] ?? 'border-l-gray-400'}`}
            >
              <CardContent className="py-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-heading font-600">{v.name}</p>
                    <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-500 text-muted-foreground">
                      {SPECIALTIES.find((s) => s.value === v.specialty)?.label ?? v.specialty}
                    </span>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" /> {v.email}
                      </div>
                      {v.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" /> {v.phone}
                        </div>
                      )}
                    </div>
                    {v.notes && <p className="mt-1 text-xs text-muted-foreground">{v.notes}</p>}
                  </div>
                  <button
                    onClick={() => setShowDelete(v.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive active:scale-95"
                    aria-label={`Delete ${v.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Vendor Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Add Vendor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vendorName" className="text-xs font-500 text-muted-foreground">Name</Label>
              <Input id="vendorName" className="h-11" placeholder="ABC Cleaning Co." {...form.register('name')} />
              {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorEmail" className="text-xs font-500 text-muted-foreground">Email</Label>
              <Input id="vendorEmail" className="h-11" type="email" placeholder="vendor@example.com" {...form.register('email')} />
              {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorPhone" className="text-xs font-500 text-muted-foreground">Phone (optional)</Label>
              <Input id="vendorPhone" className="h-11" type="tel" placeholder="(555) 123-4567" {...form.register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorSpecialty" className="text-xs font-500 text-muted-foreground">Specialty</Label>
              <select
                id="vendorSpecialty"
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...form.register('specialty')}
              >
                <option value="">Select...</option>
                {SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {form.formState.errors.specialty && <p className="text-sm text-destructive">{form.formState.errors.specialty.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorNotes" className="text-xs font-500 text-muted-foreground">Notes (optional)</Label>
              <Input id="vendorNotes" className="h-11" placeholder="Preferred hours, rates..." {...form.register('notes')} />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Adding...' : 'Add Vendor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Delete Vendor?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This vendor will be removed from your list.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => showDelete && handleDelete(showDelete)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
