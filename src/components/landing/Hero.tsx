'use client'

import Link from 'next/link'
import { ArrowRight, Play, TrendingUp, Users, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Hero() {
  return (
    <section className="hero-gradient relative min-h-screen overflow-hidden pt-16">
      {/* Animated background elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-float absolute top-20 left-[10%] h-72 w-72 rounded-full bg-brand/5 blur-3xl" />
        <div className="animate-float-delayed absolute bottom-20 right-[15%] h-96 w-96 rounded-full bg-brand-light/5 blur-3xl" />
        <div className="animate-float absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/3 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-center px-4 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:px-8 lg:py-24" style={{ minHeight: 'calc(100vh - 4rem)' }}>
        {/* Left: Copy */}
        <div className="flex max-w-2xl flex-1 flex-col items-center text-center lg:items-start lg:text-left">
          <div className="animate-slide-up" style={{ animationDelay: '0ms' }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-medium text-brand-light">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              Agencia Creativa &amp; CRM Platform
            </span>
          </div>

          <h1
            className="mt-6 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl animate-slide-up"
            style={{ animationDelay: '150ms' }}
          >
            Escala tu marca con{' '}
            <span className="text-gradient-brand">contenido</span> y{' '}
            <span className="text-gradient">automatización.</span>
          </h1>

          <p
            className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg animate-slide-up"
            style={{ animationDelay: '300ms' }}
          >
            Impulsamos tu presencia digital con estrategia, creatividad y tecnología.
            Desde producción de contenido hasta gestión de clientes, todo en una sola plataforma.
          </p>

          <div
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4 animate-slide-up"
            style={{ animationDelay: '450ms' }}
          >
            <Link href="/login">
              <Button size="lg" className="bg-brand text-white hover:bg-brand-dark glow-brand w-full sm:w-auto">
                Iniciar Ahora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#services">
              <Button variant="outline" size="lg" className="w-full border-border bg-transparent text-foreground hover:bg-surface-elevated sm:w-auto">
                <Play className="mr-2 h-4 w-4" />
                Ver Servicios
              </Button>
            </a>
          </div>
        </div>

        {/* Right: Dashboard mockup */}
        <div
          className="relative mt-12 flex-1 lg:mt-0 animate-slide-up"
          style={{ animationDelay: '600ms' }}
        >
          {/* Main mockup card */}
          <div className="glass-card glow-brand relative overflow-hidden rounded-2xl p-1">
            <div className="rounded-xl bg-surface-card p-4">
              {/* Top bar */}
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs text-muted-foreground">BoostMarketing Dashboard</span>
              </div>

              <div className="flex gap-4">
                {/* Sidebar */}
                <div className="hidden w-12 flex-col gap-3 sm:flex">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-full ${i === 0 ? 'w-10 bg-brand/40' : 'w-8 bg-white/5'}`}
                    />
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 space-y-3">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: TrendingUp, label: 'ROI', value: '3.2x', color: 'text-green-400' },
                      { icon: Users, label: 'Leads', value: '847', color: 'text-cyan-400' },
                      { icon: BarChart3, label: 'Conv.', value: '24%', color: 'text-brand-light' },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg bg-surface-elevated p-2.5">
                        <stat.icon className={`mb-1 h-3.5 w-3.5 ${stat.color}`} />
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className="text-sm font-semibold text-foreground">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Chart bars */}
                  <div className="rounded-lg bg-surface-elevated p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Rendimiento Mensual</span>
                      <span className="text-xs text-green-400">+23%</span>
                    </div>
                    <div className="flex items-end gap-1.5" style={{ height: 80 }}>
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-gradient-to-t from-brand/60 to-brand-light/80"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Mini list */}
                  <div className="space-y-1.5">
                    {['Campaña Redes Sociales', 'Email Marketing Q4', 'SEO Optimización'].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-surface-elevated px-2.5 py-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-green-400' : i === 1 ? 'bg-yellow-400' : 'bg-cyan-400'}`} />
                        <span className="text-xs text-muted-foreground">{item}</span>
                        <span className="ml-auto text-xs text-foreground">{i === 0 ? '92%' : i === 1 ? '78%' : '65%'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating cards */}
          <div className="animate-float absolute -top-4 -right-4 glass-card rounded-xl px-3 py-2 sm:-top-6 sm:-right-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/20">
                <TrendingUp className="h-3.5 w-3.5 text-green-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Crecimiento</p>
                <p className="text-sm font-semibold text-green-400">+127%</p>
              </div>
            </div>
          </div>

          <div className="animate-float-delayed absolute -bottom-2 -left-4 glass-card rounded-xl px-3 py-2 sm:-bottom-4 sm:-left-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/20">
                <Users className="h-3.5 w-3.5 text-brand-light" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Nuevos Leads</p>
                <p className="text-sm font-semibold text-foreground">+48 hoy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
