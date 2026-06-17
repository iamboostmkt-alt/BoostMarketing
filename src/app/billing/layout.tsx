import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pagos y suscripción — Weeklink',
};

export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login?callbackUrl=/billing');

  return (
    <>
      {/* Script que aplica fondo claro antes del primer paint */}
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.style.background='#F6F7FB';document.body.style.background='#F6F7FB';` }} />
      <div className="auth-bg" style={{ background: '#F6F7FB', minHeight: '100dvh', fontFamily: 'var(--font-inter, system-ui, sans-serif)', position: 'relative' }}>
        {children}
      </div>
    </>
  );
}
