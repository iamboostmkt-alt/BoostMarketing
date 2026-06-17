import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Weeklink — La plataforma todo en uno para agencias modernas',
  description: 'Gestiona proyectos, chats, entregables y clientes en un solo lugar. Colabora, automatiza y entrega resultados con tu equipo.',
  openGraph: {
    title: 'Weeklink — Para agencias modernas',
    description: 'CRM + Chat + Tareas + Portal cliente en una sola plataforma.',
    url: 'https://weeklink.app',
  },
};

export default function WeeklinkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="auth-bg"
      style={{
        background: '#F6F7FB',
        color: '#111827',
        minHeight: '100dvh',
        fontFamily: 'var(--font-inter, system-ui, sans-serif)',
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
}
