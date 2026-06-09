import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, X, GripVertical, ArrowLeft, Check } from 'lucide-react';
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

const STEP_LABELS = ['Address', 'Rooms', 'Deposit'];

export function PropertyCreatePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();
  const [step, setStep] = useState(1);
  const [rooms, setRooms] = useState<string[]>([...DEFAULT_ROOMS]);
  const [newRoom, setNewRoom] = useState('');
  const [addressData, setAddressData] = useState<z.output<typeof addressSchema> | null>(null);
  const [saving, setSaving] = useState(false);

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
      toast.success('Property created');
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
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-heading text-xl font-700 tracking-tight">Add Property</h2>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between px-2">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isCompleted = step > stepNum;
          const isActive = step === stepNum;
          return (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-600 transition-colors ${
                  isCompleted
                    ? 'bg-emerald text-white'
                    : isActive
                      ? 'bg-emerald text-white'
                      : 'border-2 border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span className={`text-xs font-500 ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step 1: Address */}
      {step === 1 && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald/10 text-xs font-700 text-emerald">1</span>
              Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="street" className="text-xs font-500 text-muted-foreground">Street Address</Label>
                <Input id="street" placeholder="123 Main St" className="h-11" {...addressForm.register('street')} />
                {addressForm.formState.errors.street && <p className="text-sm text-destructive">{addressForm.formState.errors.street.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-500 text-muted-foreground">City</Label>
                  <Input id="city" className="h-11" {...addressForm.register('city')} />
                  {addressForm.formState.errors.city && <p className="text-sm text-destructive">{addressForm.formState.errors.city.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zip" className="text-xs font-500 text-muted-foreground">ZIP</Label>
                  <Input id="zip" className="h-11" {...addressForm.register('zip')} />
                  {addressForm.formState.errors.zip && <p className="text-sm text-destructive">{addressForm.formState.errors.zip.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state" className="text-xs font-500 text-muted-foreground">State</Label>
                <select id="state" className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...addressForm.register('state')}>
                  <option value="">Select...</option>
                  {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
                {addressForm.formState.errors.state && <p className="text-sm text-destructive">{addressForm.formState.errors.state.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-500 text-muted-foreground">Property Label (optional)</Label>
                <Input id="name" placeholder="e.g., Unit B" className="h-11" {...addressForm.register('name')} />
              </div>
              <Button type="submit" className="h-11 w-full font-600">Next</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Rooms */}
      {step === 2 && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald/10 text-xs font-700 text-emerald">2</span>
              Rooms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {rooms.map((room, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                  <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                  <span className="flex-1 text-sm font-500">{room}</span>
                  {rooms.length > 1 && (
                    <button onClick={() => removeRoom(i)} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-destructive">
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
                  className="h-11"
                />
                {newRoom && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full z-10 mt-1 w-full rounded-lg border border-border/60 bg-background shadow-md">
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
              <Button variant="outline" size="icon" onClick={addRoom} className="h-11 w-11"><Plus className="h-4 w-4" /></Button>
            </div>
            <Button className="h-11 w-full font-600" onClick={() => setStep(3)}>Next</Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Deposit */}
      {step === 3 && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald/10 text-xs font-700 text-emerald">3</span>
              Deposit Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="depositAmount" className="text-xs font-500 text-muted-foreground">Security Deposit ($)</Label>
                <Input id="depositAmount" type="number" step="0.01" min="0" placeholder="1200.00" className="h-11" {...depositForm.register('depositAmount')} />
                {depositForm.formState.errors.depositAmount && <p className="text-sm text-destructive">{depositForm.formState.errors.depositAmount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="petDeposit" className="text-xs font-500 text-muted-foreground">Pet Deposit ($, optional)</Label>
                <Input id="petDeposit" type="number" step="0.01" min="0" placeholder="0.00" className="h-11" {...depositForm.register('petDeposit')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leaseStartDate" className="text-xs font-500 text-muted-foreground">Lease Start Date (optional)</Label>
                <Input id="leaseStartDate" type="date" className="h-11" {...depositForm.register('leaseStartDate')} />
                <p className="text-xs text-muted-foreground">Provides context for move-in photo timestamps</p>
              </div>
              <Button type="submit" className="h-11 w-full font-600" disabled={saving}>
                {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : 'Save Property'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
