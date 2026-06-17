'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

export function CompletedDeliverables({ tasks }: { tasks: any[] }) {
  const [open, setOpen] = useState(false);
  if (tasks.length === 0) return null;
  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden mt-2">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
        <div className="flex items-center gap-2 text-xs font-medium text-white/35">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400/50" />
          Listas ({tasks.length})
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/20 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-1.5 p-3 border-t border-white/[0.04]">
          {tasks.map((task: any) => (
            <div key={task.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.02] opacity-60">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
              <span className="text-xs text-white/45 line-through truncate flex-1">{task.title}</span>
              {task.dueDate && (
                <span className="text-[10px] text-white/25 shrink-0">
                  {new Date(task.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ total, completed }: { total: number; completed: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>Progreso general</span>
        <span className="font-semibold text-white/80">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>
      <p className="text-[11px] text-white/30">{completed} de {total} ítems completados</p>
    </div>
  );
}
