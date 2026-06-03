'use client'

import { Zap, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { isImageSrc } from '@/lib/safe-image'

const footerLinks = {
  Servicios: [
    { label: 'Producción de Contenido', href: '#services' },
    { label: 'Estrategia Digital', href: '#services' },
    { label: 'CRM & Automatización', href: '#services' },
    { label: 'Analytics & Reportes', href: '#services' },
  ],
  Legal: [
    { label: 'Términos de Servicio', href: '#' },
    { label: 'Política de Privacidad', href: '#' },
    { label: 'Cookies', href: '#' },
  ],
}

interface FooterProps {
  agencyName?: string
  logoUrl?: string
  email?: string
  phone?: string
  instagram?: string
  facebook?: string
  tiktok?: string
  linkedin?: string
  whatsapp?: string
}

export default function Footer({
  agencyName = 'BoostMarketing',
  logoUrl,
  email,
  phone,
  instagram,
  facebook,
  tiktok,
  linkedin,
  whatsapp,
}: FooterProps) {
  const socials = [
    { label: 'Instagram', href: instagram, svg: <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01 M7 2H17a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z" /> },
    { label: 'Facebook', href: facebook, svg: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /> },
    { label: 'TikTok', href: tiktok, svg: <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /> },
    { label: 'LinkedIn', href: linkedin, svg: <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></> },
  ].filter((s) => s.href && s.href.trim() !== '')

  const contactLinks = [
    email ? { label: email, href: `mailto:${email}` } : null,
    phone ? { label: phone, href: `tel:${phone.replace(/\s/g, '')}` } : null,
  ].filter(Boolean) as { label: string; href: string }[]

  const waUrl = whatsapp?.trim()
    ? whatsapp.startsWith('http')
      ? whatsapp
      : `https://wa.me/${whatsapp.replace(/\D/g, '')}`
    : null

  return (
    <>
      <footer className="mt-auto border-t border-border bg-[#0a0a0e]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand column */}
            <div className="sm:col-span-2">
              <Link href="/" className="flex items-center gap-2">
                {isImageSrc(logoUrl) ? (
                  <Image src={logoUrl!} alt={agencyName} width={32} height={32} className="h-8 w-8 rounded-lg object-contain" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                )}
                <span className="text-lg font-bold text-foreground">{agencyName}</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Agencia creativa y plataforma CRM que impulsa el crecimiento de marcas con estrategia, contenido y tecnología.
              </p>

              {/* Social icons — only rendered if at least one link exists */}
              {socials.length > 0 && (
                <div className="mt-6 flex gap-3">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href!}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated text-muted-foreground transition-colors hover:bg-brand/15 hover:text-brand-light"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        {s.svg}
                      </svg>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Servicios column */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="text-sm font-semibold text-foreground">{title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Contact column — only rendered if at least one item */}
            {contactLinks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground">Contacto</h4>
                <ul className="mt-4 space-y-2.5">
                  {contactLinks.map((link) => (
                    <li key={link.href}>
                      <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground break-all">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Banner Weeklink */}
          <div className="mt-10 rounded-2xl border border-violet-100 bg-violet-50/60 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 shrink-0">
                <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                  <path d="M8 11L12 21L16 13L20 21L24 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-violet-900">BoostMarketing usa Weeklink internamente</p>
                <p className="text-xs text-violet-600">La plataforma todo en uno para agencias modernas</p>
              </div>
            </div>
            <a href="/weeklink"
              className="shrink-0 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-violet-700 hover:-translate-y-px"
              style={{ boxShadow: '0 4px 15px rgba(124,58,237,0.25)' }}>
              Ver Weeklink →
            </a>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} {agencyName}. Todos los derechos reservados.
            </p>
            <p className="text-xs text-muted-foreground">Hecho con 💜 en Ciudad de México</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp floating button — only shown if whatsapp is configured */}
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chatear por WhatsApp"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
    </>
  )
}
