'use client';

import { useState } from 'react';
import { FileText, Download, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ReportButtonProps {
  clientId:     string;
  clientName?:  string;
  clientEmail?: string;
  month?:       number;
  year?:        number;
}

export function ReportButton({ clientId, clientName, clientEmail, month, year }: ReportButtonProps) {
  const [loading, setLoading] = useState<'pdf' | 'email' | null>(null);

  const m = month ?? new Date().getMonth() + 1;
  const y = year  ?? new Date().getFullYear();
  const reportUrl = '/api/reports/monthly?clientId=' + clientId + '&month=' + m + '&year=' + y;

  const handlePDF = () => {
    window.open(reportUrl, '_blank', 'noopener,noreferrer');
  };

  const handleEmail = async () => {
    const email = prompt('Correo para enviar el reporte:', clientEmail || '');
    if (!email) return;
    setLoading('email');
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
      setLoading(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm'
          className='gap-2 border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
          ><FileText className='w-4 h-4' />
          Reporte
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='bg-[#15151c] border-white/[0.06] text-white' align='end'>
        <DropdownMenuItem
          className='gap-2 text-white/70 focus:text-white focus:bg-white/[0.06] cursor-pointer'
          onClick={handlePDF}>
          <Download className='w-4 h-4' /> Ver / Imprimir PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          className='gap-2 text-white/70 focus:text-white focus:bg-white/[0.06] cursor-pointer'
          onClick={handleEmail} disabled={loading !== null}>
          <Mail className='w-4 h-4' /> Enviar por email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
