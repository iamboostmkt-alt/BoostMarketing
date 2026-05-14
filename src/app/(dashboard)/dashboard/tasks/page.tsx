'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Plus, LayoutList, Columns3, CheckSquare, AlertTriangle,
  User, Users, Building2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import TaskCard from '@/components/dashboard/TaskCard';
import TaskForm from '@/components/dashboard/TaskForm';
import TaskDetailModal from '@/components/dashboard/TaskDetailModal';
import type { Task } from '@/lib/types';
import { taskStatuses } from '@/lib/theme-maps';

type ViewMode = 'list' | 'board';
const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

interface ClientWithTasks {
  id: string;
  name: string;
  company: string;
  tasks: Task[];
}

const statusDotColors: Record<string, string> = {
  pending: 'bg-slate-400',
  in_progress: 'bg-cyan-400',
  editing: 'bg-cyan-400',
  review: 'bg-amber-400',
  completed: 'bg-emerald-400',
};

// ─── Section Header ───────────────────────────────────────────
function SectionHeader({
  icon, title, count, collapsed, onToggle, accent = 'brand',
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  accent?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 py-2 group"
    >
      <div className={`flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.06] text-white/50 group-hover:text-white transition-colors`}>
        {icon}
      </div>
      <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors flex-1 text-left">
        {title}
      </span>
      <span className="text-xs text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-full">
        {count}
      </span>
      <span className="text-white/30 group-hover:text-white/60 transition-colors">
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </span>
    </button>
  );
}

