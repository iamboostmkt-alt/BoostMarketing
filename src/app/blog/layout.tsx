import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: { default: 'Blog — Weeklink', template: '%s | Blog Weeklink' },
  description: 'Tips, guías y estrategias para agencias de marketing digital en México. Aprende a gestionar mejor tus proyectos, clientes y equipo.',
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#F6F7FB', minHeight: '100dvh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Navbar */}
      <nav style={{ background: 'white', borderBottom: '1px solid rgba(17,24,39,0.06)', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <Link href="/weeklink" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 16 }}>W</div>
          <span style={{ fontWeight: 700, color: '#111827', fontSize: 16 }}>Weeklink</span>
          <span style={{ color: '#9CA3AF', fontSize: 14 }}>/ Blog</span>
        </Link>
        <Link href="/login" style={{ background: '#7C3AED', color: 'white', padding: '8px 20px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
          Probar gratis
        </Link>
      </nav>
      {children}
    </div>
  );
}
