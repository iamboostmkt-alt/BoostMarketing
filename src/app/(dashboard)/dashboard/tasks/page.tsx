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
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import TaskCard from '@/components/dashboard/TaskCard';
import TaskForm from '@/components/dashboard/TaskForm';
import TaskDetailModal from '@/components/dashboard/TaskDetailModal';
import type { Task } from '@/lib/types';
import { taskStatuses, statusLabels } from '@/lib/theme-maps';

type ViewMode = 'list' | 'board';
type TabId = 'mine' | 'clients' | 'all' | 'review';
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

// 4 macro-grupos que agrupan los 10 estados
const BOARD_GROUPS = [
  {
    id: 'backlog',
    label: 'To Do',
    icon: '○',
    statuses: ['draft', 'pending'],
    dropStatus: 'pending',
    color: 'bg-white/60',
    glow: 'bg-white/[0.04] ring-white/15',
    hex: '#ffffff',
  },
  {
    id: 'in_progress',
    label: 'En Curso',
    icon: '◑',
    statuses: ['in_progress', 'changes_requested'],
    dropStatus: 'in_progress',
    color: 'bg-[#48CAE4]',
    glow: 'bg-[#48CAE4]/[0.06] ring-[#48CAE4]/20',
    hex: '#48CAE4',
  },
  {
    id: 'review',
    label: 'Revisión',
    icon: '◷',
    statuses: ['internal_review', 'client_review'],
    dropStatus: 'client_review',
    color: 'bg-[#7c3aed]',
    glow: 'bg-[#7c3aed]/[0.06] ring-[#7c3aed]/20',
    hex: '#7c3aed',
  },
  {
    id: 'done',
    label: 'Listo',
    icon: '●',
    statuses: ['approved', 'scheduled', 'published', 'completed'],
    dropStatus: 'completed',
    color: 'bg-[#22C55E]',
    glow: 'bg-[#22C55E]/[0.06] ring-[#22C55E]/20',
    hex: '#22C55E',
  },
];

