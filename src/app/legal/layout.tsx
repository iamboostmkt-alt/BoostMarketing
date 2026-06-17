import Link from 'next/link';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#F6F7FB', minHeight: '100vh', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/weeklink" className="inline-flex items-center gap-1.5 text-[13px] mb-8 transition-colors" style={{ color: '#9CA3AF' }}>
          ← Volver a Weeklink
        </Link>
        {children}
        {/* Footer legal */}
        <div className="mt-16 pt-8 border-t border-[rgba(17,24,39,0.08)]">
          <p className="text-[12px] text-[#9CA3AF] mb-4">Documentos legales de Weeklink</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              { label: 'Términos', href: '/terminos' },
              { label: 'Privacidad', href: '/privacidad' },
              { label: 'Cookies', href: '/legal/cookies' },
              { label: 'Uso aceptable', href: '/legal/uso-aceptable' },
              { label: 'Política IA', href: '/legal/ia' },
              { label: 'Seguridad', href: '/legal/seguridad' },
              { label: 'Founding', href: '/legal/founding' },
              { label: 'Trust Center', href: '/trust' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="text-[12px] text-[#7C3AED] hover:underline">{l.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
