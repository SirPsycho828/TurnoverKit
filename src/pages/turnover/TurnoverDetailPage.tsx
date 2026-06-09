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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { differenceInDays, differenceInBusinessDays, format, isPast } from 'date-fns';
import { formatCents } from '@/lib/currency';
import { MILESTONE_TEMPLATES, type Milestone } from '@/lib/timeline';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  Loader2,
  CalendarClock,
  Timer,
} from 'lucide-react';
import { toast } from 'sonner';
import { PhotoComparison } from '@/components/turnover/PhotoComparison';
import { ESignPanel } from '@/components/turnover/ESignPanel';
import { DisputeList } from '@/components/turnover/DisputeList';
import { RefundPanel } from '@/components/turnover/RefundPanel';
import { NextStepCard } from '@/components/ux/NextStepCard';
import { GuidanceTip } from '@/components/ux/GuidanceTip';
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

const STATUS_COLORS: Record<TurnoverStatus, string> = {
  notice_received: 'bg-emerald/10 text-emerald border border-emerald/20',
  inspection_scheduled: 'bg-emerald/10 text-emerald border border-emerald/20',
  inspection_complete: 'bg-emerald/10 text-emerald border border-emerald/20',
  deductions_drafted: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  tenant_review: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  finalized: 'bg-muted text-muted-foreground border border-border/60',
  archived: 'bg-muted text-muted-foreground border border-border/60',
};

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
    const milestone = milestones.find((m) => m.key === key);
    const newCompleted = !milestone?.completed;
    setMilestones((prev) =>
      prev.map((m) =>
        m.key === key ? { ...m, completed: newCompleted, completedAt: newCompleted ? new Date() : null } : m,
      ),
    );
    if (newCompleted && milestone) {
      toast.success(`${milestone.title} marked complete`);
    }
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
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5">
          <Loader2 className="h-6 w-6 animate-spin text-emerald" />
        </div>
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
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-heading text-xl font-700 tracking-tight">{turnover.tenantName}</h2>
          <p className="text-xs text-muted-foreground">Turnover</p>
        </div>
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-600', STATUS_COLORS[turnover.status])}>
          {STATUS_LABELS[turnover.status]}
        </span>
      </div>

      {/* Countdown Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className={cn(
          'border-border/60',
          daysUntilMoveOut <= 3 && daysUntilMoveOut >= 0 && 'border-amber-500/40',
        )}>
          <CardContent className="py-4 text-center">
            <div className="mb-1.5 flex justify-center">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="font-heading text-2xl font-800 tabular-nums">
              {daysUntilMoveOut < 0 ? `${Math.abs(daysUntilMoveOut)}d ago` : `${daysUntilMoveOut}d`}
            </p>
            <p className="mt-0.5 text-xs font-500 text-muted-foreground">Move-out</p>
            <p className="text-xs text-muted-foreground">{format(moveOut, 'MMM d')}</p>
          </CardContent>
        </Card>
        <Card className={cn(
          'border-border/60',
          depositPastDue ? 'border-destructive/40' : daysUntilDeposit <= 7 && 'border-amber-500/40',
        )}>
          <CardContent className="py-4 text-center">
            <div className="mb-1.5 flex justify-center">
              <Timer className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="font-heading text-2xl font-800 tabular-nums">
              {daysUntilDeposit < 0 ? (
                <span className="text-destructive">{Math.abs(daysUntilDeposit)}d overdue</span>
              ) : (
                `${daysUntilDeposit}d`
              )}
            </p>
            <p className="mt-0.5 text-xs font-500 text-muted-foreground">
              Deposit due{turnover.stateRules.deadlineType === 'business' ? ' (bus.)' : ''}
            </p>
            <p className="text-xs text-muted-foreground">{format(depositDue, 'MMM d')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Legal reminder if overdue */}
      {depositPastDue && turnover.status !== 'finalized' && turnover.status !== 'archived' && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm">
            Deposit return deadline has passed. Act immediately to avoid penalties.
          </p>
        </div>
      )}

      {/* Progress */}
      <Card className="border-border/60">
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-xs font-500 text-muted-foreground">Progress</span>
            <span className="font-heading text-sm font-600 tabular-nums">{completedMilestones}/{milestones.length}</span>
          </div>
          <Progress value={progressPercent} className="mt-2 h-2 [&>div]:bg-emerald" />
        </CardContent>
      </Card>

      {/* Next Step — status-aware prompt */}
      {turnover.status === 'notice_received' && !turnover.inspectionComplete && (
        <NextStepCard
          icon={Camera}
          title="Start the inspection"
          description="Walk the unit and document each room's condition."
          to={`/turnovers/${id}/inspect`}
          actionLabel="Inspect"
        />
      )}
      {turnover.status === 'inspection_scheduled' && !turnover.inspectionComplete && (
        <NextStepCard
          icon={Camera}
          title="Conduct the inspection"
          description="Photograph and rate each room before the move-out date."
          to={`/turnovers/${id}/inspect`}
          actionLabel="Inspect"
        />
      )}
      {(turnover.status === 'inspection_complete' || (turnover.inspectionComplete && statusIdx < 4)) && activeDeductions.length === 0 && totalDeposit > 0 && (
        <NextStepCard
          icon={DollarSign}
          title="Add deductions"
          description="Itemize any charges for damage beyond normal wear and tear."
          to={`/turnovers/${id}/deductions`}
          actionLabel="Deductions"
        />
      )}
      {turnover.status === 'deductions_drafted' && (
        <NextStepCard
          icon={Link2}
          title="Share with tenant"
          description="Copy the portal link and send it to the tenant for review."
          to={`/turnovers/${id}`}
          actionLabel="Copy Link"
        />
      )}
      {turnover.status === 'finalized' && !turnover.relistReady && (
        <NextStepCard
          icon={ClipboardCheck}
          title="Complete relist checklist"
          description="Finish prep tasks to get the unit ready for the next tenant."
          to={`/turnovers/${id}`}
          actionLabel="View"
        />
      )}

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
                className={cn(
                  'flex items-start gap-3 rounded-xl border border-border/60 p-3 cursor-pointer transition-colors hover:bg-muted/50',
                  m.completed && 'border-l-[3px] border-l-emerald',
                )}
                onClick={() => handleToggleMilestone(m.key)}
              >
                <div className="mt-0.5">
                  {m.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald" />
                  ) : (
                    <Icon className={cn('h-5 w-5', isOverdue ? 'text-destructive' : 'text-muted-foreground')} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm', m.completed ? 'text-muted-foreground line-through' : 'font-medium')}>
                    {m.title}
                  </p>
                  {m.targetDate && (
                    <p className={cn('text-xs', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                      {isOverdue ? 'Overdue -- ' : ''}Target: {format(m.targetDate, 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-3 mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-emerald" /> Deposit Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Security Deposit</span>
                <span className="tabular-nums">{formatCents(turnover.depositAmount)}</span>
              </div>
              {turnover.petDeposit > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pet Deposit</span>
                  <span className="tabular-nums">{formatCents(turnover.petDeposit)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1.5">
                <span className="font-medium">Total Held</span>
                <span className="font-medium tabular-nums">{formatCents(totalDeposit)}</span>
              </div>
              {activeDeductions.length > 0 && (
                <>
                  <div className="flex justify-between text-destructive">
                    <span>Deductions</span>
                    <span className="tabular-nums">-{formatCents(totalDeductionsCents)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5">
                    <span className="font-medium">Refund Due</span>
                    <span className="font-heading font-700 tabular-nums text-emerald">
                      {formatCents(Math.max(0, totalDeposit - totalDeductionsCents))}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-emerald" /> Legal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Return Deadline</span>
                <span className="tabular-nums">{turnover.stateRules.returnDeadlineDays} {turnover.stateRules.deadlineType} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itemization Required</span>
                <span>{turnover.stateRules.itemizationRequired ? 'Yes' : 'No'}</span>
              </div>
              {turnover.stateRules.inspectionNoticeDays && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inspection Notice</span>
                  <span className="tabular-nums">{turnover.stateRules.inspectionNoticeDays} days</span>
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
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="h-4 w-4 text-emerald" /> Rooms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between rounded-lg border border-border/60 p-2.5 transition-colors hover:bg-muted/50">
                      <span className="text-sm">{room.roomName}</span>
                      <div className="flex items-center gap-2">
                        {room.condition && (
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-500',
                            room.condition === 'good' && 'bg-emerald/10 text-emerald',
                            room.condition === 'fair' && 'bg-amber-500/10 text-amber-600',
                            room.condition === 'poor' && 'bg-orange-500/10 text-orange-600',
                            room.condition === 'damaged' && 'bg-destructive/10 text-destructive',
                          )}>
                            {room.condition}
                          </span>
                        )}
                        <span className="text-xs tabular-nums text-muted-foreground">
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
            <Card className="border-border/60">
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
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Relist Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {turnover.relistChecklist.map((item, i) => (
                    <label key={i} className="flex items-center gap-2.5 text-sm">
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
          )}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-3 mt-3">
          {turnover.status !== 'archived' && (
            <>
              <Button
                className="h-11 w-full font-600"
                onClick={() => navigate(`/turnovers/${id}/inspect`)}
                disabled={turnover.status === 'finalized'}
              >
                <Camera className="mr-2 h-4 w-4" />
                {turnover.inspectionComplete ? 'View Inspection' : 'Start Inspection'}
              </Button>

              {totalDeposit > 0 && (
                <Button
                  variant="outline"
                  className="h-11 w-full font-600"
                  onClick={() => navigate(`/turnovers/${id}/deductions`)}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  {activeDeductions.length > 0 ? 'Edit Deductions' : 'Add Deductions'}
                </Button>
              )}

              <Button
                variant="outline"
                className="h-11 w-full font-600"
                onClick={() => {
                  const portalUrl = `${window.location.origin}/portal/${turnover.portalToken}`;
                  navigator.clipboard.writeText(portalUrl);
                  toast.success('Portal link copied — send it to your tenant via text or email');
                }}
              >
                <Link2 className="mr-2 h-4 w-4" />
                Copy Tenant Portal Link
              </Button>

              {nextStatus && !isFinalized && (
                <>
                  <GuidanceTip id="status-advance">
                    Advancing the status tracks your progress through the turnover lifecycle. Move forward when you've completed the current stage.
                  </GuidanceTip>
                  <Button
                    variant="outline"
                    className="h-11 w-full font-600"
                    onClick={() => handleStatusAdvance(nextStatus)}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Advance to: {STATUS_LABELS[nextStatus]}
                  </Button>
                </>
              )}

              {turnover.status === 'finalized' && (
                <Button
                  variant="outline"
                  className="h-11 w-full font-600 text-muted-foreground"
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
              className="h-11 w-full font-600 text-muted-foreground"
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
            <Button variant="outline" className="h-11 font-600" onClick={() => setShowArchive(false)}>Cancel</Button>
            <Button className="h-11 font-600" onClick={handleArchive} disabled={archiving}>
              {archiving ? 'Archiving...' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
