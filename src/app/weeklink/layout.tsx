import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Weeklink — Software para Agencias de Marketing en México',
  description: 'La plataforma todo-en-uno para agencias de marketing en México. Gestiona tareas, proyectos, chat con clientes, entregas y aprobaciones. Prueba gratis 14 días.',
  keywords: [
    'software para agencias de marketing México',
    'CRM agencias digitales',
    'gestión proyectos agencia marketing',
    'portal cliente marketing digital',
    'plataforma agencia creativa',
    'herramienta gestión agencia México',
    'software tareas agencia',
    'chat cliente agencia digital',
  ],
  alternates: {
    canonical: 'https://weeklink.com.mx',
  },
  openGraph: {
    title: 'Weeklink — Software para Agencias de Marketing en México',
    description: 'Gestiona tareas, proyectos, chat con clientes y aprobaciones. Todo lo que tu agencia necesita en un solo lugar.',
    url: 'https://weeklink.com.mx',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Weeklink Software para Agencias de Marketing' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weeklink — Software para Agencias de Marketing',
    description: 'Gestiona tareas, proyectos y clientes en un solo lugar.',
    images: ['/og-image.png'],
  },
};

export default function WeeklinkLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
