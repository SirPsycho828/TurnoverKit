import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, deleteDoc, updateDoc, collection, query, where, serverTimestamp, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { uploadPhoto } from '@/lib/photo-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, MapPin, DoorOpen, DollarSign, Camera, Trash2, Plus, Loader2, RotateCcw } from 'lucide-react';
import { formatCents } from '@/lib/currency';
import { NextStepCard } from '@/components/ux/NextStepCard';
import type { Property, Turnover, MoveInPhoto, WithId } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  notice_received: 'Notice Received',
  inspection_scheduled: 'Inspection Scheduled',
  inspection_complete: 'Inspection Complete',
  deductions_drafted: 'Deductions Drafted',
  tenant_review: 'Tenant Review',
  finalized: 'Finalized',
  archived: 'Archived',
};

const STATUS_DOTS: Record<string, string> = {
  notice_received: 'bg-amber-400',
  inspection_scheduled: 'bg-amber-400',
  inspection_complete: 'bg-amber-400',
  deductions_drafted: 'bg-amber-400',
  tenant_review: 'bg-amber-400',
  finalized: 'bg-emerald',
  archived: 'bg-muted-foreground/40',
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
  const [uploadingRoom, setUploadingRoom] = useState<string | null>(null);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeRoomRef = useRef<string | null>(null);

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

  const handleAddPhotos = (roomName: string) => {
    activeRoomRef.current = roomName;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const roomName = activeRoomRef.current;
    if (!id || !roomName || !e.target.files || e.target.files.length === 0) return;

    setUploadingRoom(roomName);
    try {
      const files = Array.from(e.target.files);
      const urls: string[] = [];

      for (const file of files) {
        const timestamp = Date.now();
        const safeName = roomName.replace(/\s+/g, '-').toLowerCase();
        const path = `properties/${id}/move-in/${safeName}/${timestamp}.jpg`;
        const result = await uploadPhoto(file, path);
        urls.push(result.url);
      }

      // Check if this room already has move-in photos
      const existing = property?.moveInPhotos.find((p) => p.roomName === roomName);
      if (existing) {
        // Update existing entry by replacing the array
        const updatedPhotos = property!.moveInPhotos.map((p) =>
          p.roomName === roomName
            ? { ...p, photoUrls: [...p.photoUrls, ...urls] }
            : p,
        );
        await updateDoc(doc(db, 'properties', id), {
          moveInPhotos: updatedPhotos,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Add new room entry
        const newEntry: MoveInPhoto = {
          roomName,
          photoUrls: urls,
          uploadedAt: Timestamp.now(),
        };
        await updateDoc(doc(db, 'properties', id), {
          moveInPhotos: arrayUnion(newEntry),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('[MoveIn] upload error:', err);
    } finally {
      setUploadingRoom(null);
      e.target.value = '';
    }
  };

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
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
          <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-20 w-full animate-pulse rounded-xl bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-xl bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-xl bg-muted" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-muted" />
        <div className="flex gap-3">
          <div className="h-11 flex-1 animate-pulse rounded-lg bg-muted" />
          <div className="h-11 flex-1 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (!property) {
    return <p className="text-center text-muted-foreground">Property not found.</p>;
  }

  const getPhotosForRoom = (roomName: string) =>
    property.moveInPhotos.find((p) => p.roomName === roomName)?.photoUrls ?? [];

  return (
    <div className="space-y-4">
      {/* Hidden file input for move-in photos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 truncate font-heading text-xl font-700 tracking-tight">{property.name}</h2>
      </div>

      {/* Address */}
      <Card className="border-border/60">
        <CardContent className="flex items-start gap-3 py-4">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald" />
          <div>
            <p className="font-medium">{property.address.street}</p>
            <p className="text-sm text-muted-foreground">
              {property.address.city}, {property.address.state} {property.address.zip}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rooms */}
      <Card className="border-border/60">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <DoorOpen className="h-4 w-4 text-emerald" /> Rooms
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
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-emerald" /> Deposit
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
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4 text-emerald" /> Move-In Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {property.rooms.map((roomName) => {
            const roomPhotos = getPhotosForRoom(roomName);
            const isExpanded = expandedRoom === roomName;
            const isUploading = uploadingRoom === roomName;

            return (
              <div key={roomName} className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <button
                    className="flex items-center gap-2 text-sm font-medium"
                    onClick={() => setExpandedRoom(isExpanded ? null : roomName)}
                  >
                    {roomName}
                    {roomPhotos.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{roomPhotos.length}</Badge>
                    )}
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAddPhotos(roomName)}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <><Plus className="mr-1 h-3 w-3" /> Add</>
                    )}
                  </Button>
                </div>

                {isExpanded && roomPhotos.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {roomPhotos.map((url, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
                        <img src={url} alt={`${roomName} ${i + 1}`} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && roomPhotos.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">No photos yet</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Turnovers */}
      {turnovers.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Turnovers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {turnovers.map((t) => (
              <div
                key={t.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/50"
                onClick={() => navigate(`/turnovers/${t.id}`)}
              >
                <div>
                  <p className="text-sm font-medium">{t.tenantName}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOTS[t.status] ?? 'bg-muted-foreground/40'}`} />
                    <p className="text-xs text-muted-foreground">{STATUS_LABELS[t.status] ?? t.status}</p>
                  </div>
                </div>
                <Badge variant={t.status === 'archived' ? 'outline' : 'secondary'}>
                  {STATUS_LABELS[t.status] ?? t.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Next Step — no turnovers yet */}
      {turnovers.length === 0 && (
        <NextStepCard
          icon={RotateCcw}
          title="Ready to start a turnover?"
          description="Begin tracking the move-out process for this property."
          to={`/turnovers/new?propertyId=${id}`}
          actionLabel="Start"
        />
      )}

      {/* Actions */}
      <div className="space-y-3 pb-4">
        <Button
          className="h-11 w-full font-600"
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
          className="h-11 w-full border-destructive/30 font-600 text-destructive hover:bg-destructive/5"
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