// ─── Task List ────────────────────────────────────────────────
function TaskList({
  tasks, viewMode, onEdit, onDelete, onView, onMarkComplete, onMarkPending,
}: {
  tasks: Task[];
  viewMode: ViewMode;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onView: (t: Task) => void;
  onMarkComplete: (t: Task) => Promise<void>;
  onMarkPending: (t: Task) => Promise<void>;
}) {
  if (tasks.length === 0) return (
    <div className="text-xs text-white/25 py-4 pl-10">Sin tareas</div>
  );

  if (viewMode === 'board') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pl-2">
        {taskStatuses.map((stage) => {
          const stageTasks = tasks.filter((t) => t.status === stage.id);
          return (
            <div key={stage.id} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className={`w-2 h-2 rounded-full ${statusDotColors[stage.id] || 'bg-white/30'}`} />
                <span className="text-xs font-medium text-white/50">{stage.label}</span>
                <span className="text-[10px] text-white/25 ml-auto">{stageTasks.length}</span>
              </div>
              <div className="space-y-2 min-h-[80px] bg-white/[0.02] rounded-lg p-2 border border-white/[0.04]">
                {stageTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onEdit={onEdit}
                    onDelete={onDelete} onMarkComplete={onMarkComplete} onMarkPending={onMarkPending} />
                ))}
                {stageTasks.length === 0 && (
                  <div className="flex items-center justify-center h-16 text-xs text-white/20">Sin tareas</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2 pl-2">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onEdit={onEdit}
          onDelete={onDelete} onView={onView}
          onMarkComplete={onMarkComplete} onMarkPending={onMarkPending} />
      ))}
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────
function TasksContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const role      = session?.user?.role ?? '';
  const isManager = MANAGER_ROLES.includes(role);

  const [myTasks,         setMyTasks]         = useState<Task[]>([]);
  const [clientsWithTasks, setClientsWithTasks] = useState<ClientWithTasks[]>([]);
  const [allTasks,        setAllTasks]         = useState<Task[]>([]);
  const [loading,         setLoading]          = useState(true);

  const [collapsedMine,    setCollapsedMine]    = useState(false);
  const [collapsedClients, setCollapsedClients] = useState<Record<string, boolean>>({});
  const [collapsedAll,     setCollapsedAll]     = useState(false);

  const [viewMode,    setViewMode]    = useState<ViewMode>('list');
  const [formOpen,    setFormOpen]    = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTask,  setDeleteTask]  = useState<Task | null>(null);
  const [deleting,    setDeleting]    = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setEditingTask(null);
      setFormOpen(true);
    }
  }, [searchParams]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mineRes, clientsRes, allRes] = await Promise.all([
        fetch('/api/tasks?scope=mine'),
        fetch('/api/tasks?scope=clients-with-tasks'),
        isManager ? fetch('/api/tasks?scope=all') : Promise.resolve(null),
      ]);

      if (mineRes.ok) {
        const d = await mineRes.json();
        setMyTasks(d.tasks ?? []);
      }
      if (clientsRes.ok) {
        const d = await clientsRes.json();
        setClientsWithTasks(d.clients ?? []);
      }
      if (allRes?.ok) {
        const d = await allRes.json();
        setAllTasks(d.tasks ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleMarkComplete(task: Task) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: 'completed' }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar');
      toast.success('Tarea completada');
      await fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  }

  async function handleMarkPending(task: Task) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: 'pending' }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar');
      toast.success('Tarea marcada como pendiente');
      await fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  }

  async function handleDelete() {
    if (!deleteTask) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks?id=${deleteTask.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar');
      }
      toast.success('Tarea eliminada');
      setDeleteTask(null);
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  }

  function handleEdit(task: Task) { setEditingTask(task); setFormOpen(true); }
  function handleCreate() { setEditingTask(null); setFormOpen(true); }

  const totalCount = myTasks.length + clientsWithTasks.reduce((acc, c) => acc + c.tasks.length, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Tareas</h1>
          <p className="text-white/40 text-sm mt-1">
            {totalCount} tarea{totalCount !== 1 ? 's' : ''} visibles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
            <button onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/[0.1] text-white' : 'text-white/40 hover:text-white/60'}`}
              title="Lista">
              <LayoutList className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-white/[0.1] text-white' : 'text-white/40 hover:text-white/60'}`}
              title="Tablero">
              <Columns3 className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={handleCreate} className="bg-brand hover:bg-brand-dark text-white gap-2">
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </Button>
        </div>
      </div>

      {/* ── 1. MIS TAREAS ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="border-b border-white/[0.06] pb-1">
          <SectionHeader
            icon={<User className="w-3.5 h-3.5" />}
            title="Mis Tareas"
            count={myTasks.length}
            collapsed={collapsedMine}
            onToggle={() => setCollapsedMine((p) => !p)}
          />
        </div>

        {!collapsedMine && (
          myTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mb-3">
                <CheckSquare className="w-5 h-5 text-white/20" />
              </div>
              <p className="text-sm text-white/40">No tienes tareas asignadas</p>
              <Button onClick={handleCreate} variant="ghost"
                className="mt-3 text-brand hover:text-brand-light gap-1 text-xs">
                <Plus className="w-3.5 h-3.5" /> Crear tarea
              </Button>
            </div>
          ) : (
            <TaskList tasks={myTasks} viewMode={viewMode}
              onEdit={handleEdit} onDelete={(t) => setDeleteTask(t)}
              onView={(t) => setViewingTask(t)}
              onMarkComplete={handleMarkComplete} onMarkPending={handleMarkPending} />
          )
        )}
      </div>

      {/* ── 2. CLIENTES ───────────────────────────────────────── */}
      {clientsWithTasks.length > 0 && (
        <div className="space-y-3">
          <div className="border-b border-white/[0.06] pb-1">
            <div className="flex items-center gap-2 py-1">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.06] text-white/50">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-semibold text-white/80 flex-1">Clientes</span>
              <span className="text-xs text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-full">
                {clientsWithTasks.length}
              </span>
            </div>
          </div>

          {clientsWithTasks.map((client) => (
            <div key={client.id} className="space-y-2">
              <SectionHeader
                icon={<Users className="w-3.5 h-3.5" />}
                title={client.name + (client.company ? ` — ${client.company}` : '')}
                count={client.tasks.length}
                collapsed={collapsedClients[client.id] ?? false}
                onToggle={() => setCollapsedClients((p) => ({ ...p, [client.id]: !p[client.id] }))}
              />
              {!(collapsedClients[client.id] ?? false) && (
                <TaskList tasks={client.tasks} viewMode={viewMode}
                  onEdit={handleEdit} onDelete={(t) => setDeleteTask(t)}
                  onView={(t) => setViewingTask(t)}
                  onMarkComplete={handleMarkComplete} onMarkPending={handleMarkPending} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 3. TODAS LAS TAREAS (solo managers) ───────────────── */}
      {isManager && (
        <div className="space-y-3">
          <div className="border-b border-white/[0.06] pb-1">
            <SectionHeader
              icon={<LayoutList className="w-3.5 h-3.5" />}
              title="Todas las Tareas"
              count={allTasks.length}
              collapsed={collapsedAll}
              onToggle={() => setCollapsedAll((p) => !p)}
            />
          </div>

          {!collapsedAll && (
            allTasks.length === 0 ? (
              <div className="text-xs text-white/25 py-4 pl-10">Sin tareas en el sistema</div>
            ) : (
              <TaskList tasks={allTasks} viewMode={viewMode}
                onEdit={handleEdit} onDelete={(t) => setDeleteTask(t)}
                onView={(t) => setViewingTask(t)}
                onMarkComplete={handleMarkComplete} onMarkPending={handleMarkPending} />
            )
          )}
        </div>
      )}

      {/* Empty global */}
      {totalCount === 0 && !isManager && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <CheckSquare className="w-8 h-8 text-white/20" />
          </div>
          <h3 className="text-lg font-semibold text-white/70 mb-1">Sin tareas</h3>
          <p className="text-sm text-white/40 mb-4">Crea tu primera tarea para comenzar</p>
          <Button onClick={handleCreate} className="bg-brand hover:bg-brand-dark text-white gap-2">
            <Plus className="w-4 h-4" /> Nueva Tarea
          </Button>
        </div>
      )}

      {/* Modals */}
      <TaskForm open={formOpen} onOpenChange={setFormOpen}
        task={editingTask} isManager={isManager} onSuccess={fetchAll} />

      <TaskDetailModal task={viewingTask} open={!!viewingTask}
        onClose={() => setViewingTask(null)} onEdit={handleEdit} />

      <AlertDialog open={!!deleteTask} onOpenChange={(open) => !open && setDeleteTask(null)}>
        <AlertDialogContent className="bg-[#15151c] border-white/[0.06] text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <AlertDialogTitle className="text-white">Eliminar Tarea</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-white/50">
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.04] border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.06]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white">
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    }>
      <TasksContent />
    </Suspense>
  );
}