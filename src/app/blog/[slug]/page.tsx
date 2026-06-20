import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { blogPosts, getBlogPost } from '@/lib/blog-posts';

export async function generateStaticParams() {
  return blogPosts.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getBlogPost(params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `https://weeklink.com.mx/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://weeklink.com.mx/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
      authors: ['Weeklink'],
    },
  };
}

function renderContent(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '40px 0 16px', lineHeight: 1.3 }}>{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '28px 0 10px' }}>{line.slice(4)}</h3>);
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<p key={key++} style={{ fontWeight: 700, color: '#111827', margin: '12px 0' }}>{line.slice(2, -2)}</p>);
    } else if (line.startsWith('✅ ') || line.startsWith('❌ ')) {
      const isPos = line.startsWith('✅');
      elements.push(<div key={key++} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '6px 0', color: isPos ? '#059669' : '#DC2626', fontSize: 15 }}><span>{isPos ? '✅' : '❌'}</span><span>{line.slice(3)}</span></div>);
    } else if (line.match(/^\d+\. /)) {
      elements.push(<li key={key++} style={{ color: '#374151', fontSize: 16, lineHeight: 1.7, marginBottom: 8 }}>{line.replace(/^\d+\. /, '')}</li>);
    } else if (line.startsWith('- ')) {
      elements.push(<li key={key++} style={{ color: '#374151', fontSize: 16, lineHeight: 1.7, marginBottom: 6, listStyleType: 'disc', marginLeft: 20 }}>{line.slice(2)}</li>);
    } else if (line.includes('[') && line.includes('](')) {
      const match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        elements.push(
          <div key={key++} style={{ margin: '24px 0', textAlign: 'center' }}>
            <Link href={match[2]} style={{ background: '#7C3AED', color: 'white', padding: '12px 28px', borderRadius: 12, textDecoration: 'none', fontSize: 15, fontWeight: 700 }}>
              {match[1]}
            </Link>
          </div>
        );
      }
    } else if (line.trim()) {
      // Parsear **bold** inline
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const parsed = parts.map((p, idx) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return <strong key={idx}>{p.slice(2, -2)}</strong>;
        }
        return p;
      });
      elements.push(<p key={key++} style={{ color: '#374151', fontSize: 16, lineHeight: 1.8, margin: '12px 0' }}>{parsed}</p>);
    }
  }
  return elements;
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: 'Weeklink', url: 'https://weeklink.com.mx' },
    publisher: { '@type': 'Organization', name: 'Weeklink', logo: { '@type': 'ImageObject', url: 'https://weeklink.com.mx/icons/icon-192.png' } },
    url: `https://weeklink.com.mx/blog/${post.slug}`,
    keywords: post.keywords.join(', '),
  };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* Breadcrumb */}
      <nav style={{ marginBottom: 32, fontSize: 14, color: '#9CA3AF' }}>
        <Link href="/weeklink" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Inicio</Link>
        <span style={{ margin: '0 8px' }}>→</span>
        <Link href="/blog" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Blog</Link>
        <span style={{ margin: '0 8px' }}>→</span>
        <span style={{ color: '#374151' }}>{post.category}</span>
      </nav>

      {/* Header */}
      <header style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(124,58,237,0.1)', color: '#7C3AED', padding: '4px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600 }}>{post.category}</span>
          <span style={{ color: '#9CA3AF', fontSize: 13, display: 'flex', alignItems: 'center' }}>{post.readTime} de lectura</span>
          <span style={{ color: '#9CA3AF', fontSize: 13, display: 'flex', alignItems: 'center' }}>
            {new Date(post.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#111827', lineHeight: 1.25, margin: '0 0 16px' }}>{post.title}</h1>
        <p style={{ color: '#6B7280', fontSize: 18, lineHeight: 1.6, margin: 0 }}>{post.description}</p>
      </header>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(17,24,39,0.06)', marginBottom: 40 }} />

      {/* Content */}
      <article style={{ background: 'white', borderRadius: 20, padding: '40px 40px', border: '1px solid rgba(17,24,39,0.06)' }}>
        {renderContent(post.content)}
      </article>

      {/* CTA */}
      <div style={{ marginTop: 48, background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', borderRadius: 20, padding: '40px 32px', textAlign: 'center' }}>
        <h2 style={{ color: 'white', fontSize: 26, fontWeight: 800, margin: '0 0 10px' }}>¿Listo para organizarte?</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 24px', fontSize: 16 }}>Prueba Weeklink gratis por 14 días. Sin tarjeta de crédito.</p>
        <Link href="/login" style={{ background: 'white', color: '#7C3AED', padding: '12px 28px', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>Empezar gratis →</Link>
      </div>

      {/* More posts */}
      <div style={{ marginTop: 48 }}>
        <h3 style={{ color: '#111827', fontWeight: 700, fontSize: 20, marginBottom: 20 }}>Más artículos</h3>
        <div style={{ display: 'grid', gap: 16 }}>
          {blogPosts.filter(p => p.slug !== post.slug).slice(0, 2).map(p => (
            <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: 'none', background: 'white', borderRadius: 12, padding: '20px 24px', border: '1px solid rgba(17,24,39,0.06)', display: 'block' }}>
              <div style={{ fontSize: 12, color: '#7C3AED', fontWeight: 600, marginBottom: 6 }}>{p.category}</div>
              <div style={{ color: '#111827', fontWeight: 600, fontSize: 16, lineHeight: 1.4 }}>{p.title}</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
