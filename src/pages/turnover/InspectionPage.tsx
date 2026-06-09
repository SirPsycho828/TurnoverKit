import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { uploadPhoto } from '@/lib/photo-upload';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  X,
  ShieldCheck,
  AlertTriangle,
  CircleAlert,
  ThumbsUp,
} from 'lucide-react';
import { GuidanceTip } from '@/components/ux/GuidanceTip';
import type { Turnover, Room, RoomCondition, RoomPhoto, WithId } from '@/types';

const CONDITIONS: { value: RoomCondition; label: string; color: string; activeColor: string; icon: React.ElementType }[] = [
  { value: 'good', label: 'Good', color: 'bg-muted text-muted-foreground', activeColor: 'border-emerald bg-emerald/10 text-emerald', icon: ThumbsUp },
  { value: 'fair', label: 'Fair', color: 'bg-muted text-muted-foreground', activeColor: 'border-amber-500 bg-amber-500/10 text-amber-600', icon: ShieldCheck },
  { value: 'poor', label: 'Poor', color: 'bg-muted text-muted-foreground', activeColor: 'border-orange-500 bg-orange-500/10 text-orange-600', icon: AlertTriangle },
  { value: 'damaged', label: 'Damaged', color: 'bg-muted text-muted-foreground', activeColor: 'border-destructive bg-destructive/10 text-destructive', icon: CircleAlert },
];

const DEFAULT_CHECKLIST = [
  'Walls - holes, scuffs, marks',
  'Flooring - stains, scratches, damage',
  'Ceiling - stains, damage',
  'Windows - clean, intact, locks work',
  'Doors - operate properly, no damage',
  'Light fixtures - working',
  'Outlets/switches - working',
  'Closets - clean, shelving intact',
];

interface PendingPhoto {
  file: File;
  previewUrl: string;
}

