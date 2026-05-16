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
  const [deliverables, setDeliverables] = useState<PortalDeliverable[]>([]);
  const [appointments, setAppointments] = useState<PortalAppointment[]>([]);
  const [activities,   setActivities]   = useState<PortalActivity[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [noClient,     setNoClient]     = useState(false);

  const fetchPortal = useCallback(async () => {
    // Managers necesitan clientId seleccionado antes de hacer fetch
    if (isManager && !previewClientId) {
      setLoading(false);
      return;
    }

    setLoading(true);
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
      // Compatibilidad con API actual que devuelve `tasks` — renombrar a deliverables
      const rawDeliverables = (data as any).deliverables ?? (data as any).tasks ?? [];
      setDeliverables(rawDeliverables);
      setAppointments(data.appointments ?? []);
      setActivities(data.activities   ?? []);
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
    deliverables,
    appointments,
    activities,
    loading,
    error,
    noClient,
    refetch: fetchPortal,
  };
}
