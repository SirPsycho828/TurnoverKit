import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, X, GripVertical, ArrowLeft } from 'lucide-react';
import { DEFAULT_ROOMS, ROOM_SUGGESTIONS } from '@/config/room-defaults';
import { US_STATES } from '@/config/us-states';
import { dollarsToCents } from '@/lib/currency';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'Select a state'),
  zip: z.string().min(5, 'Enter a valid ZIP code'),
  name: z.string().optional(),
});

const depositSchema = z.object({
  depositAmount: z.string().min(1, 'Enter a deposit amount').transform((val, ctx) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid amount' });
      return z.NEVER;
    }
    return num;
  }),
  petDeposit: z.string().optional().transform((val) => {
    if (!val) return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  }),
  leaseStartDate: z.string().optional(),
});

type AddressInput = z.input<typeof addressSchema>;
type DepositInput = z.input<typeof depositSchema>;

export function PropertyCreatePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();
  const [step, setStep] = useState(1);
  const [rooms, setRooms] = useState<string[]>([...DEFAULT_ROOMS]);
  const [newRoom, setNewRoom] = useState('');
  const [addressData, setAddressData] = useState<z.output<typeof addressSchema> | null>(null);
  const [saving, setSaving] = useState(false);

  const totalSteps = 3;

  const addressForm = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: { state: profile?.state ?? '' },
  });

  const depositForm = useForm<DepositInput>({
    resolver: zodResolver(depositSchema),
  });

  const handleAddressSubmit = addressForm.handleSubmit((data) => {
    setAddressData(data);
    setStep(2);
  });

  const addRoom = () => {
    const trimmed = newRoom.trim();
    if (trimmed && !rooms.includes(trimmed)) {
      setRooms([...rooms, trimmed]);
      setNewRoom('');
    }
  };

  const removeRoom = (index: number) => {
    if (rooms.length > 1) {
      setRooms(rooms.filter((_, i) => i !== index));
    }
  };

  const handleDepositSubmit = depositForm.handleSubmit(async (data) => {
    if (!user || !addressData) return;
    setSaving(true);
    try {
      const propertyName = addressData.name || `${addressData.street}`;
      const docRef = await addDoc(collection(db, 'properties'), {
        landlordId: user.uid,
        name: propertyName,
        address: {
          street: addressData.street,
          city: addressData.city,
          state: addressData.state,
          zip: addressData.zip,
        },
        rooms,
        leaseDepositAmount: dollarsToCents(data.depositAmount),
        petDeposit: dollarsToCents(data.petDeposit),
        leaseStartDate: data.leaseStartDate || null,
        moveInPhotos: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate(`/properties/${docRef.id}`);
    } catch {
      // Firestore will queue offline
    } finally {
      setSaving(false);
    }
  });

  const filteredSuggestions = ROOM_SUGGESTIONS.filter(
    (s) => !rooms.includes(s) && s.toLowerCase().includes(newRoom.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))} className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-semibold">Add Property</h2>
      </div>

      <Progress value={(step / totalSteps) * 100} className="h-1" />
      <p className="text-xs text-muted-foreground">Step {step} of {totalSteps}</p>

      {/* Step 1: Address */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Address</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Street Address</Label>
                <Input id="street" placeholder="123 Main St" {...addressForm.register('street')} />
                {addressForm.formState.errors.street && <p className="text-sm text-destructive">{addressForm.formState.errors.street.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...addressForm.register('city')} />
                  {addressForm.formState.errors.city && <p className="text-sm text-destructive">{addressForm.formState.errors.city.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input id="zip" {...addressForm.register('zip')} />
                  {addressForm.formState.errors.zip && <p className="text-sm text-destructive">{addressForm.formState.errors.zip.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <select id="state" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...addressForm.register('state')}>
                  <option value="">Select...</option>
                  {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
                {addressForm.formState.errors.state && <p className="text-sm text-destructive">{addressForm.formState.errors.state.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Property Label (optional)</Label>
                <Input id="name" placeholder="e.g., Unit B" {...addressForm.register('name')} />
              </div>
              <Button type="submit" className="w-full">Next</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Rooms */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Rooms</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {rooms.map((room, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{room}</span>
                  {rooms.length > 1 && (
                    <button onClick={() => removeRoom(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Add a room..."
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRoom(); } }}
                />
                {newRoom && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full z-10 mt-1 w-full rounded-lg border bg-background shadow-md">
                    {filteredSuggestions.slice(0, 5).map((s) => (
                      <button
                        key={s}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => { setRooms([...rooms, s]); setNewRoom(''); }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="outline" size="icon" onClick={addRoom}><Plus className="h-4 w-4" /></Button>
            </div>
            <Button className="w-full" onClick={() => setStep(3)}>Next</Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Deposit */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Deposit Details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="depositAmount">Security Deposit ($)</Label>
                <Input id="depositAmount" type="number" step="0.01" min="0" placeholder="1200.00" {...depositForm.register('depositAmount')} />
                {depositForm.formState.errors.depositAmount && <p className="text-sm text-destructive">{depositForm.formState.errors.depositAmount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="petDeposit">Pet Deposit ($, optional)</Label>
                <Input id="petDeposit" type="number" step="0.01" min="0" placeholder="0.00" {...depositForm.register('petDeposit')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leaseStartDate">Lease Start Date (optional)</Label>
                <Input id="leaseStartDate" type="date" {...depositForm.register('leaseStartDate')} />
                <p className="text-xs text-muted-foreground">Provides context for move-in photo timestamps</p>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : 'Save Property'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
