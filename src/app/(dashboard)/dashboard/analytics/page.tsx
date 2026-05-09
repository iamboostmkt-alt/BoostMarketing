'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { DashboardStats, Contact, Task } from '@/lib/types';
import { useMounted } from '@/hooks/use-mounted';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const CHART_COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#10b981'];
const GRID_COLOR = 'rgba(255,255,255,0.05)';
const TEXT_COLOR = '#8b8b9e';

// Mock weekly data for the line chart
function generateWeeklyData() {
  const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];
  return weeks.map((w) => ({
    name: w,
    completadas: Math.floor(Math.random() * 10) + 2,
    pendientes: Math.floor(Math.random() * 8) + 1,
  }));
}

// Custom tooltip for dark theme
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c1c27] border border-white/[0.08] rounded-lg p-3 shadow-lg">
        <p className="text-white/60 text-xs mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// Custom pie label
function renderCustomLabel({ name, percent }: any) {
  return `${name} ${(percent * 100).toFixed(0)}%`;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useMounted();

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, contactsRes, tasksRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/contacts'),
          fetch('/api/tasks'),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
        if (contactsRes.ok) {
          const data = await contactsRes.json();
          setContacts(data.contacts || []);
        }
        if (tasksRes.ok) {
          const data = await tasksRes.json();
          setTasks(data.tasks || data || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Compute analytics
  const contactsByStage = useMemo(() => {
    const stages = [
      { name: 'Lead', value: 0 },
      { name: 'Prospecto', value: 0 },
      { name: 'Negociación', value: 0 },
      { name: 'Ganado', value: 0 },
    ];
    contacts.forEach((c) => {
      if (c.status === 'lead') stages[0].value++;
      else if (c.status === 'prospect') stages[1].value++;
      else if (c.status === 'negotiation') stages[2].value++;
      else if (c.status === 'won') stages[3].value++;
    });
    return stages;
  }, [contacts]);

  const taskStatusDistribution = useMemo(() => {
    const statuses = [
      { name: 'Pendiente', value: 0 },
      { name: 'En Progreso', value: 0 },
      { name: 'Revisión', value: 0 },
      { name: 'Completado', value: 0 },
    ];
    tasks.forEach((t) => {
      if (t.status === 'pending') statuses[0].value++;
      else if (t.status === 'editing') statuses[1].value++;
      else if (t.status === 'review') statuses[2].value++;
      else if (t.status === 'completed') statuses[3].value++;
    });
    return statuses.filter((s) => s.value > 0);
  }, [tasks]);

  const weeklyData = useMemo(() => generateWeeklyData(), []);

  const completedTasks = stats?.completedTasks || 0;
  const totalTasks = stats?.totalTasks || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const conversionRate = contacts.length > 0
    ? Math.round(
        (contacts.filter((c) => c.status === 'won').length / contacts.length) * 100
      )
    : 0;

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
      label: 'Tareas Completadas',
      value: `${completionRate}%`,
      icon: CheckCircle2,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/10',
      change: completionRate >= 50 ? '+5%' : '-3%',
      up: completionRate >= 50,
    },
    {
      label: 'Ingresos del Pipeline',
      value: `$${(stats?.totalRevenue || 0).toLocaleString('es-ES')}`,
      icon: DollarSign,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
      change: '+23%',
      up: true,
    },
    {
      label: 'Tasa de Conversión',
      value: `${conversionRate}%`,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      change: conversionRate >= 20 ? '+8%' : '-2%',
      up: conversionRate >= 20,
    },
  ];

  const hasData = contacts.length > 0 || tasks.length > 0;

  return (
    <motion.div variants={container} initial={mounted ? 'hidden' : false} animate="show" className="space-y-6">
      {/* Header */}
      <motion.div
        variants={itemAnim}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Analytics</h2>
          <p className="text-white/40 mt-1">Visualiza el rendimiento de tu negocio</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-white/30" />
          <span className="text-sm text-white/40">Últimos 30 días</span>
        </div>
      </motion.div>

      {/* Stats cards */}
      <motion.div variants={itemAnim} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
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
                {loading ? (
                  <Skeleton className="h-8 w-20 mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                )}
                <p className="text-sm text-white/40 mt-0.5">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Charts */}
      {loading ? (
        <motion.div variants={itemAnim} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-6">
              <Skeleton className="h-5 w-40 mb-4" />
              <Skeleton className="h-[300px] w-full" />
            </div>
          ))}
        </motion.div>
      ) : !hasData ? (
        <motion.div variants={itemAnim} className="glass-card rounded-xl p-16 text-center">
          <BarChart3 className="w-12 h-12 text-white/15 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No hay datos suficientes para mostrar gráficos</p>
          <p className="text-white/25 text-xs mt-1">Agrega contactos y tareas para ver tus analytics</p>
        </motion.div>
      ) : (
        <motion.div variants={itemAnim} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart: Contacts by Stage */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-base font-semibold text-white mb-4">Contactos por Etapa</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={contactsByStage} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: TEXT_COLOR, fontSize: 12 }}
                  axisLine={{ stroke: GRID_COLOR }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: TEXT_COLOR, fontSize: 12 }}
                  axisLine={{ stroke: GRID_COLOR }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Contactos" radius={[6, 6, 0, 0]}>
                  {contactsByStage.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart: Tasks Completed per Week */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-base font-semibold text-white mb-4">Tareas por Semana</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: TEXT_COLOR, fontSize: 12 }}
                  axisLine={{ stroke: GRID_COLOR }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: TEXT_COLOR, fontSize: 12 }}
                  axisLine={{ stroke: GRID_COLOR }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: TEXT_COLOR, fontSize: 12 }}
                  formatter={(value: string) => (
                    <span style={{ color: TEXT_COLOR }}>{value}</span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="completadas"
                  name="Completadas"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ fill: '#7c3aed', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="pendientes"
                  name="Pendientes"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ fill: '#06b6d4', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart: Task Status Distribution */}
          <div className="glass-card rounded-xl p-6 lg:col-span-2">
            <h3 className="text-base font-semibold text-white mb-4">Distribución por Estado de Tareas</h3>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <ResponsiveContainer width="100%" height={300} className="max-w-[400px]">
                <PieChart>
                  <Pie
                    data={taskStatusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={120}
                    innerRadius={60}
                    dataKey="value"
                    stroke="none"
                  >
                    {taskStatusDistribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-3">
                {taskStatusDistribution.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-sm text-white/60">{entry.name}</span>
                    <span className="text-sm font-semibold text-white ml-2">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
