import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, MapPin, DoorOpen, DollarSign, Camera, Trash2 } from 'lucide-react';
import { formatCents } from '@/lib/currency';
import type { Property, Turnover, WithId } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  notice_received: 'Notice Received',
  inspection_scheduled: 'Inspection Scheduled',
  inspection_complete: 'Inspection Complete',
  deductions_drafted: 'Deductions Drafted',
  tenant_review: 'Tenant Review',
  finalized: 'Finalized',
  archived: 'Archived',
};

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [property, setProperty] = useState<WithId<Property> | null>(null);
  const [turnovers, setTurnovers] = useState<WithId<Turnover>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id || !user) return;

    const unsubProp = onSnapshot(doc(db, 'properties', id), (snap) => {
      if (snap.exists()) {
        setProperty({ id: snap.id, ...snap.data() } as WithId<Property>);
      }
      setLoading(false);
    });

    const tQuery = query(
      collection(db, 'turnovers'),
      where('propertyId', '==', id),
      where('landlordId', '==', user.uid),
    );
    const unsubTurnovers = onSnapshot(tQuery, (snap) => {
      setTurnovers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<Turnover>)));
    });

    return () => { unsubProp(); unsubTurnovers(); };
  }, [id, user]);

  const activeTurnovers = turnovers.filter((t) => t.status !== 'archived');
  const hasActiveTurnover = activeTurnovers.length > 0;

  const handleDelete = async () => {
    if (!id || hasActiveTurnover) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'properties', id));
      navigate('/dashboard');
    } catch {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!property) {
    return <p className="text-center text-muted-foreground">Property not found.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/dashboard')} className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 truncate text-xl font-semibold">{property.name}</h2>
      </div>

      {/* Address */}
      <Card>
        <CardContent className="flex items-start gap-3 py-4">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="font-medium">{property.address.street}</p>
            <p className="text-sm text-muted-foreground">
              {property.address.city}, {property.address.state} {property.address.zip}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rooms */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <DoorOpen className="h-4 w-4 text-accent" /> Rooms
          </CardTitle>
          <Badge variant="secondary">{property.rooms.length}</Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {property.rooms.map((room) => (
              <Badge key={room} variant="outline">{room}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deposit */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-accent" /> Deposit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Security Deposit</span>
            <span className="font-medium">{formatCents(property.leaseDepositAmount)}</span>
          </div>
          {property.petDeposit > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pet Deposit</span>
              <span className="font-medium">{formatCents(property.petDeposit)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Move-in Photos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4 text-accent" /> Move-In Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {property.moveInPhotos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No move-in photos yet. Add them for better comparison during inspections.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {property.moveInPhotos.reduce((sum, r) => sum + r.photoUrls.length, 0)} photos across {property.moveInPhotos.length} rooms
            </p>
          )}
        </CardContent>
      </Card>

      {/* Turnovers */}
      {turnovers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Turnovers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {turnovers.map((t) => (
              <div
                key={t.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                onClick={() => navigate(`/turnovers/${t.id}`)}
              >
                <div>
                  <p className="text-sm font-medium">{t.tenantName}</p>
                  <p className="text-xs text-muted-foreground">{STATUS_LABELS[t.status] ?? t.status}</p>
                </div>
                <Badge variant={t.status === 'archived' ? 'outline' : 'secondary'}>
                  {STATUS_LABELS[t.status] ?? t.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-3 pb-4">
        <Button
          className="w-full"
          disabled={hasActiveTurnover}
          onClick={() => navigate(`/turnovers/new?propertyId=${id}`)}
        >
          Start Turnover
        </Button>
        {hasActiveTurnover && (
          <p className="text-center text-xs text-muted-foreground">
            Finish the current turnover first
          </p>
        )}
        <Button
          variant="outline"
          className="w-full text-destructive hover:bg-destructive/10"
          disabled={hasActiveTurnover}
          onClick={() => setShowDelete(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete Property
        </Button>
        {hasActiveTurnover && (
          <p className="text-center text-xs text-muted-foreground">
            Archive or delete active turnovers first
          </p>
        )}
      </div>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {property.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This removes all move-in photos. Archived turnovers will remain in your records.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
