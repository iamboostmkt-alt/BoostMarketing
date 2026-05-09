'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'

const navLinks = [
  { label: 'Servicios', href: '#services' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Portafolio', href: '#portfolio' },
  { label: 'Contacto', href: '#contact' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="glass-nav fixed top-0 left-0 right-0 z-50">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">
            Boost<span className="text-gradient-brand">Marketing</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Iniciar Sesión
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="bg-brand hover:bg-brand-dark text-white">
              Empezar Gratis
            </Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </nav>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="bg-surface-card border-border w-[280px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-left">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-foreground">BoostMarketing</span>
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4 pt-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-center text-muted-foreground">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button className="w-full justify-center bg-brand text-white hover:bg-brand-dark">
                Empezar Gratis
              </Button>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
