import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pagos y suscripción — Weeklink',
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#F6F7FB', minHeight: '100vh', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      {children}
    </div>
  );
}
