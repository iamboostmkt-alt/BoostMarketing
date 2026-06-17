'use client'

import { Hash, Plus, CheckCheck, Video, Folder, Bell, Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from './avatar'

const internalChannels = [
  { id: 'general', name: 'general', active: true, unread: 0 },
  { id: 'marketing', name: 'marketing', active: false, unread: 3 },
  { id: 'design', name: 'design', active: false, unread: 0 },
  { id: 'ads', name: 'ads', active: false, unread: 0 },
];
const clientChannels = [
  { id: 'gym', name: 'GymnasTwin', initials: 'GT', color: '#8B5CF6', unread: 2 },
  { id: 'cafe', name: 'Café del Mar', initials: 'CM', color: '#06B6D4', unread: 0 },
];
const directMessages = [
  { id: 'alex', person: { name: 'Alex Turner', initials: 'AT', color: '#3B82F6', status: 'online' as const } },
  { id: 'sofia', person: { name: 'Sophia Miller', initials: 'SM', color: '#10B981', status: 'away' as const }, unread: 2 },
];
const apps = [
  { id: 'tasks', label: 'Tareas', icon: 'CheckCheck' },
  { id: 'calendar', label: 'Calendario', icon: 'Video' },
  { id: 'deliverables', label: 'Entregables', icon: 'Folder' },
  { id: 'ai', label: 'AI Assistant', icon: 'Sparkles' },
];



const appIcons: Record<string, LucideIcon> = {
  CheckCheck,
  Video,
  Folder,
  Bell,
  Sparkles,
}

function GroupLabel({ children, action }: { children: React.ReactNode; action?: boolean }) {
  return (
    <div className="flex items-center justify-between px-2 pb-1 pt-4">
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--wl-text-muted)]">{children}</span>
      {action && (
        <button aria-label="Añadir" className="text-[var(--wl-text-muted)] transition-colors hover:text-[var(--wl-text-primary)]/90">
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  )
}

function Badge({ count }: { count: number }) {
  return (
    <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-[var(--wl-text-primary)] shadow-[0_0_8px_rgba(139,92,246,0.5)]">
      {count}
    </span>
  )
}

export function ChannelList() {
  return (
    <div className="flex h-full w-[244px] shrink-0 flex-col border-r border-[var(--wl-border-subtle)] bg-[var(--wl-surface)]">
      <div className="flex-1 overflow-y-auto  px-2 pb-4">
        {/* Internal channels */}
        <GroupLabel action>Canales internos</GroupLabel>
        <ul className="flex flex-col gap-0.5">
          {internalChannels.map((c) => (
            <li key={c.id}>
              <button
                className={cn(
                  'flex h-9 w-full items-center gap-2 rounded-[10px] px-2.5 text-[13px] transition-colors',
                  c.active
                    ? 'bg-violet-500/[0.12] font-medium text-white/90'
                    : 'text-[var(--wl-text-primary)]/65 hover:bg-[var(--wl-hover)] hover:text-[var(--wl-text-primary)]/90',
                )}
              >
                <Hash className={cn('h-4 w-4', c.active ? 'text-violet-400' : 'text-[var(--wl-text-muted)]')} strokeWidth={1.75} />
                <span className="truncate">{c.name}</span>
                {c.unread ? <Badge count={c.unread} /> : null}
              </button>
            </li>
          ))}
        </ul>

        {/* Clients */}
        <GroupLabel action>Clientes</GroupLabel>
        <ul className="flex flex-col gap-0.5">
          {clientChannels.map((c) => (
            <li key={c.id}>
              <button className="flex h-9 w-full items-center gap-2 rounded-[10px] px-2 text-[13px] text-[var(--wl-text-primary)]/65 transition-colors hover:bg-[var(--wl-hover)] hover:text-[var(--wl-text-primary)]/90">
                <Avatar initials={c.initials} color={c.color} size={20} />
                <span className="truncate">{c.name}</span>
                {c.unread ? <Badge count={c.unread} /> : null}
              </button>
            </li>
          ))}
        </ul>

        {/* DMs */}
        <GroupLabel action>Mensajes directos</GroupLabel>
        <ul className="flex flex-col gap-0.5">
          {directMessages.map((d) => (
            <li key={d.id}>
              <button className="flex h-9 w-full items-center gap-2 rounded-[10px] px-2 text-[13px] text-[var(--wl-text-primary)]/65 transition-colors hover:bg-[var(--wl-hover)] hover:text-[var(--wl-text-primary)]/90">
                <Avatar initials={d.person.initials} color={d.person.color} size={20} status={d.person.status} />
                <span className="truncate">{d.person.name}</span>
                {'unread' in d && d.unread ? <Badge count={d.unread} /> : null}
              </button>
            </li>
          ))}
        </ul>

        {/* Apps */}
        <GroupLabel>Apps</GroupLabel>
        <ul className="flex flex-col gap-0.5">
          {apps.map((a) => {
            const Icon = appIcons[a.icon]
            return (
              <li key={a.id}>
                <button className="flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] text-[var(--wl-text-primary)]/65 transition-colors hover:bg-[var(--wl-hover)] hover:text-[var(--wl-text-primary)]/90">
                  <Icon className={cn('h-4 w-4', a.id === 'ai' ? 'text-violet-400' : 'text-[var(--wl-text-muted)]')} strokeWidth={1.75} />
                  <span className="truncate">{a.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
