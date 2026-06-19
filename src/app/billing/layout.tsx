import { getServerSession } from 'next-auth';
import BillingCleanup from './BillingCleanup';
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
      {/* Fondo claro solo mientras billing está montado */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          document.documentElement.setAttribute('data-billing', '1');
          document.documentElement.style.background = '#F6F7FB';
          document.body.style.background = '#F6F7FB';
          document.body.style.overflow = '';
        })();
      ` }} />
      <div className="auth-bg" style={{ background: '#F6F7FB', minHeight: '100dvh', fontFamily: 'var(--font-inter, system-ui, sans-serif)', position: 'relative' }}>
        <BillingCleanup />
        {children}
      </div>
    </>
  );
}
