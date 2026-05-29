'use client';

export function WeeklinkChatContent({ room, title, subtitle, accentColor }: {
  room?: string;
  title?: string;
  subtitle?: string;
  onOpenThread?: (msg: any) => void;
  accentColor?: string;
}) {
  return (
    <div style={{ flex: 1, background: '#07070A', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ background: '#8B5CF6', color: 'white', padding: '4px 12px', fontSize: '11px', textAlign: 'center' }}>
        ✦ WeeklinkChat ACTIVO — room: {room}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Cargando mensajes...</p>
      </div>
    </div>
  );
}
