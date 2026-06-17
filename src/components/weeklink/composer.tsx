'use client'

import { Plus, Smile, AtSign, Slash, Paperclip, Sparkles, Mic, SendHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const tools = [
  { icon: Plus, label: 'Añadir' },
  { icon: Smile, label: 'Emoji' },
  { icon: AtSign, label: 'Mencionar' },
  { icon: Slash, label: 'Comandos' },
  { icon: Paperclip, label: 'Adjuntar' },
]

export function Composer({ placeholder, compact }: { placeholder: string; compact?: boolean }) {
  return (
    <div className="px-4 pb-4 pt-1">
      <div className="rounded-[18px] border border-[var(--wl-border)] bg-white/[0.03] px-2 py-2 transition-colors focus-within:border-violet-500/40">
        <div className="flex items-center gap-1">
          {tools.slice(0, compact ? 4 : 5).map((t, i) => (
            <button
              key={i}
              aria-label={t.label}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--wl-text-primary)]/65 transition-colors hover:bg-[var(--wl-hover)] hover:text-[var(--wl-text-primary)]/90"
            >
              <t.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          ))}
          <input
            type="text"
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent px-2 text-[13.5px] text-[var(--wl-text-primary)]/90 placeholder:text-[var(--wl-text-muted)] focus:outline-none"
          />
          {!compact && (
            <>
              <button
                aria-label="AI Assistant"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-violet-400 transition-colors hover:bg-primary/[0.1]"
              >
                <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
              <button
                aria-label="Nota de voz"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--wl-text-primary)]/65 transition-colors hover:bg-[var(--wl-hover)] hover:text-[var(--wl-text-primary)]/90"
              >
                <Mic className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            </>
          )}
          <button
            aria-label="Enviar"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-[var(--wl-text-primary)] transition-all hover:bg-[#7c4ddb] hover:shadow-[0_0_16px_-2px_rgba(139,92,246,0.7)]',
            )}
          >
            <SendHorizontal className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  )
}
