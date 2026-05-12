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

interface ReportButtonProps {
  clientId: string;
  clientName?: string;
  month?: number;
  year?: number;
}

export function ReportButton({ clientId, clientName, month, year }: ReportButtonProps) {
  const [loading, setLoading] = useState<'pdf' | 'email' | null>(null);

  const m = month ?? new Date().getMonth() + 1;
  const y = year  ?? new Date().getFullYear();
  const reportUrl = `/api/reports/monthly?clientId=${clientId}&month=${m}&year=${y}`;

  // Abre el reporte en nueva pestana — el usuario usa Ctrl+P para PDF
  // Esto evita que window.print() congele la app principal
  const handlePDF = () => {
    setLoading('pdf');
    const win = window.open(reportUrl, '_blank');
    // Dar tiempo al navegador para abrir la ventana
    setTimeout(() => {
      setLoading(null);
      if (!win) {
        alert('Activa las ventanas emergentes para ver el reporte.');
      }
    }, 800);
  };

  const handleEmail = async () => {
    const email = prompt('Correo para enviar el reporte:');
    if (!email) return;
    setLoading('email');
    try {
      const res = await fetch('/api/reports/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, month: m, year: y, recipientEmail: email }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Reporte enviado a ${email}`);
      } else {
        alert(`Error: ${data.error || 'No se pudo enviar'}`);
      }
    } catch {
      alert('Error de red al enviar el reporte.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
          disabled={loading !== null}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          Reporte
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="bg-[#15151c] border-white/[0.06] text-white"
        align="end"
      >
        <DropdownMenuItem
          className="gap-2 text-white/70 focus:text-white focus:bg-white/[0.06] cursor-pointer"
          onClick={handlePDF}
          disabled={loading !== null}
        >
          <Download className="w-4 h-4" />
          Ver / Imprimir PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 text-white/70 focus:text-white focus:bg-white/[0.06] cursor-pointer"
          onClick={handleEmail}
          disabled={loading !== null}
        >
          <Mail className="w-4 h-4" />
          Enviar por email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}