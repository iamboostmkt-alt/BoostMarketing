"use client";

import { useState } from "react";
import { FileText, Download, Mail, MessageCircle, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface ReportButtonProps {
  clientId:    string;
  clientName:  string;
  clientEmail?: string;
}

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

export default function ReportButton({ clientId, clientName, clientEmail }: ReportButtonProps) {
  const now   = new Date();
  const [month, setMonth]         = useState(now.getMonth() + 1);
  const [year,  setYear]          = useState(now.getFullYear());
  const [email, setEmail]         = useState(clientEmail || "");
  const [emailModal, setEmailModal] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState("");

  const reportUrl = `/api/reports/monthly?clientId=${clientId}&month=${month}&year=${year}`;

  function handleDownload() {
    const win = window.open(reportUrl, "_blank");
    if (win) {
      win.addEventListener("load", () => {
        win.print();
      });
    }
  }

  function handlePreview() {
    window.open(reportUrl, "_blank");
  }

  async function handleSendEmail() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/reports/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, month, year, recipientEmail: email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Reporte enviado a ${email}`);
        setTimeout(() => setEmailModal(false), 2000);
      } else {
        setMsg(data.error || "Error al enviar");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleWhatsApp() {
    const monthName = MONTHS[month - 1];
    const text = encodeURIComponent(
      `Hola! Te comparto el reporte de ${monthName} ${year} para ${clientName}:\n${window.location.origin}${reportUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Selector de mes/año */}
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="text-xs bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white/70"
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1} className="bg-[#15151c]">{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="text-xs bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white/70"
        >
          {[2024, 2025, 2026].map(y => (
            <option key={y} value={y} className="bg-[#15151c]">{y}</option>
          ))}
        </select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="bg-brand hover:bg-brand-dark text-white gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" />
              Reporte
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#15151c] border-white/[0.06] text-white w-48">
            <DropdownMenuLabel className="text-white/40 text-xs">
              {MONTHS[month - 1]} {year} — {clientName}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            <DropdownMenuItem
              className="gap-2 cursor-pointer focus:bg-white/[0.06] text-sm"
              onClick={handlePreview}
            >
              <FileText className="w-4 h-4 text-brand-light" />
              Ver reporte
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 cursor-pointer focus:bg-white/[0.06] text-sm"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 text-green-400" />
              Descargar PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            <DropdownMenuItem
              className="gap-2 cursor-pointer focus:bg-white/[0.06] text-sm"
              onClick={() => setEmailModal(true)}
            >
              <Mail className="w-4 h-4 text-cyan-400" />
              Enviar por email
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 cursor-pointer focus:bg-white/[0.06] text-sm"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="w-4 h-4 text-green-400" />
              Enviar por WhatsApp
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modal email */}
      <Dialog open={emailModal} onOpenChange={setEmailModal}>
        <DialogContent className="bg-[#15151c] border-white/[0.06] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Enviar reporte por email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Destinatario</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand"
              />
            </div>
            <div className="text-xs text-white/40 bg-white/[0.03] rounded-lg p-3">
              Se enviará el reporte de <strong className="text-white/60">{MONTHS[month - 1]} {year}</strong> para <strong className="text-white/60">{clientName}</strong>
            </div>
            {msg && (
              <p className={`text-xs ${msg.includes("Error") ? "text-red-400" : "text-green-400"}`}>
                {msg}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEmailModal(false)}
              className="text-white/40 hover:text-white">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSendEmail} disabled={loading || !email}
              className="bg-brand hover:bg-brand-dark text-white gap-1.5">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
