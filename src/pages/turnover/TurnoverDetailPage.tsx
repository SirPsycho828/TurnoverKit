import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { differenceInDays, differenceInBusinessDays, format, isPast } from 'date-fns';
import { formatCents } from '@/lib/currency';
import { MILESTONE_TEMPLATES, type Milestone } from '@/lib/timeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ArrowLeft,
  Calendar,
  Shield,
  CheckCircle2,
  Circle,
  Clock,
  Camera,
  DollarSign,
  FileText,
  Send,
  Wrench,
  RotateCcw,
  ClipboardCheck,
  Link2,
  Archive,
  AlertCircle,
} from 'lucide-react';
import { PhotoComparison } from '@/components/turnover/PhotoComparison';
import { ESignPanel } from '@/components/turnover/ESignPanel';
import { DisputeList } from '@/components/turnover/DisputeList';
import { RefundPanel } from '@/components/turnover/RefundPanel';
import type { Turnover, Room, Deduction, Property, TenantResponse, Signature, WithId, TurnoverStatus } from '@/types';

const STATUS_LABELS: Record<TurnoverStatus, string> = {
  notice_received: 'Notice Received',
  inspection_scheduled: 'Inspection Scheduled',
  inspection_complete: 'Inspection Complete',
  deductions_drafted: 'Deductions Drafted',
  tenant_review: 'Tenant Review',
  finalized: 'Finalized',
  archived: 'Archived',
};

const STATUS_ORDER: TurnoverStatus[] = [
  'notice_received',
  'inspection_scheduled',
  'inspection_complete',
  'deductions_drafted',
  'tenant_review',
  'finalized',
  'archived',
];

const MILESTONE_ICONS: Record<string, React.ElementType> = {
  send_acknowledgment: Send,
  share_portal: Link2,
  schedule_inspection: Calendar,
  conduct_inspection: Camera,
  document_condition: ClipboardCheck,
  compare_photos: Camera,
  draft_deductions: DollarSign,
  sign_report: FileText,
  send_itemization: Send,
  dispatch_vendors: Wrench,
  return_deposit: RotateCcw,
  relist_ready: CheckCircle2,
};

