'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Quote, UserCircle2 } from 'lucide-react'
import type { TeamMember } from '@/lib/types'
import { isImageSrc } from '@/lib/safe-image'

interface TeamSectionProps {
  members: TeamMember[]
}

const PLACEHOLDER_MEMBERS: TeamMember[] = [
  { id: 't1', name: 'Ana Martínez', role: 'CEO & Fundadora', imageUrl: '', quote: 'La creatividad es el motor que impulsa cada campaña que creamos.', order: 0, isActive: true, createdAt: '', updatedAt: '' },
  { id: 't2', name: 'Carlos Rojas', role: 'Director Creativo', imageUrl: '', quote: 'Cada marca tiene una historia única — nuestra misión es contarla bien.', order: 1, isActive: true, createdAt: '', updatedAt: '' },
  { id: 't3', name: 'Laura Sánchez', role: 'Especialista SEO', imageUrl: '', quote: 'Los datos nos guían, pero la estrategia nos diferencia.', order: 2, isActive: true, createdAt: '', updatedAt: '' },
  { id: 't4', name: 'Diego Torres', role: 'Social Media Manager', imageUrl: '', quote: 'Las redes sociales son el puente entre la marca y su comunidad.', order: 3, isActive: true, createdAt: '', updatedAt: '' },
  { id: 't5', name: 'Valentina Cruz', role: 'Diseñadora Gráfica', imageUrl: '', quote: 'El diseño no es solo estética — es comunicación visual poderosa.', order: 4, isActive: true, createdAt: '', updatedAt: '' },
]

export default function TeamSection({ members }: TeamSectionProps) {
  const display = members.length > 0 ? members : PLACEHOLDER_MEMBERS
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const next = useCallback(() => setActive((i) => (i + 1) % display.length), [display.length])
  const prev = useCallback(() => setActive((i) => (i - 1 + display.length) % display.length), [display.length])

  useEffect(() => {
    if (paused) return
    timerRef.current = setInterval(next, 4000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [next, paused])

  const member = display[active]

  return (
    <section id="team" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14 animate-slide-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-medium text-brand-light mb-4">
            Nuestro Equipo
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Las personas detrás de{' '}
            <span className="text-gradient-brand">cada resultado</span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-base text-muted-foreground sm:text-lg">
            Un equipo apasionado, creativo y orientado a resultados.
          </p>
        </div>

        {/* Carousel */}
        <div
          className="relative max-w-3xl mx-auto"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="glass-card rounded-3xl p-8 sm:p-12 animate-slide-up text-center" style={{ animationDelay: '100ms' }}>
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-brand/20 bg-surface-elevated">
                {isImageSrc(member.imageUrl) ? (
                  <Image
                    src={member.imageUrl}
                    alt={member.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-brand/10">
                    <UserCircle2 className="w-12 h-12 text-brand-light/60" />
                  </div>
                )}
              </div>
            </div>

            {/* Quote */}
            {member.quote && (
              <div className="mb-6 relative">
                <Quote className="w-6 h-6 text-brand/30 absolute -top-1 -left-1 sm:left-4 rotate-180" />
                <p className="text-lg sm:text-xl text-foreground/80 italic leading-relaxed px-4 sm:px-8">
                  &ldquo;{member.quote}&rdquo;
                </p>
              </div>
            )}

            {/* Name & role */}
            <p className="text-xl font-bold text-foreground">{member.name}</p>
            <p className="mt-1 text-sm font-medium text-brand-light">{member.role}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6 mt-8">
            <button
              onClick={prev}
              className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="flex gap-2">
              {display.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`rounded-full transition-all duration-300 ${i === active ? 'w-6 h-2 bg-brand' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
                  aria-label={`Ir al miembro ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thumbnail strip */}
        {display.length > 1 && (
          <div className="flex justify-center gap-3 mt-8 flex-wrap">
            {display.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setActive(i)}
                className={`flex flex-col items-center gap-1.5 transition-opacity duration-200 ${i === active ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
              >
                <div className={`w-10 h-10 rounded-full overflow-hidden bg-surface-elevated ring-2 ring-offset-2 ring-offset-[#0b0b0f] transition-all duration-200 ${i === active ? 'ring-brand/60' : 'ring-transparent'}`}>
                  {isImageSrc(m.imageUrl) ? (
                    <Image src={m.imageUrl} alt={m.name} width={40} height={40} className="object-cover w-full h-full" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-brand/10 text-[10px] font-bold text-brand-light">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-white/40 hidden sm:block truncate max-w-[64px]">{m.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
