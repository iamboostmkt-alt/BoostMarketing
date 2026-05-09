'use client'

import { Camera, Target, Zap, Users, BarChart3, Palette } from 'lucide-react'

const services = [
  {
    icon: Camera,
    title: 'Producción de Contenido',
    description: 'Video, foto, diseño gráfico. Creamos contenido visual que conecta con tu audiencia y genera resultados.',
  },
  {
    icon: Target,
    title: 'Estrategia Digital',
    description: 'Planificación, SEO, redes sociales. Diseñamos estrategias a medida para maximizar tu alcance digital.',
  },
  {
    icon: Zap,
    title: 'CRM & Automatización',
    description: 'Pipeline, tareas, workflows. Automatiza tu proceso de ventas y gestión de clientes en una sola plataforma.',
  },
  {
    icon: Users,
    title: 'Gestión de Clientes',
    description: 'Seguimiento, comunicación, reports. Mantén relaciones sólidas con herramientas de gestión avanzadas.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reportes',
    description: 'Métricas, KPIs, insights. Toma decisiones basadas en datos con reportes detallados en tiempo real.',
  },
  {
    icon: Palette,
    title: 'Branding & Diseño',
    description: 'Identidad, UI/UX, brand guide. Construimos marcas memorables con diseño estratégico y coherente.',
  },
]

export default function Services() {
  return (
    <section id="services" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center animate-slide-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand-light">
            Servicios
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Servicios que{' '}
            <span className="text-gradient-brand">Impulsan</span> tu Marca
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Todo lo que necesitas para crecer digitalmente, integrado en una sola plataforma.
          </p>
        </div>

        {/* Grid */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <div
              key={service.title}
              className="glass-card group cursor-default rounded-2xl p-6 transition-all duration-300 hover:border-brand/20 hover:shadow-[0_0_30px_rgba(124,58,237,0.08)] animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15">
                <service.icon className="h-5 w-5 text-brand-light" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{service.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
