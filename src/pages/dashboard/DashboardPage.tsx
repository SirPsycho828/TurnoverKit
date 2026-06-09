import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Home, Building2, RotateCcw, Camera, DollarSign } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { NextStepCard } from '@/components/ux/NextStepCard';
import type { Property, Turnover, WithId } from '@/types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<WithId<Property>[]>([]);
  const [turnovers, setTurnovers] = useState<WithId<Turnover>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const propsQuery = query(
      collection(db, 'properties'),
      where('landlordId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );

    const turnoversQuery = query(
      collection(db, 'turnovers'),
      where('landlordId', '==', user.uid),
    );

    const unsubProps = onSnapshot(propsQuery, (snap) => {
      setProperties(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<Property>)),
      );
      setLoading(false);
    });

    const unsubTurnovers = onSnapshot(turnoversQuery, (snap) => {
      setTurnovers(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<Turnover>)),
      );
    });

    return () => {
      unsubProps();
      unsubTurnovers();
    };
  }, [user]);

  // Fire deadline notifications for active turnovers
  useNotifications(turnovers);

  const getActiveTurnoverCount = (propertyId: string) =>
    turnovers.filter(
      (t) => t.propertyId === propertyId && t.status !== 'archived',
    ).length;

  const activeTurnovers = turnovers.filter((t) => t.status !== 'archived');
  const totalActiveTurnovers = activeTurnovers.length;

  const needsInspection = activeTurnovers.filter(
    (t) => t.status === 'notice_received' || t.status === 'inspection_scheduled',
  ).length;
  const needsDeductions = activeTurnovers.filter(
    (t) => t.status === 'inspection_complete',
  ).length;
  const inReview = activeTurnovers.filter(
    (t) => t.status === 'tenant_review' || t.status === 'deductions_drafted',
  ).length;

  // Find the most urgent turnover for the next-step prompt
  const urgentTurnover = activeTurnovers.find(
    (t) => t.status === 'notice_received' || t.status === 'inspection_scheduled',
  ) ?? activeTurnovers.find(
    (t) => t.status === 'inspection_complete',
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  const displayName = user?.displayName?.split(' ')[0] || 'there';

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground">
          {getGreeting()}, {displayName}
        </p>
        <h2 className="font-heading text-xl font-700 tracking-tight">Properties</h2>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/5">
              <Building2 className="h-4.5 w-4.5 text-foreground" />
            </div>
            <div>
              <p className="text-xs font-500 text-muted-foreground">Properties</p>
              <p className="font-heading text-lg font-700 tracking-tight">
                {properties.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald/8">
              <RotateCcw className="h-4.5 w-4.5 text-emerald" />
            </div>
            <div>
              <p className="text-xs font-500 text-muted-foreground">Active Turnovers</p>
              <p className="font-heading text-lg font-700 tracking-tight">
                {totalActiveTurnovers}
              </p>
              {totalActiveTurnovers > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {[
                    needsInspection > 0 && `${needsInspection} need inspection`,
                    needsDeductions > 0 && `${needsDeductions} need deductions`,
                    inReview > 0 && `${inReview} in review`,
                  ].filter(Boolean).join(', ') || 'All on track'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Step — workflow guidance */}
      {properties.length > 0 && totalActiveTurnovers === 0 && (
        <NextStepCard
          icon={RotateCcw}
          title="No active turnovers"
          description="When a tenant gives notice, start a turnover from any property."
          to="/properties/new"
          actionLabel="Add Property"
        />
      )}
      {urgentTurnover && (urgentTurnover.status === 'notice_received' || urgentTurnover.status === 'inspection_scheduled') && (
        <NextStepCard
          icon={Camera}
          title={`Inspect: ${urgentTurnover.tenantName}`}
          description="Walk the unit and document each room's condition."
          to={`/turnovers/${urgentTurnover.id}/inspect`}
          actionLabel="Inspect"
        />
      )}
      {urgentTurnover && urgentTurnover.status === 'inspection_complete' && (
        <NextStepCard
          icon={DollarSign}
          title={`Deductions: ${urgentTurnover.tenantName}`}
          description="Itemize any charges for damage beyond normal wear and tear."
          to={`/turnovers/${urgentTurnover.id}/deductions`}
          actionLabel="Add"
        />
      )}

      {/* Property List Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-500 text-muted-foreground uppercase tracking-wide">
          All Properties
        </p>
        <Button size="sm" onClick={() => navigate('/properties/new')}>
          <Plus className="mr-1 h-4 w-4" />
          Add Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No properties yet"
          description="Add your first property to start tracking turnovers."
          actionLabel="Add Property"
          onAction={() => navigate('/properties/new')}
        />
      ) : (
        <div className="space-y-3">
          {properties.map((property) => {
            const activeCount = getActiveTurnoverCount(property.id);
            return (
              <Card
                key={property.id}
                className={`cursor-pointer border-border/60 transition-colors hover:bg-muted/50 active:scale-[0.99]${
                  activeCount > 0 ? ' border-l-2 border-l-emerald' : ''
                }`}
                onClick={() => navigate(`/properties/${property.id}`)}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-heading font-600">{property.name}</h3>
                    <p className="truncate text-sm text-muted-foreground">
                      {property.address.street}, {property.address.city},{' '}
                      {property.address.state}
                    </p>
                  </div>
                  {activeCount > 0 && (
                    <span className="ml-2 shrink-0 rounded-full bg-emerald/10 px-2.5 py-0.5 text-xs font-600 text-emerald">
                      {activeCount} active
                    </span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
