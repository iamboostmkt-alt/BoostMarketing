'use client'

import { useState } from 'react'
import { MessageCircle, Calendar, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import AppointmentModal from './AppointmentModal'

export default function Contact() {
  const [apptOpen, setApptOpen] = useState(false)

  return (
    <section id="contact" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Two CTA cards */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* WhatsApp card */}
          <a
            href="https://wa.me/message/RDOGLXNL6UAUL1"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card group flex flex-col gap-4 rounded-2xl p-6 transition-all duration-300 hover:border-green-500/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.08)] sm:p-8 animate-slide-up"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/15">
              <MessageCircle className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">¿Listo para empezar?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Escríbenos por WhatsApp y recibe atención inmediata. Respondemos en menos de 5 minutos.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-green-400 transition-transform group-hover:translate-x-1">
              Chatear ahora <ArrowRight className="h-4 w-4" />
            </span>
          </a>

          {/* Appointment card */}
          <button
            type="button"
            onClick={() => setApptOpen(true)}
            className="glass-card group flex flex-col gap-4 rounded-2xl p-6 text-left transition-all duration-300 hover:border-brand/20 hover:shadow-[0_0_30px_rgba(124,58,237,0.08)] sm:p-8 animate-slide-up w-full"
            style={{ animationDelay: '100ms' }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/15">
              <Calendar className="h-6 w-6 text-brand-light" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Agenda una videollamada</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Reserva una sesión de descubrimiento gratuita de 30 minutos con nuestro equipo.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-light transition-transform group-hover:translate-x-1">
              Agendar ahora <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>

        {/* Large CTA banner */}
        <div
          className="relative mt-12 overflow-hidden rounded-3xl animate-slide-up"
          style={{ animationDelay: '200ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand/20 via-brand-dark/10 to-cyan-500/5" />
          <div className="absolute inset-0 bg-surface-card/80 backdrop-blur-sm" />

          <div className="relative z-10 flex flex-col items-center px-6 py-16 text-center sm:px-12 sm:py-20">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15">
              <Sparkles className="h-7 w-7 text-brand-light" />
            </div>
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Empieza tu{' '}
              <span className="text-gradient-brand">transformación digital</span>{' '}
              hoy
            </h2>
            <p className="mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
              Únete a más de 150 empresas que ya escalaron su marca con BoostMarketing.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href="/login">
                <Button size="lg" className="bg-brand text-white hover:bg-brand-dark glow-brand">
                  Comenzar Ahora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setApptOpen(true)}
                className="border-white/15 bg-white/[0.04] text-[var(--wl-text-primary)] hover:bg-white/[0.08]"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Agendar Llamada
              </Button>
            </div>
          </div>

          <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-brand/5 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-cyan-500/5 blur-3xl" />
        </div>
      </div>

      <AppointmentModal open={apptOpen} onOpenChange={setApptOpen} />
    </section>
  )
}
