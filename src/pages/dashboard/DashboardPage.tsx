import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Home } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import type { Property, Turnover, WithId } from '@/types';

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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Properties</h2>
        <Button size="sm" onClick={() => navigate('/properties/new')}>
          <Plus className="mr-1 h-4 w-4" />
          Add Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Home className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              No properties yet. Add your first property to get started.
            </p>
            <Button onClick={() => navigate('/properties/new')}>
              Add Your First Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {properties.map((property) => {
            const activeCount = getActiveTurnoverCount(property.id);
            return (
              <Card
                key={property.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => navigate(`/properties/${property.id}`)}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium">{property.name}</h3>
                    <p className="truncate text-sm text-muted-foreground">
                      {property.address.street}, {property.address.city},{' '}
                      {property.address.state}
                    </p>
                  </div>
                  {activeCount > 0 && (
                    <Badge variant="secondary" className="ml-2 shrink-0">
                      {activeCount} active
                    </Badge>
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
