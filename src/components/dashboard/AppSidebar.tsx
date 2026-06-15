'use client';

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  CheckSquare,
  Calendar,
  MessageSquare,
  UserCircle,
  BarChart3,
  Shield,
  Mail,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Plus,
  Zap,
  Command,
  HelpCircle,
  Palette,
  Home,
  FolderOpen,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { canAccessRoute, getRoleLabel } from "@/core/constants/roles";
import { useSidebar } from "./SidebarContext";
import { InviteModal } from "./InviteModal";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  clientOnly?: boolean;
  roles?: string[];
  disabled?: boolean;
  badge?: number;
};

const navItems: NavItem[] = [
  { href: "/dashboard",               label: "Home",       icon: Home },
  { href: "/dashboard/tasks",         label: "Tareas",     icon: CheckSquare },
  { href: "/dashboard/projects",      label: "Proyectos",  icon: FolderOpen },
  { href: "/dashboard/calendar",      label: "Calendario", icon: Calendar },
  { href: "/dashboard/chat",          label: "Chat",       icon: MessageSquare },
  { href: "/dashboard/client-portal", label: "Mi Portal",  icon: Briefcase, roles: ["CLIENT", "ADMIN", "PROJECT_MANAGER"] },
  { href: "/dashboard/crm",           label: "Leads",      icon: Users,      roles: ["ADMIN", "PROJECT_MANAGER", "SALES_REP"] },
  { href: "/dashboard/analytics",     label: "Analytics",  icon: BarChart3,  roles: ["ADMIN"] },
  { href: "/dashboard/admin",         label: "Admin",      icon: Shield,     roles: ["ADMIN"] },
];

