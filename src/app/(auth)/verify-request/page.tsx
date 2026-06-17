import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0b0f] px-4">
      <div className="w-full max-w-md glass-card rounded-xl p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-brand-light" />
        </div>
        <h1 className="text-xl font-bold text-[var(--wl-text-primary)] mb-2">Revisa tu correo</h1>
        <p className="text-sm text-[var(--wl-text-muted)] mb-6">
          Te enviamos un enlace mágico para iniciar sesión. En desarrollo, el enlace
          aparece en la terminal del servidor.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-brand-light hover:text-brand"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al login
        </Link>
      </div>
    </div>
  );
}
