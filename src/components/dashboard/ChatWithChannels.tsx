'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Hash, Lock, LifeBuoy, Briefcase, ChevronDown, Plus,
  Search, Sparkles, Bell, HelpCircle, X, Menu,
  Pin, Users, MoreHorizontal, SmilePlus, Reply,
  ListPlus, Send, Smile, Paperclip, AtSign, Slash, Mic,
  CheckCheck, Video, Folder
} from 'lucide-react';
import { bus, RT_EVENTS } from '@/lib/event-bus';
import { useUploadThing } from '@/lib/uploadthing';
import { Avatar } from '@/components/weeklink/avatar';
import { VideoCard, PdfCard, TaskCard, ArchiveCard } from '@/components/weeklink/chat-cards';
import SupportTicket from '@/components/dashboard/SupportTicket';
import type { ChatMessage } from '@/lib/types';

const QUICK_EMOJIS = ['👍','🔥','💜','✅','😂','🎉'];

function getInitials(name: string | null, email: string) {
  return (name || email).split(/[\s@]/)[0].slice(0, 2).toUpperCase();
}

function renderMessage(text: string) {
  return text.split(/(@\w+)/g).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="rounded-[5px] bg-primary/15 px-1 py-px font-medium text-[#b794f6]">{part}</span>
      : part
  );
}

