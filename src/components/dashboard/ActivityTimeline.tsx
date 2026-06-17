'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckSquare, Users, UserCircle, Bell } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
}

const entityIcons: Record<string, React.ElementType> = {
  task: CheckSquare,
  Task: CheckSquare,
  contact: Users,
  Contact: Users,
  client: UserCircle,
  Client: UserCircle,
  notification: Bell,
};

const entityColors: Record<string, string> = {
  task: 'text-[#38BDF8]',
  Task: 'text-[#38BDF8]',
  contact: 'text-brand-light',
  Contact: 'text-brand-light',
  client: 'text-green-400',
  Client: 'text-green-400',
  notification: 'text-amber-400',
};

const entityBgColors: Record<string, string> = {
  task: 'bg-[#38BDF8]/10',
  Task: 'bg-[#38BDF8]/10',
  contact: 'bg-brand/10',
  Contact: 'bg-brand/10',
  client: 'bg-green-400/10',
  Client: 'bg-green-400/10',
  notification: 'bg-amber-400/10',
};

// Human-readable action labels
const actionLabels: Record<string, string> = {
  CREATE_TASK:       'Tarea creada',
  UPDATE_TASK:       'Tarea actualizada',
  DELETE_TASK:       'Tarea eliminada',
  TASK_CREATED:      'Tarea creada',
  TASK_UPDATED:      'Tarea actualizada',
  TASK_DELETED:      'Tarea eliminada',
  CREATE_CONTACT:    'Contacto creado',
  UPDATE_CONTACT:    'Contacto actualizado',
  DELETE_CONTACT:    'Contacto eliminado',
  CREATE_CLIENT:     'Cliente creado',
  CLIENT_CREATED:    'Cliente creado',
  UPDATE_CLIENT:     'Cliente actualizado',
  DELETE_CLIENT:     'Cliente eliminado',
  CREATE_USER:       'Usuario creado',
  UPDATE_USER:       'Usuario actualizado',
  DELETE_USER:       'Usuario eliminado',
  UPDATE_PROFILE:    'Perfil actualizado',
  WORKSPACE_CREATED: 'Workspace creado',
  CREATE_MEETING:    'Reunión creada',
  UPDATE_MEETING:    'Reunión actualizada',
  DELETE_MEETING:    'Reunión eliminada',
  CREATE_ACTIVITY:   'Actividad creada',
  UPDATE_ACTIVITY:   'Actividad actualizada',
  DELETE_ACTIVITY:   'Actividad eliminada',
};

function getActionLabel(action: string, details: string): string {
  const label = actionLabels[action];
  if (label) {
    // Try to extract a name/title from details
    try {
      const parsed = JSON.parse(details);
      if (parsed.title) return `${label}: ${parsed.title}`;
      if (parsed.name) return `${label}: ${parsed.name}`;
    } catch {
      // ignore
    }
    return label;
  }
  return action;
}

export default function ActivityTimeline() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const res = await fetch('/api/activity?limit=10');
        if (res.ok) {
          const data = await res.json();
          // API returns { activities: [...] }
          setActivities(data.activities || data || []);
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Bell className="w-10 h-10 text-[var(--wl-text-placeholder)] mb-3" />
        <p className="text-sm text-[var(--wl-text-muted)]">No hay actividad reciente</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto custom-scrollbar p-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-3 bottom-3 w-px bg-[var(--wl-hover)]" />

        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = entityIcons[activity.entity] || Bell;
            const color = entityColors[activity.entity] || 'text-[var(--wl-text-muted)]';
            const bgColor = entityBgColors[activity.entity] || 'bg-[var(--wl-hover)]';

            return (
              <div key={activity.id} className="relative flex items-start gap-3">
                {/* Icon dot */}
                <div
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${bgColor} shrink-0`}
                >
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm text-[var(--wl-text-secondary)] leading-snug">
                    {getActionLabel(activity.action, activity.details)}
                  </p>
                  <p className="text-xs text-[var(--wl-text-placeholder)] mt-1">
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
