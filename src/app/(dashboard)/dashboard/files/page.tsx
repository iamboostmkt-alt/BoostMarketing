'use client';
import { useEffect, useState } from 'react';
import { FileText, Image, Video, File, Download, ExternalLink, Search, Loader2, FolderOpen } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface FileItem {
  id: string; fileName: string; fileUrl: string; fileType: string;
  fileSize?: number; createdAt: string; isInternal: boolean;
  task: { id: string; title: string; client?: { id: string; name: string } | null; project?: { id: string; name: string } | null };
  user?: { id: string; name: string; image: string | null } | null;
}

type FilterType = 'all' | 'imagen' | 'video' | 'pdf' | 'archivo';

function fileIcon(type: string) {
  if (type?.startsWith('image/')) return <Image className="w-5 h-5 text-blue-400" />;
  if (type?.startsWith('video/')) return <Video className="w-5 h-5 text-purple-400" />;
  if (type === 'application/pdf') return <FileText className="w-5 h-5 text-red-400" />;
  return <File className="w-5 h-5 text-white/40" />;
}

function fileTypeBadge(type: string): FilterType {
  if (type?.startsWith('image/')) return 'imagen';
  if (type?.startsWith('video/')) return 'video';
  if (type === 'application/pdf') return 'pdf';
  return 'archivo';
}

function fmtSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ini(name: string) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function FilesPage() {
  const [files,   setFiles]   = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState<FilterType>('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '200' });
    if (filter !== 'all') params.set('type', filter);
    if (search) params.set('search', search);

    fetch(`/api/files?${params}`)
      .then(r => r.ok ? r.json() : { files: [] })
      .then(d => setFiles(d.files || []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [filter, search]);

  const FILTERS: { id: FilterType; label: string; icon: React.ReactNode }[] = [
    { id: 'all',    label: 'Todos',    icon: <FolderOpen className="w-3.5 h-3.5" /> },
    { id: 'imagen', label: 'Imágenes', icon: <Image className="w-3.5 h-3.5" /> },
    { id: 'video',  label: 'Videos',   icon: <Video className="w-3.5 h-3.5" /> },
    { id: 'pdf',    label: 'PDFs',     icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'archivo',label: 'Archivos', icon: <File className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--wl-bg)' }}>
      {/* Header */}
      <div className="px-4 sm:px-6 pt-5 pb-4 shrink-0">
        <h1 className="text-[22px] font-bold mb-0.5" style={{ color: 'var(--wl-text-primary)' }}>Archivos</h1>
        <p className="text-[13px]" style={{ color: 'var(--wl-text-muted)' }}>
          {loading ? 'Cargando…' : `${files.length} archivo${files.length !== 1 ? 's' : ''} en el workspace`}
        </p>

        {/* Buscador */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--wl-text-placeholder)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar archivo..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none"
            style={{ background: 'var(--wl-surface)', border: '1px solid var(--wl-border)', color: 'var(--wl-text-primary)' }}
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium shrink-0 transition-all"
              style={{
                background: filter === f.id ? '#7C3AED' : 'var(--wl-surface)',
                color: filter === f.id ? '#fff' : 'var(--wl-text-muted)',
                border: `1px solid ${filter === f.id ? '#7C3AED' : 'var(--wl-border)'}`,
              }}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="w-12 h-12 mb-3" style={{ color: 'var(--wl-text-placeholder)' }} />
            <p className="text-[15px] font-medium" style={{ color: 'var(--wl-text-primary)' }}>Sin archivos</p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--wl-text-muted)' }}>
              {search ? 'No se encontraron archivos con ese nombre' : 'Los archivos subidos a tareas aparecerán aquí'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-[14px] group transition-all"
                style={{ background: 'var(--wl-surface)', border: '1px solid var(--wl-border)' }}>

                {/* Ícono tipo */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--wl-elevated)' }}>
                  {fileIcon(f.fileType)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--wl-text-primary)' }}>
                    {f.fileName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {f.task?.client && (
                      <span className="text-[11px]" style={{ color: '#8B5CF6' }}>{f.task.client.name}</span>
                    )}
                    {f.task?.client && f.task?.title && (
                      <span className="text-[11px]" style={{ color: 'var(--wl-text-placeholder)' }}>·</span>
                    )}
                    {f.task?.title && (
                      <span className="text-[11px] truncate max-w-[140px]" style={{ color: 'var(--wl-text-muted)' }}>{f.task.title}</span>
                    )}
                    {f.fileSize && (
                      <span className="text-[10px]" style={{ color: 'var(--wl-text-placeholder)' }}>{fmtSize(f.fileSize)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {f.user && (
                      <Avatar className="h-4 w-4 rounded-full overflow-hidden">
                        <AvatarImage src={f.user.image || undefined} />
                        <AvatarFallback className="text-[8px]">{ini(f.user.name)}</AvatarFallback>
                      </Avatar>
                    )}
                    <span className="text-[10px]" style={{ color: 'var(--wl-text-placeholder)' }}>
                      {f.user?.name?.split(' ')[0]} · {new Date(f.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                    {f.isInternal && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>Interno</span>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 shrink-0">
                  <a href={f.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    style={{ color: 'var(--wl-text-muted)' }} title="Abrir">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <a href={f.fileUrl} download={f.fileName}
                    className="p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    style={{ color: 'var(--wl-text-muted)' }} title="Descargar">
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
