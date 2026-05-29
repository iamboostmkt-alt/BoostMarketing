'use client'

import { X, ChevronDown, Circle, FileText, FileArchive, Video, Clock } from 'lucide-react'
import { Avatar } from './avatar'

import { Composer } from './composer'
import { VideoCard } from './chat-cards'


function PanelLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">{children}</p>
}


const files = [
  { name: 'GT_Campaña_Ver2.mp4', size: '36.4 MB', icon: Video, color: '#8b5cf6' },
  { name: 'GT_Assets_Stories.zip', size: '124 MB', icon: FileArchive, color: '#22d3ee' },
  { name: 'GT_Campaña_Final.pdf', size: '2.1 MB', icon: FileText, color: '#ef4444' },
]

export function ThreadPanel() {
  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-white/[0.05] bg-[#11131a]">
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-white/[0.05] px-5">
        <h2 className="text-[15px] font-semibold tracking-tight">Hilo</h2>
        <button aria-label="Cerrar hilo" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/65 transition-colors hover:bg-white/[0.04] hover:text-white/90">
          <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto  px-5 py-3">
        {/* Root message */}
        <div className="flex gap-3 py-2 group relative -mx-2 px-2 rounded-xl hover:bg-white/[0.02] transition-colors">
          <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: '#8B5CF6' }}>
            SO
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[13px] font-semibold text-white/90">Sofia</span>
              <span className="text-[11px] text-white/25">10:24 AM</span>
            </div>
            <div className="text-[13.5px] leading-[1.55] text-white/70"><p>Aquí está el concepto de campaña para GymnasTwin 💪</p>
          <div className="mt-2">
            <VideoCard thumb="/campaign-thumb.png" name="GT_Campaña_Ver2.mp4" meta="36.4 MB · Video · v2" />
          </div></div>
          </div>
        </div>

        <div className="my-3 flex items-center gap-3">
          <span className="text-[11px] font-medium text-white/40">6 respuestas</span>
          <span className="h-px flex-1 bg-divider" />
        </div>

        <div className="flex gap-3 py-2 group relative -mx-2 px-2 rounded-xl hover:bg-white/[0.02] transition-colors">
          <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: '#8B5CF6' }}>
            MA
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[13px] font-semibold text-white/90">Marcos</span>
              <span className="text-[11px] text-white/25">10:25 AM</span>
            </div>
            <div className="text-[13.5px] leading-[1.55] text-white/70"><p>Se ve increíble. Revisemos el CTA final.</p></div>
          </div>
        </div>
        <div className="flex gap-3 py-2 group relative -mx-2 px-2 rounded-xl hover:bg-white/[0.02] transition-colors">
          <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: '#8B5CF6' }}>
            AL
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[13px] font-semibold text-white/90">Alex</span>
              <span className="text-[11px] text-white/25">10:28 AM</span>
            </div>
            <div className="text-[13.5px] leading-[1.55] text-white/70"><p>Propongo estas 2 variaciones.</p></div>
          </div>
        </div>
        <div className="flex gap-3 py-2 group relative -mx-2 px-2 rounded-xl hover:bg-white/[0.02] transition-colors">
          <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: '#8B5CF6' }}>
            SO
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[13px] font-semibold text-white/90">Sofia</span>
              <span className="text-[11px] text-white/25">10:31 AM</span>
            </div>
            <div className="text-[13.5px] leading-[1.55] text-white/70"><p>Perfecto, subo la versión final.</p></div>
          </div>
        </div>
        <div className="flex gap-3 py-2 group relative -mx-2 px-2 rounded-xl hover:bg-white/[0.02] transition-colors">
          <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: '#8B5CF6' }}>
            DI
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[13px] font-semibold text-white/90">Diseno</span>
              <span className="text-[11px] text-white/25">10:35 AM</span>
            </div>
            <div className="text-[13.5px] leading-[1.55] text-white/70"><p>Genial equipo, estamos listos.</p></div>
          </div>
        </div>

        {/* Thread details */}
        <div className="mt-5 border-t border-white/[0.05] pt-4">
          <button className="mb-4 flex w-full items-center justify-between">
            <span className="text-[13px] font-semibold">Detalles del hilo</span>
            <ChevronDown className="h-4 w-4 text-white/40" strokeWidth={1.75} />
          </button>

          <PanelLabel>Participantes</PanelLabel>
          <div className="mb-4 flex items-center">
            <div className="flex -space-x-2">
              {['AB','CD','EF','GH','IJ'].map((ini, i) => (
                <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-[#11131a]" style={{background:'#8B5CF6'}}>{ini}</div>
              ))}
            </div>
            <span className="-ml-2 flex h-[26px] items-center justify-center rounded-full border border-white/[0.08] bg-[#141824] px-2 text-[11px] font-medium text-white/65 ring-2 ring-[#11131a]">
              +8
            </span>
          </div>

          <PanelLabel>Tarea relacionada</PanelLabel>
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#141824] p-3">
            <Circle className="h-4 w-4 shrink-0 text-white/40" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13px] font-medium">Revisar CTA principal</p>
                <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">En progreso</span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/40">
                <Clock className="h-3 w-3" strokeWidth={1.75} />
                Hoy · 11:00 AM
              </p>
            </div>
            <Avatar initials={'UK'} color={'#8B5CF6'} size={22} />
          </div>

          <PanelLabel>Archivos</PanelLabel>
          <ul className="mb-4 flex flex-col gap-1.5">
            {files.map((f) => (
              <li key={f.name}>
                <button className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/[0.03]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${f.color}1f`, color: f.color }}>
                    <f.icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/65">{f.name}</span>
                  <span className="text-[11px] text-white/40">{f.size}</span>
                </button>
              </li>
            ))}
          </ul>

          <PanelLabel>Etiquetas</PanelLabel>
          <div className="flex flex-wrap gap-1.5">
            {['campaña', 'gymnastwin', 'ver2'].map((t) => (
              <span key={t} className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-white/65">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Composer placeholder="Responder en el hilo…" compact />
    </aside>
  )
}
