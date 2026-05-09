'use client'

import { motion } from 'framer-motion'
import { Search, Lightbulb, Rocket, RefreshCw } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Descubrimiento',
    description: 'Analizamos tu marca, mercado y objetivos para entender tu posición actual y potencial.',
  },
  {
    number: '02',
    icon: Lightbulb,
    title: 'Estrategia',
    description: 'Diseñamos el plan de acción personalizado con objetivos claros y medibles.',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Ejecución',
    description: 'Producimos y lanzamos contenido de alta calidad con procesos optimizados.',
  },
  {
    number: '04',
    icon: RefreshCw,
    title: 'Optimización',
    description: 'Medimos resultados y mejoramos continuamente para maximizar el rendimiento.',
  },
]

export default function Workflow() {
  return (
    <section id="workflow" className="relative py-20 sm:py-28">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/3 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand-light">
            Proceso
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Nuestro <span className="text-gradient-brand">Proceso</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Un enfoque probado en 4 pasos para transformar tu presencia digital.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="mt-16 flex flex-col gap-0 lg:flex-row lg:gap-0">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.15, duration: 0.5, ease: 'easeOut' }}
              className="group relative flex flex-1 flex-col items-center text-center lg:items-start lg:text-left"
            >
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="absolute top-8 left-[calc(50%+40px)] hidden h-px w-[calc(100%-80px)] bg-gradient-to-r from-brand/30 to-transparent lg:block" />
              )}

              {/* Connector line (mobile) */}
              {i < steps.length - 1 && (
                <div className="absolute top-16 left-1/2 h-8 w-px -translate-x-1/2 bg-gradient-to-b from-brand/30 to-transparent lg:hidden" />
              )}

              {/* Number circle */}
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-brand/10 transition-all duration-300 group-hover:bg-brand/20 group-hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]" />
                <div className="relative flex flex-col items-center">
                  <step.icon className="h-5 w-5 text-brand-light" />
                  <span className="mt-0.5 text-[10px] font-bold text-brand">{step.number}</span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