// ─── Channel List ──────────────────────────────────────────────────────────────
function ChannelList({
  activeId, setActiveId, rooms, clients, members, myId, unreads, role,
}: {
  activeId: string;
  setActiveId: (id: string) => void;
  rooms: { id: string; name: string; icon: string; subtitle?: string; locked?: boolean }[];
  clients: { id: string; name: string; color?: string }[];
  members: { id: string; name: string | null; email: string; color?: string; image?: string | null; role?: string }[];
  myId: string;
  unreads: Record<string, number>;
  role: string;
}) {
  const [openClients, setOpenClients] = useState(true);
  const [openDMs, setOpenDMs] = useState(true);
  const [showChannelMenu, setShowChannelMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [showDMSearch, setShowDMSearch] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const createChannelRef = useRef<HTMLDivElement>(null);
  const channelMenuRef = useRef<HTMLDivElement>(null);
  const isManager = ['ADMIN', 'PROJECT_MANAGER'].includes(role);

  return (
    <div className="flex h-full w-[244px] shrink-0 flex-col border-r border-white/[0.05] bg-card">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
        {/* Internal channels */}
        <div className="flex items-center justify-between px-2 pb-1 pt-4">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">Canales</span>
          <div className="relative" ref={channelMenuRef}>
            <button onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenuPos({ top: r.bottom + 4, left: r.left }); setShowChannelMenu(!showChannelMenu); }}
              className="flex h-5 w-5 items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            {showChannelMenu && (
              <div className="fixed z-[9999] w-48 rounded-xl border border-white/[0.08] bg-[#141824] py-1 shadow-2xl" style={{ top: menuPos.top, left: menuPos.left }}>
                <button onClick={() => { setShowChannelMenu(false); setShowCreateChannel(true); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white">
                  <span className="text-[14px]">＃</span>Crear canal
                </button>
                {isManager && (
                  <button onClick={() => setShowChannelMenu(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white">
                    <span className="text-[14px]">◉</span>Crear espacio cliente
                  </button>
                )}
                <button onClick={() => setShowChannelMenu(false)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white">
                  <span className="text-[14px]">⊕</span>Chat grupal
                </button>
                {isManager && (
                  <button onClick={() => setShowChannelMenu(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white">
                    <span className="text-[14px]">📢</span>Anuncio
                  </button>
                )}
              </div>
            )}
            {showCreateChannel && (
              <div ref={createChannelRef} className="fixed z-[9999] w-56 rounded-xl border border-white/[0.08] bg-[#141824] p-3 shadow-2xl" style={{ top: menuPos.top, left: menuPos.left }}>
                <p className="text-[12px] font-medium text-white/70 mb-2">Nuevo canal</p>
                <input autoFocus value={newChannelName} onChange={e => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''))}
                  placeholder="nombre-del-canal"
                  className="w-full rounded-lg border border-white/[0.08] bg-[#0f1117] px-2.5 py-1.5 text-[12px] text-white placeholder:text-white/25 focus:outline-none focus:border-primary/40 mb-2" />
                <div className="flex gap-2">
                  <button onClick={() => { setShowCreateChannel(false); setNewChannelName(''); }}
                    className="flex-1 rounded-lg border border-white/[0.08] py-1.5 text-[12px] text-white/50 hover:text-white transition-colors">
                    Cancelar
                  </button>
                  <button disabled={!newChannelName.trim()}
                    onClick={() => { if (newChannelName.trim()) { setActiveId(newChannelName.trim()); setShowCreateChannel(false); setNewChannelName(''); } }}
                    className="flex-1 rounded-lg bg-primary py-1.5 text-[12px] font-medium text-white disabled:opacity-40 transition-opacity">
                    Crear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <ul className="flex flex-col gap-0.5">
          {rooms.map(r => {
            const isActive = activeId === r.id;
            const unread = unreads[r.id] || 0;
            const Icon = r.locked ? Lock : r.icon === 'support' ? LifeBuoy : r.icon === 'projects' ? Briefcase : Hash;
            return (
              <li key={r.id}>
                <button onClick={() => setActiveId(r.id)}
                  className={`flex h-9 w-full items-center gap-2 rounded-[10px] px-2.5 text-[13px] transition-colors ${
                    isActive ? 'bg-primary/[0.12] font-medium text-white' : 'text-white/55 hover:bg-white/[0.03] hover:text-white'
                  }`}>
                  {isActive && <span className="absolute left-[-8px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_rgba(139,92,246,0.8)]" />}
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-white/35'}`} strokeWidth={1.75} />
                  <span className="flex-1 truncate text-left">{r.name}</span>
                  {unread > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white shadow-[0_0_8px_rgba(139,92,246,0.5)]">
                      {unread}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Clients */}
        <div className="flex items-center justify-between px-2 pb-1 pt-4">
          <button onClick={() => setOpenClients(!openClients)}
            className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white/40 hover:text-white/60">
            <ChevronDown className={`h-3 w-3 transition-transform ${openClients ? '' : '-rotate-90'}`} strokeWidth={2} />
            Cuentas ({clients.length})
          </button>
        </div>
        {openClients && (
          <ul className="flex flex-col gap-0.5">
            {clients.map(c => {
              const isActive = activeId === c.id;
              const unread = unreads[c.id] || 0;
              return (
                <li key={c.id}>
                  <button onClick={() => setActiveId(c.id)}
                    className={`flex h-9 w-full items-center gap-2 rounded-[10px] px-2 text-[13px] transition-colors ${
                      isActive ? 'bg-primary/[0.12] font-medium text-white' : 'text-white/55 hover:bg-white/[0.03] hover:text-white'
                    }`}>
                    <Avatar initials={(c.name || 'C').slice(0,2).toUpperCase()} color={c.color || '#8b5cf6'} size={20} />
                    <span className="flex-1 truncate text-left">{c.name}</span>
                    {unread > 0 && (
                      <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white">
                        {unread}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Direct Messages */}
        <div className="flex items-center justify-between px-2 pb-1 pt-4">
          <button onClick={() => setOpenDMs(!openDMs)}
            className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white/40 hover:text-white/60">
            <ChevronDown className={`h-3 w-3 transition-transform ${openDMs ? '' : '-rotate-90'}`} strokeWidth={2} />
            Mensajes directos
          </button>
          <button onClick={() => { setShowDMSearch(!showDMSearch); setDmSearchQuery(''); }}
            className="flex h-5 w-5 items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
        {showDMSearch && (
          <div className="mx-2 mb-2 rounded-xl border border-white/[0.08] bg-[#141824] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05]">
              <Search className="h-3.5 w-3.5 text-white/30 shrink-0" strokeWidth={1.75} />
              <input autoFocus value={dmSearchQuery} onChange={e => setDmSearchQuery(e.target.value)}
                placeholder="Buscar persona..."
                className="flex-1 bg-transparent text-[12px] text-white placeholder:text-white/25 focus:outline-none" />
              <button onClick={() => setShowDMSearch(false)} className="text-white/25 hover:text-white/60">
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
            <div className="max-h-[200px] overflow-y-auto py-1">
              {members.filter(m => m.id !== myId && (
                !dmSearchQuery || (m.name || m.email).toLowerCase().includes(dmSearchQuery.toLowerCase())
              )).map(m => {
                const dmId = [myId, m.id].sort().join('_DM_');
                const initials = ((m.name || m.email) || 'U').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
                return (
                  <button key={m.id} onClick={() => { setActiveId(dmId); setShowDMSearch(false); setDmSearchQuery(''); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 hover:bg-white/[0.04] hover:text-white transition-colors">
                    <div className="relative shrink-0">
                      <Avatar initials={initials} color={m.color || '#8b5cf6'} size={22} image={m.image ?? undefined} />
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#141824] bg-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="truncate text-[12px] font-medium text-white/80">{m.name || m.email}</p>
                      <p className="truncate text-[10px] text-white/30">{m.role || 'Miembro'}</p>
                    </div>
                  </button>
                );
              })}
              {members.filter(m => m.id !== myId && (!dmSearchQuery || (m.name || m.email).toLowerCase().includes(dmSearchQuery.toLowerCase()))).length === 0 && (
                <p className="px-3 py-3 text-[12px] text-white/25 text-center">Sin resultados</p>
              )}
            </div>
          </div>
        )}
        {openDMs && (
          <ul className="flex flex-col gap-0.5 max-h-[216px] overflow-y-auto scrollbar-thin">
            {members.filter(m => m.id !== myId).map(m => {
              const dmId = [myId, m.id].sort().join('_DM_');
              const isActive = activeId === dmId;
              const unread = unreads[dmId] || 0;
              const initials = ((m.name || m.email) || 'U').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
              return (
                <li key={m.id}>
                  <button onClick={() => setActiveId(dmId)}
                    className={`flex h-9 w-full items-center gap-2 rounded-[10px] px-2 text-[13px] transition-colors ${
                      isActive ? 'bg-primary/[0.12] font-medium text-white' : 'text-white/55 hover:bg-white/[0.03] hover:text-white'
                    }`}>
                    <div className="relative shrink-0">
                      <Avatar initials={initials} color={m.color || '#8b5cf6'} size={20} image={m.image ?? undefined} />
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-card bg-emerald-400" />
                    </div>
                    <span className="flex-1 truncate text-left">{m.name || m.email}</span>
                    {unread > 0 && (
                      <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white">
                        {unread}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Apps */}
        <div className="px-2 pb-1 pt-4">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">Apps</span>
        </div>
        <ul className="flex flex-col gap-0.5">
          {[
            { id: 'tasks', label: 'Tareas', Icon: CheckCheck },
            { id: 'meetings', label: 'Reuniones', Icon: Video },
            { id: 'files', label: 'Archivos', Icon: Folder },
            { id: 'ai', label: 'AI Assistant', Icon: Sparkles },
          ].map(({ id, label, Icon }) => (
            <li key={id}>
              <button className="flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] text-white/40 transition-colors hover:bg-white/[0.03] hover:text-white/70">
                <Icon className={`h-4 w-4 ${id === 'ai' ? 'text-primary' : 'text-white/30'}`} strokeWidth={1.75} />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────
function TasksTab({ roomTasks, room, onRefresh }: { roomTasks: any[]; room: string; onRefresh: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const taskFileRef = useRef<HTMLInputElement>(null);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const { startUpload } = useUploadThing('chatAttachment');

  const activeTasks = roomTasks.filter(t => !['completed','approved'].includes(t.status));
  const doneTasks = roomTasks.filter(t => ['completed','approved'].includes(t.status));

  const statusStyleMap: Record<string, { background: string; color: string }> = {
    pending:           { background: 'rgba(226,232,240,0.12)', color: '#E2E8F0' },
    in_progress:       { background: 'rgba(56,189,248,0.15)',  color: '#38BDF8' },
    internal_review:   { background: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
    client_review:     { background: 'rgba(56,189,248,0.15)',  color: '#38BDF8' },
    changes_requested: { background: 'rgba(234,179,8,0.15)',   color: '#EAB308' },
    approved:          { background: 'rgba(34,197,94,0.15)',   color: '#22C55E' },
    completed:         { background: 'rgba(34,197,94,0.15)',   color: '#22C55E' },
  };

  const statusLabel: Record<string, string> = {
    pending: 'Pendiente', in_progress: 'En progreso', internal_review: 'En revisión',
    client_review: 'Revisión cliente', changes_requested: 'Cambios', approved: 'Aprobado', completed: 'Completado',
  };

  async function handleComplete(taskId: string) {
    setCompleting(taskId);
    await fetch(`/api/tasks?id=${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }).catch(() => {});
    setCompleting(null);
    onRefresh();
  }

  async function handleTaskFileUpload(e: React.ChangeEvent<HTMLInputElement>, taskId: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTaskId(taskId);
    try {
      const uploaded = await startUpload([file]);
      if (uploaded?.[0]) {
        const { url, name, type } = uploaded[0] as any;
        await fetch('/api/chat/link-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, fileUrl: url, fileName: name, fileType: type, isVideo: type.startsWith('video') }),
        });
        onRefresh();
      }
    } catch {}
    setUploadingTaskId(null);
    if (taskFileRef.current) taskFileRef.current.value = '';
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
      <input ref={taskFileRef} type="file" className="hidden" accept="image/*,video/*,.pdf,.zip,.doc,.docx"
        onChange={e => uploadingTaskId && handleTaskFileUpload(e, uploadingTaskId)} />
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-white/30">
        Tareas activas ({activeTasks.length})
      </p>
      {activeTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <span className="text-2xl">✅</span>
          <p className="text-[13px] text-white/25">No hay tareas activas</p>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {activeTasks.map((t: any) => {
          const isExpanded = expandedId === t.id;
          const style = statusStyleMap[t.status] || statusStyleMap.pending;
          const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Sin fecha';
          return (
            <div key={t.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <button onClick={() => setExpandedId(isExpanded ? null : t.id)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors">
                <ChevronDown className={`h-3.5 w-3.5 text-white/30 shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`} strokeWidth={2} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-medium text-white/85">{t.title}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">{due} · {t.assignedUser?.name || '--'}</p>
                </div>
                <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={style}>
                  {statusLabel[t.status] || t.status}
                </span>
              </button>
              {isExpanded && (
                <div className="border-t border-white/[0.04] px-3 py-2.5 flex items-center gap-2">
                  <button onClick={() => { setUploadingTaskId(t.id); taskFileRef.current?.click(); }}
                    className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] text-white/50 hover:text-white hover:border-white/20 transition-colors">
                    <Paperclip className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {uploadingTaskId === t.id ? 'Subiendo...' : 'Subir archivo'}
                  </button>
                  <button onClick={() => handleComplete(t.id)} disabled={completing === t.id}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 px-3 py-1.5 text-[12px] text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-40">
                    <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {completing === t.id ? 'Completando...' : 'Marcar completada'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tareas completadas/aprobadas colapsadas */}
      {doneTasks.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setShowDone(!showDone)}
            className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-white/25 hover:text-white/40 transition-colors mb-2">
            <ChevronDown className={`h-3 w-3 transition-transform ${showDone ? '' : '-rotate-90'}`} strokeWidth={2} />
            Completadas / Aprobadas ({doneTasks.length})
          </button>
          {showDone && (
            <div className="flex flex-col gap-1.5">
              {doneTasks.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.01] px-3 py-2 opacity-50">
                  <CheckCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" strokeWidth={1.75} />
                  <p className="flex-1 truncate text-[12px] text-white/50 line-through">{t.title}</p>
                  <span className="text-[10px] text-emerald-400/60">{statusLabel[t.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Chat ─────────────────────────────────────────────────────────────────
function ChatMain({
  room, title, accentColor, onOpenThread, dmUser, role = '',
}: {
  room: string;
  title: string;
  accentColor: string;
  onOpenThread: (msg: ChatMessage) => void;
  dmUser?: { id: string; name: string | null; email: string; color?: string; image?: string | null } | null;
  role?: string;
}) {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState<{id: string, x: number, y: number} | null>(null);
  const [activeTab, setActiveTab] = useState<'messages'|'files'|'pinned'|'tasks'>('messages');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ name: string; type: string; preview?: string; progress: number }[]>([]);
  const [roomTasks, setRoomTasks] = useState<any[]>([]);
  const [linkModal, setLinkModal] = useState<{ fileUrl: string; fileName: string; fileType: string } | null>(null);
  const [linkTaskId, setLinkTaskId] = useState('');
  const [linkableTasks, setLinkableTasks] = useState<any[]>([]);
  const [linking, setLinking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { startUpload } = useUploadThing('chatAttachment', {
    onUploadProgress: (p) => {
      setPendingFiles(prev => prev.map((f, i) => i === 0 ? { ...f, progress: p } : f));
    },
  });

  useEffect(() => {
    if (!linkModal) return;
    const clientId = ['TEAM','SUPPORT','PROJECTS','PRIVATE'].includes(room) ? undefined : room;
    const isManager = ['ADMIN','PROJECT_MANAGER'].includes(role);
    const assignedParam = isManager ? '' : '&assignedToMe=true';
    const url = clientId
      ? `/api/tasks?clientId=${clientId}&limit=30${assignedParam}`
      : `/api/tasks?limit=30${assignedParam}`;
    fetch(url).then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.tasks) setLinkableTasks(d.tasks); }).catch(() => {});
  }, [linkModal, room, role]);

  useEffect(() => {
    if (activeTab !== 'tasks') return;
    const clientId = ['TEAM','SUPPORT','PROJECTS','PRIVATE'].includes(room) ? undefined : room;
    const isManager = ['ADMIN','PROJECT_MANAGER'].includes(role);
    const assignedParam = isManager ? '' : '&assignedToMe=true';
    const url = clientId ? `/api/tasks?clientId=${clientId}&limit=20${assignedParam}` : `/api/tasks?limit=20${assignedParam}`;
    fetch(url).then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.tasks) setRoomTasks(d.tasks); }).catch(() => {});
  }, [activeTab, room, role]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat?room=${encodeURIComponent(room)}`);
      if (res.ok) { const d = await res.json(); setMessages(d.messages || []); }
    } catch {}
    setLoading(false);
  }, [room]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    return bus.on<{ message: ChatMessage; room: string }>(RT_EVENTS.MESSAGE_SENT, (p) => {
      if (p.room === room)
        setMessages(prev => prev.some(m => m.id === p.message.id) ? prev : [...prev, p.message]);
    });
  }, [room]);

  useEffect(() => {
    return bus.on<{ message: ChatMessage; room: string }>('reaction.updated' as any, (p) => {
      if (p.room === room)
        setMessages(prev => prev.map(m => m.id === p.message.id ? { ...m, reactions: (p.message as any).reactions } : m));
    });
  }, [room]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, room }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.message) setMessages(prev => prev.some(m => m.id === d.message.id) ? prev : [...prev, d.message]);
      }
    } catch {}
    setSending(false);
  }

  async function compressVideo(file: File): Promise<File> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1280 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        video.currentTime = 0;
        video.onseeked = () => {
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(file);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        };
        // Para videos usamos el archivo original con límite de 64MB — compresión real requiere WebCodecs
        resolve(file);
      };
      video.onerror = () => resolve(file);
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFiles = Array.from(e.target.files || []);
    if (!rawFiles.length) return;
    setUploading(true);
    setPendingFiles(rawFiles.map(f => ({
      name: f.name, type: f.type, progress: 0,
      preview: f.type.startsWith('image') ? URL.createObjectURL(f) : undefined,
    })));
    try {
      for (const rawFile of rawFiles) {
        const file = rawFile.type.startsWith('video') && rawFile.size > 10 * 1024 * 1024
          ? await compressVideo(rawFile) : rawFile;
        const uploaded = await startUpload([file]);
        if (uploaded?.[0]) {
          const { url, name, type } = uploaded[0] as any;
          await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: name || 'Archivo', room, fileUrl: url, fileName: name, fileType: type }),
          });
        }
        setPendingFiles(prev => prev.filter(f => f.name !== file.name));
        // Si es canal de cliente → ofrecer vincular con tarea
        if (!['TEAM','SUPPORT','PROJECTS','PRIVATE'].includes(room) && uploaded?.[0]) {
          const { url, name, type } = uploaded[0] as any;
          setLinkModal({ fileUrl: url, fileName: name, fileType: type });
          setLinkTaskId('');
        }
      }
    } catch {}
    setUploading(false);
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleLinkTask() {
    if (!linkModal || !linkTaskId) return;
    setLinking(true);
    const isVideo = linkModal.fileType.startsWith('video');
    await fetch('/api/chat/link-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...linkModal, taskId: linkTaskId, isVideo }),
    }).catch(() => {});
    setLinking(false);
    setLinkModal(null);
    setLinkTaskId('');
  }

  async function handleReaction(msgId: string, emoji: string) {
    setShowEmoji(null);
    const res = await fetch('/api/chat/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: msgId, emoji }),
    }).catch(() => null);
    // Actualizar localmente sin esperar RT
    if (res?.ok) {
      const d = await res.json().catch(() => null);
      if (d?.message) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: (d.message as any).reactions } : m));
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const fakeEvent = { target: { files: e.dataTransfer.files, value: '' } } as any;
    handleFileUpload(fakeEvent);
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background overflow-hidden"
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={handleDrop}>
      {/* Channel header */}
      <header className="shrink-0 border-b border-white/[0.05]">
        {dmUser && (
          <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] bg-white/[0.01]">
            <div className="relative shrink-0">
              <Avatar initials={((dmUser.name || dmUser.email) || 'U').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()} color={dmUser.color || '#8b5cf6'} size={36} image={dmUser.image} />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-400" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-white/95">{dmUser.name || dmUser.email}</p>
              <p className="text-[11px] text-white/30">@{(dmUser.email || '').split('@')[0]} · <span className="text-emerald-400">En línea</span></p>
            </div>
          </div>
        )}
        <div className="flex h-[52px] items-center gap-3 px-5">
          <div className="flex items-center gap-2">
            {dmUser ? (
              <span className="text-[13px] font-medium text-white/40">@</span>
            ) : (
              <Hash className="h-4 w-4 text-white/40" strokeWidth={1.75} />
            )}
            <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white">
              <Users className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white">
              <Pin className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white">
              <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-0 px-4">
          {(['messages','files','pinned','tasks'] as const).filter(tab => {
            if (room.includes('_DM_') && tab === 'tasks') return false;
            return true;
          }).map(tab => {
            const labels: Record<string, string> = { messages: 'Messages', files: 'Files', pinned: 'Pinned', tasks: 'Tasks' };
            const isActive = activeTab === tab;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`relative flex h-9 items-center gap-1.5 px-3 text-[13px] transition-colors ${
                  isActive ? 'text-white' : 'text-white/35 hover:text-white/60'
                }`}>
                {labels[tab]}
                {tab === 'tasks' && (
                  <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-white/[0.08] px-1 text-[10px] font-medium text-white/50">3</span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Tab: Files */}
      {activeTab === 'files' && (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-white/30">Archivos compartidos</p>
          {messages.filter(m => m.fileUrl).length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="text-3xl">📎</span>
              <p className="text-[13px] text-white/25">No hay archivos compartidos aún</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {messages.filter(m => m.fileUrl).map(m => (
              <a key={m.id} href={m.fileUrl!} target="_blank" rel="noopener noreferrer"
                className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:border-white/10 transition-colors">
                {m.fileType?.startsWith('image') ? (
                  <img src={m.fileUrl!} alt={m.fileName || 'imagen'} className="w-full h-24 object-cover rounded-lg" />
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-lg bg-white/[0.04]">
                    <Paperclip className="h-8 w-8 text-white/20" strokeWidth={1.5} />
                  </div>
                )}
                <p className="truncate text-[11px] text-white/60">{m.fileName || 'Archivo'}</p>
                <p className="text-[10px] text-white/25">{(m.user as any)?.name || ''} · {new Date(m.createdAt).toLocaleDateString('es-MX')}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Pinned */}
      {activeTab === 'pinned' && (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-white/30">Mensajes fijados</p>
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-3xl">📌</span>
            <p className="text-[13px] text-white/25">No hay mensajes fijados</p>
            <p className="text-[11px] text-white/20">Hover sobre un mensaje → Pin para fijarlo</p>
          </div>
        </div>
      )}

      {/* Tab: Tasks */}
      {activeTab === 'tasks' && (
        <TasksTab roomTasks={roomTasks} room={room} onRefresh={() => {
          const clientId = ['TEAM','SUPPORT','PROJECTS','PRIVATE'].includes(room) ? undefined : room;
          const isManager = ['ADMIN','PROJECT_MANAGER'].includes(role || '');
          const assignedParam = isManager ? '' : '&assignedToMe=true';
          const url = clientId ? `/api/tasks?clientId=${clientId}&limit=30${assignedParam}` : `/api/tasks?limit=30${assignedParam}`;
          fetch(url).then(r => r.ok ? r.json() : null).then(d => { if (d?.tasks) setRoomTasks(d.tasks); }).catch(() => {});
        }} />
      )}

      {/* Messages */}
      {activeTab === 'messages' && <div className="flex-1 overflow-y-auto px-5 py-3" style={{scrollbarWidth:'none'}}>
        {loading && (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-white/[0.06] shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-white/[0.06] rounded w-32" />
                  <div className="h-3 bg-white/[0.04] rounded w-64" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
            <span className="text-4xl">💬</span>
            <p className="text-[13px] text-white/30">No hay mensajes aún. ¡Sé el primero!</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.userId === myId;
          const msgDate = new Date(msg.createdAt);
          const prevDate = idx > 0 ? new Date(messages[idx - 1].createdAt) : null;
          const isNewDay = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
          const today = new Date();
          const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
          const dayLabel = msgDate.toDateString() === today.toDateString() ? 'Hoy'
            : msgDate.toDateString() === yesterday.toDateString() ? 'Ayer'
            : msgDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
          const isSame = idx > 0 && messages[idx - 1].userId === msg.userId && !isNewDay;
          const color = (msg.user as any)?.color || accentColor;
          const initials = getInitials((msg.user as any)?.name ?? null, (msg.user as any)?.email ?? '');
          const reactions = (msg.reactions || []).reduce((acc: any[], r: any) => {
            const ex = acc.find((x: any) => x.emoji === r.emoji);
            if (ex) { ex.count++; if (r.userId === myId) ex.mine = true; }
            else acc.push({ emoji: r.emoji, count: 1, mine: r.userId === myId });
            return acc;
          }, []);

          return (
            <div key={msg.id}>
              {isNewDay && (
                <div className="flex items-center gap-3 my-4 px-2">
                  <div className="flex-1 h-px bg-white/[0.05]" />
                  <span className="text-[11px] font-medium text-white/30 px-2">{dayLabel}</span>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                </div>
              )}
            <div className={isSame ? 'mt-0.5' : 'mt-4'}>
              <div className="group relative -mx-2 rounded-xl px-2 transition-colors hover:bg-white/[0.02]"
                style={{ paddingTop: isSame ? '1px' : '8px', paddingBottom: '1px' }}>
                {/* Hover actions */}
                <div className={`absolute -top-1 left-52 z-10 items-center rounded-lg border border-white/[0.08] bg-[#1a1d2e] p-0.5 shadow-xl ${showEmoji?.id === msg.id ? 'flex' : 'hidden group-hover:flex'}`}>
                  {[
                    { Icon: SmilePlus, fn: () => { setShowEmoji(showEmoji?.id === msg.id ? null : {id: msg.id, x: 0, y: 0}); }, tip: 'Reaccionar' },
                    { Icon: Reply, fn: () => onOpenThread(msg), tip: 'Responder en hilo' },
                    { Icon: ListPlus, fn: () => {}, tip: 'Crear tarea' },
                    { Icon: Pin, fn: () => {}, tip: 'Fijar mensaje' },
                    { Icon: MoreHorizontal, fn: () => {}, tip: 'Más opciones' },
                  ].map(({ Icon, fn, tip }, i) => (
                    <div key={i} className="relative group/tip">
                      <button onClick={() => fn()}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white">
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                      <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1a1d2e] border border-white/[0.08] px-2 py-1 text-[11px] text-white/70 opacity-0 transition-opacity delay-500 group-hover/tip:opacity-100 z-30">
                        {tip}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Emoji picker — absolute encima del hover bar */}
                {showEmoji?.id === msg.id && (
                  <div className="absolute -top-10 right-0 z-20 flex gap-1 rounded-xl border border-white/[0.08] bg-[#1a1d2e] p-2 shadow-2xl"
                    onMouseLeave={() => setShowEmoji(null)}>
                    {QUICK_EMOJIS.map(e => (
                      <button key={e} onClick={() => handleReaction(msg.id, e)}
                        className="text-lg p-1 rounded-lg hover:bg-white/[0.06] transition-all hover:scale-125">
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  {isSame ? (
                    <div className="w-9 shrink-0 pt-0.5 text-right">
                      <span className="text-[10px] text-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ) : (
                    <Avatar initials={initials} color={color} size={36} className="mt-0.5 shrink-0" image={(msg.user as any)?.image} />
                  )}
                  <div className="min-w-0 flex-1">
                    {!isSame && (
                      <div className="mb-0.5 flex items-baseline gap-2">
                        <span className="text-[13.5px] font-semibold leading-none text-white/95">
                          {(msg.user as any)?.name || (msg.user as any)?.email}
                          {isMe && <span className="ml-1.5 text-[10px] font-normal" style={{ color: accentColor }}>tú</span>}
                        </span>
                        <span className="text-[11px] text-white/30">
                          {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    <div className="text-[13.5px] leading-[1.55] text-white/75">
                      {renderMessage(msg.message)}
                    </div>
                    {/* Inline file/task cards */}
                    {msg.fileUrl && msg.fileType?.startsWith('video') && (
                      <div className="mt-2">
                        <VideoCard thumb={msg.fileUrl} name={msg.fileName || 'Video'} meta={msg.fileType} />
                      </div>
                    )}
                    {msg.fileUrl && msg.fileType === 'application/pdf' && (
                      <div className="mt-2">
                        <PdfCard name={msg.fileName || 'Documento'} meta="PDF" />
                      </div>
                    )}
                    {msg.fileUrl && msg.fileType && !msg.fileType.startsWith('video') && msg.fileType !== 'application/pdf' && msg.fileType.startsWith('image') && (
                      <div className="mt-2">
                        <img src={msg.fileUrl} alt={msg.fileName || 'imagen'} className="max-w-[320px] rounded-xl border border-white/[0.08]" />
                      </div>
                    )}
                    {msg.fileUrl && msg.fileType && !msg.fileType.startsWith('video') && msg.fileType !== 'application/pdf' && !msg.fileType.startsWith('image') && (
                      <div className="mt-2">
                        <ArchiveCard name={msg.fileName || 'Archivo'} meta={msg.fileType} />
                      </div>
                    )}
                    {msg.taskId && (
                      <div className="mt-2">
                        <TaskCard title="Tarea vinculada" status="En progreso" due="Pendiente" assignee="--" />
                      </div>
                    )}
                    {reactions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {reactions.map((r: any, i: number) => (
                          <button key={i} onClick={() => handleReaction(msg.id, r.emoji)}
                            className={`flex h-7 items-center gap-1.5 rounded-full border px-2 text-[12px] transition-colors ${
                              r.mine ? 'border-primary/40 bg-primary/15 text-white' : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/10'
                            }`}>
                            <span>{r.emoji}</span>
                            <span className="font-medium tabular-nums">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="flex gap-[3px] items-center">
              {[0,1,2].map(i => (
                <span key={i} className="block h-[6px] w-[6px] rounded-full bg-primary/60"
                  style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <span className="text-[12px] text-white/35">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'está' : 'están'} escribiendo…
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>}

      {/* Modal vincular archivo con tarea */}
      {linkModal && (
        <div className="mx-4 mb-2 rounded-xl border border-primary/30 bg-primary/[0.06] p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-medium text-white/80">
              {linkModal.fileType.startsWith('video') ? '🎬 Video subido' : '📎 Archivo subido'} — ¿Vincular con tarea?
            </p>
            <button onClick={() => setLinkModal(null)} className="text-white/30 hover:text-white/60">
              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
          {linkModal.fileType.startsWith('video') && (
            <p className="text-[11px] text-primary/70 mb-2">Al vincular un video la tarea pasará a <strong>En revisión</strong> automáticamente</p>
          )}
          <select value={linkTaskId} onChange={e => setLinkTaskId(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-[#141824] px-3 py-2 text-[12px] text-white/70 focus:outline-none focus:border-primary/40 mb-2">
            <option value="">Seleccionar tarea...</option>
            {linkableTasks.map((t: any) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={handleLinkTask} disabled={!linkTaskId || linking}
              className="flex-1 rounded-lg bg-primary py-1.5 text-[12px] font-medium text-white disabled:opacity-40 transition-opacity">
              {linking ? 'Vinculando...' : 'Vincular'}
            </button>
            <button onClick={() => setLinkModal(null)}
              className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] text-white/40 hover:text-white/70">
              Omitir
            </button>
          </div>
        </div>
      )}
      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="mx-4 mb-2 flex flex-col gap-1.5">
          {pendingFiles.map((f, i) => {
            const typeLabel = f.type.startsWith('image') ? '🖼 Imagen' : f.type.startsWith('video') ? '🎬 Video' : f.type === 'application/pdf' ? '📄 PDF' : '📎 Archivo';
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                {f.preview ? (
                  <img src={f.preview} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
                    <Paperclip className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="truncate text-[12px] text-white/70">{f.name}</p>
                    <span className="text-[10px] text-white/30 ml-2 shrink-0">{typeLabel}</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${f.progress || 5}%` }} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-primary">{f.progress < 100 ? `Subiendo ${f.progress}%` : '✓ Listo'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Composer */}
      <div className="px-4 pb-4 pt-1">
        <form onSubmit={handleSend}>
          <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] px-2 py-2 transition-colors focus-within:border-primary/40">
            <div className="flex items-center gap-1">
              <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*,video/*,.pdf,.zip,.doc,.docx" onChange={handleFileUpload} />
              {[
                { Icon: Plus, tip: 'Más opciones' },
                { Icon: Smile, tip: 'Emojis' },
                { Icon: AtSign, tip: 'Mencionar' },
                { Icon: Slash, tip: 'Comandos' },
              ].map(({ Icon, tip }, i) => (
                <div key={i} className="relative group/tip">
                  <button type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </button>
                  <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1a1d2e] border border-white/[0.08] px-2 py-1 text-[11px] text-white/70 opacity-0 transition-opacity delay-500 group-hover/tip:opacity-100 z-30">
                    {tip}
                  </div>
                </div>
              ))}
              <div className="relative group/tip">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${uploading ? 'text-primary animate-pulse' : 'text-white/35 hover:bg-white/[0.06] hover:text-white'}`}>
                  <Paperclip className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
                <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1a1d2e] border border-white/[0.08] px-2 py-1 text-[11px] text-white/70 opacity-0 transition-opacity delay-500 group-hover/tip:opacity-100 z-30">
                  Adjuntar archivo
                </div>
              </div>
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder={`Escribe en #${title}…`}
                className="min-w-0 flex-1 bg-transparent px-2 text-[13.5px] text-white placeholder:text-white/25 focus:outline-none" />
              <button type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/[0.1]">
                <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
              <button type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white">
                <Mic className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
              <button type="submit" disabled={!input.trim() || sending}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white transition-all hover:bg-primary/90 disabled:opacity-30"
                style={{ boxShadow: input.trim() ? `0 0 16px -2px ${accentColor}70` : 'none' }}>
                <Send className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            </div>
          </div>
          <p className="mt-1 px-2 text-[11px] text-white/20">Enter para enviar · @ para mencionar · / para comandos</p>
        </form>
      </div>
      {/* Emoji picker portal fixed */}
    </section>
  );
}

// ─── Thread Panel ──────────────────────────────────────────────────────────────
function ThreadPanel({ msg, onClose, accentColor, room }: { msg: ChatMessage; onClose: () => void; accentColor: string; room: string }) {
  const color = (msg.user as any)?.color || accentColor;
  const initials = getInitials((msg.user as any)?.name ?? null, (msg.user as any)?.email ?? '');
  const [replies, setReplies] = useState<any[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchReplies = useCallback(async () => {
    const res = await fetch(`/api/chat/replies?parentId=${msg.id}`).catch(() => null);
    if (res?.ok) { const d = await res.json(); setReplies(d.replies || []); }
  }, [msg.id]);

  useEffect(() => { fetchReplies(); }, [fetchReplies]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [replies]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyInput.trim() || sending) return;
    setSending(true);
    const text = replyInput.trim();
    setReplyInput('');
    await fetch('/api/chat/replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, parentId: msg.id, room }),
    }).catch(() => {});
    await fetchReplies();
    setSending(false);
  }

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-white/[0.05] bg-[#11131a]">
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-white/[0.05] px-5">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Hilo</h2>
          {replies.length > 0 && <p className="text-[11px] text-white/30">{replies.length} {replies.length === 1 ? 'respuesta' : 'respuestas'}</p>}
        </div>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white">
          <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
        {/* Original message */}
        <div className="flex gap-3 pb-4 border-b border-white/[0.05]">
          <Avatar initials={initials} color={color} size={36} className="shrink-0 mt-0.5" image={(msg.user as any)?.image} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[13.5px] font-semibold text-white/95">{(msg.user as any)?.name || 'Usuario'}</span>
              <span className="text-[11px] text-white/30">
                {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-[13.5px] leading-[1.55] text-white/75">{msg.message}</p>
          </div>
        </div>
        {/* Replies */}
        {replies.length === 0 && (
          <p className="text-[11px] text-white/25 text-center py-6">Sin respuestas aún — sé el primero 🧵</p>
        )}
        <div className="mt-4 flex flex-col gap-4">
          {replies.map((r: any) => {
            const rInitials = getInitials(r.user?.name ?? null, r.user?.email ?? '');
            const rColor = r.user?.color || accentColor;
            return (
              <div key={r.id} className="flex gap-3">
                <Avatar initials={rInitials} color={rColor} size={28} className="shrink-0 mt-0.5" image={r.user?.image} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-[12.5px] font-semibold text-white/90">{r.user?.name || r.user?.email}</span>
                    <span className="text-[10px] text-white/25">
                      {new Date(r.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[13px] leading-[1.5] text-white/70">{r.message}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>
      <div className="px-4 pb-4 pt-1">
        <form onSubmit={handleReply}>
          <div className="flex items-center gap-2 rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-3 py-2 focus-within:border-primary/40 transition-colors">
            <input value={replyInput} onChange={e => setReplyInput(e.target.value)}
              placeholder="Responder en hilo…"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-white/25 focus:outline-none" />
            <button type="submit" disabled={!replyInput.trim() || sending}
              className="text-primary disabled:opacity-30 transition-opacity">
              <Send className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ChatWithChannels() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role ?? '';
  const [activeId, setActiveId] = useState('TEAM');
  const [threadMsg, setThreadMsg] = useState<ChatMessage | null>(null);
  const [accentColor] = useState('#8B5CF6');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreads, setUnreads] = useState<Record<string, number>>({});
  const [clients, setClients] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string | null; email: string; color?: string; image?: string | null; role?: string }[]>([]);
  const [dmActivity, setDmActivity] = useState<Record<string, number>>({});

  // Fetch unreads
  useEffect(() => {
    fetch('/api/chat/unread').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.unreads) setUnreads(d.unreads); }).catch(() => {});
  }, []);

  // Fetch clients
  useEffect(() => {
    if (['CLIENT'].includes(role)) return;
    fetch('/api/clients?sidebar=1').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.clients) setClients(d.clients); }).catch(() => {});
  }, [role]);
  // Fetch workspace members for DMs
  useEffect(() => {
    fetch('/api/workspace/members?limit=20').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.members) setMembers(d.members); }).catch(() => {});
  }, []);

  // Listen for new messages → update unreads + dm sort
  useEffect(() => {
    return bus.on<{ room: string }>(RT_EVENTS.MESSAGE_SENT, (p) => {
      if (p.room !== activeId) {
        setUnreads(prev => ({ ...prev, [p.room]: (prev[p.room] || 0) + 1 }));
      }
      if (p.room.includes('_DM_')) {
        setDmActivity(prev => ({ ...prev, [p.room]: Date.now() }));
      }
    });
  }, [activeId]);

  // Clear unread when switching
  const handleSetActive = (id: string) => {
    setActiveId(id);
    setUnreads(prev => ({ ...prev, [id]: 0 }));
    setThreadMsg(null);
    setMobileOpen(false);
  };

  const isSupport = activeId === 'SUPPORT' && !['ADMIN'].includes(role);

  const rooms = [
    { id: 'TEAM',     name: 'general',   icon: 'hash',     subtitle: 'Equipo interno' },
    { id: 'SUPPORT',  name: 'soporte',   icon: 'support',  subtitle: 'Atención a clientes' },
    { id: 'PROJECTS', name: 'proyectos', icon: 'projects', subtitle: 'Discusión de proyectos' },
    { id: 'PRIVATE',  name: 'privado',   icon: 'hash',     locked: true, subtitle: 'Admin y Project Managers' },
  ].filter(r => {
    if (r.locked && !['ADMIN', 'PROJECT_MANAGER'].includes(role)) return false;
    return true;
  });

  const activeRoom = rooms.find(r => r.id === activeId) || clients.find(c => c.id === activeId);
  const activeDmUser = activeId.includes('_DM_') ? members.find(m => activeId.includes(m.id) && m.id !== (session?.user as any)?.id) ?? null : null;
  const activeTitle = activeDmUser ? (activeDmUser.name || activeDmUser.email) : ((activeRoom as any)?.name || activeId.toLowerCase());

  const channelList = (
    <ChannelList
      activeId={activeId}
      setActiveId={handleSetActive}
      rooms={rooms}
      clients={clients}
      role={role}
      members={[...members].filter(m => {
        if (m.role === 'CLIENT' || m.role === 'GUEST') return false;
        return true;
      }).sort((a, b) => {
        const myId = (session?.user as any)?.id ?? '';
        const dmA = [myId, a.id].sort().join('_DM_');
        const dmB = [myId, b.id].sort().join('_DM_');
        return (dmActivity[dmB] || 0) - (dmActivity[dmA] || 0);
      })}
      myId={(session?.user as any)?.id ?? ''}
      unreads={unreads}
    />
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Channel list desktop */}
      <div className="hidden md:flex">{channelList}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10">
            <button className="absolute top-3 right-3 text-white/40 hover:text-white z-10" onClick={() => setMobileOpen(false)}>
              <X className="w-4 h-4" />
            </button>
            {channelList}
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] shrink-0 md:hidden bg-card">
          <button onClick={() => setMobileOpen(true)} className="text-white/50 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-sm font-semibold text-white">#{activeTitle}</p>
        </div>

        {isSupport ? (
          <div className="flex-1 overflow-y-auto p-4 bg-background">
            <SupportTicket onClose={() => handleSetActive('TEAM')} />
          </div>
        ) : (
          <ChatMain
            key={activeId}
            room={activeId}
            title={activeTitle}
            accentColor={accentColor}
            onOpenThread={(msg) => setThreadMsg(msg)}
            dmUser={activeDmUser}
            role={role}
          />
        )}
      </div>

      {/* Thread panel */}
      {threadMsg && (
        <div className="hidden lg:flex">
          <ThreadPanel msg={threadMsg} onClose={() => setThreadMsg(null)} accentColor={accentColor} room={activeId} />
        </div>
      )}
    </div>
  );
}
