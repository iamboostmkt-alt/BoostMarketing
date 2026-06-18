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
      {/* Al entrar: poner fondo claro. Al salir: restaurar oscuro */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          var el = document.documentElement;
          var bod = document.body;
          el.style.background = '#F6F7FB';
          bod.style.background = '#F6F7FB';
          // Observer: cuando .auth-bg se desmonte, restaurar oscuro
          var obs = new MutationObserver(function() {
            if (!document.querySelector('.auth-bg')) {
              el.style.background = '#080808';
              bod.style.background = '';
              obs.disconnect();
            }
          });
          obs.observe(document.body, { childList: true, subtree: true });
        })();
      ` }} />
      <div className="auth-bg" style={{ background: '#F6F7FB', minHeight: '100dvh', fontFamily: 'var(--font-inter, system-ui, sans-serif)', position: 'relative' }}>
        {children}
      </div>
    </>
  );
}
