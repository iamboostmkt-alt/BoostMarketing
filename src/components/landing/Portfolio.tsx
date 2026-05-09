'use client'

import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    quote: 'BoostMarketing transformó nuestra presencia digital. En 3 meses, nuestras ventas online crecieron un 180%. Su equipo es increíblemente profesional y creativo.',
    name: 'María García',
    company: 'CEO, ModaStudio',
    initials: 'MG',
    rating: 5,
  },
  {
    quote: 'El CRM que implementaron nos permitió organizar todo nuestro pipeline. Ahora cerramos el doble de deals en menos tiempo. Totalmente recomendado.',
    name: 'Carlos Rodríguez',
    company: 'Director, TechFlow',
    initials: 'CR',
    rating: 5,
  },
  {
    quote: 'La estrategia de contenido y SEO que diseñaron nos posicionó en el top 3 de Google para nuestros keywords principales. Resultados reales y medibles.',
    name: 'Ana Martínez',
    company: 'Fundadora, NaturalVida',
    initials: 'AM',
    rating: 5,
  },
]

export default function Portfolio() {
  return (
    <section id="portfolio" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand-light">
            Testimonios
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Lo que Dicen Nuestros{' '}
            <span className="text-gradient-brand">Clientes</span>
          </h2>
        </motion.div>

        {/* Testimonial cards */}
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.12, duration: 0.5, ease: 'easeOut' }}
              className="glass-card flex flex-col rounded-2xl p-6"
            >
              {/* Quote icon */}
              <Quote className="mb-4 h-8 w-8 text-brand/30" />

              {/* Quote text */}
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              {/* Rating */}
              <div className="mt-4 flex gap-1">
                {[...Array(testimonial.rating)].map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Author */}
              <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand-light">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
