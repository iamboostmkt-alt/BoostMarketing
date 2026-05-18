'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Plus, LayoutList, Columns3, CheckSquare, AlertTriangle,
  User, Building2, LayoutGrid, ChevronDown, CheckCircle2,
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
type TabId = 'mine' | 'clients' | 'all';
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

function BoardView({ tasks, onEdit, onDelete, onView, onMarkComplete, onMarkPending }: {
  tasks: Task[];
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onView: (t: Task) => void;
  onMarkComplete: (t: Task) => Promise<void>;
  onMarkPending: (t: Task) => Promise<void>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {taskStatuses.map((stage) => {
        const stageTasks = tasks.filter((t) => t.status === stage.id);
        return (
          <div key={stage.id} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className={`w-2 h-2 rounded-full ${statusDotColors[stage.id] || 'bg-white/30'}`} />
              <span className="text-xs font-medium text-white/50">{stage.label}</span>
              <span className="text-[10px] text-white/25 ml-auto">{stageTasks.length}</span>
            </div>
            <div className="space-y-2 min-h-[80px] bg-white/[0.02] rounded-xl p-2 border border-white/[0.04]">
              {stageTasks.map((task) => (
                <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete}
                  onMarkComplete={onMarkComplete} onMarkPending={onMarkPending} />
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

function MineTasksView({ tasks, viewMode, cardProps, onCreate }: {
  tasks: Task[];
  viewMode: ViewMode;
  cardProps: any;
  onCreate: () => void;
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  const activeTasks    = tasks.filter(t => t.status !== 'completed' && t.status !== 'approved');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'approved');

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
          <CheckSquare className="w-8 h-8 text-white/20" />
        </div>
        <h3 className="text-lg font-semibold text-white/70 mb-1">Sin tareas asignadas</h3>
        <p className="text-sm text-white/40 mb-4">Crea una tarea para comenzar</p>
        <Button onClick={onCreate} className="bg-brand hover:bg-brand-dark text-white gap-2">
          <Plus className="w-4 h-4" /> Nueva Tarea
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tareas activas */}
      {viewMode === 'board' ? (
        <BoardView tasks={activeTasks} {...cardProps} />
      ) : (
        <div className="space-y-3">
          {activeTasks.map((task) => <TaskCard key={task.id} task={task} {...cardProps} />)}
          {activeTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-400/40 mb-2" />
              <p className="text-sm text-white/40">Todas las tareas están completadas</p>
            </div>
          )}
        </div>
      )}

      {/* Sección Listas colapsable */}
      {completedTasks.length > 0 && (
        <div className="border border-white/[0.06] rounded-xl overflow-hidden">
          <button type="button" onClick={() => setShowCompleted(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-2 text-sm font-medium text-white/40">
              <CheckCircle2 className="w-4 h-4 text-green-400/60" />
              Listas ({completedTasks.length})
            </div>
            <ChevronDown className={`w-4 h-4 text-white/20 transition-transform ${showCompleted ? 'rotate-180' : ''}`} />
          </button>
          {showCompleted && (
            <div className="space-y-2 p-3">
              {completedTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] opacity-60">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-sm text-white/50 line-through truncate flex-1">{task.title}</span>
                  <button type="button" onClick={() => cardProps.onEdit(task)}
                    className="text-[10px] text-white/25 hover:text-white/60 transition-colors shrink-0">
                    Ver
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TasksContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const role      = session?.user?.role ?? '';
  const isManager = MANAGER_ROLES.includes(role);

  const [activeTab, setActiveTab]           = useState<TabId>('mine');
  const [myTasks, setMyTasks]               = useState<Task[]>([]);
  const [clientsWithTasks, setClientsWithTasks] = useState<ClientWithTasks[]>([]);
  const [allTasks, setAllTasks]             = useState<Task[]>([]);
  const [loading, setLoading]               = useState(true);
  const [viewMode, setViewMode]             = useState<ViewMode>('list');
  const [formOpen, setFormOpen]             = useState(false);
  const [editingTask, setEditingTask]       = useState<Task | null>(null);
  const [deleteTask, setDeleteTask]         = useState<Task | null>(null);
  const [deleting, setDeleting]             = useState(false);
  const [viewingTask, setViewingTask]       = useState<Task | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'create') { setEditingTask(null); setFormOpen(true); }
  }, [searchParams]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mineRes, clientsRes, allRes] = await Promise.all([
        fetch('/api/tasks?scope=mine'),
        fetch('/api/tasks?scope=clients-with-tasks'),
        isManager ? fetch('/api/tasks?scope=all') : Promise.resolve(null),
      ]);
      if (mineRes.ok)    { const d = await mineRes.json();    setMyTasks(d.tasks ?? []); }
      if (clientsRes.ok) { const d = await clientsRes.json(); setClientsWithTasks(d.clients ?? []); }
      if (allRes?.ok)    { const d = await allRes.json();     setAllTasks(d.tasks ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [isManager]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleMarkComplete(task: Task) {
    try {
      const res = await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, status: 'completed' }) });
      if (!res.ok) throw new Error();
      toast.success('Tarea completada');
      await fetchAll();
    } catch { toast.error('Error al completar'); }
  }

  async function handleMarkPending(task: Task) {
    try {
      const res = await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, status: 'pending' }) });
      if (!res.ok) throw new Error();
      toast.success('Marcada como pendiente');
      await fetchAll();
    } catch { toast.error('Error al actualizar'); }
  }

  async function handleDelete() {
    if (!deleteTask) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks?id=${deleteTask.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Tarea eliminada');
      const id = deleteTask.id;
      setDeleteTask(null);
      // Actualizar estado local sin setLoading para evitar flash de recarga
      setMyTasks(prev => prev.filter(t => t.id !== id));
      setAllTasks(prev => prev.filter(t => t.id !== id));
      setClientsWithTasks(prev => prev.map(c => ({
        ...c,
        tasks: c.tasks.filter((t: any) => t.id !== id),
      })));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally { setDeleting(false); }
  }

  function handleEdit(task: Task) { setEditingTask(task); setFormOpen(true); }
  function handleCreate() { setEditingTask(null); setFormOpen(true); }

  const tabs = [
    { id: 'mine' as TabId,    label: 'Mis Tareas',        icon: User,        count: myTasks.length },
    { id: 'clients' as TabId, label: 'Clientes',          icon: Building2,   count: clientsWithTasks.reduce((a, c) => a + c.tasks.length, 0) },
    ...(isManager ? [{ id: 'all' as TabId, label: 'Todas', icon: LayoutGrid, count: allTasks.length }] : []),
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between"><Skeleton className="h-8 w-32" /><Skeleton className="h-9 w-28" /></div>
        <div className="flex gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-32 rounded-xl" />)}</div>
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      </div>
    );
  }

  const cardProps = { onEdit: handleEdit, onDelete: (t: Task) => setDeleteTask(t), onView: (t: Task) => setViewingTask(t), onMarkComplete: handleMarkComplete, onMarkPending: handleMarkPending };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Tareas</h1>
          <p className="text-white/40 text-sm mt-1">{tabs.find(t => t.id === activeTab)?.count ?? 0} tareas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
            <button onClick={() => setViewMode('list')} title="Lista"
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/[0.1] text-white' : 'text-white/40 hover:text-white/60'}`}>
              <LayoutList className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('board')} title="Tablero"
              className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-white/[0.1] text-white' : 'text-white/40 hover:text-white/60'}`}>
              <Columns3 className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={handleCreate} className="bg-brand hover:bg-brand-dark text-white gap-2">
            <Plus className="w-4 h-4" /> Nueva Tarea
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                active
                  ? 'border-brand text-white'
                  : 'border-transparent text-white/40 hover:text-white/70 hover:border-white/20'
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-brand/20 text-brand-light' : 'bg-white/[0.06] text-white/30'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab: Mis Tareas */}
      {activeTab === 'mine' && (
        <MineTasksView
          tasks={myTasks}
          viewMode={viewMode}
          cardProps={cardProps}
          onCreate={handleCreate}
        />
      )}

      {/* Tab: Clientes */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          {clientsWithTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-lg font-semibold text-white/70 mb-1">Sin tareas de clientes</h3>
              <p className="text-sm text-white/40">No hay tareas asociadas a clientes visibles para ti</p>
            </div>
          ) : clientsWithTasks.map((client) => (
            <div key={client.id} className="rounded-xl border border-white/[0.06] overflow-hidden">
              <button onClick={() => setExpandedClient(expandedClient === client.id ? null : client.id)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-brand-light" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">{client.name}</p>
                  {client.company && <p className="text-xs text-white/40">{client.company}</p>}
                </div>
                <span className="text-xs text-white/30 bg-white/[0.06] px-2 py-0.5 rounded-full">{client.tasks.length} tareas</span>
                <span className="text-white/30 text-xs">{expandedClient === client.id ? '▲' : '▼'}</span>
              </button>
              {expandedClient === client.id && (
                <div className="p-3 space-y-2 border-t border-white/[0.04]">
                  <MineTasksView
                    tasks={client.tasks}
                    viewMode={viewMode}
                    cardProps={cardProps}
                    onCreate={handleCreate}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: Todas (managers only) */}
      {activeTab === 'all' && isManager && (
        <MineTasksView
          tasks={allTasks}
          viewMode={viewMode}
          cardProps={cardProps}
          onCreate={handleCreate}
        />
      )}

      {/* Modals */}
      <TaskForm open={formOpen} onOpenChange={setFormOpen} task={editingTask} isManager={isManager} onSuccess={fetchAll} />
      <TaskDetailModal task={viewingTask} open={!!viewingTask} onClose={() => setViewingTask(null)} onEdit={handleEdit} isManager={isManager} />
      <AlertDialog open={!!deleteTask} onOpenChange={(open) => !open && setDeleteTask(null)}>
        <AlertDialogContent className="bg-[#15151c] border-white/[0.06] text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <AlertDialogTitle className="text-white">Eliminar Tarea</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-white/50">Esta accion no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.04] border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.06]">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-500 hover:bg-red-600 text-white">
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
        <div className="flex gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-32 rounded-xl" />)}</div>
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      </div>
    }>
      <TasksContent />
    </Suspense>
  );
}