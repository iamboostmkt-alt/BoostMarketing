'use client';

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, ChevronDown, Check, Loader2, Search } from "lucide-react";
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
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-1 transition-all whitespace-nowrap"
        style={{
          height: isLarge ? 38 : 26,
          padding: isLarge ? "0 14px" : "0 10px",
          borderRadius: 20,
          background: isOpen ? "rgba(124,58,237,0.08)" : "#1a1a1f",
          border: isOpen ? "1px solid rgba(124,58,237,0.40)" : "1px solid rgba(255,255,255,0.08)",
          fontSize: isLarge ? 13 : 11,
          fontWeight: 500,
          color: isOpen ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)",
        }}
        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; }}
        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
      >
        <span>{label}</span>
        <ChevronDown style={{ width: isLarge ? 14 : 12, height: isLarge ? 14 : 12, color: "rgba(255,255,255,0.25)", marginLeft: 4, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-[60] mt-1.5 overflow-hidden shadow-2xl"
            style={{ minWidth: 160, background: "#16161e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "4px 0" }}
          >
            {ROLES.map(r => {
              const isSelected = r.value === value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => { onChange(r.value); setIsOpen(false); }}
                  className="relative flex w-full items-center transition-colors"
                  style={{ padding: "7px 12px", fontSize: 12, background: isSelected ? "#1a1a1a" : "transparent", color: isSelected ? "#a78bfa" : "rgba(255,255,255,0.60)", fontWeight: isSelected ? 500 : 400 }}
                  onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.90)"; } }}
                  onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.60)"; } }}
                >
                  {isSelected && <div className="pointer-events-none absolute inset-y-0 right-0 w-full" style={{ background: "linear-gradient(to left, rgba(124,58,237,0.25) 0%, rgba(124,58,237,0.05) 50%, transparent 100%)" }} />}
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

export function InviteModal({ open, onClose }: InviteModalProps) {
  const [email,    setEmail]    = React.useState("");
  const [role,     setRole]     = React.useState<RoleValue>("TEAM_MEMBER");
  const [loading,  setLoading]  = React.useState(false);
  const [success,  setSuccess]  = React.useState(false);
  const [error,    setError]    = React.useState<string | null>(null);
  const [search,   setSearch]   = React.useState("");
  const [members,  setMembers]  = React.useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState(false);

  // Cargar miembros al abrir
  React.useEffect(() => {
    if (!open) return;
    setLoadingMembers(true);
    fetch("/api/team/workload")
      .then(r => r.json())
      .then(d => setMembers(d.users ?? []))
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  }, [open]);

  // Reset al cerrar
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setEmail(""); setRole("TEAM_MEMBER");
        setError(null); setSuccess(false); setSearch("");
      }, 200);
    }
  }, [open]);

  // Escape
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

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
            <div
              className="rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
              style={{ background: "linear-gradient(180deg, #1a1a22 0%, #16161e 100%)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04]">
                    <UserPlus className="h-4 w-4 text-purple-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-white/90 leading-none">Invitar miembro</p>
                    <p className="mt-0.5 text-[12px] text-white/35">Se enviará un correo con credenciales</p>
                  </div>
                </div>
                <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-white/25 transition-colors hover:bg-white/[0.05] hover:text-white/60">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Sección 1: Invite */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <h2 className="text-[15px] font-medium text-white/90">Invite members</h2>
                  <p className="mt-1 text-[13px] text-white/40">Add new members by entering their email address</p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleInvite()}
                      className="h-[38px] flex-1 rounded-lg border border-white/[0.08] bg-[#1a1a1f] px-4 text-sm text-white/70 placeholder-white/25 outline-none transition-all focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/15"
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
                      className="flex h-[38px] items-center gap-2 rounded-lg bg-[#7c3aed] px-6 text-sm font-medium text-white disabled:opacity-60 whitespace-nowrap"
                    >
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : success ? <><Check className="h-3.5 w-3.5" /> Enviado</> : "Invite"}
                    </motion.button>
                  </div>
                  <AnimatePresence>
                    {error && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-400">
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sección 2: People with access */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-[14px] font-medium text-white/80">People with access</h2>
                    <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-medium text-purple-300">
                      {members.length} members
                    </span>
                  </div>
                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="h-[38px] w-full rounded-lg border border-white/[0.06] bg-[#1a1a1f] pl-10 pr-4 text-sm text-white/70 placeholder-white/25 outline-none transition-all focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/15"
                    />
                  </div>
                  <div className="h-px bg-white/[0.06] mb-2" />
                  {/* Lista */}
                  <div className="max-h-52 overflow-y-auto space-y-0.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {loadingMembers ? (
                      <div className="py-6 text-center text-[13px] text-white/30">Cargando...</div>
                    ) : filtered.length === 0 ? (
                      <div className="py-6 text-center text-[13px] text-white/30">No members found</div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {filtered.map((member, i) => (
                          <motion.div
                            key={member.id}
                            layout
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.13, delay: i * 0.03 }}
                            whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                            className="flex items-center justify-between rounded-lg px-1 py-2"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 shrink-0">
                                <AvatarImage src={member.image ?? undefined} alt={member.name} />
                                <AvatarFallback style={{ backgroundColor: (member.color || "#7c3aed") + "33", color: member.color || "#a78bfa" }} className="text-xs font-semibold">
                                  {initials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-[13px] font-medium text-white/85">{member.name}</p>
                                <p className="text-[12px] text-white/30">{member.email}</p>
                              </div>
                            </div>
                            <span
                              className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border"
                              style={{
                                color: member.customRole?.color || "#a78bfa",
                                background: (member.customRole?.color || "#7c3aed") + "18",
                                borderColor: (member.customRole?.color || "#7c3aed") + "30",
                              }}
                            >
                              {member.customRole?.label || ROLES.find(r => r.value === member.role)?.label || member.role}
                            </span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
