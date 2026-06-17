import Image from 'next/image'
import { Star } from 'lucide-react'
import type { Testimonial } from '@/lib/types'
import { isImageSrc } from '@/lib/safe-image'

interface TestimonialsSectionProps {
  items: Testimonial[]
}

const PLACEHOLDER: Testimonial[] = [
  {
    id: 't1', name: 'María García', role: 'CEO', company: 'ModaStudio',
    text: 'Desde que trabajamos con esta agencia, nuestras ventas crecieron un 180% en 3 meses. El equipo es increíble.',
    imageUrl: '', rating: 5, active: true, order: 0, createdAt: '', updatedAt: '',
  },
  {
    id: 't2', name: 'Carlos Rodríguez', role: 'Director', company: 'TechFlow',
    text: 'La estrategia de contenido y las campañas digitales duplicaron nuestra tasa de cierre de negocios.',
    imageUrl: '', rating: 5, active: true, order: 1, createdAt: '', updatedAt: '',
  },
  {
    id: 't3', name: 'Ana Martínez', role: 'Fundadora', company: 'NaturalVida',
    text: 'Pasamos de ser invisibles en Google a estar en el top 3 de búsquedas en menos de 6 meses.',
    imageUrl: '', rating: 5, active: true, order: 2, createdAt: '', updatedAt: '',
  },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-white/20'}`}
        />
      ))}
    </div>
  )
}

export default function TestimonialsSection({ items }: TestimonialsSectionProps) {
  const display = items.length > 0 ? items : PLACEHOLDER

  return (
    <section id="testimonials" className="py-20 sm:py-28 bg-surface-elevated/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14 animate-slide-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-medium text-brand-light mb-4">
            Testimonios
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Lo que dicen{' '}
            <span className="text-gradient-brand">nuestros clientes</span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-base text-muted-foreground sm:text-lg">
            Resultados reales de empresas que confiaron en nuestra estrategia y metodología.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {display.map((item, i) => (
            <div
              key={item.id}
              className="glass-card rounded-2xl p-6 hover:border-brand/20 hover:shadow-[0_0_30px_rgba(124,58,237,0.08)] transition-all duration-300 animate-slide-up flex flex-col gap-4"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <StarRating rating={item.rating} />

              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                &ldquo;{item.text}&rdquo;
              </p>

              <div className="flex items-center gap-3 pt-2 border-t border-[var(--wl-border)]">
                {isImageSrc(item.imageUrl) ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-brand-light text-sm font-semibold shrink-0">
                    {item.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[item.role, item.company].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
