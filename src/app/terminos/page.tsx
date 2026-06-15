import Link from 'next/link';

export const metadata = { title: 'Términos y Condiciones — Weeklink' };

export default function TerminosPage() {
  return (
    <div style={{ background: '#F6F7FB', minHeight: '100vh', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/weeklink" className="inline-flex items-center gap-1.5 text-[13px] mb-8 transition-colors" style={{ color: '#9CA3AF' }}>
          ← Volver a Weeklink
        </Link>
        <h1 className="text-[32px] font-bold text-[#111827] mb-2">Términos y Condiciones</h1>
        <p className="text-[13px] text-[#9CA3AF] mb-8">Última actualización: 15 de junio de 2026</p>

        <div className="space-y-8" style={{ color: '#374151', lineHeight: '1.75' }}>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">1. Aceptación de los términos</h2>
            <p className="text-[14px]">Al registrarte y usar Weeklink, aceptas estos Términos y Condiciones. Si no estás de acuerdo con algún término, no uses el servicio. Estos términos aplican a todas las agencias y usuarios que accedan a la plataforma.</p>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">2. Descripción del servicio</h2>
            <p className="text-[14px]">Weeklink es una plataforma SaaS de gestión para agencias de marketing que incluye: CRM, gestión de tareas, chat interno, portal del cliente, proyectos con milestones, analytics e inteligencia artificial. El servicio se ofrece bajo suscripción mensual o anual con período de prueba gratuito de 15 días.</p>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">3. Período de prueba y facturación</h2>
            <p className="text-[14px] mb-3">Al registrarte obtienes 15 días de acceso completo sin costo. Al finalizar el período de prueba, se procesará automáticamente el pago según el plan que seleccionaste. Puedes cancelar en cualquier momento antes del cobro automático sin ningún cargo.</p>
            <p className="text-[14px]">Los precios están expresados en MXN (pesos mexicanos) e IVA no incluido. Weeklink se reserva el derecho de modificar los precios con 30 días de aviso previo.</p>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">4. Programa Founding Lifetime</h2>
            <p className="text-[14px]">Los primeros 20 clientes que completen su suscripción obtienen el precio de Business protegido de por vida mientras mantengan activa su suscripción sin interrupciones. Los siguientes 100 clientes conservan el precio Founding durante 18 meses.</p>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">5. Uso aceptable</h2>
            <p className="text-[14px] mb-2">Te comprometes a usar Weeklink únicamente para fines legítimos de gestión de agencia. Está prohibido:</p>
            <ul className="list-disc list-inside space-y-1 text-[14px] ml-2">
              <li>Compartir credenciales de acceso con personas no autorizadas</li>
              <li>Usar el servicio para actividades ilegales o fraudulentas</li>
              <li>Intentar acceder a datos de otros workspaces</li>
              <li>Realizar ingeniería inversa o intentar copiar el software</li>
            </ul>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">6. Propiedad intelectual</h2>
            <p className="text-[14px]">Weeklink y todo su contenido, diseño y código son propiedad de BoostMarketing y sus licenciantes. Los datos que subas a la plataforma son tuyos — Weeklink no reclama propiedad sobre el contenido de tu agencia.</p>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">7. Disponibilidad del servicio</h2>
            <p className="text-[14px]">Weeklink es actualmente una plataforma en fase Founding Beta. Nos esforzamos por mantener el servicio disponible 24/7, pero no garantizamos disponibilidad ininterrumpida. No recomendamos almacenar información crítica sin respaldos externos durante esta etapa.</p>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">8. Cancelación</h2>
            <p className="text-[14px]">Puedes cancelar tu suscripción en cualquier momento desde la sección de Billing en tu dashboard. Al cancelar, conservas acceso hasta el final del período pagado. Tus datos se conservan por 30 días después de la cancelación antes de ser eliminados permanentemente.</p>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">9. Contacto</h2>
            <p className="text-[14px]">Para dudas sobre estos términos, contáctanos en <strong>hola@weeklink.app</strong></p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[rgba(17,24,39,0.08)]">
          <Link href="/privacidad" className="text-[13px] hover:underline" style={{ color: '#7C3AED' }}>
            Ver Política de Privacidad →
          </Link>
        </div>
      </div>
    </div>
  );
}
