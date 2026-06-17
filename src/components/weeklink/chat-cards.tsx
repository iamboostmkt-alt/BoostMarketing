'use client'


import React from 'react'
import { Play, FileText, Clock, Circle, FileArchive, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from './avatar'


export function VideoCard({
  thumb,
  name,
  meta,
  className,
}: {
  thumb: string
  name: string
  meta: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-3xl mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpen(false)}
              className="absolute -top-9 right-0 flex items-center gap-1 text-[13px] text-[var(--wl-text-secondary)] hover:text-[var(--wl-text-primary)] transition-colors">
              <X className="h-4 w-4" strokeWidth={1.75} /> Cerrar
            </button>
            <video src={thumb} controls autoPlay playsInline preload="auto"
              className="w-full rounded-2xl border border-[var(--wl-border)] shadow-2xl"
              style={{ maxHeight: '80vh' }} />
            <div className="mt-2 flex items-center justify-between px-1">
              <p className="text-[12px] text-[var(--wl-text-muted)] truncate">{name}</p>
              <a href={thumb} download={name}
                className="text-[11px] text-[var(--wl-text-primary)]/30 hover:text-[var(--wl-text-secondary)] transition-colors ml-3 shrink-0">
                ↓ descargar
              </a>
            </div>
          </div>
        </div>
      )}
      <div className={cn('group flex max-w-[420px] flex-col overflow-hidden rounded-2xl border border-[var(--wl-border)] bg-[var(--wl-elevated)] p-2 transition-colors hover:border-white/10', className)}>
        <div className="relative cursor-pointer" onClick={() => setOpen(true)}>
          <video src={thumb} preload="metadata" playsInline muted
            className="w-full rounded-xl border border-[var(--wl-border)] pointer-events-none"
            style={{ maxHeight: '180px' }} />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl hover:bg-black/40 transition-colors">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-lg hover:bg-white transition-colors">
              <Play className="h-4 w-4 translate-x-px fill-black text-black" strokeWidth={1.75} />
            </span>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1">
          <p className="truncate text-[12px] text-[var(--wl-text-muted)]">{name}</p>
          <a href={thumb} download={name}
            onClick={e => e.stopPropagation()}
            className="ml-2 shrink-0 text-[10px] text-[var(--wl-text-primary)]/25 hover:text-[var(--wl-text-primary)]/50 transition-colors">
            ↓ descargar
          </a>
        </div>
      </div>
    </>
  )
}

export function PdfCard({ name, meta }: { name: string; meta: string }) {
  return (
    <div className="flex max-w-[360px] items-center gap-3 rounded-2xl border border-[var(--wl-border)] bg-[var(--wl-elevated)] p-3 transition-colors hover:border-white/10">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/12 text-[#ef4444]">
        <FileText className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium">{name}</p>
        <p className="mt-0.5 text-[11px] text-[var(--wl-text-muted)]">{meta}</p>
      </div>
    </div>
  )
}

export function TaskCard({
  title,
  status,
  due,
  assignee,
}: {
  title: string
  status: 'En progreso' | 'Revisión' | 'Aprobado'
  due: string
  assignee: string
}) {
  const statusStyles: Record<string, string> = {
    'En progreso': 'bg-violet-500/15 text-violet-400',
    Revisión: 'bg-amber-400/15 text-amber-400',
    Aprobado: 'bg-emerald-400/15 text-emerald-400',
  }
  const person = { initials: (assignee as string).slice(0,2).toUpperCase(), color: '#8B5CF6' }
  return (
    <div className="flex max-w-[420px] items-center gap-3 rounded-2xl border border-[var(--wl-border)] bg-[var(--wl-elevated)] p-3 transition-colors hover:border-white/10">
      <Circle className="h-4 w-4 shrink-0 text-[var(--wl-text-muted)]" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium">{title}</p>
          <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', statusStyles[status])}>{status}</span>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--wl-text-muted)]">
          <Clock className="h-3 w-3" strokeWidth={1.75} />
          {due}
        </p>
      </div>
      <Avatar initials={person.initials} color={person.color} size={22} />
    </div>
  )
}

export function HeadlineOptions({ options }: { options: { key: string; text: string }[] }) {
  return (
    <div className="max-w-[420px] overflow-hidden rounded-2xl border border-[var(--wl-border)] bg-[var(--wl-elevated)]">
      {options.map((o, i) => (
        <div
          key={o.key}
          className={cn('flex items-center gap-3 px-3 py-2.5', i !== options.length - 1 && 'border-b border-[var(--wl-border-subtle)]')}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.06] text-[11px] font-semibold text-[var(--wl-text-primary)]/65">
            {o.key}
          </span>
          <span className="text-[13px] text-[var(--wl-text-primary)]/65">{o.text}</span>
        </div>
      ))}
    </div>
  )
}

export function ImageGallery({ images }: { images: string[] }) {
  const shown = images.slice(0, 3)
  const extra = images.length - 3
  return (
    <div className="flex max-w-[420px] gap-2">
      {shown.map((src, i) => (
        <div key={i} className="relative h-[72px] w-[72px] overflow-hidden rounded-xl border border-[var(--wl-border)]">
          <img src={src || '/placeholder.svg'} alt={`Asset ${i + 1}`} className="object-cover w-full h-full" />
        </div>
      ))}
      {extra > 0 && (
        <button className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-xl border border-[var(--wl-border)] bg-[var(--wl-elevated)] text-[var(--wl-text-primary)]/65 transition-colors hover:text-[var(--wl-text-primary)]/90">
          <span className="text-[13px] font-semibold">+{extra}</span>
          <span className="text-[10px] text-[var(--wl-text-muted)]">más</span>
        </button>
      )}
    </div>
  )
}

export function ArchiveCard({ name, meta }: { name: string; meta: string }) {
  return (
    <div className="flex max-w-[360px] items-center gap-3 rounded-2xl border border-[var(--wl-border)] bg-[var(--wl-elevated)] p-3 transition-colors hover:border-white/10">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/12 text-cyan-400">
        <FileArchive className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium">{name}</p>
        <p className="mt-0.5 text-[11px] text-[var(--wl-text-muted)]">{meta}</p>
      </div>
    </div>
  )
}
