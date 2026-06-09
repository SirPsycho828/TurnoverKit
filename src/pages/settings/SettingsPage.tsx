import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { US_STATES } from '@/config/us-states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, MapPin, Info, LifeBuoy } from 'lucide-react';

export function SettingsPage() {
  const { user, profile } = useAuthContext();
  const [state, setState] = useState(profile?.state ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        state,
        updatedAt: serverTimestamp(),
      });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const emailInitial = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl font-700 tracking-tight">Settings</h2>

      {/* User Profile Header */}
      <Card className="border-border/60">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-heading text-lg font-700">
            {emailInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-600 truncate">{user?.displayName || 'Account'}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-muted-foreground" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="state" className="text-xs font-500 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                Default State
              </span>
            </Label>
            <select
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select...</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">Used as the default state when adding new properties.</p>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-muted-foreground" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            TurnoverKit helps independent landlords manage rental turnovers with confidence.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Version 1.0.0</p>
        </CardContent>
      </Card>

      {/* Help */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LifeBuoy className="h-4 w-4 text-muted-foreground" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Contact support at support@turnoverkit.com
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
