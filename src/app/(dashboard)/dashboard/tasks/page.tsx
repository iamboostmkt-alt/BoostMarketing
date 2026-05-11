'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Plus, LayoutList, Columns3, CheckSquare, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import TaskCard from '@/components/dashboard/TaskCard';
import TaskForm from '@/components/dashboard/TaskForm';
import TaskDetailModal from '@/components/dashboard/TaskDetailModal';
import type { Task } from '@/lib/types';
import { statusColors, taskStatuses } from '@/lib/theme-maps';

type ViewMode = 'list' | 'board';

const filterTabs = [
  { id: 'all', label: 'Todas' },
  ...taskStatuses.map((s) => ({ id: s.id, label: s.label })),
];

const statusDotColors: Record<string, string> = {
  pending: 'bg-slate-400',
  editing: 'bg-cyan-400',
  review: 'bg-amber-400',
  completed: 'bg-emerald-400',
};

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER'];

function TasksContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isManager = MANAGER_ROLES.includes(session?.user?.role ?? '');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  // Open form if query param action=create
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setEditingTask(null);
      setFormOpen(true);
    }
  }, [searchParams]);

  const fetchTasks = useCallback(async () => {
    try {
      // Managers see all tasks across the team; others see only their own
      const url = isManager ? '/api/tasks?scope=all' : '/api/tasks';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || data || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = activeFilter === 'all'
    ? tasks
    : tasks.filter((t) => t.status === activeFilter);

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
      fetchTasks();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  function handleEdit(task: Task) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditingTask(null);
    setFormOpen(true);
  }

  // Skeleton loading
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
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
            {tasks.length} tarea{tasks.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-brand hover:bg-brand-dark text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Tarea
        </Button>
      </div>

      {/* Filter tabs + View toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                activeFilter === tab.id
                  ? 'bg-brand text-white shadow-lg shadow-brand/20'
                  : 'bg-white/[0.04] text-white/50 hover:text-white/70 hover:bg-white/[0.06]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'list'
                ? 'bg-white/[0.1] text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
            title="Vista de lista"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'board'
                ? 'bg-white/[0.1] text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
            title="Vista de tablero"
          >
            <Columns3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filteredTasks.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <CheckSquare className="w-8 h-8 text-white/20" />
          </div>
          <h3 className="text-lg font-semibold text-white/70 mb-1">No hay tareas</h3>
          <p className="text-sm text-white/40 mb-4">
            {activeFilter === 'all'
              ? 'Crea tu primera tarea para comenzar a organizar tu trabajo'
              : `No hay tareas con estado "${filterTabs.find((t) => t.id === activeFilter)?.label}"`}
          </p>
          <Button
            onClick={handleCreate}
            className="bg-brand hover:bg-brand-dark text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </Button>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && filteredTasks.length > 0 && (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div key={task.id}>
              <TaskCard
                task={task}
                onEdit={handleEdit}
                onDelete={(t) => setDeleteTask(t)}
                onView={(t) => setViewingTask(t)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Board View */}
      {viewMode === 'board' && filteredTasks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {taskStatuses.map((stage) => {
            const stageTasks = filteredTasks.filter((t) => t.status === stage.id);
            return (
              <div key={stage.id} className="space-y-3">
                {/* Column header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusDotColors[stage.id] || 'bg-white/30'}`} />
                    <span className="text-sm font-medium text-white/70">
                      {stage.label}
                    </span>
                  </div>
                  <span className="text-xs text-white/30 bg-white/[0.04] rounded-full px-2 py-0.5">
                    {stageTasks.length}
                  </span>
                </div>

                {/* Column body */}
                <div className="space-y-2.5 min-h-[120px] bg-white/[0.02] rounded-xl p-2.5 border border-white/[0.04]">
                  {stageTasks.map((task) => (
                    <div key={task.id}>
                      <TaskCard
                        task={task}
                        onEdit={handleEdit}
                        onDelete={(t) => setDeleteTask(t)}
                      />
                    </div>
                  ))}
                  {stageTasks.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-white/20">
                      Sin tareas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Form Dialog */}
      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
        isManager={isManager}
        onSuccess={fetchTasks}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={viewingTask}
        open={!!viewingTask}
        onClose={() => setViewingTask(null)}
        onEdit={handleEdit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTask} onOpenChange={(open) => !open && setDeleteTask(null)}>
        <AlertDialogContent className="bg-[#15151c] border-white/[0.06] text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <AlertDialogTitle className="text-white">
                Eliminar Tarea
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-white/50">
              ¿Estás seguro de que quieres eliminar la tarea &ldquo;{deleteTask?.title}&rdquo;?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.04] border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.06]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
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
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <TasksContent />
    </Suspense>
  );
}
