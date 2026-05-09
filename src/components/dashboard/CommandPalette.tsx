'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  UserCircle,
  BarChart3,
  Settings,
  Plus,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useSidebar } from './SidebarContext';

const navigationCommands = [
  { label: 'Ir a Dashboard', icon: LayoutDashboard, href: '/dashboard', shortcut: '⇧D' },
  { label: 'Ir a CRM', icon: Users, href: '/dashboard/crm', shortcut: '⇧C' },
  { label: 'Ir a Tareas', icon: CheckSquare, href: '/dashboard/tasks', shortcut: '⇧T' },
  { label: 'Ir a Calendario', icon: Calendar, href: '/dashboard/calendar', shortcut: '⇧A' },
  { label: 'Ir a Clientes', icon: UserCircle, href: '/dashboard/clients', shortcut: '⇧L' },
  { label: 'Ir a Analytics', icon: BarChart3, href: '/dashboard/analytics', shortcut: '⇧N' },
  { label: 'Ir a Ajustes', icon: Settings, href: '/dashboard/settings', shortcut: '⇧S' },
];

const actionCommands = [
  { label: 'Crear Tarea', icon: CheckSquare, href: '/dashboard/tasks?action=create', shortcut: '⌘T' },
  { label: 'Crear Contacto', icon: Users, href: '/dashboard/crm?action=create', shortcut: '⌘C' },
  { label: 'Crear Cliente', icon: UserCircle, href: '/dashboard/clients?action=create', shortcut: '⌘L' },
];

export default function CommandPalette() {
  const router = useRouter();
  const { commandOpen, setCommandOpen } = useSidebar();

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

  const runCommand = (command: () => void) => {
    setCommandOpen(false);
    command();
  };

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={setCommandOpen}
      title="Paleta de Comandos"
      description="Busca un comando para ejecutar..."
    >
      <CommandInput placeholder="Buscar comando o navegar..." />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
        <CommandGroup heading="Navegación">
          {navigationCommands.map((cmd) => (
            <CommandItem
              key={cmd.href}
              onSelect={() => runCommand(() => router.push(cmd.href))}
              className="text-white/70 aria-selected:text-white aria-selected:bg-white/[0.06] cursor-pointer"
            >
              <cmd.icon className="mr-2 h-4 w-4 text-white/40" />
              <span>{cmd.label}</span>
              <CommandShortcut className="text-white/20">{cmd.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator className="bg-white/[0.06]" />
        <CommandGroup heading="Acciones">
          {actionCommands.map((cmd) => (
            <CommandItem
              key={cmd.href}
              onSelect={() => runCommand(() => router.push(cmd.href))}
              className="text-white/70 aria-selected:text-white aria-selected:bg-white/[0.06] cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4 text-brand-light" />
              <span>{cmd.label}</span>
              <CommandShortcut className="text-white/20">{cmd.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
