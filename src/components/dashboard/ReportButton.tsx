'use client';
import { useState } from 'react';
import { FileText, Mail, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ReportButtonProps {
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  month?: number;
  year?: number;
}

export function ReportButton({ clientId, clientName, clientEmail, month, year }: ReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [m, setM] = useState(month ?? new Date().getMonth() + 1);
  const [y, setY] = useState(year ?? new Date().getFullYear());

  const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const reportUrl = '/api/reports/monthly?clientId=' + clientId + '&month=' + m + '&year=' + y;

  function prevMonth() {
    if (m === 1) { setM(12); setY(y - 1); } else { setM(m - 1); }
  }
  function nextMonth() {
    const now = new Date();
    if (y === now.getFullYear() && m === now.getMonth() + 1) return;
    if (m === 12) { setM(1); setY(y + 1); } else { setM(m + 1); }
  }

  const handleEmail = async () => {
    const email = prompt('Correo para enviar el reporte:', clientEmail || '');
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reports/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, month: m, year: y, recipientEmail: email }),
      });
      const data = await res.json();
      if (res.ok) { toast.success('Reporte enviado a ' + email); }
      else { toast.error(data.error || 'No se pudo enviar el reporte'); }
    } catch {
      toast.error('Error de red al enviar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1 bg-white/[0.03] border border-[var(--wl-border)] rounded-xl px-2 py-1">
      <button type="button" onClick={prevMonth}
        className="p-1 text-white/30 hover:text-white transition-colors">
        <ChevronLeft className="w-3 h-3" />
      </button>
      <span className="text-xs text-white/50 min-w-[52px] text-center">
        {MONTHS[m - 1]} {y}
      </span>
      <button type="button" onClick={nextMonth}
        className="p-1 text-white/30 hover:text-white transition-colors">
        <ChevronRight className="w-3 h-3" />
      </button>
      <div className="w-px h-4 bg-white/[0.08] mx-1" />
      <a href={reportUrl} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md text-[var(--wl-text-secondary)] hover:text-white hover:bg-[var(--wl-hover)] transition-colors">
        <FileText className="w-3.5 h-3.5" />
        Ver
      </a>
      <Button variant="ghost" size="sm"
        className="h-6 px-2 text-xs text-[var(--wl-text-secondary)] hover:text-white hover:bg-[var(--wl-hover)]"
        onClick={handleEmail}
        disabled={loading}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}