// ─── User Dropdown ────────────────────────────────────────────────────────────
function UserDropdown({
  user,
  collapsed,
}: {
  user: { name: string; image?: string | null; color?: string; customRoleLabel?: string | null; customRoleColor?: string | null };
  collapsed: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center rounded-full transition-opacity hover:opacity-80"
      >
        <Avatar className="h-7 w-7">
          <AvatarImage src={user.image ?? undefined} alt={user.name} />
          <AvatarFallback
            style={{ backgroundColor: user.color || "#7c3aed" }}
            className="text-[10px] font-medium text-white"
          >
            {initials}
          </AvatarFallback>
        </Avatar>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/[0.08] bg-[#16161e] shadow-2xl",
              collapsed ? "left-full ml-2 top-0" : "right-0 bottom-full mb-2"
            )}
          >
            {/* Header: Avatar + nombre + rol */}
            <div className="flex items-center gap-3 px-3 py-3 border-b border-white/[0.06]">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                <AvatarFallback
                  style={{ backgroundColor: (user.color || "#7c3aed") + "33", color: user.color || "#a78bfa" }}
                  className="text-xs font-semibold"
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90 truncate">{user.name}</p>
                {user.customRoleLabel ? (
                  <span
                    className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium mt-0.5"
                    style={{ backgroundColor: (user.customRoleColor || "#7c3aed") + "22", color: user.customRoleColor || "#a78bfa" }}
                  >
                    {user.customRoleLabel}
                  </span>
                ) : (
                  <p className="text-[11px] text-white/40 truncate">Usuario</p>
                )}
              </div>
            </div>

            {/* Menu items */}
            <div className="p-1">
              <button
                onClick={() => { setOpen(false); router.push("/dashboard/settings"); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <User className="h-4 w-4" strokeWidth={1.5} />
                <span>Mi perfil</span>
              </button>
              <button
                onClick={() => { setOpen(false); router.push("/dashboard/settings"); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <Settings className="h-4 w-4" strokeWidth={1.5} />
                <span>Ajustes</span>
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white">
                <Palette className="h-4 w-4" strokeWidth={1.5} />
                <span className="flex-1 text-left">Apariencia</span>
                <ChevronRight className="h-3.5 w-3.5 text-white/30" />
              </button>
              <Link href="/dashboard/billing" onClick={() => setOpen(false)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white">
                <Zap className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
                <span>Billing & Plan</span>
                <span className="ml-auto text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">Upgrade</span>
              </Link>
              <div className="my-1 h-px bg-white/[0.06]" />
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white">
                <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
                <span>Soporte</span>
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white">
                <Command className="h-4 w-4" strokeWidth={1.5} />
                <span>Atajos</span>
                <span className="ml-auto text-[10px] text-white/25 font-mono">⌘K</span>
              </button>
              <div className="my-1 h-px bg-white/[0.06]" />
              <button
                onClick={() => signOut({ callbackUrl: "/weeklink" })}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Workspace Switcher ────────────────────────────────────────────────────────
function WorkspaceSwitcher({
  name, initial, color, image, collapsed, role, workspaceName, onInvite,
}: {
  name: string; initial: string; color: string; image?: string | null;
  collapsed: boolean; role?: string; workspaceName: string; onInvite: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const isAdmin = role === "ADMIN" || role === "admin";
  const isManager = ["ADMIN", "PROJECT_MANAGER"].includes(role ?? "");

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const trigger = collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <button onClick={() => setOpen(!open)} className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04] transition-colors hover:bg-white/[0.07]">
          <Avatar className="h-7 w-7">
            <AvatarImage src={image ?? undefined} alt={name} />
            <AvatarFallback style={{ backgroundColor: color + "33", color }} className="text-[10px] font-semibold">{initial}</AvatarFallback>
          </Avatar>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{name}</TooltipContent>
    </Tooltip>
  ) : (
    <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2.5 transition-colors hover:bg-white/[0.07]">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={image ?? undefined} alt={name} />
        <AvatarFallback style={{ backgroundColor: color + "33", color }} className="text-[10px] font-semibold">{initial}</AvatarFallback>
      </Avatar>
      <span className="flex-1 truncate text-left text-sm font-medium text-white/75">{name}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-white/30 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );

  return (
    <div ref={ref} className="relative">
      {trigger}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-white/[0.08] bg-[#0e0e14] shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-white/[0.06]">
            <p className="text-xs font-semibold text-white/80 truncate">{workspaceName}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{isAdmin ? "Administrador" : isManager ? "Project Manager" : "Equipo"}</p>
          </div>

          {/* Admin stats */}
          {isAdmin && (
            <div className="px-3 py-2 border-b border-white/[0.06]">
              <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Workspace</p>
              <Link href="/dashboard/billing" onClick={() => setOpen(false)} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.05] transition-colors group">
                <span className="text-xs text-white/60 group-hover:text-white/80">Plan actual</span>
                <span className="text-[10px] font-semibold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">Ver plan →</span>
              </Link>
              <Link href="/dashboard/team" onClick={() => setOpen(false)} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.05] transition-colors group">
                <span className="text-xs text-white/60 group-hover:text-white/80">Miembros</span>
                <span className="text-[10px] text-white/40">Ver todos →</span>
              </Link>
              <Link href="/dashboard/clients" onClick={() => setOpen(false)} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.05] transition-colors group">
                <span className="text-xs text-white/60 group-hover:text-white/80">Cuentas activas</span>
                <span className="text-[10px] text-white/40">Ver →</span>
              </Link>
            </div>
          )}

          {/* PM + equipo acciones */}
          <div className="px-3 py-2">
            <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Acciones</p>
            {role !== "CLIENT" && (
              <Link href="/dashboard/tasks?new=1" onClick={() => setOpen(false)} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.05] transition-colors group">
                <span className="text-white/40 group-hover:text-purple-400 text-sm">+</span>
                <span className="text-xs text-white/60 group-hover:text-white/80">Nueva tarea</span>
              </Link>
            )}
            <Link href="/dashboard/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.05] transition-colors group">
              <span className="text-white/40 group-hover:text-white/60 text-sm">⚙</span>
              <span className="text-xs text-white/60 group-hover:text-white/80">Ajustes</span>
            </Link>
            {isAdmin && (
              <button
                onClick={() => { setOpen(false); onInvite(); }}
                className="flex w-full items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.05] transition-colors group"
              >
                <span className="text-white/40 group-hover:text-purple-400 text-sm">👥</span>
                <span className="text-xs text-white/60 group-hover:text-white/80">Invitar usuario</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <div className="mb-0.5 mt-3 px-3 text-[9px] font-medium uppercase tracking-widest text-white/15">
      {children}
    </div>
  );
}

// ─── Nav Item ──────────────────────────────────────────────────────────────────
function NavItemButton({
  item,
  isActive,
  collapsed,
  badge,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  const [isHovered, setIsHovered] = React.useState(false);

  const content = (
    <Link
      href={item.href}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative mx-2 flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-all duration-150",
        collapsed && "mx-0 justify-center px-2",
        isActive ? "text-white/85" : "text-white/40 hover:text-white/70"
      )}
    >
      {/* Active background */}
      {isActive && (
        <motion.div
          layoutId="nav-active-bg"
          className="absolute inset-0 rounded-lg bg-white/[0.05]"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}

      {/* Active right gradient — neon purple, right to left, subtle */}
      {isActive && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-20 rounded-r-lg"
          style={{
            background: "linear-gradient(to left, rgba(139,92,246,0.12) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Active right dot */}
      {isActive && (
        <motion.div
          layoutId="nav-active-dot"
          className="absolute right-1.5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-violet-400/60"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}

      {/* Hover background */}
      {!isActive && (
        <div className="absolute inset-0 rounded-lg bg-white/[0.04] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
      )}

      <Icon
        className={cn(
          "relative z-10 h-[14px] w-[14px] shrink-0 transition-colors duration-150",
          isActive ? "text-violet-400/80" : "text-white/30 group-hover:text-white/60"
        )}
        strokeWidth={1.5}
      />

      {!collapsed && (
        <>
          <span className="relative z-10 flex-1 truncate">{item.label}</span>
          {badge && badge > 0 ? (
            <span className="relative z-10 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: '#7c3aed' }}>
              {badge > 99 ? '99+' : badge}
            </span>
          ) : (isActive || isHovered) && (
            <ChevronRight className="relative z-10 h-3 w-3 text-white/20" />
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }
  return content;
}

// ─── Clients Section ───────────────────────────────────────────────────────────
function ClientsSection({ collapsed, clients, isAdmin }: {
  collapsed: boolean;
  clients: Array<{id: string; name: string; color?: string}>;
  isAdmin: boolean;
}) {
  const [open, setOpen] = React.useState(true);
  if (collapsed) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-1"
      >
        <span className="flex-1 text-left text-[10px] uppercase tracking-widest text-white/20">
          Cuentas
        </span>
        {open ? (
          <ChevronDown className="h-3 w-3 text-white/20" />
        ) : (
          <ChevronRight className="h-3 w-3 text-white/20" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-0.5 pl-4">
              <Link
                href="/dashboard/clients"
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white/75"
              >
                <div className="h-2 w-2 rounded-full bg-purple-400/60" />
                <span className="truncate">Gestión de cuentas</span>
              </Link>
              {/* Cuentas reales — PM/Admin van al portal, Team va a tareas filtradas */}
              {clients.map(c => (
                <Link
                  key={c.id}
                  href={isAdmin ? `/dashboard/client-portal?clientId=${c.id}` : `/dashboard/tasks?clientId=${c.id}`}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white/70"
                >
                  <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: c.color || '#7c3aed' }} />
                  <span className="truncate">{c.name}</span>
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/dashboard/clients/new"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-purple-400/70 transition-colors hover:text-purple-400"
                >
                  <Plus className="h-3 w-3" />
                  <span>Nueva cuenta</span>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Settings Dropdown ─────────────────────────────────────────────────────────
function SettingsDropdown({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  const button = (
    <button
      onClick={() => setOpen(!open)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative mx-2 flex w-[calc(100%-16px)] items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/45 transition-all duration-150 hover:text-white/90",
        collapsed && "mx-0 w-full justify-center px-2"
      )}
    >
      <div className="absolute inset-0 rounded-lg bg-white/[0.04] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
      <Settings
        className="relative z-10 h-[15px] w-[15px] shrink-0 text-white/55 transition-colors duration-150 group-hover:text-purple-400"
        strokeWidth={1.5}
      />
      {!collapsed && (
        <>
          <span className="relative z-10 flex-1 text-left">Ajustes</span>
          {isHovered && (
            <ChevronDown
              className={cn(
                "relative z-10 h-3 w-3 text-white/20 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          )}
        </>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">Ajustes</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      {button}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="ml-6 mt-1 space-y-0.5 border-l border-white/[0.06] pl-3">
              {["General", "Notificaciones", "Seguridad", "Apariencia"].map((item) => (
                <Link
                  key={item}
                  href={`/dashboard/settings/${item.toLowerCase()}`}
                  className="block rounded-lg px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white/80"
                >
                  {item}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Sidebar ──────────────────────────────────────────────────────────────
export default function AppSidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  // En móvil nunca colapsamos el sidebar — forzar expandido al abrir
  const [savedCollapsed, setSavedCollapsed] = React.useState(false);
  const { data: session } = useSession();

  const userName        = session?.user?.name || "Usuario";
  const role            = session?.user?.role;
  const userImage       = session?.user?.image;
  const userColor       = session?.user?.color || "#7c3aed";
  const customRoleLabel = session?.user?.customRoleLabel ?? null;
  const customRoleColor = session?.user?.customRoleColor ?? "#7c3aed";
  const workspaceName   = session?.user?.workspaceName || "Mi Workspace";

  const workspaceInitial = workspaceName[0]?.toUpperCase() || "W";

  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const isClient   = role === "CLIENT";
  const isAdmin    = role === "ADMIN";
  const isManagerRole = ["ADMIN", "PROJECT_MANAGER"].includes(role ?? "");

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [chatUnread, setChatUnread] = React.useState(0);
  const [clients, setClients] = React.useState<Array<{id: string; name: string; color?: string}>>([]);

  React.useEffect(() => {
    if (isClient) return;
    // Cargar no leídos del chat
    fetch('/api/chat/unread').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.unreads) {
        const total = Object.values(d.unreads as Record<string,number>).reduce((a,b) => a+b, 0);
        setChatUnread(total);
      }
    }).catch(() => {});
    // Cargar cuentas según rol
    if (isAdmin || isManagerRole) {
      fetch('/api/clients?sidebar=1').then(r => r.ok ? r.json() : null).then(d => {
        if (d?.clients) setClients(d.clients.slice(0, 8));
      }).catch(() => {});
    }
  }, [isClient, isAdmin, isManagerRole]);
  const filteredNavItems = navItems.filter((item) => {
    if (item.roles) return item.roles.includes(role ?? "");
    if (isClient) return !!item.clientOnly;
    if (item.clientOnly) return false;
    return canAccessRoute(item.href, role);
  });

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-3">
        {!collapsed ? (
          <>
            <span className="text-sm font-semibold text-white/90">Weeklink</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCollapsed(true)}
                  className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60 border border-white/[0.08]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Colapsar</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <div className="w-full flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCollapsed(false)}
                  className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60 border border-white/[0.08]"
                >
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expandir</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Workspace label */}
      {!collapsed && (
        <div className="px-3 pt-1 pb-0.5 flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-white/20 font-medium">Workspace</span>
          <span className="text-[10px] text-white/20">·</span>
          <span className="text-[10px] text-white/35 font-medium truncate">{workspaceName}</span>
        </div>
      )}
      <div className="mx-2 mt-1">
        <WorkspaceSwitcher
          name={userName}
          initial={initials}
          color={userColor}
          image={userImage}
          collapsed={collapsed}
          role={role}
          workspaceName={workspaceName}
          onInvite={() => setInviteOpen(true)}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
        <SectionLabel collapsed={collapsed}>Menú Principal</SectionLabel>
        <div className="space-y-0.5">
          {filteredNavItems.map((item) => (
            <NavItemButton
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              collapsed={collapsed}
              badge={item.href === '/dashboard/chat' ? chatUnread : undefined}
            />
          ))}
        </div>

        {(isAdmin || isManagerRole) && (
          <ClientsSection collapsed={collapsed} clients={clients} isAdmin={isAdmin} />
        )}

        {/* Teams — solo ADMIN y PM */}
        {(isAdmin || isManagerRole) && (
          <>
            <SectionLabel collapsed={collapsed}>Equipo</SectionLabel>
            {!collapsed && (
              <div className="mt-2">
                <div className="mt-1 space-y-0.5 pl-4">
                  <Link
                    href="/dashboard/team"
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white/75"
                  >
                    <div className="h-2 w-2 rounded-full bg-sky-400/60" />
                    <span className="truncate">Ver equipo</span>
                  </Link>
                  <button
                    onClick={() => setInviteOpen(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-purple-400/70 transition-colors hover:text-purple-400"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Invitar miembro</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </nav>

      {/* Herramientas — fixed at bottom, never collapses */}
      <div className="border-t border-white/[0.06] pb-2 pt-2">
        {!collapsed && (
          <div className="mb-1 px-3 text-[10px] font-medium uppercase tracking-widest text-white/20">
            Herramientas
          </div>
        )}
        <div className="space-y-0.5">
          {/* Email — pendiente BR-email, ruta no existe aún */}
          <SettingsDropdown collapsed={collapsed} />
        </div>
      </div>


    </div>
  );

  // Sync: cuando el móvil abre, restaurar sidebar expandido
  React.useEffect(() => {
    if (mobileOpen && collapsed) {
      setSavedCollapsed(true);
      setCollapsed(false);
    }
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        style={{ width: collapsed ? 72 : 240, background: "linear-gradient(180deg, #0a0a0a 0%, #0f0f0f 50%, #0a0a0a 100%)" }}
        className="hidden md:flex flex-col border-r border-white/[0.06] overflow-hidden shrink-0 transition-[width] duration-300 ease-in-out"
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar — siempre expandido, ignora collapsed */}
      <aside
        className="fixed top-0 left-0 z-50 h-[100dvh] w-[240px] border-r border-white/[0.06] md:hidden transition-transform duration-300 ease-in-out flex flex-col"
        style={{ transform: mobileOpen ? "translateX(0)" : "translateX(-280px)", background: "linear-gradient(180deg, #0a0a0a 0%, #0f0f0f 50%, #0a0a0a 100%)" }}
      >
        {/* Botón cerrar en mobile */}
        <div className="flex h-14 items-center justify-between px-3 shrink-0">
          <span className="text-sm font-semibold text-white/90">Weeklink</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60 border border-white/[0.08]"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
        {/* Workspace label */}
        <div className="px-3 pt-1 pb-0.5 flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-white/20 font-medium">Workspace</span>
          <span className="text-[10px] text-white/20">·</span>
          <span className="text-[10px] text-white/35 font-medium truncate">{workspaceName}</span>
        </div>
        <div className="mx-2 mt-1">
          <WorkspaceSwitcher
            name={userName}
            initial={initials}
            color={userColor}
            image={userImage}
            collapsed={false}
            role={role}
            workspaceName={workspaceName}
            onInvite={() => { setInviteOpen(true); setMobileOpen(false); }}
          />
        </div>
        {/* Navigation mobile — siempre expanded */}
        <nav className="flex-1 overflow-y-auto py-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          <SectionLabel collapsed={false}>Menú Principal</SectionLabel>
          <div className="space-y-0.5">
            {filteredNavItems.map((item) => (
              <NavItemButton
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                collapsed={false}
                badge={item.href === '/dashboard/chat' ? chatUnread : undefined}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </div>
          {(isAdmin || isManagerRole) && (
            <ClientsSection collapsed={false} clients={clients} isAdmin={isAdmin} />
          )}
          {(isAdmin || isManagerRole) && (
            <>
              <SectionLabel collapsed={false}>Equipo</SectionLabel>
              <div className="mt-2">
                <div className="mt-1 space-y-0.5 pl-4">
                  <Link
                    href="/dashboard/team"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white/75"
                  >
                    <div className="h-2 w-2 rounded-full bg-sky-400/60" />
                    <span className="truncate">Ver equipo</span>
                  </Link>
                  <button
                    onClick={() => { setInviteOpen(true); setMobileOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-purple-400/70 transition-colors hover:text-purple-400"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Invitar miembro</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </nav>
        {/* Bottom tools */}
        <div className="border-t border-white/[0.06] pb-2 pt-2">
          <div className="mb-1 px-3 text-[10px] font-medium uppercase tracking-widest text-white/20">Herramientas</div>
          <SettingsDropdown collapsed={false} />
        </div>
      </aside>

      {/* Invite Modal — disponible desde cualquier punto del sidebar */}
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