export function TurnoverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [turnover, setTurnover] = useState<WithId<Turnover> | null>(null);
  const [property, setProperty] = useState<WithId<Property> | null>(null);
  const [rooms, setRooms] = useState<WithId<Room>[]>([]);
  const [deductions, setDeductions] = useState<WithId<Deduction>[]>([]);
  const [disputes, setDisputes] = useState<WithId<TenantResponse>[]>([]);
  const [signatures, setSignatures] = useState<WithId<Signature>[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchive, setShowArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Load turnover + subcollections
  useEffect(() => {
    if (!id || !user) return;

    const unsubTurnover = onSnapshot(doc(db, 'turnovers', id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as WithId<Turnover>;
        setTurnover(data);
        rebuildMilestones(data);

        // Load property for photo comparison
        if (!property) {
          getDoc(doc(db, 'properties', data.propertyId)).then((pSnap) => {
            if (pSnap.exists()) {
              setProperty({ id: pSnap.id, ...pSnap.data() } as WithId<Property>);
            }
          });
        }
      }
      setLoading(false);
    });

    getDocs(query(collection(db, 'turnovers', id, 'rooms'))).then((snap) => {
      const r = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as WithId<Room>))
        .sort((a, b) => a.order - b.order);
      setRooms(r);
    });

    const unsubDeductions = onSnapshot(
      collection(db, 'turnovers', id, 'deductions'),
      (snap) => {
        setDeductions(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<Deduction>)),
        );
      },
    );

    const unsubDisputes = onSnapshot(
      collection(db, 'turnovers', id, 'tenantResponses'),
      (snap) => {
        setDisputes(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<TenantResponse>)),
        );
      },
    );

    const unsubSignatures = onSnapshot(
      collection(db, 'turnovers', id, 'signatures'),
      (snap) => {
        setSignatures(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<Signature>)),
        );
      },
    );

    return () => {
      unsubTurnover();
      unsubDeductions();
      unsubDisputes();
      unsubSignatures();
    };
  }, [id, user]);

  function rebuildMilestones(t: WithId<Turnover>) {
    const moveOut = t.moveOutDate.toDate();
    const depositDue = t.depositDueDate.toDate();
    const totalDeposit = t.depositAmount + t.petDeposit;

    const ms = MILESTONE_TEMPLATES
      .filter((tmpl) => !tmpl.requiresDeposit || totalDeposit > 0)
      .map((tmpl) => ({
        key: tmpl.key,
        title: tmpl.title,
        order: tmpl.order,
        targetDate: tmpl.dateLogic(moveOut, depositDue, t.stateRules),
        completed: false,
        completedAt: null,
        linksTo: tmpl.linksTo,
      }));

    // Mark milestones completed based on turnover status
    const statusIdx = STATUS_ORDER.indexOf(t.status);
    if (statusIdx >= 3) {
      // inspection_complete or later => conduct_inspection, document_condition done
      markCompleted(ms, 'conduct_inspection');
      markCompleted(ms, 'document_condition');
    }
    if (statusIdx >= 1) {
      markCompleted(ms, 'schedule_inspection');
    }
    if (t.inspectionComplete) {
      markCompleted(ms, 'conduct_inspection');
      markCompleted(ms, 'document_condition');
    }
    if (statusIdx >= 4) {
      markCompleted(ms, 'draft_deductions');
      markCompleted(ms, 'sign_report');
    }
    if (statusIdx >= 5) {
      markCompleted(ms, 'send_itemization');
      markCompleted(ms, 'return_deposit');
    }
    if (t.relistReady) {
      markCompleted(ms, 'relist_ready');
    }

    setMilestones(ms);
  }

  function markCompleted(ms: Milestone[], key: string) {
    const m = ms.find((x) => x.key === key);
    if (m) m.completed = true;
  }

  const handleToggleMilestone = async (key: string) => {
    if (!turnover) return;
    setMilestones((prev) =>
      prev.map((m) =>
        m.key === key ? { ...m, completed: !m.completed, completedAt: m.completed ? null : new Date() } : m,
      ),
    );
  };

  const handleStatusAdvance = async (newStatus: TurnoverStatus) => {
    if (!id) return;
    const updates: Record<string, unknown> = {
      status: newStatus,
      updatedAt: serverTimestamp(),
    };
    if (newStatus === 'finalized') {
      updates.finalizedAt = serverTimestamp();
    }
    await updateDoc(doc(db, 'turnovers', id), updates);
  };

  const handleArchive = async () => {
    if (!id) return;
    setArchiving(true);
    await updateDoc(doc(db, 'turnovers', id), {
      status: 'archived',
      updatedAt: serverTimestamp(),
    });
    setArchiving(false);
    setShowArchive(false);
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!turnover) {
    return <p className="text-center text-muted-foreground">Turnover not found.</p>;
  }

  const moveOut = turnover.moveOutDate.toDate();
  const depositDue = turnover.depositDueDate.toDate();
  const now = new Date();
  const daysUntilMoveOut = differenceInDays(moveOut, now);
  const daysUntilDeposit = turnover.stateRules.deadlineType === 'business'
    ? differenceInBusinessDays(depositDue, now)
    : differenceInDays(depositDue, now);
  const depositPastDue = isPast(depositDue);
  const totalDeposit = turnover.depositAmount + turnover.petDeposit;
  const completedMilestones = milestones.filter((m) => m.completed).length;
  const progressPercent = milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0;
  const statusIdx = STATUS_ORDER.indexOf(turnover.status);
  const isFinalized = turnover.status === 'finalized' || turnover.status === 'archived';
  const activeDeductions = deductions.filter((d) => !d.removed);
  const totalDeductionsCents = activeDeductions.reduce((sum, d) => sum + d.amount, 0);

  const nextStatus = statusIdx < STATUS_ORDER.length - 2
    ? STATUS_ORDER[statusIdx + 1]
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/dashboard')} className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold">{turnover.tenantName}</h2>
          <p className="text-sm text-muted-foreground">Turnover</p>
        </div>
        <Badge variant={isFinalized ? 'outline' : 'secondary'}>
          {STATUS_LABELS[turnover.status]}
        </Badge>
      </div>

      {/* Countdown Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className={daysUntilMoveOut <= 3 && daysUntilMoveOut >= 0 ? 'border-warning' : ''}>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">
              {daysUntilMoveOut < 0 ? `${Math.abs(daysUntilMoveOut)}d ago` : `${daysUntilMoveOut}d`}
            </p>
            <p className="text-xs text-muted-foreground">Move-out</p>
            <p className="text-xs text-muted-foreground">{format(moveOut, 'MMM d')}</p>
          </CardContent>
        </Card>
        <Card className={depositPastDue ? 'border-destructive' : daysUntilDeposit <= 7 ? 'border-warning' : ''}>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">
              {daysUntilDeposit < 0 ? (
                <span className="text-destructive">{Math.abs(daysUntilDeposit)}d overdue</span>
              ) : (
                `${daysUntilDeposit}d`
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Deposit due{turnover.stateRules.deadlineType === 'business' ? ' (bus.)' : ''}
            </p>
            <p className="text-xs text-muted-foreground">{format(depositDue, 'MMM d')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Legal reminder if overdue */}
      {depositPastDue && turnover.status !== 'finalized' && turnover.status !== 'archived' && (
        <div className="flex items-start gap-2 rounded-lg border-l-4 border-destructive bg-destructive/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm">
            Deposit return deadline has passed. Act immediately to avoid penalties.
          </p>
        </div>
      )}

      {/* Progress */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completedMilestones}/{milestones.length}</span>
          </div>
          <Progress value={progressPercent} className="mt-2 h-2" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList className="w-full">
          <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
          <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
          <TabsTrigger value="actions" className="flex-1">Actions</TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-2 mt-3">
          {milestones.map((m) => {
            const Icon = MILESTONE_ICONS[m.key] ?? Circle;
            const isOverdue = m.targetDate && isPast(m.targetDate) && !m.completed;
            return (
              <div
                key={m.key}
                className="flex items-start gap-3 rounded-lg border p-3"
                onClick={() => handleToggleMilestone(m.key)}
              >
                <div className="mt-0.5">
                  {m.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Icon className={`h-5 w-5 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${m.completed ? 'text-muted-foreground line-through' : 'font-medium'}`}>
                    {m.title}
                  </p>
                  {m.targetDate && (
                    <p className={`text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {isOverdue ? 'Overdue — ' : ''}Target: {format(m.targetDate, 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-3 mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-accent" /> Deposit Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Security Deposit</span>
                <span>{formatCents(turnover.depositAmount)}</span>
              </div>
              {turnover.petDeposit > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pet Deposit</span>
                  <span>{formatCents(turnover.petDeposit)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1">
                <span className="font-medium">Total Held</span>
                <span className="font-medium">{formatCents(totalDeposit)}</span>
              </div>
              {activeDeductions.length > 0 && (
                <>
                  <div className="flex justify-between text-destructive">
                    <span>Deductions</span>
                    <span>-{formatCents(totalDeductionsCents)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="font-medium">Refund Due</span>
                    <span className="font-medium text-success">
                      {formatCents(Math.max(0, totalDeposit - totalDeductionsCents))}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-accent" /> Legal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Return Deadline</span>
                <span>{turnover.stateRules.returnDeadlineDays} {turnover.stateRules.deadlineType} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itemization Required</span>
                <span>{turnover.stateRules.itemizationRequired ? 'Yes' : 'No'}</span>
              </div>
              {turnover.stateRules.inspectionNoticeDays && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inspection Notice</span>
                  <span>{turnover.stateRules.inspectionNoticeDays} days</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tenant Right to Attend</span>
                <span>{turnover.stateRules.tenantRightToAttend ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receipt Required</span>
                <span>{turnover.stateRules.receiptRequired ? 'Yes' : 'No'}</span>
              </div>
            </CardContent>
          </Card>

          {rooms.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="h-4 w-4 text-accent" /> Rooms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between rounded-lg border p-2">
                      <span className="text-sm">{room.roomName}</span>
                      <div className="flex items-center gap-2">
                        {room.condition && (
                          <Badge
                            variant={
                              room.condition === 'good'
                                ? 'secondary'
                                : room.condition === 'damaged'
                                  ? 'destructive'
                                  : 'outline'
                            }
                          >
                            {room.condition}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {room.photos.length} photos
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Photo Comparison */}
          {property && turnover.inspectionComplete && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Photo Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoComparison
                  moveInPhotos={property.moveInPhotos}
                  inspectionPhotos={rooms.map((r) => ({
                    roomName: r.roomName,
                    photos: r.photos,
                  }))}
                />
              </CardContent>
            </Card>
          )}

          {/* E-Sign */}
          {turnover.inspectionComplete && (
            <>
              <ESignPanel
                turnoverId={turnover.id}
                role="landlord"
                existingSignature={
                  signatures.find((s) => s.role === 'landlord')
                    ? {
                        name: signatures.find((s) => s.role === 'landlord')!.name,
                        signedAt: signatures.find((s) => s.role === 'landlord')!.signedAt.toDate(),
                      }
                    : null
                }
              />
            </>
          )}

          {/* Disputes */}
          <DisputeList
            turnoverId={turnover.id}
            disputes={disputes}
            deductions={deductions}
          />

          {/* Refund/Invoice */}
          {(turnover.status === 'deductions_drafted' || turnover.status === 'tenant_review' || turnover.status === 'finalized') && (
            <RefundPanel turnover={turnover} totalDeductions={totalDeductionsCents} />
          )}

          {/* Relist Checklist */}
          {turnover.relistChecklist && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Relist Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {turnover.relistChecklist.map((item, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={async () => {
                          if (!id || !turnover.relistChecklist) return;
                          const updated = turnover.relistChecklist.map((c, idx) =>
                            idx === i ? { ...c, checked: !c.checked } : c,
                          );
                          const allChecked = updated.every((c) => c.checked);
                          await updateDoc(doc(db, 'turnovers', id), {
                            relistChecklist: updated,
                            relistReady: allChecked,
                            updatedAt: serverTimestamp(),
                          });
                        }}
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
          )}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-3 mt-3">
          {turnover.status !== 'archived' && (
            <>
              <Button
                className="w-full"
                onClick={() => navigate(`/turnovers/${id}/inspect`)}
                disabled={turnover.status === 'finalized'}
              >
                <Camera className="mr-2 h-4 w-4" />
                {turnover.inspectionComplete ? 'View Inspection' : 'Start Inspection'}
              </Button>

              {totalDeposit > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/turnovers/${id}/deductions`)}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  {activeDeductions.length > 0 ? 'Edit Deductions' : 'Add Deductions'}
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const portalUrl = `${window.location.origin}/portal/${turnover.portalToken}`;
                  navigator.clipboard.writeText(portalUrl);
                }}
              >
                <Link2 className="mr-2 h-4 w-4" />
                Copy Tenant Portal Link
              </Button>

              {nextStatus && !isFinalized && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleStatusAdvance(nextStatus)}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Advance to: {STATUS_LABELS[nextStatus]}
                </Button>
              )}

              {turnover.status === 'finalized' && (
                <Button
                  variant="outline"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowArchive(true)}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Turnover
                </Button>
              )}
            </>
          )}

          {turnover.status !== 'finalized' && turnover.status !== 'archived' && (
            <Button
              variant="outline"
              className="w-full text-muted-foreground"
              onClick={() => setShowArchive(true)}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive Turnover
            </Button>
          )}
        </TabsContent>
      </Tabs>

      {/* Archive Dialog */}
      <Dialog open={showArchive} onOpenChange={setShowArchive}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive this turnover?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Archived turnovers are kept for your records but removed from the active view.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowArchive(false)}>Cancel</Button>
            <Button onClick={handleArchive} disabled={archiving}>
              {archiving ? 'Archiving...' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
