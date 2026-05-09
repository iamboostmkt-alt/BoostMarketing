'use client'

import { Zap, MessageCircle, Instagram, Twitter, Linkedin, Youtube } from 'lucide-react'
import Link from 'next/link'

const footerLinks = {
  Company: [
    { label: 'Sobre Nosotros', href: '#' },
    { label: 'Equipo', href: '#' },
    { label: 'Carrera', href: '#' },
    { label: 'Blog', href: '#' },
  ],
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
  Contacto: [
    { label: 'hola@boostmarketing.io', href: 'mailto:hola@boostmarketing.io' },
    { label: '+52 55 1234 5678', href: 'tel:+525512345678' },
    { label: 'Ciudad de México, MX', href: '#' },
  ],
}

const socialLinks = [
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Youtube, href: '#', label: 'YouTube' },
]

export default function Footer() {
  return (
    <>
      <footer className="mt-auto border-t border-border bg-[#0a0a0e]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
            {/* Brand column */}
            <div className="sm:col-span-2">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-foreground">
                  Boost<span className="text-gradient-brand">Marketing</span>
                </span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Agencia creativa y plataforma CRM que impulsa el crecimiento de marcas con estrategia, contenido y tecnología.
              </p>
              {/* Social links */}
              <div className="mt-6 flex gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated text-muted-foreground transition-colors hover:bg-brand/15 hover:text-brand-light"
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="text-sm font-semibold text-foreground">{title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} BoostMarketing. Todos los derechos reservados.
            </p>
            <p className="text-xs text-muted-foreground">
              Hecho con 💜 en Ciudad de México
            </p>
          </div>
        </div>
      </footer>

      {/* WhatsApp floating button */}
      <a
        href="https://wa.me/1234567890"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chatear por WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </>
  )
}
