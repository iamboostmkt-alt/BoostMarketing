'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { X, ExternalLink, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import type { PortfolioItem } from '@/lib/types'
import { isImageSrc } from '@/lib/safe-image'

interface PortfolioSectionProps {
  items: PortfolioItem[]
}

const PLACEHOLDER_ITEMS: PortfolioItem[] = [
  { id: 'p1', title: 'GymnasTwin — Redes Sociales', description: 'Estrategia de contenido que aumentó el engagement en 180% en 3 meses. Manejo de Instagram, TikTok y Facebook con publicaciones diarias, stories y reels virales.', imageUrl: '', tags: 'Social Media, Contenido, TikTok', projectUrl: '', order: 0, active: true, createdAt: '', updatedAt: '' },
  { id: 'p2', title: 'NÓMADA — Identidad Visual', description: 'Rediseño completo de marca: logo, paleta de colores, tipografía y guía de estilo corporativo. Incrementó reconocimiento de marca 3x en el mercado objetivo.', imageUrl: '', tags: 'Branding, Diseño, Logo', projectUrl: '', order: 1, active: true, createdAt: '', updatedAt: '' },
  { id: 'p3', title: 'IMEDI — SEO & Contenidos', description: 'Posicionamiento top 3 en Google para 15 keywords clave. Tráfico orgánico +320% en 6 meses mediante estrategia de contenido y optimización técnica.', imageUrl: '', tags: 'SEO, Blog, Keywords', projectUrl: '', order: 2, active: true, createdAt: '', updatedAt: '' },
  { id: 'p4', title: 'José Twin — Paid Ads', description: 'Campañas de Meta Ads con ROAS de 4.2x. Generación de 280 leads calificados en el primer mes con presupuesto optimizado al máximo.', imageUrl: '', tags: 'Meta Ads, Google Ads, ROAS', projectUrl: '', order: 3, active: true, createdAt: '', updatedAt: '' },
  { id: 'p5', title: 'Boostmarketing — Estrategia 360', description: 'Campaña integral: contenido + ads + email marketing. Revenue mensual +45% en Q2 2026 con ROI comprobado en cada canal.', imageUrl: '', tags: 'Estrategia, Email, Ads', projectUrl: '', order: 4, active: true, createdAt: '', updatedAt: '' },
  { id: 'p6', title: 'GymnasTwin — Branding 2.0', description: 'Evolución de marca post-rebranding. Nuevos colores, voz de marca y kit completo para redes sociales. Coherencia visual en todos los puntos de contacto.', imageUrl: '', tags: 'Branding, Guidelines, Assets', projectUrl: '', order: 5, active: true, createdAt: '', updatedAt: '' },
]

// Categorías derivadas de los tags
function getCategories(items: PortfolioItem[]): string[] {
  const cats = new Set<string>()
  items.forEach(item => {
    item.tags?.split(',').forEach(t => {
      const clean = t.trim()
      if (clean) cats.add(clean)
    })
  })
  return Array.from(cats).slice(0, 5) // max 5 categorías
}

// Placeholder visual cuando no hay imagen
const PLACEHOLDER_COLORS = [
  'from-violet-500/20 to-purple-600/20',
  'from-blue-500/20 to-cyan-600/20',
  'from-emerald-500/20 to-teal-600/20',
  'from-orange-500/20 to-red-500/20',
  'from-pink-500/20 to-rose-600/20',
  'from-amber-500/20 to-yellow-500/20',
]
const PLACEHOLDER_ICONS = ['📱', '🎨', '📈', '💰', '🚀', '✨']

