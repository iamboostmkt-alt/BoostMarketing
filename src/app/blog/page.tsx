import type { Metadata } from 'next';
import Link from 'next/link';
import { blogPosts } from '@/lib/blog-posts';

export const metadata: Metadata = {
  title: 'Blog — Tips para Agencias de Marketing en México | Weeklink',
  description: 'Aprende a gestionar mejor tu agencia de marketing digital en México. Guías prácticas sobre gestión de proyectos, portales de cliente y herramientas para agencias.',
  alternates: { canonical: 'https://weeklink.com.mx/blog' },
  openGraph: {
    title: 'Blog Weeklink — Tips para Agencias de Marketing en México',
    description: 'Guías y estrategias para agencias de marketing digital en México.',
    url: 'https://weeklink.com.mx/blog',
  },
};

const categoryColors: Record<string, string> = {
  'Gestión de agencias': '#7C3AED',
  'Experiencia del cliente': '#059669',
  'Herramientas': '#2563EB',
};

export default function BlogIndex() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(124,58,237,0.1)', color: '#7C3AED', padding: '4px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          Blog
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: '#111827', lineHeight: 1.2, margin: '0 0 16px' }}>
          Tips para agencias de marketing
        </h1>
        <p style={{ color: '#6B7280', fontSize: 18, maxWidth: 560, margin: '0 auto' }}>
          Guías prácticas para gestionar mejor tus proyectos, clientes y equipo en tu agencia digital.
        </p>
      </div>

      {/* Posts */}
      <div style={{ display: 'grid', gap: 24 }}>
        {blogPosts.map(post => (
          <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
            <article style={{
              background: 'white',
              borderRadius: 16,
              padding: '28px 32px',
              border: '1px solid rgba(17,24,39,0.06)',
              transition: 'box-shadow 0.2s, transform 0.2s',
              display: 'block',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ background: categoryColors[post.category] + '15', color: categoryColors[post.category], padding: '3px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600 }}>
                  {post.category}
                </span>
                <span style={{ color: '#9CA3AF', fontSize: 13 }}>{post.readTime} de lectura</span>
                <span style={{ color: '#9CA3AF', fontSize: 13 }}>·</span>
                <span style={{ color: '#9CA3AF', fontSize: 13 }}>
                  {new Date(post.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 10px', lineHeight: 1.3 }}>
                {post.title}
              </h2>
              <p style={{ color: '#6B7280', fontSize: 15, margin: 0, lineHeight: 1.6 }}>
                {post.description}
              </p>
              <div style={{ marginTop: 16, color: '#7C3AED', fontSize: 14, fontWeight: 600 }}>
                Leer artículo →
              </div>
            </article>
          </Link>
        ))}
      </div>

      {/* CTA */}
      <div style={{ marginTop: 64, background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', borderRadius: 20, padding: '40px 32px', textAlign: 'center' }}>
        <h2 style={{ color: 'white', fontSize: 28, fontWeight: 800, margin: '0 0 12px' }}>
          ¿Listo para organizar tu agencia?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, margin: '0 0 24px' }}>
          Prueba Weeklink gratis por 14 días. Sin tarjeta de crédito.
        </p>
        <Link href="/login" style={{ background: 'white', color: '#7C3AED', padding: '12px 28px', borderRadius: 12, textDecoration: 'none', fontSize: 15, fontWeight: 700, display: 'inline-block' }}>
          Empezar gratis →
        </Link>
      </div>
    </main>
  );
}
