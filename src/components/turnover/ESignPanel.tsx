import { useState, useRef } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, FileText, RotateCcw } from 'lucide-react';

interface Props {
  turnoverId: string;
  role: 'landlord' | 'tenant';
  existingSignature?: { name: string; signedAt: Date } | null;
  onSigned?: () => void;
}

export function ESignPanel({ turnoverId, role, existingSignature, onSigned }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saving, setSaving] = useState(false);

  if (existingSignature) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <p className="text-sm font-medium">
              Signed by {existingSignature.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {existingSignature.signedAt.toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasDrawn(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1B4965';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !name.trim() || !hasDrawn) return;
    setSaving(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      await addDoc(collection(db, 'turnovers', turnoverId, 'signatures'), {
        role,
        name: name.trim(),
        signatureDataUrl: dataUrl,
        signedAt: serverTimestamp(),
      });
      onSigned?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" /> {role === 'landlord' ? 'Landlord' : 'Tenant'} Signature
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full legal name"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label>Signature</Label>
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" /> Clear
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={300}
            height={120}
            className="w-full rounded-lg border bg-white touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
        <Button
          className="w-full"
          onClick={handleSign}
          disabled={saving || !name.trim() || !hasDrawn}
        >
          {saving ? 'Signing...' : 'Sign Report'}
        </Button>
        <p className="text-xs text-muted-foreground">
          By signing, you confirm this inspection report is accurate to the best of your knowledge.
        </p>
      </CardContent>
    </Card>
  );
}
