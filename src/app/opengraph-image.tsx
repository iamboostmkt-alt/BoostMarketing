import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Weeklink — Software para Agencias de Marketing en México';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #07070A 0%, #0f0f1a 50%, #1a0a2e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow effect */}
        <div style={{
          position: 'absolute',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
          top: -100,
          left: '50%',
          transform: 'translateX(-50%)',
        }} />

        {/* Logo + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40 }}>
          <div style={{
            width: 72,
            height: 72,
            background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
          }}>
            W
          </div>
          <span style={{ color: 'white', fontSize: 52, fontWeight: 700, letterSpacing: -1 }}>
            Weeklink
          </span>
        </div>

        {/* Headline */}
        <div style={{
          color: 'white',
          fontSize: 44,
          fontWeight: 800,
          textAlign: 'center',
          maxWidth: 900,
          lineHeight: 1.2,
          marginBottom: 24,
        }}>
          Software para Agencias de
          <span style={{ color: '#A78BFA' }}> Marketing</span>
        </div>

        {/* Subtitle */}
        <div style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: 24,
          textAlign: 'center',
          maxWidth: 700,
          marginBottom: 48,
        }}>
          Tareas · Proyectos · Chat con clientes · Entregas y aprobaciones
        </div>

        {/* Features pills */}
        <div style={{ display: 'flex', gap: 16 }}>
          {['✓ Portal cliente', '✓ IA integrada', '✓ Google Meet', '✓ Notificaciones'].map(f => (
            <div key={f} style={{
              background: 'rgba(124,58,237,0.2)',
              border: '1px solid rgba(124,58,237,0.4)',
              color: '#C4B5FD',
              padding: '10px 20px',
              borderRadius: 100,
              fontSize: 18,
              fontWeight: 600,
            }}>
              {f}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          color: 'rgba(255,255,255,0.3)',
          fontSize: 18,
        }}>
          weeklink.com.mx
        </div>
      </div>
    ),
    { ...size }
  );
}
