// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/client-portal/useClientPortal.ts
//
// Hook principal del portal cliente.
// Centraliza fetch, estado, y refetch. El componente solo renderiza.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import type {
  ClientPortalState,
  ClientPortalResponse,
  PortalDeliverable,
  PortalAppointment,
  PortalActivity,
  PortalClient,
} from '@/lib/client-portal/types';
import type { Milestone } from '@/lib/types';

interface UseClientPortalOptions {
  /** Para managers que previewean el portal de un cliente específico */
  previewClientId?: string;
  isManager?: boolean;
}

export function useClientPortal({
  previewClientId,
  isManager = false,
}: UseClientPortalOptions = {}): ClientPortalState {
  const [client,       setClient]       = useState<PortalClient | null>(null);
  const [clientUserId, setClientUserId] = useState<string | null>(null);
  const [deliverables, setDeliverables] = useState<PortalDeliverable[]>([]);
  const [appointments, setAppointments] = useState<PortalAppointment[]>([]);
  const [activities,   setActivities]   = useState<PortalActivity[]>([]);
  const [milestones,   setMilestones]   = useState<Milestone[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [noClient,     setNoClient]     = useState(false);

  const fetchPortal = useCallback(async (silent = false) => {
    // Managers necesitan clientId seleccionado antes de hacer fetch
    if (isManager && !previewClientId) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    setError(null);
    setNoClient(false);

    const url = isManager
      ? `/api/client-portal?clientId=${previewClientId}`
      : '/api/client-portal';

    try {
      const res  = await fetch(url);
      const data = await res.json() as Partial<ClientPortalResponse> & {
        error?: string;
        client?: PortalClient | null;
      };

      if (!res.ok)          { setError(data.error ?? 'Error al cargar el portal.'); return; }
      if (data.client === null) { setNoClient(true); return; }
      if (data.error)       { setError(data.error); return; }

      setClient(data.client ?? null);
      setClientUserId((data as any).clientUserId ?? null);
      // Compatibilidad con API actual que devuelve `tasks` — renombrar a deliverables
      const rawDeliverables = (data as any).deliverables ?? (data as any).tasks ?? [];
      setDeliverables(rawDeliverables);
      setAppointments(data.appointments ?? []);
      setActivities(data.activities   ?? []);
      // Fetch milestones separado
      if (data.client) {
        const clientId = (data.client as any).id;
        const mRes = await fetch('/api/milestones?clientId=' + clientId);
        console.log('[milestones] status:', mRes.status);
        if (mRes.ok) {
          const mData = await mRes.json();
          console.log('[milestones] data:', mData);
          setMilestones(mData.milestones ?? []);
        }
      }
    } catch {
      setError('Error de red. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [isManager, previewClientId]);

  useEffect(() => {
    fetchPortal();
  }, [fetchPortal]);

  return {
    client,
    clientUserId,
    deliverables,
    appointments,
    activities,
    loading,
    error,
    noClient,
    refetch: fetchPortal,
    milestones,
    refetchSilent: () => fetchPortal(true),
  };
}
