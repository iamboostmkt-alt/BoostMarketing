'use client';

import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Menu, Search, Bell, Moon, User, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useSidebar } from './SidebarContext';
import { NotificationsDropdown } from './NotificationsDropdown';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/crm': 'CRM',
  '/dashboard/tasks': 'Tareas',
  '/dashboard/calendar': 'Calendario',
  '/dashboard/clients': 'Clientes',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/settings': 'Ajustes',
};

export default function TopNav() {
  const pathname = usePathname();
  const { setMobileOpen, setCommandOpen } = useSidebar();
  const { data: session } = useSession();

  // NON-BLOCKING: always render with defaults, update when session resolves
  const userName = session?.user?.name || 'Usuario';
  const userImage = session?.user?.image;

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getPageTitle = () => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (pathname === path || pathname.startsWith(path + '/')) {
        return title;
      }
    }
    return 'Dashboard';
  };

  return (
    <header className="h-16 border-b border-white/[0.06] bg-[#0b0b0f]/80 backdrop-blur-xl sticky top-0 z-30">
      <div className="flex items-center h-full px-4 md:px-6 gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-white/60 hover:text-white hover:bg-white/[0.06]"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Page title */}
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg font-semibold text-white truncate">{getPageTitle()}</h1>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-md mx-auto hidden sm:block">
          <button
            onClick={() => setCommandOpen(true)}
            className="w-full flex items-center gap-2 h-9 px-3 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-white/40 hover:text-white/60"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm flex-1 text-left">Buscar...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 h-5 px-1.5 rounded border border-white/[0.1] bg-white/[0.05] text-[10px] text-white/30 font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden text-white/60 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Notifications */}
          <NotificationsDropdown />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={userImage || undefined} alt={userName} />
                  <AvatarFallback className="bg-brand/20 text-brand-light text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 bg-[#15151c] border-white/[0.06] text-white"
              align="end"
              forceMount
            >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    <p className="text-xs leading-none text-white/40">
                      {session?.user?.email || ''}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="text-white/70 focus:text-white focus:bg-white/[0.06] cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-white/70 focus:text-white focus:bg-white/[0.06] cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <a href="/dashboard/settings" className="flex-1">Ajustes</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-white/70 focus:text-white focus:bg-white/[0.06] cursor-pointer">
                    <Moon className="mr-2 h-4 w-4" />
                    Tema Oscuro
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem
                  className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
