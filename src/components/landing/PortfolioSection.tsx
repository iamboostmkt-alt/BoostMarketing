import Image from 'next/image'
import { ExternalLink, ImageOff, ArrowUpRight } from 'lucide-react'
import type { PortfolioItem } from '@/lib/types'
import { isImageSrc } from '@/lib/safe-image'

interface PortfolioSectionProps {
  items: PortfolioItem[]
}

const PLACEHOLDER_ITEMS: PortfolioItem[] = [
  {
    id: 'p1', title: 'Campaña Redes Sociales', description: 'Estrategia integral de contenido para plataformas digitales con aumento de 180% en engagement.',
    imageUrl: '', tags: 'Social Media, Contenido', projectUrl: '', order: 0, active: true, createdAt: '', updatedAt: '',
  },
  {
    id: 'p2', title: 'Branding & Identidad Visual', description: 'Rediseño completo de marca para empresa tech, incluyendo logo, paleta y guía de estilo.',
    imageUrl: '', tags: 'Branding, Diseño', projectUrl: '', order: 1, active: true, createdAt: '', updatedAt: '',
  },
  {
    id: 'p3', title: 'SEO & Marketing de Contenidos', description: 'Posicionamiento top 3 en Google mediante estrategia de contenido y optimización técnica.',
    imageUrl: '', tags: 'SEO, Contenido', projectUrl: '', order: 2, active: true, createdAt: '', updatedAt: '',
  },
]

export default function PortfolioSection({ items }: PortfolioSectionProps) {
  const display = items.length > 0 ? items : PLACEHOLDER_ITEMS

  return (
    <section id="portfolio" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14 animate-slide-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-medium text-brand-light mb-4">
            Nuestro Trabajo
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Proyectos que{' '}
            <span className="text-gradient-brand">hablan por sí mismos</span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-base text-muted-foreground sm:text-lg">
            Resultados reales para marcas reales. Cada proyecto es una historia de crecimiento.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {display.map((item, i) => {
            const tagList = item.tags ? item.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
            return (
              <div
                key={item.id}
                className="glass-card group rounded-2xl overflow-hidden hover:border-brand/20 hover:shadow-[0_0_30px_rgba(124,58,237,0.08)] transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Image */}
                <div className="relative aspect-video bg-surface-elevated overflow-hidden">
                  {isImageSrc(item.imageUrl) ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageOff className="h-10 w-10 text-white/10" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-base font-semibold text-foreground leading-snug">{item.title}</h3>

                  {item.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{item.description}</p>
                  )}

                  {tagList.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tagList.map((tag) => (
                        <span key={tag} className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-light">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.projectUrl && (
                    <div className="mt-4 pt-4 border-t border-[var(--wl-border)]">
                      <a
                        href={item.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-light hover:text-brand transition-colors group"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver proyecto
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
