'use client';

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, ChevronDown, Check, Loader2 } from "lucide-react";

const ROLES = [
  { value: "PROJECT_MANAGER", label: "Project Manager" },
  { value: "TEAM_MEMBER",     label: "Team Member"     },
  { value: "DESIGNER",        label: "Designer"        },
  { value: "MARKETING",       label: "Marketing"       },
  { value: "SALES_REP",       label: "Sales Rep"       },
] as const;

type RoleValue = typeof ROLES[number]["value"];

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

export function InviteModal({ open, onClose }: InviteModalProps) {
  const [name,     setName]     = React.useState("");
  const [email,    setEmail]    = React.useState("");
  const [role,     setRole]     = React.useState<RoleValue>("TEAM_MEMBER");
  const [tempPass, setTempPass] = React.useState("");
  const [loading,  setLoading]  = React.useState(false);
  const [success,  setSuccess]  = React.useState(false);
  const [error,    setError]    = React.useState<string | null>(null);
  const [roleOpen, setRoleOpen] = React.useState(false);
  const roleRef = React.useRef<HTMLDivElement>(null);

  // Cerrar role dropdown al click fuera
  React.useEffect(() => {
    function handleOut(e: MouseEvent) {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleOpen(false);
    }
    if (roleOpen) document.addEventListener("mousedown", handleOut);
    return () => document.removeEventListener("mousedown", handleOut);
  }, [roleOpen]);

  // Reset al cerrar
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setName(""); setEmail(""); setRole("TEAM_MEMBER");
        setTempPass(""); setError(null); setSuccess(false);
      }, 200);
    }
  }, [open]);

  // Cerrar con Escape
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const roleLabel = ROLES.find(r => r.value === role)?.label ?? role;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError("Nombre y correo son obligatorios."); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role, ...(tempPass ? { tempPassword: tempPass } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al invitar."); return; }
      setSuccess(true);
      setTimeout(onClose, 1800);
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <div
              className="rounded-2xl border border-white/[0.08] shadow-2xl"
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
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/25 transition-colors hover:bg-white/[0.05] hover:text-white/60"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="space-y-3 p-6">

                {/* Nombre */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-white/25">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Ana García"
                    className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0e0e14] px-3 text-[13px] text-white/80 placeholder-white/20 outline-none transition-all focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/10"
                    disabled={loading || success}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-white/25">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ana@agencia.com"
                    className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0e0e14] px-3 text-[13px] text-white/80 placeholder-white/20 outline-none transition-all focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/10"
                    disabled={loading || success}
                  />
                </div>

                {/* Rol — custom select con degradado del sidebar */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-white/25">
                    Rol
                  </label>
                  <div className="relative" ref={roleRef}>
                    <button
                      type="button"
                      onClick={() => setRoleOpen(!roleOpen)}
                      disabled={loading || success}
                      className="flex h-9 w-full items-center justify-between rounded-lg border border-white/[0.08] bg-[#0e0e14] px-3 text-[13px] text-white/70 transition-all hover:border-white/[0.14]"
                      style={{ outline: "none" }}
                    >
                      <span>{roleLabel}</span>
                      <ChevronDown
                        className="h-3.5 w-3.5 text-white/25 transition-transform"
                        style={{ transform: roleOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                      />
                    </button>

                    <AnimatePresence>
                      {roleOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-white/[0.08] bg-[#16161e] py-1 shadow-2xl"
                        >
                          {ROLES.map((r) => {
                            const isSelected = r.value === role;
                            return (
                              <button
                                key={r.value}
                                type="button"
                                onClick={() => { setRole(r.value); setRoleOpen(false); }}
                                className="relative flex w-full items-center overflow-hidden px-3 py-2 text-left text-[12px] transition-colors"
                                style={{
                                  background: isSelected ? "#1a1a1a" : "transparent",
                                  color: isSelected ? "#a78bfa" : "rgba(255,255,255,0.60)",
                                  fontWeight: isSelected ? 500 : 400,
                                }}
                                onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.90)"; } }}
                                onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.60)"; } }}
                              >
                                {/* Degradado neon — igual que nav activo sidebar */}
                                {isSelected && (
                                  <div
                                    className="pointer-events-none absolute inset-y-0 right-0 w-full"
                                    style={{ background: "linear-gradient(to left, rgba(124,58,237,0.25) 0%, rgba(124,58,237,0.05) 50%, transparent 100%)" }}
                                  />
                                )}
                                {isSelected && (
                                  <div className="absolute left-0 top-0 h-full w-0.5 bg-[#7c3aed]" />
                                )}
                                <span className="relative z-10">{r.label}</span>
                                {isSelected && (
                                  <div className="absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-purple-500" />
                                )}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Password temporal (opcional) */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-white/25">
                    Contraseña temporal <span className="normal-case text-white/20">(opcional — se genera automática)</span>
                  </label>
                  <input
                    type="text"
                    value={tempPass}
                    onChange={(e) => setTempPass(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0e0e14] px-3 font-mono text-[13px] text-white/60 placeholder-white/20 outline-none transition-all focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/10"
                    disabled={loading || success}
                  />
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-400"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Divider */}
                <div className="h-px bg-white/[0.06]" />

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="h-9 rounded-lg border border-white/[0.08] px-4 text-[13px] text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white/80"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    type="submit"
                    disabled={loading || success}
                    whileTap={{ scale: 0.97 }}
                    className="flex h-9 items-center gap-2 rounded-lg bg-[#7c3aed] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#6d28d9] disabled:opacity-60"
                  >
                    {loading ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Invitando...</>
                    ) : success ? (
                      <><Check className="h-3.5 w-3.5" /> Enviado</>
                    ) : (
                      <>Enviar invitación</>
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
