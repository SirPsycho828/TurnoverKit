import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Camera } from 'lucide-react';
import type { MoveInPhoto, RoomPhoto } from '@/types';

interface Props {
  moveInPhotos: MoveInPhoto[];
  inspectionPhotos: { roomName: string; photos: RoomPhoto[] }[];
}

export function PhotoComparison({ moveInPhotos, inspectionPhotos }: Props) {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const allRooms = new Set([
    ...moveInPhotos.map((p) => p.roomName),
    ...inspectionPhotos.map((p) => p.roomName),
  ]);

  const roomList = Array.from(allRooms);

  if (roomList.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-8">
          <Camera className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No photos available for comparison. Add move-in photos to your property and complete an inspection.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeRoom = selectedRoom ?? roomList[0];
  const moveIn = moveInPhotos.find((p) => p.roomName === activeRoom);
  const inspection = inspectionPhotos.find((p) => p.roomName === activeRoom);

  return (
    <div className="space-y-3">
      {/* Room selector */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {roomList.map((room) => (
          <button
            key={room}
            onClick={() => setSelectedRoom(room)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors ${
              activeRoom === room
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {room}
          </button>
        ))}
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-2 text-center text-xs font-medium text-muted-foreground">Move-In</p>
          {moveIn && moveIn.photoUrls.length > 0 ? (
            <div className="space-y-2">
              {moveIn.photoUrls.map((url, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-lg border">
                  <img src={url} alt={`Move-in ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-lg border bg-muted">
              <p className="text-xs text-muted-foreground">No photos</p>
            </div>
          )}
        </div>
        <div>
          <p className="mb-2 text-center text-xs font-medium text-muted-foreground">Move-Out</p>
          {inspection && inspection.photos.length > 0 ? (
            <div className="space-y-2">
              {inspection.photos.map((photo, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-lg border">
                  <img
                    src={photo.url || photo.thumbnailUrl}
                    alt={`Inspection ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-lg border bg-muted">
              <p className="text-xs text-muted-foreground">No photos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
