'use client';
import { useState, useEffect } from 'react';
import { useUploadThing } from '@/lib/uploadthing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, Check } from 'lucide-react';

export default function SettingsContent() {
  const [logoUrl, setLogoUrl] = useState('');
  const [brandName, setBrandName] = useState('BoostMarketing');
  const [brandColor, setBrandColor] = useState('#7c3aed');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState('');

  const { startUpload, isUploading } = useUploadThing('imageUploader', {
    onClientUploadComplete: (res) => {
      if (res?.[0]?.url) {
        const url = (res[0].ufsUrl ?? res[0].url);
        setLogoUrl(url);
        setPreview(url);
        // Auto-guardar inmediatamente
        fetch('/api/cms/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logoUrl: url }),
        }).then(() => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        });
      }
    },
    onUploadError: (err) => {
      console.error('Upload error:', err);
      alert('Error al subir imagen: ' + err.message);
    },
  });

  useEffect(() => {
    setLoading(true);
    fetch('/api/cms/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings) {
          setLogoUrl(d.settings.logoUrl || '');
          setPreview(d.settings.logoUrl || '');
          setBrandName(d.settings.brandName || 'BoostMarketing');
          setBrandColor(d.settings.brandColor || '#7c3aed');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/cms/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl, brandName, brandColor }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    startUpload([file]);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--wl-text-muted)]" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--wl-text-primary)]">Configuración</h1>
        <p className="text-[var(--wl-text-muted)] text-sm mt-1">Personaliza el branding de tu plataforma</p>
      </div>

      {/* Logo */}
      <div className="bg-[var(--wl-hover)] border border-[var(--wl-border)] rounded-xl p-6 space-y-4">
        <h2 className="text-[var(--wl-text-primary)] font-semibold">Logo de la empresa</h2>
        <p className="text-[var(--wl-text-muted)] text-sm">Se usará en todos los emails y notificaciones</p>

        {preview && (
          <div className="flex items-center justify-center bg-[var(--wl-hover)] rounded-lg p-4 w-48 h-24">
            <img src={preview} alt="Logo preview" className="max-h-16 max-w-full object-contain" />
          </div>
        )}

        <div className="flex items-center gap-3">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--wl-border)] hover:bg-white/[0.12] border border-[var(--wl-border)] rounded-lg text-[var(--wl-text-primary)] text-sm transition-colors">
              {isUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
              ) : (
                <><Upload className="w-4 h-4" /> Subir logo</>
              )}
            </div>
          </label>
          {logoUrl && (
            <span className="text-[var(--wl-text-muted)] text-xs truncate max-w-xs">{logoUrl}</span>
          )}
        </div>
      </div>

      {/* Brand Name */}
      <div className="bg-[var(--wl-hover)] border border-[var(--wl-border)] rounded-xl p-6 space-y-4">
        <h2 className="text-[var(--wl-text-primary)] font-semibold">Nombre de la empresa</h2>
        <Input
          value={brandName}
          onChange={e => setBrandName(e.target.value)}
          className="bg-[var(--wl-hover)] border-[var(--wl-border)] text-[var(--wl-text-primary)]"
          placeholder="BoostMarketing"
        />
      </div>

      {/* Brand Color */}
      <div className="bg-[var(--wl-hover)] border border-[var(--wl-border)] rounded-xl p-6 space-y-4">
        <h2 className="text-[var(--wl-text-primary)] font-semibold">Color principal</h2>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={brandColor}
            onChange={e => setBrandColor(e.target.value)}
            className="w-12 h-10 rounded cursor-pointer border border-[var(--wl-border)] bg-transparent"
          />
          <Input
            value={brandColor}
            onChange={e => setBrandColor(e.target.value)}
            className="bg-[var(--wl-hover)] border-[var(--wl-border)] text-[var(--wl-text-primary)] w-36"
            placeholder="#7c3aed"
          />
          <div className="w-8 h-8 rounded-full border border-white/20" style={{ background: brandColor }} />
        </div>
      </div>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saving || isUploading}
        className="bg-brand hover:bg-brand-dark text-white gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
        {saved ? 'Guardado' : 'Guardar cambios'}
      </Button>
    </div>
  );
}