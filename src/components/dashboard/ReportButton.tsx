'use client';
import { useState } from 'react';
import { FileText, Mail, Loader2 } from 'lucide-react';
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
  const m = month ?? new Date().getMonth() + 1;
  const y = year ?? new Date().getFullYear();
  const reportUrl = '/api/reports/monthly?clientId=' + clientId + '&month=' + m + '&year=' + y;

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
    <div className="flex items-center gap-2">
      <a href={reportUrl} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors">
        <FileText className="w-4 h-4" />
        Reporte
      </a>
      <Button variant="outline" size="sm"
        className="gap-2 border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
        onClick={handleEmail}
        disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
      </Button>
    </div>
  );
}