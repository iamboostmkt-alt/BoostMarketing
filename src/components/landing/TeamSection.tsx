'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Quote, UserCircle2 } from 'lucide-react'
import type { TeamMember } from '@/lib/types'
import { isImageSrc } from '@/lib/safe-image'

interface TeamSectionProps {
  members: TeamMember[]
}

const PLACEHOLDER_MEMBERS: TeamMember[] = [
  { id: 't1', name: 'Ana Martínez',     role: 'CEO & Fundadora',      imageUrl: '', quote: 'La creatividad es el motor que impulsa cada campaña que creamos.',     order: 0, isActive: true, createdAt: '', updatedAt: '' },
  { id: 't2', name: 'Carlos Rojas',     role: 'Director Creativo',    imageUrl: '', quote: 'Cada marca tiene una historia única — nuestra misión es contarla bien.', order: 1, isActive: true, createdAt: '', updatedAt: '' },
  { id: 't3', name: 'Laura Sánchez',    role: 'Especialista SEO',     imageUrl: '', quote: 'Los datos nos guían, pero la estrategia nos diferencia.',                order: 2, isActive: true, createdAt: '', updatedAt: '' },
  { id: 't4', name: 'Diego Torres',     role: 'Social Media Manager', imageUrl: '', quote: 'Las redes sociales son el puente entre la marca y su comunidad.',        order: 3, isActive: true, createdAt: '', updatedAt: '' },
  { id: 't5', name: 'Valentina Cruz',   role: 'Diseñadora Gráfica',   imageUrl: '', quote: 'El diseño no es solo estética — es comunicación visual poderosa.',       order: 4, isActive: true, createdAt: '', updatedAt: '' },
]

function MemberCard({
  member,
  isActive,
  onHover,
}: {
  member:  TeamMember
  isActive: boolean
  onHover:  () => void
}) {
  return (
    <div
      onMouseEnter={onHover}
      className={`group relative rounded-3xl overflow-hidden bg-surface-elevated border transition-all duration-500 cursor-pointer ${
        isActive
          ? 'border-brand/50 shadow-2xl shadow-brand/15 scale-[1.02]'
          : 'border-[var(--wl-border)] hover:border-white/[0.12] hover:scale-[1.01]'
      }`}
    >
      {/* Image */}
      <div className="aspect-[4/5] relative overflow-hidden">
        {isImageSrc(member.imageUrl) ? (
          <Image
            src={member.imageUrl}
            alt={member.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-brand/20 via-brand/10 to-transparent">
            <UserCircle2 className="w-24 h-24 text-brand-light/40" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0f] via-[#0b0b0f]/40 to-transparent" />

        {/* Quote overlay on hover */}
        {member.quote && (
          <div className="absolute inset-0 bg-[#0b0b0f]/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-6">
            <div className="relative">
              <Quote className="w-5 h-5 text-brand-light/40 absolute -top-2 -left-2" />
              <p className="text-sm text-[var(--wl-text-primary)]/85 italic leading-relaxed text-center">
                &ldquo;{member.quote}&rdquo;
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
        <p className="text-base sm:text-lg font-bold text-[var(--wl-text-primary)] leading-tight">
          {member.name}
        </p>
        <p className="text-[11px] sm:text-xs font-medium text-brand-light mt-0.5">
          {member.role}
        </p>
      </div>

      {/* Active marker */}
      {isActive && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-brand-light shadow-lg shadow-brand-light/50 animate-pulse" />
      )}
    </div>
  )
}

export default function TeamSection({ members }: TeamSectionProps) {
  const display = members.length > 0 ? members : PLACEHOLDER_MEMBERS
  const [active, setActive] = useState(0)

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

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {display.map((m, i) => (
            <div
              key={m.id}
              className="animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <MemberCard
                member={m}
                isActive={i === active}
                onHover={() => setActive(i)}
              />
            </div>
          ))}
        </div>

        {/* Bottom hint */}
        <p className="text-center text-xs text-muted-foreground/60 mt-10">
          Pasa el cursor sobre cada miembro para conocer su filosofía.
        </p>
      </div>
    </section>
  )
}
