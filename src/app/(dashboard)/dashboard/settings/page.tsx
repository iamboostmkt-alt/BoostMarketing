'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Save, Moon, Bell, Globe, Palette, Camera, Building2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserProfile } from '@/lib/types';
import { useUploadThing } from '@/lib/uploadthing';

const PREDEFINED_COLORS = [
  { value: '#7c3aed', label: 'Violeta' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f59e0b', label: 'Ámbar' },
  { value: '#10b981', label: 'Verde' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#3b82f6', label: 'Azul' },
];

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { startUpload } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res) => { if (res?.[0]?.url) { setLogoUrl(res[0].url); setLogoPreview(res[0].url); } },
    onUploadError: (err) => { toast.error("Error: " + err.message); },
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#7c3aed');

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) { toast.error('Las contraseñas no coinciden'); return; }
    if (newPassword.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Error al cambiar contraseña'); return; }
      toast.success('Contraseña actualizada');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch { toast.error('Error de red'); }
    finally { setChangingPassword(false); }
  }

  // Preferences state (visual only)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [language, setLanguage] = useState('es');

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [brandName, setBrandName] = useState('BoostMarketing');
  const [brandColor, setBrandColor] = useState('#7c3aed');
  const [logoPreview, setLogoPreview] = useState('');
  const [savingBrand, setSavingBrand] = useState(false);
  const [savedBrand, setSavedBrand] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/auth/profile');
        if (res.ok) {
          const data = await res.json();
          const user = data.user;
          setProfile(user);
          setName(user.name || '');
          setSelectedColor(user.color || '#7c3aed');
          setImageUrl(user.image || null);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  // Fallback to session data
  const userName = profile?.name || session?.user?.name || 'Usuario';
  const userEmail = profile?.email || session?.user?.email || '';
  const userRole = profile?.role || session?.user?.role || 'CLIENT';
  const userColor = profile?.color || session?.user?.color || '#7c3aed';

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/auth/avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir');
      setImageUrl(data.url);
      // Refresh JWT token so TopNav + AppSidebar show the new avatar immediately
      await updateSession({ image: data.url });
      toast.success('Avatar actualizado');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir el avatar');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: selectedColor }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      toast.success('Perfil actualizado correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  async function handleSaveBrand() {
    setSavingBrand(true);
    try {
      await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logoUrl, brandName, brandColor }) });
      setSavedBrand(true); setTimeout(() => setSavedBrand(false), 2000);
      toast.success('Configuracion guardada');
    } finally { setSavingBrand(false); }
  }

  const handleSavePreferences = () => {
    toast.success('Preferencias guardadas correctamente');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">Configuración</h2>
        <p className="text-white/40 mt-1">Administra tu perfil y preferencias</p>
      </div>

      {/* Tabs */}
      <div>
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-white/[0.04] border border-white/[0.06]">
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50"
            >
              Perfil
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50"
            >
              Preferencias
            </TabsTrigger>
            <TabsTrigger value="empresa" className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50">Empresa</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="glass-card rounded-xl p-6">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3">
                  {loading ? (
                    <Skeleton className="w-24 h-24 rounded-full" />
                  ) : (
                    <div className="relative group">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={userName}
                          className="w-24 h-24 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="flex items-center justify-center w-24 h-24 rounded-full text-2xl font-bold shrink-0"
                          style={{ backgroundColor: selectedColor + '33', color: selectedColor }}
                        >
                          {initials}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
                      >
                        {uploading ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <Camera className="w-5 h-5 text-white" />
                        )}
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => fileRef.current?.click()}
                      disabled={uploading || loading}
                      className="text-sm text-brand-light hover:text-white transition-colors disabled:opacity-50">
                      {uploading ? 'Subiendo...' : 'Cambiar foto'}
                    </button>
                    {imageUrl && (
                      <button type="button" disabled={uploading || loading}
                        onClick={async () => {
                          if (!confirm('Eliminar foto de perfil?')) return;
                          setUploading(true);
                          try {
                            const res = await fetch('/api/auth/profile', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name, color: selectedColor, removeImage: true }),
                            });
                            if (res.ok) {
                              setImageUrl(null);
                              await updateSession({ image: null });
                              toast.success('Foto eliminada');
                            }
                          } catch { toast.error('Error al eliminar'); }
                          finally { setUploading(false); }
                        }}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50">
                        Eliminar foto
                      </button>
                    )}
                  </div>
                </div>

                {/* Form */}
                <div className="flex-1 space-y-5">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="settings-name" className="text-white/70">
                      Nombre
                    </Label>
                    {loading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Input
                        id="settings-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tu nombre"
                        className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand"
                      />
                    )}
                  </div>

                  {/* Email (read-only) */}
                  <div className="space-y-2">
                    <Label htmlFor="settings-email" className="text-white/70">
                      Email
                    </Label>
                    {loading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Input
                        id="settings-email"
                        value={userEmail}
                        readOnly
                        className="bg-white/[0.02] border-white/[0.06] text-white/40 cursor-not-allowed"
                      />
                    )}
                    <p className="text-xs text-white/25">El email no se puede cambiar</p>
                  </div>

                  {/* Role (read-only) */}
                  <div className="space-y-2">
                    <Label className="text-white/70">Rol</Label>
                    {loading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <div className="flex items-center h-10 px-3 rounded-md bg-white/[0.02] border border-white/[0.06]">
                        <span className="text-sm text-white/40 capitalize">{userRole}</span>
                      </div>
                    )}
                    <p className="text-xs text-white/25">El rol es asignado por el administrador</p>
                  </div>

                  {/* Color Picker */}
                  <div className="space-y-2">
                    <Label className="text-white/70 flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Color de perfil
                    </Label>
                    {loading ? (
                      <div className="flex gap-3">
                        {PREDEFINED_COLORS.map((_, i) => (
                          <Skeleton key={i} className="w-10 h-10 rounded-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {PREDEFINED_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setSelectedColor(color.value)}
                            className={`
                              w-10 h-10 rounded-full transition-all duration-200
                              flex items-center justify-center
                              ${
                                selectedColor === color.value
                                  ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-[#15151c] scale-110'
                                  : 'hover:scale-105'
                              }
                            `}
                            style={{ backgroundColor: color.value }}
                            title={color.label}
                          >
                            {selectedColor === color.value && (
                              <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Save button */}
                  <div className="pt-2">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving || loading}
                      className="bg-brand hover:bg-brand-dark text-white gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Guardar Cambios
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {/* Change Password */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <svg className="w-5 h-5 text-brand-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <h3 className="text-base font-semibold text-white">Cambiar contraseña</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Contraseña actual</Label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Nueva contraseña</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Confirmar nueva contraseña</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la nueva contraseña" className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:ring-brand" />
                </div>
                <div className="pt-2">
                  <Button onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword} className="bg-brand hover:bg-brand-dark text-white gap-2">
                    {changingPassword ? (<><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Guardando...</>) : (<><Save className="w-4 h-4" />Cambiar contraseña</>)}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            {/* Theme */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <Moon className="w-5 h-5 text-brand-light" />
                <h3 className="text-base font-semibold text-white">Tema</h3>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">Modo oscuro</p>
                  <p className="text-xs text-white/30 mt-0.5">El tema oscuro está activado por defecto</p>
                </div>
                <Switch checked={true} disabled className="data-[state=checked]:bg-brand" />
              </div>
            </div>

            {/* Notifications */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <Bell className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-semibold text-white">Notificaciones</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="notif-email"
                    checked={emailNotifications}
                    onCheckedChange={(checked) => setEmailNotifications(checked as boolean)}
                    className="border-white/20 data-[state=checked]:bg-brand data-[state=checked]:border-brand mt-0.5"
                  />
                  <div>
                    <Label htmlFor="notif-email" className="text-sm text-white/70 cursor-pointer">
                      Notificaciones por email
                    </Label>
                    <p className="text-xs text-white/30 mt-0.5">
                      Recibe alertas de nuevas actividades por correo electrónico
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="notif-push"
                    checked={pushNotifications}
                    onCheckedChange={(checked) => setPushNotifications(checked as boolean)}
                    className="border-white/20 data-[state=checked]:bg-brand data-[state=checked]:border-brand mt-0.5"
                  />
                  <div>
                    <Label htmlFor="notif-push" className="text-sm text-white/70 cursor-pointer">
                      Notificaciones push
                    </Label>
                    <p className="text-xs text-white/30 mt-0.5">
                      Notificaciones en tiempo real en tu navegador
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="notif-weekly"
                    checked={weeklyReport}
                    onCheckedChange={(checked) => setWeeklyReport(checked as boolean)}
                    className="border-white/20 data-[state=checked]:bg-brand data-[state=checked]:border-brand mt-0.5"
                  />
                  <div>
                    <Label htmlFor="notif-weekly" className="text-sm text-white/70 cursor-pointer">
                      Reporte semanal
                    </Label>
                    <p className="text-xs text-white/30 mt-0.5">
                      Resumen semanal de tu actividad y métricas
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Language */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <Globe className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-white">Idioma</h3>
              </div>
              <div className="max-w-xs">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white w-full focus-visible:ring-brand">
                    <SelectValue placeholder="Seleccionar idioma" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#15151c] border-white/[0.08] text-white">
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Save preferences */}
            <Button
              onClick={handleSavePreferences}
              className="bg-brand hover:bg-brand-dark text-white gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar
            </Button>
          </TabsContent>

          <TabsContent value="empresa" className="space-y-6">
            <div className="glass-card rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-3"><Building2 className="w-5 h-5 text-brand-light" /><h3 className="text-base font-semibold text-white">Branding de la empresa</h3></div>
              <p className="text-white/40 text-sm">El logo se usara en todos los emails del sistema</p>
              <div className="space-y-3">
                <label className="text-white/70 text-sm font-medium">Logo</label>
                {logoPreview && (<div className="flex items-center justify-center bg-white/[0.06] border border-white/[0.08] rounded-lg p-4 w-48 h-24"><img src={logoPreview} alt="Logo" className="max-h-16 max-w-full object-contain" /></div>)}
                <label className="cursor-pointer inline-block">
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) startUpload([f]); }} disabled={uploading} />
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] rounded-lg text-white text-sm transition-colors w-fit">{uploading ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />&nbsp;Subiendo...</> : <><Upload className="w-4 h-4" />&nbsp;Subir logo</>}</div>
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-white/70 text-sm font-medium">Nombre de la empresa</label>
                <Input value={brandName} onChange={e => setBrandName(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white max-w-sm" placeholder="BoostMarketing" />
              </div>
              <div className="space-y-2">
                <label className="text-white/70 text-sm font-medium">Color principal</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-white/[0.08] bg-transparent" />
                  <Input value={brandColor} onChange={e => setBrandColor(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white w-32" />
                  <div className="w-8 h-8 rounded-full border border-white/20" style={{ background: brandColor }} />
                </div>
              </div>
              <Button onClick={handleSaveBrand} disabled={savingBrand || uploading} className="bg-brand hover:bg-brand-dark text-white gap-2">{savingBrand ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />&nbsp;Guardando...</> : <><Save className="w-4 h-4" />&nbsp;{savedBrand ? "Guardado!" : "Guardar cambios"}</>}</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
