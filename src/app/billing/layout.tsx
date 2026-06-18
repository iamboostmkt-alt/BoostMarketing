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
          // Poner fondo claro inmediatamente
          el.style.background = '#F6F7FB';
          bod.style.background = '#F6F7FB';
          // Cuando se desmonte .auth-bg, restaurar fondo oscuro INMEDIATAMENTE
          var obs = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
              if (!document.querySelector('.auth-bg')) {
                el.style.background = '#080808';
                bod.style.background = '#080808';
                // Quitar después de la transición
                setTimeout(function() {
                  if (!document.querySelector('.auth-bg')) {
                    el.style.removeProperty('background');
                    bod.style.removeProperty('background');
                  }
                }, 500);
                obs.disconnect();
                break;
              }
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