export function InspectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [turnover, setTurnover] = useState<WithId<Turnover> | null>(null);
  const [rooms, setRooms] = useState<WithId<Room>[]>([]);
  const [currentRoom, setCurrentRoom] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<Map<string, PendingPhoto[]>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const tSnap = await getDoc(doc(db, 'turnovers', id));
      if (tSnap.exists()) {
        setTurnover({ id: tSnap.id, ...tSnap.data() } as WithId<Turnover>);
      }

      const rSnap = await getDocs(query(collection(db, 'turnovers', id, 'rooms')));
      const roomList = rSnap.docs
        .map((d) => {
          const data = d.data() as Room;
          if (!data.checklistItems || data.checklistItems.length === 0) {
            data.checklistItems = DEFAULT_CHECKLIST.map((label) => ({
              label,
              checked: false,
            }));
          }
          return { id: d.id, ...data } as WithId<Room>;
        })
        .sort((a, b) => a.order - b.order);
      setRooms(roomList);
      setLoading(false);
    })();
  }, [id, user]);

  const room = rooms[currentRoom];

  const updateRoom = (roomId: string, updates: Partial<Room>) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, ...updates } : r)),
    );
  };

  const handleCondition = (condition: RoomCondition) => {
    if (!room) return;
    updateRoom(room.id, { condition });
  };

  const handleChecklistToggle = (index: number) => {
    if (!room) return;
    const updated = room.checklistItems.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item,
    );
    updateRoom(room.id, { checklistItems: updated });
  };

  const handleNotesChange = (notes: string) => {
    if (!room) return;
    updateRoom(room.id, { notes });
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!room || !e.target.files) return;
    const newPhotos: PendingPhoto[] = Array.from(e.target.files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingPhotos((prev) => {
      const existing = prev.get(room.id) ?? [];
      return new Map(prev).set(room.id, [...existing, ...newPhotos]);
    });
    e.target.value = '';
  };

  const removePendingPhoto = (roomId: string, index: number) => {
    setPendingPhotos((prev) => {
      const existing = prev.get(roomId) ?? [];
      URL.revokeObjectURL(existing[index].previewUrl);
      return new Map(prev).set(roomId, existing.filter((_, i) => i !== index));
    });
  };

  const removeSavedPhoto = (roomId: string, index: number) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? { ...r, photos: r.photos.filter((_, i) => i !== index) }
          : r,
      ),
    );
  };

  const handleSaveAll = async () => {
    if (!id) return;
    setSaving(true);
    try {
      // Upload all pending photos first
      let totalPhotos = 0;
      let uploaded = 0;
      for (const photos of pendingPhotos.values()) {
        totalPhotos += photos.length;
      }

      for (const r of rooms) {
        const pending = pendingPhotos.get(r.id) ?? [];
        const uploadedPhotos: RoomPhoto[] = [...r.photos];

        for (const p of pending) {
          uploaded++;
          setUploadProgress(`Uploading photo ${uploaded}/${totalPhotos}...`);
          const timestamp = Date.now();
          const path = `turnovers/${id}/rooms/${r.id}/${timestamp}.jpg`;
          const result = await uploadPhoto(p.file, path);
          uploadedPhotos.push({
            url: result.url,
            thumbnailUrl: result.thumbnailUrl,
            storagePath: result.storagePath,
            capturedAt: Timestamp.now(),
          });
        }

        setUploadProgress('Saving inspection data...');
        await updateDoc(doc(db, 'turnovers', id, 'rooms', r.id), {
          condition: r.condition ?? null,
          notes: r.notes,
          checklistItems: r.checklistItems,
          photos: uploadedPhotos,
        });
      }

      // Mark inspection as complete
      await updateDoc(doc(db, 'turnovers', id), {
        inspectionComplete: true,
        status: 'inspection_complete',
        updatedAt: serverTimestamp(),
      });
      navigate(`/turnovers/${id}`);
    } catch (err) {
      console.error('[Inspection] save error:', err);
      setUploadProgress('');
    } finally {
      setSaving(false);
    }
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

  if (!turnover || rooms.length === 0) {
    return <p className="text-center text-muted-foreground">No rooms found.</p>;
  }

  const completedRooms = rooms.filter((r) => r.condition).length;
  const roomPending = pendingPhotos.get(room?.id) ?? [];

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
        <div className="flex-1">
          <h2 className="font-heading text-xl font-700 tracking-tight">Inspection</h2>
          <p className="text-xs font-500 text-muted-foreground">
            {completedRooms}/{rooms.length} rooms assessed
          </p>
        </div>
        <Button className="h-9 font-600" size="sm" onClick={handleSaveAll} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Upload progress */}
      {uploadProgress && (
        <div className="rounded-xl border border-emerald/20 bg-emerald/5 p-3 text-center text-sm text-emerald">
          {uploadProgress}
        </div>
      )}

      {/* Room navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentRoom(Math.max(0, currentRoom - 1))}
          disabled={currentRoom === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-heading font-600">{room.roomName}</p>
          <p className="text-xs font-500 text-muted-foreground">
            Room {currentRoom + 1} of {rooms.length}
          </p>
        </div>
        <button
          onClick={() => setCurrentRoom(Math.min(rooms.length - 1, currentRoom + 1))}
          disabled={currentRoom === rooms.length - 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 active:scale-95"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Room tabs / pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {rooms.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setCurrentRoom(i)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-500 transition-colors',
              i === currentRoom
                ? 'bg-primary text-primary-foreground shadow-sm'
                : r.condition
                  ? 'bg-emerald/10 text-emerald border border-emerald/20'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            {r.condition && <CheckCircle2 className="h-3 w-3" />}
            {r.roomName}
          </button>
        ))}
      </div>

      {/* Condition selector */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overall Condition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {CONDITIONS.map((c) => {
              const Icon = c.icon;
              const isActive = room.condition === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => handleCondition(c.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-sm font-600 transition-colors',
                    isActive
                      ? c.activeColor
                      : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {c.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <GuidanceTip id="inspection-conditions">
        Good = normal wear and tear. Fair = minor issues. Poor = significant wear. Damaged = beyond normal use — may justify a deduction.
      </GuidanceTip>

      {/* Checklist */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {room.checklistItems.map((item, i) => (
              <label key={i} className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => handleChecklistToggle(i)}
                  className="h-[18px] w-[18px] rounded border-input accent-emerald"
                />
                <span className={item.checked ? 'text-muted-foreground line-through' : ''}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4 text-emerald" /> Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GuidanceTip id="inspection-photos">
            Photograph any damage, stains, or wear that differs from move-in condition. Close-ups help support deduction claims.
          </GuidanceTip>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handlePhotoCapture}
          />
          <div className="grid grid-cols-3 gap-2">
            {/* Previously saved photos */}
            {room.photos.map((photo, i) => (
              <div key={`saved-${i}`} className="relative aspect-square overflow-hidden rounded-xl border border-border/60">
                <img src={photo.thumbnailUrl || photo.url} alt={`Saved ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  onClick={() => removeSavedPhoto(room.id, i)}
                  className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {/* Pending (not yet uploaded) photos */}
            {roomPending.map((p, i) => (
              <div key={`pending-${i}`} className="relative aspect-square overflow-hidden rounded-xl ring-2 ring-emerald/40">
                <img src={p.previewUrl} alt={`New ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  onClick={() => removePendingPhoto(room.id, i)}
                  className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {/* Add photo button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-emerald hover:text-emerald"
            >
              <Camera className="h-5 w-5" />
              <span className="text-[10px] font-500">Add</span>
            </button>
          </div>
          {(room.photos.length > 0 || roomPending.length > 0) && (
            <p className="mt-2 text-xs text-muted-foreground">
              {room.photos.length} saved{roomPending.length > 0 ? `, ${roomPending.length} pending upload` : ''}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={room.notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Additional notes about this room..."
            className="min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex gap-3 pb-4">
        {currentRoom < rooms.length - 1 ? (
          <Button className="h-11 flex-1 font-600" onClick={() => setCurrentRoom(currentRoom + 1)}>
            Next Room: {rooms[currentRoom + 1].roomName}
          </Button>
        ) : (
          <Button className="h-11 flex-1 font-600" onClick={handleSaveAll} disabled={saving}>
            {saving ? 'Saving...' : 'Complete Inspection'}
          </Button>
        )}
      </div>
    </div>
  );
}
