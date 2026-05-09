'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Users,
  CheckSquare,
  UserCircle,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import type { DashboardStats, Task } from '@/lib/types';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/theme-maps';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const userName = session?.user?.name || 'Usuario';

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // silent
      } finally {
        setLoadingStats(false);
      }
    }
    fetchStats();
  }, []);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch('/api/tasks?limit=5');
        if (res.ok) {
          const data = await res.json();
          // API returns { tasks: [...] }
          setTasks(data.tasks || data || []);
        }
      } catch {
        // silent
      } finally {
        setLoadingTasks(false);
      }
    }
    fetchTasks();
  }, []);

  const statCards = [
    {
      label: 'Total Contactos',
      value: stats?.totalContacts || 0,
      icon: Users,
      color: 'text-brand-light',
      bgColor: 'bg-brand/10',
      change: '+12%',
      up: true,
    },
    {
      label: 'Tareas Pendientes',
      value: stats ? stats.totalTasks - stats.completedTasks : 0,
      icon: CheckSquare,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/10',
      change: '-5%',
      up: false,
    },
    {
      label: 'Clientes Activos',
      value: stats?.activeClients || 0,
      icon: UserCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      change: '+8%',
      up: true,
    },
    {
      label: 'Ingresos Totales',
      value: `$${(stats?.totalRevenue || 0).toLocaleString('es-ES')}`,
      icon: DollarSign,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
      change: '+23%',
      up: true,
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={itemAnim}>
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          Bienvenido,{' '}
          <span className="text-gradient-brand">{userName}</span>
        </h2>
        <p className="text-white/40 mt-1">Aquí tienes un resumen de tu actividad reciente.</p>
      </motion.div>

      {/* Stats cards */}
      <motion.div variants={itemAnim} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              variants={itemAnim}
              className="glass-card rounded-xl p-5 hover:border-white/[0.1] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    stat.up ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {stat.up ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {stat.change}
                </div>
              </div>
              <div className="mt-4">
                {loadingStats ? (
                  <Skeleton className="h-8 w-20 mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                )}
                <p className="text-sm text-white/40 mt-0.5">{stat.label}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={itemAnim} className="flex flex-wrap gap-3">
        <Link href="/dashboard/tasks?action=create">
          <Button
            size="sm"
            className="bg-brand hover:bg-brand-dark text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </Button>
        </Link>
        <Link href="/dashboard/crm?action=create">
          <Button
            size="sm"
            variant="outline"
            className="border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.06] gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Contacto
          </Button>
        </Link>
        <Link href="/dashboard/clients?action=create">
          <Button
            size="sm"
            variant="outline"
            className="border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.06] gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </Button>
        </Link>
      </motion.div>

      {/* Two column layout */}
      <motion.div variants={itemAnim} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent tasks */}
        <div className="lg:col-span-2 glass-card rounded-xl">
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-semibold text-white">Tareas Recientes</h3>
            </div>
            <Link href="/dashboard/tasks">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/40 hover:text-white hover:bg-white/[0.06] text-xs"
              >
                Ver todas
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {loadingTasks ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 md:px-6">
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckSquare className="w-10 h-10 text-white/20 mb-3" />
                <p className="text-sm text-white/40">No hay tareas recientes</p>
                <Link href="/dashboard/tasks?action=create">
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 border-white/[0.1] text-white/50 hover:text-white hover:bg-white/[0.06]"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Crear tarea
                  </Button>
                </Link>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-4 md:px-6 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90 truncate">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-white/40 mt-0.5 truncate">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[task.status] || 'status-pending'}`}
                    >
                      {statusLabels[task.status] || task.status}
                    </span>
                    <span className={`text-xs font-medium hidden sm:inline ${priorityColors[task.priority] || 'text-white/40'}`}>
                      {priorityLabels[task.priority] || task.priority}
                    </span>
                    {task.dueDate && (
                      <div className="hidden md:flex items-center gap-1 text-xs text-white/30">
                        <Clock className="w-3 h-3" />
                        {new Date(task.dueDate).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Activity timeline */}
        <div className="glass-card rounded-xl">
          <div className="flex items-center gap-2 p-4 md:p-6 border-b border-white/[0.06]">
            <Clock className="w-5 h-5 text-brand-light" />
            <h3 className="text-base font-semibold text-white">Actividad Reciente</h3>
          </div>
          <ActivityTimeline />
        </div>
      </motion.div>
    </motion.div>
  );
}
