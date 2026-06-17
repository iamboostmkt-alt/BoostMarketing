'use client';
import { useEffect, useState } from 'react';
import { Paperclip, Image, Video, FileText, Archive, Search, Download, ExternalLink } from 'lucide-react';

interface FileMsg {
  id: string;
  message: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  room: string;
  user: { name: string; email: string; color: string; image?: string };
}

function getFileIcon(type: string) {
  if (type?.startsWith('image')) return Image;
  if (type?.startsWith('video')) return Video;
  if (type === 'application/pdf') return FileText;
  if (type?.includes('zip') || type?.includes('rar')) return Archive;
  return Paperclip;
}

function getFileCategory(type: string) {
  if (type?.startsWith('image')) return 'imagen';
  if (type?.startsWith('video')) return 'video';
  if (type === 'application/pdf') return 'pdf';
  return 'archivo';
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'imagen'|'video'|'pdf'|'archivo'>('all');

  useEffect(() => {
    // Obtener mensajes con archivos de todos los rooms
    fetch('/api/chat?room=TEAM&limit=200')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const msgs = d?.messages || [];
        const withFiles = msgs.filter((m: any) => m.fileUrl);
        setFiles(withFiles);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = files
    .filter(f => filter === 'all' || getFileCategory(f.fileType) === filter)
    .filter(f => !search || (f.fileName || f.message || '').toLowerCase().includes(search.toLowerCase()));

  const images = filtered.filter(f => f.fileType?.startsWith('image'));
  const others = filtered.filter(f => !f.fileType?.startsWith('image'));

  return (
    <div className="min-h-full p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold tracking-tight">Archivos</h1>
        <p className="text-[13px] text-[var(--wl-text-muted)] mt-0.5">{files.length} archivos compartidos en el workspace</p>
      </div>

      {/* Búsqueda + filtros */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--wl-text-placeholder)]" strokeWidth={1.75} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar archivos..."
            className="w-full rounded-xl border border-[var(--wl-border)] bg-[var(--wl-hover)] pl-9 pr-3 py-2 text-[13px] text-[var(--wl-text-primary)] placeholder:text-[var(--wl-text-placeholder)] focus:outline-none focus:border-primary/40" />
        </div>
        <div className="flex items-center gap-1.5">
          {(['all','imagen','video','pdf','archivo'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors capitalize ${
                filter === f ? 'bg-primary/15 text-primary' : 'text-[var(--wl-text-muted)] hover:text-[var(--wl-text-secondary)] hover:bg-[var(--wl-hover)]'
              }`}>
              {f === 'all' ? 'Todos' : f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Paperclip className="h-10 w-10 text-[var(--wl-text-placeholder)]" strokeWidth={1.5} />
          <p className="text-[13px] text-[var(--wl-text-placeholder)]">No hay archivos compartidos</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Grid de imágenes */}
          {images.length > 0 && (
            <div>
              <h2 className="text-[11px] font-medium uppercase tracking-wide text-[var(--wl-text-placeholder)] mb-3">
                Imágenes ({images.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {images.map(f => (
                  <a key={f.id} href={f.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="group relative aspect-square rounded-xl overflow-hidden border border-[var(--wl-border)] bg-[var(--wl-hover)]">
                    <img src={f.fileUrl} alt={f.fileName} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ExternalLink className="h-5 w-5 text-[var(--wl-text-primary)]" strokeWidth={1.75} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-[var(--wl-text-secondary)] truncate">{f.fileName || 'imagen'}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Lista de otros archivos */}
          {others.length > 0 && (
            <div>
              <h2 className="text-[11px] font-medium uppercase tracking-wide text-[var(--wl-text-placeholder)] mb-3">
                Otros archivos ({others.length})
              </h2>
              <div className="flex flex-col gap-2">
                {others.map(f => {
                  const Icon = getFileIcon(f.fileType);
                  return (
                    <div key={f.id}
                      className="flex items-center gap-3 rounded-xl border border-[var(--wl-border)] bg-[var(--wl-hover)] px-4 py-3 hover:bg-[var(--wl-hover)] transition-colors">
                      <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[var(--wl-text-secondary)] truncate">{f.fileName || f.message}</p>
                        <p className="text-[11px] text-[var(--wl-text-placeholder)]">
                          {f.user?.name || f.user?.email} · {new Date(f.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <a href={f.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--wl-text-placeholder)] hover:text-[var(--wl-text-primary)] hover:bg-[var(--wl-hover)] transition-colors">
                        <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
