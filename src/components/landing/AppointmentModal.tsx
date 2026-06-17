'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon, CheckCircle2, Video, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface AppointmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AppointmentModal({ open, onOpenChange }: AppointmentModalProps) {
  const [step,       setStep]       = useState<'form' | 'success'>('form')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')

  const [name,     setName]    = useState('')
  const [email,    setEmail]   = useState('')
  const [phone,    setPhone]   = useState('')
  const [time,     setTime]    = useState('10:00')
  const [notes,    setNotes]   = useState('')
  const [date,     setDate]    = useState<Date | undefined>(undefined)
  const [calOpen,  setCalOpen] = useState(false)

  function resetForm() {
    setStep('form')
    setName('')
    setEmail('')
    setPhone('')
    setTime('10:00')
    setNotes('')
    setDate(undefined)
    setError('')
    setCalOpen(false)
  }

  function handleClose(val: boolean) {
    if (!val) resetForm()
    onOpenChange(val)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim())  { setError('El nombre es requerido.'); return }
    if (!email.trim()) { setError('El email es requerido.'); return }
    if (!date)         { setError('Selecciona una fecha.'); return }

    const [h, m] = time.split(':').map(Number)
    const combined = new Date(date)
    combined.setHours(h, m, 0, 0)

    if (combined < new Date()) { setError('La fecha y hora deben ser en el futuro.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:  name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          date:  combined.toISOString(),
          notes: notes.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al agendar.'); return }
      setStep('success')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[var(--wl-surface)] border-[var(--wl-border)] text-white max-w-md w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Video className="h-5 w-5 text-brand-light" />
            Agendar Videollamada
          </DialogTitle>
        </DialogHeader>

        {step === 'success' ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Videollamada Agendada</h3>
              <p className="mt-1 text-sm text-white/50">
                Nos pondremos en contacto con{' '}
                <span className="text-[var(--wl-text-secondary)] font-medium">{email}</span>.
                {date && (
                  <span className="block mt-1 text-[var(--wl-text-muted)]">
                    {format(date, "EEEE d 'de' MMMM yyyy", { locale: es })} · {time}h
                  </span>
                )}
              </p>
            </div>
            <Button onClick={() => handleClose(false)} className="bg-brand hover:bg-brand-dark text-white">
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name + Email */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[var(--wl-text-secondary)] text-xs">Nombre *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre completo"
                  className="bg-white/[0.04] border-[var(--wl-border)] text-white placeholder:text-white/25 focus-visible:ring-brand"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[var(--wl-text-secondary)] text-xs">Email *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="bg-white/[0.04] border-[var(--wl-border)] text-white placeholder:text-white/25 focus-visible:ring-brand"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="text-[var(--wl-text-secondary)] text-xs">Teléfono</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+52 55 1234 5678"
                className="bg-white/[0.04] border-[var(--wl-border)] text-white placeholder:text-white/25 focus-visible:ring-brand"
              />
            </div>

            {/* Date picker — inline toggle (avoids Popover-inside-Dialog z-index issue) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[var(--wl-text-secondary)] text-xs">Fecha *</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCalOpen((o) => !o)}
                  className="w-full justify-between bg-white/[0.04] border-[var(--wl-border)] text-left font-normal hover:bg-[var(--wl-hover)] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-[var(--wl-text-muted)]" />
                    {date ? (
                      <span className="text-white">{format(date, 'd MMM yyyy', { locale: es })}</span>
                    ) : (
                      <span className="text-white/30">Seleccionar…</span>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-white/30 transition-transform duration-200 ${calOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[var(--wl-text-secondary)] text-xs">Hora *</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-white/[0.04] border-[var(--wl-border)] text-white focus-visible:ring-brand [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Inline calendar (opens below the trigger button, no portal/z-index issues) */}
            {calOpen && (
              <div className="rounded-xl border border-[var(--wl-border)] bg-[#0e0e14] overflow-hidden">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { setDate(d); setCalOpen(false); }}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  locale={es}
                  className="text-white"
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-[var(--wl-text-secondary)] text-xs">Notas adicionales</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="¿Sobre qué quieres hablar?"
                rows={3}
                className="bg-white/[0.04] border-[var(--wl-border)] text-white placeholder:text-white/25 resize-none focus-visible:ring-brand"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2 flex items-center gap-2">
                <X className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                className="flex-1 border-[var(--wl-border)] text-[var(--wl-text-secondary)] hover:text-white hover:bg-[var(--wl-hover)]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-brand hover:bg-brand-dark text-white"
              >
                {submitting ? 'Agendando…' : 'Agendar'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
