'use client';

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, ChevronDown, Check, Loader2, Search, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ROLES = [
  { value: "PROJECT_MANAGER", label: "Project Manager" },
  { value: "TEAM_MEMBER",     label: "Team Member"     },
  { value: "DESIGNER",        label: "Designer"        },
  { value: "MARKETING",       label: "Marketing"       },
  { value: "SALES_REP",       label: "Sales Rep"       },
] as const;

type RoleValue = typeof ROLES[number]["value"];

interface Member {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
  color: string;
  customRole?: { label: string; color: string } | null;
}

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function RolePill({ value, onChange, size = "sm" }: {
  value: RoleValue;
  onChange: (r: RoleValue) => void;
  size?: "sm" | "lg";
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const label = ROLES.find(r => r.value === value)?.label ?? value;
  const isLarge = size === "lg";

  React.useEffect(() => {
    function out(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    if (isOpen) document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, [isOpen]);

  return (
    <div className="relative" ref={ref} style={{ zIndex: isOpen ? 100 : 1 }}>
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-1 transition-all whitespace-nowrap"
        style={{
          height: isLarge ? 36 : 24,
          padding: isLarge ? "0 12px" : "0 8px",
          borderRadius: 20,
          background: isOpen ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.04)",
          border: isOpen ? "1px solid rgba(124,58,237,0.40)" : "1px solid rgba(255,255,255,0.08)",
          fontSize: isLarge ? 13 : 11,
          fontWeight: 500,
          color: isOpen ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)",
        }}
        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; }}
        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
      >
        <span>{label}</span>
        <ChevronDown style={{ width: isLarge ? 13 : 11, height: isLarge ? 13 : 11, color: "rgba(255,255,255,0.25)", marginLeft: 3, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{ position: "absolute", right: 0, top: "100%", zIndex: 9999, minWidth: 160, background: "#0f0f17", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "4px 0", marginTop: 6, boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}
          >
            {ROLES.map(r => {
              const isSelected = r.value === value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => { onChange(r.value); setIsOpen(false); }}
                  className="relative flex w-full items-center transition-colors"
                  style={{ padding: "7px 12px", fontSize: 12, background: isSelected ? "rgba(124,58,237,0.08)" : "transparent", color: isSelected ? "#a78bfa" : "rgba(255,255,255,0.60)", fontWeight: isSelected ? 500 : 400 }}
                  onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.90)"; } }}
                  onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.60)"; } }}
                >
                  {isSelected && <div className="pointer-events-none absolute inset-y-0 right-0 w-full" style={{ background: "linear-gradient(to left, rgba(124,58,237,0.20) 0%, rgba(124,58,237,0.04) 50%, transparent 100%)" }} />}
                  {isSelected && <div className="absolute left-0 top-0 h-full" style={{ width: 2, background: "#7c3aed" }} />}
                  <span className="relative z-10">{r.label}</span>
                  {isSelected && <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6" }} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MemberRow({ member, isAdmin }: { member: Member; isAdmin?: boolean }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const roleLabel = member.customRole?.label || ROLES.find(r => r.value === member.role)?.label || member.role;
  const roleColor = member.customRole?.color || "#a78bfa";
  const roleBg = (member.customRole?.color || "#7c3aed") + "15";
  const roleBorder = (member.customRole?.color || "#7c3aed") + "25";

  React.useEffect(() => {
    function out(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, [menuOpen]);

  return (
    <motion.div
      layout
      whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
      className="flex items-center justify-between rounded-lg px-1.5 py-2"
    >
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={member.image ?? undefined} alt={member.name} />
          <AvatarFallback style={{ backgroundColor: (member.color || "#7c3aed") + "33", color: member.color || "#a78bfa" }} className="text-[11px] font-semibold">
            {initials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-[13px] font-medium text-white/80">{member.name}</p>
          <p className="text-[11px] text-white/25">{member.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap"
          style={{ color: roleColor, background: roleBg, borderColor: roleBorder }}>
          {roleLabel}
        </span>
        {isAdmin && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/20 transition-colors hover:bg-white/[0.05] hover:text-white/50"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.13 }}
                  style={{ position: "absolute", right: 0, top: "100%", zIndex: 9999, width: 160, background: "#0f0f17", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "4px 0", marginTop: 4, boxShadow: "0 16px 32px rgba(0,0,0,0.6)" }}
                >
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center px-3 py-2 text-left text-[12px] text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    Cambiar rol
                  </button>
                  <div className="my-1 h-px bg-white/[0.06]" />
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center px-3 py-2 text-left text-[12px] text-red-400 transition-colors hover:bg-red-500/[0.08]"
                  >
                    Eliminar miembro
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function InviteModal({ open, onClose }: InviteModalProps) {
  const [email,    setEmail]    = React.useState("");
  const [role,     setRole]     = React.useState<RoleValue>("TEAM_MEMBER");
  const [loading,  setLoading]  = React.useState(false);
  const [success,  setSuccess]  = React.useState(false);
  const [error,    setError]    = React.useState<string | null>(null);
  const [search,   setSearch]   = React.useState("");
  const [members,  setMembers]  = React.useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoadingMembers(true);
    fetch("/api/team/workload")
      .then(r => r.json())
      .then(d => setMembers(d.users ?? []))
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setEmail(""); setRole("TEAM_MEMBER");
        setError(null); setSuccess(false); setSearch("");
      }, 200);
    }
  }, [open]);

  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleInvite() {
    setError(null);
    if (!email.trim()) { setError("El correo es obligatorio."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError("Correo inválido."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: email.split("@")[0], email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al invitar."); return; }
      setSuccess(true);
      setEmail("");
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setError("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  const cardBase: React.CSSProperties = {
    background: "linear-gradient(135deg, #0a0a0f 0%, #0e0e14 100%)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14,
    position: "relative",
    overflow: "hidden",
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 px-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04]">
                  <UserPlus className="h-3.5 w-3.5 text-purple-400" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white/85 leading-none">Invitar miembro</p>
                  <p className="mt-0.5 text-[11px] text-white/30">Se enviará un correo con credenciales</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-white/25 transition-colors hover:bg-white/[0.05] hover:text-white/60">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {/* Container 1: Invite members */}
              <div style={cardBase} className="p-5">
                {/* Glow morado — sin borde blanco */}
                <div style={{ position: "absolute", bottom: -20, right: -20, width: 200, height: 140, background: "radial-gradient(ellipse at center, rgba(88,28,220,0.12) 0%, transparent 70%)", pointerEvents: "none", borderRadius: "50%" }} />
                <h2 className="text-[14px] font-medium text-white/85 relative z-10">Invite members</h2>
                <p className="mt-0.5 text-[12px] text-white/35 relative z-10">Add new members by entering their email address</p>
                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center relative z-10">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleInvite()}
                    className="h-[36px] flex-1 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3.5 text-[13px] text-white/70 placeholder-white/20 outline-none transition-all focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10"
                    disabled={loading}
                  />
                  <RolePill value={role} onChange={setRole} size="lg" />
                  <motion.button
                    type="button"
                    onClick={handleInvite}
                    disabled={loading || success}
                    whileHover={{ backgroundColor: "#6d28d9" }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="flex h-[36px] items-center gap-1.5 rounded-lg bg-[#7c3aed] px-5 text-[13px] font-medium text-white disabled:opacity-60 whitespace-nowrap"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : success ? <><Check className="h-3.5 w-3.5" />Enviado</> : "Invite"}
                  </motion.button>
                </div>
                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mt-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-400 relative z-10">
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Container 2: People with access */}
              <div style={cardBase} className="p-5">
                <div style={{ position: "absolute", bottom: -20, right: -20, width: 200, height: 140, background: "radial-gradient(ellipse at center, rgba(88,28,220,0.12) 0%, transparent 70%)", pointerEvents: "none", borderRadius: "50%" }} />
                <div className="flex items-center gap-2.5 mb-3 relative z-10">
                  <h2 className="text-[14px] font-medium text-white/80">People with access</h2>
                  <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-300">
                    {members.length} members
                  </span>
                </div>
                <div className="relative mb-2.5 z-10">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-[34px] w-full rounded-lg border border-white/[0.07] bg-white/[0.03] pl-9 pr-3.5 text-[13px] text-white/70 placeholder-white/20 outline-none transition-all focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10"
                  />
                </div>
                <div className="h-px bg-white/[0.05] mb-2 relative z-10" />
                <div className="max-h-56 overflow-y-auto space-y-0.5 relative z-10 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {loadingMembers ? (
                    <div className="py-6 text-center text-[12px] text-white/25">Cargando...</div>
                  ) : filtered.length === 0 ? (
                    <div className="py-6 text-center text-[12px] text-white/25">No members found</div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {filtered.map((member, i) => (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.12, delay: i * 0.025 }}
                        >
                          <MemberRow member={member} isAdmin={true} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