function BoardView({ tasks, onEdit, onDelete, onView, onMarkComplete, onMarkPending, onAddSubtask, onStatusChange, isManager }: {
  tasks: Task[];
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onView: (t: Task) => void;
  onMarkComplete: (t: Task) => Promise<void>;
  onMarkPending: (t: Task) => Promise<void>;
  onAddSubtask: (t: Task) => void;
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
  isManager?: boolean;
}) {
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const group = BOARD_GROUPS.find(g => g.id === destination.droppableId);
    if (!group) return;
    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;
    if (group.statuses.includes(task.status)) return;
    await onStatusChange(draggableId, group.dropStatus);
  };

  // F1: equipo ve internal_review en Listo, managers en Revisión
  const resolvedGroups = BOARD_GROUPS.map(g => {
    if (!isManager && g.id === 'done') {
      return { ...g, statuses: [...g.statuses, 'internal_review'] };
    }
    if (!isManager && g.id === 'review') {
      return { ...g, statuses: g.statuses.filter(s => s !== 'internal_review') };
    }
    return g;
  });

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {resolvedGroups.map((group) => {
          const groupTasks = tasks
            .filter(t => group.statuses.includes(t.status))
            .sort((a, b) => {
              if (!a.dueDate && !b.dueDate) return 0;
              if (!a.dueDate) return 1;
              if (!b.dueDate) return -1;
              return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            });
          return (
            <div key={group.id} className="space-y-2">
              {/* Column header */}
              <div className="flex items-center gap-2 px-2 py-1">
                <span className={`w-1.5 h-1.5 rounded-full ${group.color}`} />
                <span className="text-xs font-medium text-white/80 uppercase tracking-wide">
                  {group.label}
                </span>
                <span className="text-[10px] text-white/20 ml-auto bg-white/[0.06] px-1.5 py-0.5 rounded-full">
                  {groupTasks.length}
                </span>
              </div>
              {/* Sub-status pills */}
              <div className="flex flex-wrap gap-1 px-1 pb-1">
                {group.statuses.map(s => {
                  const count = tasks.filter(t => t.status === s).length;
                  if (count === 0) return null;
                  return (
                    <span key={s} className="text-[9px] text-white/25 bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                      {statusLabels[s] || s} {count}
                    </span>
                  );
                })}
              </div>
              <Droppable droppableId={group.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[calc(100vh-320px)] rounded-xl p-2 transition-colors duration-150 bg-white/[0.02] ${
                      snapshot.isDraggingOver ? `ring-1 ${group.glow} bg-white/[0.04]` : ''
                    }`}
                  >
                    {groupTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.85 : 1,
                            }}
                            className={`transition-shadow duration-150 ${
                              snapshot.isDragging ? 'shadow-lg shadow-black/30 rotate-[0.5deg]' : ''
                            }`}
                          >
                            <TaskCard task={task} onEdit={onEdit} onDelete={onDelete}
                              onView={onView} onMarkComplete={onMarkComplete}
                              onMarkPending={onMarkPending} onAddSubtask={onAddSubtask} />
                            {(task as any).client?.name && (
                              <div className="flex items-center gap-1 px-2 pb-1 -mt-1">
                                <span className="w-1 h-1 rounded-full bg-brand/40 shrink-0" />
                                <span className="text-[10px] text-white/25 truncate">
                                  {(task as any).client.name}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {groupTasks.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex flex-col items-center justify-center h-16 gap-1 border border-dashed border-white/[0.04] rounded-lg">
                        <span className="text-[10px] text-white/15">Arrastra aquí</span>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

function MineTasksView({ tasks, viewMode, cardProps, onCreate, onStatusChange, isManager }: {
  tasks: Task[];
  viewMode: ViewMode;
  cardProps: any;
  onCreate: () => void;
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
  isManager?: boolean;
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
        <p className="text-sm font-medium text-white/50 mb-1">Sin tareas activas</p>
        <p className="text-xs text-white/30 mb-4">Todo en orden — o crea una tarea para empezar</p>
        <Button onClick={onCreate} size="sm" className="bg-brand hover:bg-brand-dark text-white gap-2">
          <Plus className="w-3.5 h-3.5" /> Nueva Tarea
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tareas activas */}
      {viewMode === 'board' ? (
        <BoardView tasks={activeTasks} {...cardProps} onStatusChange={onStatusChange} isManager={isManager} />
      ) : (
        <motion.div
          className="space-y-2"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        >
          {activeTasks.map((task) => (
            <motion.div
              key={task.id}
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } } }}
            >
              <TaskCard task={task} {...cardProps} />
            </motion.div>
          ))}
          {activeTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-400/40 mb-2" />
              <p className="text-sm text-white/40">Todas las tareas están completadas</p>
            </div>
          )}
        </motion.div>
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
  const [allTasksCursor, setAllTasksCursor] = useState<string | null>(null);
  const [reviewTasks, setReviewTasks]       = useState<Task[]>([]);
  const [allTasksHasMore, setAllTasksHasMore] = useState(false);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [loading, setLoading]               = useState(true);
  const [viewMode, setViewMode]             = useState<ViewMode>('board');
  const [formOpen, setFormOpen]             = useState(false);
  const [parentTaskId, setParentTaskId]     = useState<string | null>(null);
  const [editingTask, setEditingTask]       = useState<Task | null>(null);
  const [deleteTask, setDeleteTask]         = useState<Task | null>(null);
  const [deleting, setDeleting]             = useState(false);
  const [viewingTask, setViewingTask]       = useState<Task | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const filterClientId = searchParams.get('clientId') ?? null;
  const [filterClientName, setFilterClientName] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'create') { setEditingTask(null); setFormOpen(true); }
    if (filterClientId) {
      fetch('/api/clients?sidebar=1').then(r => r.ok ? r.json() : null).then(d => {
        const found = d?.clients?.find((c: any) => c.id === filterClientId);
        if (found) setFilterClientName(found.name);
      }).catch(() => {});
    } else {
      setFilterClientName(null);
    }
  }, [searchParams, filterClientId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mineRes, clientsRes, allRes] = await Promise.all([
        fetch(`/api/tasks?scope=mine${filterClientId ? `&clientId=${filterClientId}` : ''}`),
        fetch('/api/tasks?scope=clients-with-tasks'),
        isManager ? fetch(`/api/tasks?scope=all${filterClientId ? `&clientId=${filterClientId}` : ''}`) : Promise.resolve(null),
      ]);
      if (mineRes.ok)    { const d = await mineRes.json();    setMyTasks((d.tasks ?? []).filter((t: Task) => !t.parentTaskId)); }
      if (clientsRes.ok) { const d = await clientsRes.json(); setClientsWithTasks(d.clients ?? []); }
      if (isManager) {
        const revRes = await fetch('/api/tasks?scope=review');
        if (revRes.ok) { const d = await revRes.json(); setReviewTasks(d.tasks ?? []); }
      }
      if (allRes?.ok)    {
        const d = await allRes.json();
        setAllTasks((d.tasks ?? []).filter((t: Task) => !t.parentTaskId));
        setAllTasksCursor(d.nextCursor ?? null);
        setAllTasksHasMore(d.hasMore ?? false);
      }
    } catch (err) {
      console.error('[fetchAll]', err);
      toast.error('Error al cargar las tareas. Intenta de nuevo.', {
        action: { label: 'Reintentar', onClick: () => fetchAll() },
      });
    } finally { setLoading(false); }
  }, [isManager]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function loadMoreTasks() {
    if (!allTasksCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/tasks?scope=all&cursor=${allTasksCursor}`);
      if (res.ok) {
        const d = await res.json();
        setAllTasks(prev => [...prev, ...(d.tasks ?? []).filter((t: Task) => !t.parentTaskId)]);
        setAllTasksCursor(d.nextCursor ?? null);
        setAllTasksHasMore(d.hasMore ?? false);
      }
    } catch (err) {
      console.error('[loadMoreTasks]', err);
      toast.error('Error al cargar más tareas');
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleMarkComplete(task: Task) {
    const newStatus = isManager ? 'completed' : 'internal_review';
    const prevMy      = myTasks;
    const prevAll     = allTasks;
    const prevClients = clientsWithTasks;
    setMyTasks(prev  => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    setAllTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    setClientsWithTasks(prev => prev.map(c => ({
      ...c,
      tasks: c.tasks.map((t: any) => t.id === task.id ? { ...t, status: newStatus } : t),
    })));
    try {
      const res = await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, status: newStatus }) });
      if (!res.ok) throw new Error();
      toast.success(isManager ? 'Tarea completada' : 'Tarea enviada a revisión');

      // BUG-04 fix: enviar mensaje en chat del cliente al marcar como completada/en revisión
      if (task.clientId) {
        const emoji = newStatus === 'completed' ? '✅' : '👀';
        const msg   = newStatus === 'completed'
          ? `${emoji} Tarea completada: **${task.title}**`
          : `${emoji} Tarea enviada a revisión: **${task.title}**`;
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msg,
            room: task.clientId,
            isSystem: true,
            systemName: 'Weeklink',
            isInternal: true,
          }),
        }).catch(() => {});
      }
    } catch {
      setMyTasks(prevMy);
      setAllTasks(prevAll);
      setClientsWithTasks(prevClients);
      toast.error('Error al completar');
    }
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    // Optimistic update — UI first, API after
    const prevMy      = myTasks;
    const prevAll     = allTasks;
    const prevClients = clientsWithTasks;
    setMyTasks(prev  => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    setClientsWithTasks(prev => prev.map(c => ({
      ...c,
      tasks: c.tasks.map((t: any) => t.id === taskId ? { ...t, status: newStatus } : t),
    })));
    // Remover de reviewTasks si ya no es internal_review ni client_review
    if (!['internal_review', 'client_review'].includes(newStatus)) {
      setReviewTasks(prev => prev.filter(t => t.id !== taskId));
    }
    try {
      const res = await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: taskId, status: newStatus }) });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on error
      setMyTasks(prevMy);
      setAllTasks(prevAll);
      setClientsWithTasks(prevClients);
      toast.error('Error al mover tarea');
    }
  }

  async function handleMarkPending(task: Task) {
    const prevMy      = myTasks;
    const prevAll     = allTasks;
    const prevClients = clientsWithTasks;
    setMyTasks(prev  => prev.map(t => t.id === task.id ? { ...t, status: 'pending' } : t));
    setAllTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'pending' } : t));
    setClientsWithTasks(prev => prev.map(c => ({
      ...c,
      tasks: c.tasks.map((t: any) => t.id === task.id ? { ...t, status: 'pending' } : t),
    })));
    try {
      const res = await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, status: 'pending' }) });
      if (!res.ok) throw new Error();
      toast.success('Marcada como pendiente');
    } catch {
      setMyTasks(prevMy);
      setAllTasks(prevAll);
      setClientsWithTasks(prevClients);
      toast.error('Error al actualizar');
    }
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

  function handleEdit(task: Task) {
    if (!isManager) {
      const currentUserId = session?.user?.id;
      const taskCreatorId = (task as any).userId;
      // Solo puede editar si él la creó
      const canEdit = taskCreatorId === currentUserId;
      if (!canEdit) {
        setViewingTask(task); // solo ver
        return;
      }
    }
    setEditingTask(task);
    setFormOpen(true);
  }
  function handleCreate() { setEditingTask(null); setFormOpen(true); }

  const tabs = [
    { id: 'mine' as TabId,    label: 'Mis Tareas',        icon: User,        count: myTasks.filter(t => t.status !== 'completed' && t.status !== 'approved').length },
    { id: 'clients' as TabId, label: 'Clientes',          icon: Building2,   count: clientsWithTasks.reduce((a, c) => a + c.tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'approved').length, 0) },
    ...(isManager ? [{ id: 'all' as TabId, label: 'Todas', icon: LayoutGrid, count: allTasks.filter(t => t.status !== 'completed' && t.status !== 'approved').length }] : []),
    ...(isManager ? [{ id: 'review' as TabId, label: 'Revisiones', icon: CheckCircle2, count: reviewTasks.length }] : []),
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

  const currentUserId = session?.user?.id;
  const cardProps = {
    onEdit: handleEdit,
    onDelete: (t: Task) => setDeleteTask(t),
    onView: (t: Task) => setViewingTask(t),
    onMarkComplete: handleMarkComplete,
    onMarkPending: handleMarkPending,
    onAddSubtask: (t: Task) => { setParentTaskId(t.id); setEditingTask(null); setFormOpen(true); },
    onStatusChange: handleStatusChange,
    hideEdit: !isManager ? true : false,
    canEdit: (t: Task) => isManager || (t as any).userId === currentUserId,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-1">Tareas</p>
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-medium text-white">Tareas</h1>
            <span className="text-sm text-white/30">{tabs.find(t => t.id === activeTab)?.count ?? 0} activas</span>
          </div>
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

      {/* Banner filtro por cuenta */}
      {filterClientId && filterClientName && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-500/20 text-xs" style={{ background: 'rgba(124,58,237,0.08)' }}>
          <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          <span className="text-white/60">Filtrando por cuenta:</span>
          <span className="text-violet-300 font-medium">{filterClientName}</span>
          <a href="/dashboard/tasks" className="ml-auto text-white/30 hover:text-white/60 transition-colors">✕ Quitar filtro</a>
        </div>
      )}
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
      {activeTab === 'review' && isManager && (
        <div className="space-y-1">
          {reviewTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/30">
              <CheckCircle2 className="w-8 h-8 mb-3 opacity-40" />
              <p className="text-sm">Sin tareas en revisión</p>
            </div>
          ) : (
            reviewTasks.map((t) => (
              <TaskCard key={t.id} task={t} {...cardProps} isManager={isManager} />
            ))
          )}
        </div>
      )}
      {activeTab === 'mine' && (
        <MineTasksView
          tasks={myTasks}
          viewMode={viewMode}
          cardProps={cardProps}
          onCreate={handleCreate}
          onStatusChange={handleStatusChange}
          isManager={isManager}
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
              <p className="text-sm font-medium text-white/50 mb-1">Sin tareas de clientes</p>
              <p className="text-xs text-white/30">No hay tareas de clientes asignadas a ti</p>
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
                    onStatusChange={handleStatusChange}
                    isManager={isManager}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: Todas (managers only) */}
      {activeTab === 'all' && isManager && (
        <div className="space-y-4">
          <MineTasksView
            tasks={allTasks}
            viewMode={viewMode}
            cardProps={cardProps}
            onCreate={handleCreate}
            onStatusChange={handleStatusChange}
            isManager={isManager}
          />
          {allTasksHasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMoreTasks}
                disabled={loadingMore}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/50 hover:text-white text-sm transition-colors disabled:opacity-40"
              >
                {loadingMore ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                ) : (
                  '+ Cargar más tareas'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <TaskForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setParentTaskId(null); }}
        task={editingTask}
        isManager={isManager}
        parentTaskId={parentTaskId}
        onSuccess={(savedTask?: any) => {
          if (!savedTask) { fetchAll(); return; }
          if (editingTask) {
            // Edición — actualizar en los 3 estados sin recargar
            const update = (t: Task) => t.id === savedTask.id ? { ...t, ...savedTask } : t;
            setMyTasks(prev => prev.map(update));
            setAllTasks(prev => prev.map(update));
            setClientsWithTasks(prev => prev.map(c => ({
              ...c,
              tasks: c.tasks.map((t: any) => t.id === savedTask.id ? { ...t, ...savedTask } : t),
            })));
          } else {
            // Creación — si tiene subtareas pendientes hacer fetchAll para cargarlas todas
            if (!savedTask.parentTaskId) {
              setMyTasks(prev => [savedTask, ...prev]);
              setAllTasks(prev => [savedTask, ...prev]);
              if (savedTask.clientId) {
                setClientsWithTasks(prev => prev.map(c =>
                  c.id === savedTask.clientId
                    ? { ...c, tasks: [savedTask, ...c.tasks] }
                    : c
                ));
              }
              // Refetch para cargar subtareas creadas
              setTimeout(() => fetchAll(), 500);
            }
          }
        }}
      />
      <TaskDetailModal task={viewingTask} open={!!viewingTask} onClose={() => setViewingTask(null)} onEdit={handleEdit} onStatusChange={handleStatusChange} isManager={isManager} currentUserId={currentUserId} />
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

import ErrorBoundary from '@/components/dashboard/ErrorBoundary';

export default function TasksPage() {
  return (
    <ErrorBoundary>
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-32 rounded-xl" />)}</div>
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      </div>
    }>
      <TasksContent />
    </Suspense>
    </ErrorBoundary>
  );
}