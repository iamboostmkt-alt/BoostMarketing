'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, CheckSquare, Calendar,
  UserCircle, Settings, Plus, Search, Building2,
  Video, Bell, Loader2,
} from 'lucide-react';
import {
  CommandDialog, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from '@/components/ui/command';
import { useSidebar } from './SidebarContext';

const NAV = [
  { label: 'Dashboard',    icon: LayoutDashboard, href: '/dashboard' },
  { label: 'CRM',          icon: Users,           href: '/dashboard/crm' },
  { label: 'Tareas',       icon: CheckSquare,     href: '/dashboard/tasks' },
  { label: 'Calendario',   icon: Calendar,        href: '/dashboard/calendar' },
  { label: 'Cuentas',      icon: Building2,       href: '/dashboard/clients' },
  { label: 'Reuniones',    icon: Video,           href: '/dashboard/calendar?tab=meetings' },
  { label: 'Ajustes',      icon: Settings,        href: '/dashboard/settings' },
  { label: 'Notificaciones', icon: Bell,          href: '/dashboard/notifications' },
];

const ACTIONS = [
  { label: 'Nueva Tarea',     icon: CheckSquare, href: '/dashboard/tasks?action=create' },
  { label: 'Nuevo Contacto',  icon: Users,       href: '/dashboard/crm?action=create' },
  { label: 'Nueva Cuenta',    icon: UserCircle,  href: '/dashboard/clients?action=create' },
];

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  type: 'client' | 'task' | 'contact';
  href: string;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function CommandPalette() {
  const router = useRouter();
  const { commandOpen, setCommandOpen } = useSidebar();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debouncedQuery = useDebounce(query, 280);

  // Búsqueda real
  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const [clientsRes, tasksRes, contactsRes] = await Promise.allSettled([
        fetch('/api/clients?search=' + encodeURIComponent(q) + '&limit=5'),
        fetch('/api/tasks?search=' + encodeURIComponent(q) + '&limit=5'),
        fetch('/api/contacts?search=' + encodeURIComponent(q) + '&limit=5'),
      ]);

      const items: SearchResult[] = [];

      if (clientsRes.status === 'fulfilled' && clientsRes.value.ok) {
        const d = await clientsRes.value.json();
        (d.clients ?? []).forEach((c: any) => items.push({
          id: 'client-' + c.id, label: c.name,
          sublabel: c.company || c.email || 'Cuenta',
          type: 'client', href: '/dashboard/clients',
        }));
      }
      if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
        const d = await tasksRes.value.json();
        (d.tasks ?? []).forEach((t: any) => items.push({
          id: 'task-' + t.id, label: t.title,
          sublabel: t.status || 'Tarea',
          type: 'task', href: '/dashboard/tasks',
        }));
      }
      if (contactsRes.status === 'fulfilled' && contactsRes.value.ok) {
        const d = await contactsRes.value.json();
        (d.contacts ?? []).forEach((c: any) => items.push({
          id: 'contact-' + c.id, label: c.name || c.email,
          sublabel: c.company || c.email || 'Contacto',
          type: 'contact', href: '/dashboard/crm',
        }));
      }

      setResults(items.slice(0, 10));
    } catch {}
    setSearching(false);
  }, []);

  useEffect(() => { search(debouncedQuery); }, [debouncedQuery, search]);

  // Reset al cerrar
  useEffect(() => { if (!commandOpen) { setQuery(''); setResults([]); } }, [commandOpen]);

  // Atajo ⌘K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandOpen, setCommandOpen]);

  const go = (href: string) => { setCommandOpen(false); router.push(href); };

  const typeIcon = (type: SearchResult['type']) => {
    if (type === 'client')  return <Building2 className="mr-2 h-3.5 w-3.5 text-violet-400/70" />;
    if (type === 'task')    return <CheckSquare className="mr-2 h-3.5 w-3.5 text-emerald-400/70" />;
    if (type === 'contact') return <Users className="mr-2 h-3.5 w-3.5 text-blue-400/70" />;
  };

  const typeLabel = (type: SearchResult['type']) =>
    type === 'client' ? 'Cuenta' : type === 'task' ? 'Tarea' : 'Contacto';

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={setCommandOpen}
      title="Búsqueda global"
      description="Busca tareas, cuentas, contactos o navega…"
    >
      <div className="flex items-center border-b border-[var(--wl-border)] px-3">
        <Search className="h-4 w-4 shrink-0 text-[var(--wl-text-placeholder)] mr-2" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar tareas, cuentas, contactos…"
          className="flex-1 bg-transparent py-3 text-[13px] text-[var(--wl-text-secondary)] placeholder-white/25 outline-none"
          autoFocus
        />
        {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--wl-text-placeholder)] ml-2" />}
      </div>

      <CommandList className="max-h-[400px]">
        <CommandEmpty className="py-8 text-center text-[13px] text-[var(--wl-text-placeholder)]">
          {query.length >= 2 ? 'Sin resultados.' : 'Escribe para buscar…'}
        </CommandEmpty>

        {/* Resultados de búsqueda */}
        {results.length > 0 && (
          <CommandGroup heading={`Resultados (${results.length})`}>
            {results.map(r => (
              <CommandItem key={r.id} onSelect={() => go(r.href)}
                className="text-[var(--wl-text-secondary)] aria-selected:text-[var(--wl-text-primary)] aria-selected:bg-[var(--wl-hover)] cursor-pointer">
                {typeIcon(r.type)}
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[13px] truncate">{r.label}</span>
                  {r.sublabel && (
                    <span className="text-[10px] text-[var(--wl-text-placeholder)] truncate">{r.sublabel}</span>
                  )}
                </div>
                <span className="text-[10px] text-[var(--wl-text-placeholder)] ml-2 shrink-0">{typeLabel(r.type)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Navegación — siempre visible */}
        {!query && (
          <>
            <CommandGroup heading="Navegar">
              {NAV.map(cmd => (
                <CommandItem key={cmd.href} onSelect={() => go(cmd.href)}
                  className="text-[var(--wl-text-secondary)] aria-selected:text-[var(--wl-text-primary)] aria-selected:bg-[var(--wl-hover)] cursor-pointer">
                  <cmd.icon className="mr-2 h-4 w-4 text-[var(--wl-text-muted)]" />
                  <span>{cmd.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator className="bg-[var(--wl-hover)]" />
            <CommandGroup heading="Crear">
              {ACTIONS.map(cmd => (
                <CommandItem key={cmd.href} onSelect={() => go(cmd.href)}
                  className="text-[var(--wl-text-secondary)] aria-selected:text-[var(--wl-text-primary)] aria-selected:bg-[var(--wl-hover)] cursor-pointer">
                  <Plus className="mr-2 h-4 w-4 text-violet-400/70" />
                  <span>{cmd.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      <div className="border-t border-[var(--wl-border-subtle)] px-3 py-2 flex items-center gap-3 text-[10px] text-[var(--wl-text-placeholder)]">
        <span><kbd className="font-mono">↑↓</kbd> navegar</span>
        <span><kbd className="font-mono">↵</kbd> abrir</span>
        <span><kbd className="font-mono">esc</kbd> cerrar</span>
        <span className="ml-auto"><kbd className="font-mono">⌘K</kbd> toggle</span>
      </div>
    </CommandDialog>
  );
}
