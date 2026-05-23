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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { canAccessRoute, getRoleLabel } from "@/lib/roles";
import { useSidebar } from "./SidebarContext";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard",               label: "Home",      icon: Home },
  { href: "/dashboard/client-portal", label: "Mi Portal", icon: Briefcase },
  { href: "/dashboard/crm",           label: "Leads",     icon: Users },
  { href: "/dashboard/tasks",         label: "Tareas",    icon: CheckSquare },
  { href: "/dashboard/calendar",      label: "Calendario",icon: Calendar },
  { href: "/dashboard/chat",          label: "Chat",      icon: MessageSquare },
  { href: "/dashboard/clients",       label: "Usuarios",  icon: UserCircle },
  { href: "/dashboard/analytics",     label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/admin",         label: "Admin",     icon: Shield, adminOnly: true },
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
              collapsed ? "left-full ml-2 top-0" : "right-0 top-full"
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
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white">
                <Zap className="h-4 w-4" strokeWidth={1.5} />
                <span>Upgrade</span>
                <span className="ml-auto text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">PRO</span>
              </button>
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
                onClick={() => signOut({ callbackUrl: "/" })}
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
  name,
  initial,
  color,
  image,
  collapsed,
}: {
  name: string;
  initial: string;
  color: string;
  image?: string | null;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04] transition-colors hover:bg-white/[0.07]">
            <Avatar className="h-7 w-7">
              <AvatarImage src={image ?? undefined} alt={name} />
              <AvatarFallback
                style={{ backgroundColor: color + "33", color: color }}
                className="text-[10px] font-semibold"
              >
                {initial}
              </AvatarFallback>
            </Avatar>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{name}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <button className="flex w-full items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2.5 transition-colors hover:bg-white/[0.07]">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={image ?? undefined} alt={name} />
        <AvatarFallback
          style={{ backgroundColor: color + "33", color: color }}
          className="text-[10px] font-semibold"
        >
          {initial}
        </AvatarFallback>
      </Avatar>
      <span className="flex-1 truncate text-left text-sm font-medium text-white/75">{name}</span>
      <ChevronDown className="h-4 w-4 shrink-0 text-white/30" />
    </button>
  );
}

// ─── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <div className="mb-1 mt-4 px-3 text-[10px] font-medium uppercase tracking-widest text-white/20">
      {children}
    </div>
  );
}

// ─── Nav Item ──────────────────────────────────────────────────────────────────
function NavItemButton({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const [isHovered, setIsHovered] = React.useState(false);

  const content = (
    <Link
      href={item.href}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative mx-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
        collapsed && "mx-0 justify-center px-2",
        isActive ? "text-white/90" : "text-white/60 hover:text-white/90"
      )}
    >
      {/* Active background */}
      {isActive && (
        <motion.div
          layoutId="nav-active-bg"
          className="absolute inset-0 rounded-lg bg-[#1a1a1a]"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}

      {/* Active right gradient — neon purple, right to left, subtle */}
      {isActive && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-20 rounded-r-lg"
          style={{
            background: "linear-gradient(to left, rgba(124,58,237,0.25) 0%, rgba(124,58,237,0.05) 50%, transparent 100%)",
          }}
        />
      )}

      {/* Active right dot */}
      {isActive && (
        <motion.div
          layoutId="nav-active-dot"
          className="absolute right-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-purple-500"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}

      {/* Hover background */}
      {!isActive && (
        <div className="absolute inset-0 rounded-lg bg-white/[0.04] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
      )}

      <Icon
        className={cn(
          "relative z-10 h-[15px] w-[15px] shrink-0 transition-colors duration-150",
          isActive ? "text-purple-400" : "text-white/55 group-hover:text-purple-400"
        )}
        strokeWidth={1.5}
      />

      {!collapsed && (
        <>
          <span className="relative z-10 flex-1 truncate">{item.label}</span>
          {(isActive || isHovered) && (
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
function ClientsSection({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = React.useState(true);
  if (collapsed) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-1"
      >
        <span className="flex-1 text-left text-[10px] uppercase tracking-widest text-white/20">
          Usuarios
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
                <span className="truncate">Ver todos</span>
              </Link>
              <Link
                href="/dashboard/admin/users"
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white/75"
              >
                <div className="h-2 w-2 rounded-full bg-blue-400/60" />
                <span className="truncate">Gestionar equipo</span>
              </Link>
              <Link
                href="/dashboard/admin/invite"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-purple-400/70 transition-colors hover:text-purple-400"
              >
                <Plus className="h-3 w-3" />
                <span>Invitar usuario</span>
              </Link>
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
  const { data: session } = useSession();

  const userName        = session?.user?.name || "Usuario";
  const role            = session?.user?.role;
  const userImage       = session?.user?.image;
  const userColor       = (session?.user as any)?.color || "#7c3aed";
  const customRoleLabel = (session?.user as any)?.customRoleLabel ?? null;
  const customRoleColor = (session?.user as any)?.customRoleColor ?? "#7c3aed";
  const workspaceName   = (session?.user as any)?.workspaceName || "Mi Workspace";

  const workspaceInitial = workspaceName[0]?.toUpperCase() || "W";

  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const filteredNavItems = navItems.filter((item) => canAccessRoute(item.href, role));

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
        <div className="px-3 pt-1 pb-0.5">
          <span className="text-[10px] uppercase tracking-widest text-white/20 font-medium">Workspace</span>
        </div>
      )}
      <div className="mx-2 mt-1">
        <WorkspaceSwitcher
          name={userName}
          initial={initials}
          color={userColor}
          image={userImage}
          collapsed={collapsed}
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
            />
          ))}
        </div>

        {/* Workspace / Usuarios section */}
        <SectionLabel collapsed={collapsed}>Workspace</SectionLabel>
        <ClientsSection collapsed={collapsed} />
      </nav>

      {/* Herramientas — fixed at bottom, never collapses */}
      <div className="border-t border-white/[0.06] pb-2 pt-2">
        {!collapsed && (
          <div className="mb-1 px-3 text-[10px] font-medium uppercase tracking-widest text-white/20">
            Herramientas
          </div>
        )}
        <div className="space-y-0.5">
          <NavItemButton
            item={{ href: "/dashboard/email", label: "Email", icon: Mail, disabled: true }}
            isActive={isActive("/dashboard/email")}
            collapsed={collapsed}
          />
          <SettingsDropdown collapsed={collapsed} />
        </div>
      </div>


    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        style={{ width: collapsed ? 72 : 240, background: "linear-gradient(180deg, #0a0a0a 0%, #0f0f0f 50%, #0a0a0a 100%)" }}
        className="hidden md:flex flex-col border-r border-white/[0.06] h-screen sticky top-0 overflow-hidden shrink-0 transition-[width] duration-300 ease-in-out"
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

      {/* Mobile sidebar */}
      <aside
        className="fixed top-0 left-0 z-50 h-screen w-[240px] border-r border-white/[0.06] md:hidden transition-transform duration-300 ease-in-out"
        style={{ transform: mobileOpen ? "translateX(0)" : "translateX(-280px)", background: "linear-gradient(180deg, #0a0a0a 0%, #0f0f0f 50%, #0a0a0a 100%)" }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