export default function PortfolioSection({ items }: PortfolioSectionProps) {
  const display = items.filter(i => i.active).length > 0
    ? items.filter(i => i.active)
    : PLACEHOLDER_ITEMS

  const allCats = getCategories(display)
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [selected, setSelected] = useState<PortfolioItem | null>(null)
  const [carouselIdx, setCarouselIdx] = useState(0)
  const modalRef = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Filtrar items por categoría
  const filtered = activeCat
    ? display.filter(item => item.tags?.toLowerCase().includes(activeCat.toLowerCase()))
    : display

  // Imágenes del carrusel del item seleccionado
  // Si el item tiene imageUrl, usarla como primera imagen; el resto son placeholders
  const carouselImages = selected
    ? [
        selected.imageUrl,
        // Aquí podrían ir más imágenes si el modelo las tuviera
      ].filter(Boolean)
    : []

  // Cerrar modal con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Scroll al modal al abrirlo
  useEffect(() => {
    if (selected && modalRef.current) {
      setTimeout(() => {
        modalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    }
  }, [selected])

  const itemIdx = selected ? display.indexOf(selected) : 0
  const gradClass = PLACEHOLDER_COLORS[itemIdx % PLACEHOLDER_COLORS.length]
  const placeholderIcon = PLACEHOLDER_ICONS[itemIdx % PLACEHOLDER_ICONS.length]

  return (
    <section id="portfolio" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10 animate-slide-up">
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

        {/* Filtros por categoría */}
        {allCats.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            <button
              onClick={() => { setActiveCat(null); setSelected(null) }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                activeCat === null
                  ? 'bg-brand text-white border-brand'
                  : 'border-brand/20 text-muted-foreground hover:border-brand/40 hover:text-brand-light'
              }`}
            >
              Todos
            </button>
            {allCats.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCat(cat); setSelected(null) }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  activeCat === cat
                    ? 'bg-brand text-white border-brand'
                    : 'border-brand/20 text-muted-foreground hover:border-brand/40 hover:text-brand-light'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Grid de proyectos */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, i) => {
            const tagList = item.tags?.split(',').map(t => t.trim()).filter(Boolean) ?? []
            const isActive = selected?.id === item.id
            const idx = display.indexOf(item)
            const grad = PLACEHOLDER_COLORS[idx % PLACEHOLDER_COLORS.length]
            const icon = PLACEHOLDER_ICONS[idx % PLACEHOLDER_ICONS.length]

            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelected(isActive ? null : item)
                  setCarouselIdx(0)
                }}
                className={`glass-card group rounded-2xl overflow-hidden text-left transition-all duration-300 animate-slide-up ${
                  isActive
                    ? 'ring-2 ring-brand shadow-[0_0_30px_rgba(124,58,237,0.15)]'
                    : 'hover:border-brand/20 hover:shadow-[0_0_30px_rgba(124,58,237,0.08)] hover:-translate-y-1'
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {/* Imagen o placeholder */}
                <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${grad}`}>
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
                      <span className="text-5xl opacity-60">{icon}</span>
                    </div>
                  )}
                  {/* Overlay al hacer hover */}
                  <div className={`absolute inset-0 bg-brand/20 flex items-center justify-center transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <span className="text-white text-sm font-medium bg-black/40 px-3 py-1.5 rounded-full">
                      {isActive ? '← Cerrar' : 'Ver detalle →'}
                    </span>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-5">
                  <h3 className="text-base font-semibold text-foreground leading-snug">{item.title}</h3>
                  {item.description && (
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                  {tagList.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tagList.slice(0, 3).map(tag => (
                        <span key={tag} className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-light">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Panel de detalle con carrusel */}
        {selected && (
          <div
            ref={modalRef}
            className="mt-6 rounded-2xl border border-brand/20 overflow-hidden animate-slide-up"
            style={{ background: 'rgba(124,58,237,0.04)' }}
          >
            {/* Header del detalle */}
            <div className="flex items-start justify-between gap-4 p-6 border-b border-brand/10">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradClass} flex items-center justify-center text-2xl flex-shrink-0`}>
                  {placeholderIcon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selected.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selected.tags?.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                      <span key={tag} className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-light">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-0">
              {/* Carrusel de imágenes */}
              <div className="p-6 border-b lg:border-b-0 lg:border-r border-brand/10">
                {/* Imagen principal */}
                <div className={`relative rounded-xl overflow-hidden aspect-video bg-gradient-to-br ${gradClass} mb-4`}>
                  {carouselImages[carouselIdx] && isImageSrc(carouselImages[carouselIdx]) ? (
                    <Image
                      src={carouselImages[carouselIdx]}
                      alt={`${selected.title} imagen ${carouselIdx + 1}`}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-7xl opacity-50">{placeholderIcon}</span>
                    </div>
                  )}
                  {/* Flechas del carrusel */}
                  {carouselImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setCarouselIdx(i => Math.max(0, i - 1))}
                        disabled={carouselIdx === 0}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white disabled:opacity-30 hover:bg-black/60 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCarouselIdx(i => Math.min(carouselImages.length - 1, i + 1))}
                        disabled={carouselIdx === carouselImages.length - 1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white disabled:opacity-30 hover:bg-black/60 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails del carrusel */}
                {carouselImages.length > 1 && (
                  <div ref={carouselRef} className="flex gap-2 overflow-x-auto pb-1">
                    {carouselImages.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setCarouselIdx(i)}
                        className={`relative w-16 h-12 rounded-lg flex-shrink-0 overflow-hidden border-2 transition-all ${
                          carouselIdx === i ? 'border-brand' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        {isImageSrc(img) ? (
                          <Image src={img} alt={`thumb ${i}`} fill className="object-cover" />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${gradClass} flex items-center justify-center text-lg`}>
                            {placeholderIcon}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Descripción completa */}
              <div className="p-6 flex flex-col justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-light mb-2 uppercase tracking-wider">Descripción del proyecto</p>
                  <p className="text-base text-foreground leading-relaxed">
                    {selected.description || 'Proyecto de marketing digital con resultados comprobados para la marca.'}
                  </p>
                </div>

                {/* CTA */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  {selected.projectUrl ? (
                    <a
                      href={selected.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand-dark transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ver proyecto completo
                    </a>
                  ) : (
                    <a
                      href="#contacto"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand-dark transition-colors"
                    >
                      Quiero resultados así →
                    </a>
                  )}
                  <button
                    onClick={() => setSelected(null)}
                    className="inline-flex items-center justify-center px-5 py-2.5 border border-brand/20 text-brand-light rounded-xl text-sm font-medium hover:bg-brand/5 transition-colors"
                  >
                    Ver más proyectos
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  )
}
