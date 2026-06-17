export const metadata = { title: 'Política de Cookies — Weeklink' };

export default function CookiesPage() {
  return (
    <>
      <h1 className="text-[32px] font-bold text-[#111827] mb-2">Política de Cookies</h1>
      <p className="text-[13px] text-[#9CA3AF] mb-8">Última actualización: 16 de junio de 2026</p>
      <div className="space-y-8" style={{ color: '#374151', lineHeight: '1.75' }}>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">¿Qué son las cookies?</h2>
          <p className="text-[14px]">Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas Weeklink. Nos permiten recordar tus preferencias, mantener tu sesión activa y mejorar tu experiencia.</p>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Tipos de cookies que usamos</h2>
          <div className="space-y-4">
            {[
              { tipo: 'Necesarias', desc: 'Imprescindibles para el funcionamiento de la plataforma. Incluyen la cookie de sesión de autenticación (NextAuth) y las preferencias de seguridad. No pueden desactivarse.', color: '#059669' },
              { tipo: 'Analíticas', desc: 'Nos ayudan a entender cómo se usa Weeklink para mejorar la experiencia. Recogen datos de forma anónima sobre páginas visitadas y tiempo de uso.', color: '#2563EB' },
              { tipo: 'Preferencias', desc: 'Recuerdan tus configuraciones: tema, idioma, layout del dashboard y ajustes de notificaciones.', color: '#7C3AED' },
              { tipo: 'Marketing', desc: 'Actualmente no usamos cookies de marketing ni rastreo publicitario. Weeklink es un producto ad-free.', color: '#9CA3AF' },
            ].map(c => (
              <div key={c.tipo} className="rounded-xl p-4 border border-[rgba(17,24,39,0.06)] bg-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                  <span className="text-[14px] font-semibold text-[#111827]">{c.tipo}</span>
                </div>
                <p className="text-[13px]">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Gestión de cookies</h2>
          <p className="text-[14px]">Puedes gestionar o eliminar cookies desde la configuración de tu navegador. Ten en cuenta que desactivar cookies necesarias puede afectar el funcionamiento de la plataforma, incluyendo el inicio de sesión.</p>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Cookies de terceros</h2>
          <p className="text-[14px]">Stripe (procesador de pagos) utiliza sus propias cookies en el flujo de checkout. Estas están sujetas a la <a href="https://stripe.com/es-mx/privacy" target="_blank" className="text-[#7C3AED] underline">Política de Privacidad de Stripe</a>. Google OAuth puede establecer cookies durante el proceso de autenticación.</p>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Cambios a esta política</h2>
          <p className="text-[14px]">Podemos actualizar esta política en cualquier momento. Los cambios relevantes serán notificados dentro de la plataforma.</p>
        </section>
      </div>
    </>
  );
}
