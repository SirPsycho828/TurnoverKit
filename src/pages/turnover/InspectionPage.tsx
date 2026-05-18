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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
} from 'lucide-react';
import type { Turnover, Room, RoomCondition, WithId } from '@/types';

const CONDITIONS: { value: RoomCondition; label: string; color: string }[] = [
  { value: 'good', label: 'Good', color: 'bg-success/20 text-success' },
  { value: 'fair', label: 'Fair', color: 'bg-warning/20 text-warning' },
  { value: 'poor', label: 'Poor', color: 'bg-orange-500/20 text-orange-600' },
  { value: 'damaged', label: 'Damaged', color: 'bg-destructive/20 text-destructive' },
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

export function InspectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [turnover, setTurnover] = useState<WithId<Turnover> | null>(null);
  const [rooms, setRooms] = useState<WithId<Room>[]>([]);
  const [currentRoom, setCurrentRoom] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<Map<string, string[]>>(new Map());
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
          // Initialize checklist if empty
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
    const newPhotos: string[] = [];
    for (const file of Array.from(e.target.files)) {
      newPhotos.push(URL.createObjectURL(file));
    }
    setPhotos((prev) => {
      const existing = prev.get(room.id) ?? [];
      return new Map(prev).set(room.id, [...existing, ...newPhotos]);
    });
  };

  const removePhoto = (roomId: string, index: number) => {
    setPhotos((prev) => {
      const existing = prev.get(roomId) ?? [];
      const updated = existing.filter((_, i) => i !== index);
      return new Map(prev).set(roomId, updated);
    });
  };

  const handleSaveAll = async () => {
    if (!id) return;
    setSaving(true);
    try {
      for (const r of rooms) {
        await updateDoc(doc(db, 'turnovers', id, 'rooms', r.id), {
          condition: r.condition ?? null,
          notes: r.notes,
          checklistItems: r.checklistItems,
        });
      }
      // Mark inspection as complete
      await updateDoc(doc(db, 'turnovers', id), {
        inspectionComplete: true,
        status: 'inspection_complete',
        updatedAt: serverTimestamp(),
      });
      navigate(`/turnovers/${id}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (!turnover || rooms.length === 0) {
    return <p className="text-center text-muted-foreground">No rooms found.</p>;
  }

  const completedRooms = rooms.filter((r) => r.condition).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(`/turnovers/${id}`)} className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">Inspection</h2>
          <p className="text-sm text-muted-foreground">
            {completedRooms}/{rooms.length} rooms assessed
          </p>
        </div>
        <Button size="sm" onClick={handleSaveAll} disabled={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Room navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentRoom(Math.max(0, currentRoom - 1))}
          disabled={currentRoom === 0}
          className="rounded-lg p-2 hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-medium">{room.roomName}</p>
          <p className="text-xs text-muted-foreground">
            Room {currentRoom + 1} of {rooms.length}
          </p>
        </div>
        <button
          onClick={() => setCurrentRoom(Math.min(rooms.length - 1, currentRoom + 1))}
          disabled={currentRoom === rooms.length - 1}
          className="rounded-lg p-2 hover:bg-muted disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Room tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {rooms.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setCurrentRoom(i)}
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs transition-colors ${
              i === currentRoom
                ? 'bg-primary text-primary-foreground'
                : r.condition
                  ? 'bg-success/20 text-success'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {r.condition && <CheckCircle2 className="h-3 w-3" />}
            {r.roomName}
          </button>
        ))}
      </div>

      {/* Condition selector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overall Condition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => handleCondition(c.value)}
                className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                  room.condition === c.value
                    ? `border-current ${c.color}`
                    : 'border-transparent bg-muted text-muted-foreground'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {room.checklistItems.map((item, i) => (
              <label key={i} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => handleChecklistToggle(i)}
                  className="h-4 w-4 rounded border-input accent-primary"
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" /> Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            {(photos.get(room.id) ?? []).map((url, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
                <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  onClick={() => removePhoto(room.id, i)}
                  className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Camera className="h-6 w-6" />
            </button>
          </div>
          {room.photos.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {room.photos.length} saved photos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={room.notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Additional notes about this room..."
            className="min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex gap-3 pb-4">
        {currentRoom < rooms.length - 1 ? (
          <Button className="flex-1" onClick={() => setCurrentRoom(currentRoom + 1)}>
            Next Room: {rooms[currentRoom + 1].roomName}
          </Button>
        ) : (
          <Button className="flex-1" onClick={handleSaveAll} disabled={saving}>
            {saving ? 'Saving...' : 'Complete Inspection'}
          </Button>
        )}
      </div>
    </div>
  );
}
