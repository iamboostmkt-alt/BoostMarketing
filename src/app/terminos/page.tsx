import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Weeklink',
  description: 'Términos y condiciones de uso de Weeklink. Lee nuestros términos antes de usar la plataforma.',
  alternates: { canonical: 'https://weeklink.com.mx/terminos' },
};

export default function TerminosPage() {
  return (
    <div style={{ background: '#F6F7FB', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Navbar */}
      <nav style={{ background: 'white', borderBottom: '1px solid rgba(17,24,39,0.06)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/weeklink" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/weeklink-logo.png" alt="Weeklink" style={{ height: 24, width: 'auto' }} />
        </Link>
        <Link href="/login" style={{ fontSize: 13, color: '#7C3AED', fontWeight: 600, textDecoration: 'none' }}>Iniciar sesión →</Link>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        <Link href="/weeklink" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9CA3AF', textDecoration: 'none', marginBottom: 32 }}>
          ← Volver
        </Link>

        <h1 style={{ fontSize: 34, fontWeight: 800, color: '#111827', margin: '0 0 8px', lineHeight: 1.2 }}>Términos y Condiciones</h1>
        <p style={{ color: '#9CA3AF', fontSize: 14, margin: '0 0 48px' }}>Última actualización: 19 de junio de 2026 · Vigente para weeklink.com.mx</p>

        <div style={{ background: 'white', borderRadius: 16, border: '1px solid rgba(17,24,39,0.06)', padding: '40px 40px' }}>
          <div style={{ color: '#374151', lineHeight: 1.75, fontSize: 15 }}>

            <p style={{ marginBottom: 24 }}>Al acceder o usar <strong>Weeklink</strong> (weeklink.com.mx), aceptas estos Términos y Condiciones. Si no estás de acuerdo, no uses la plataforma. Weeklink es operado por <strong>BoostMarketing</strong>, con domicilio en México.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>1. Descripción del servicio</h2>
            <p>Weeklink es una plataforma SaaS (Software como Servicio) de gestión de proyectos, comunicación y colaboración diseñada para agencias de marketing digital. Incluye funcionalidades de gestión de tareas, chat en tiempo real, portal de clientes, aprobaciones de entregables, calendario con Google Meet, asistente de IA y notificaciones.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>2. Elegibilidad y registro</h2>
            <ul style={{ margin: '12px 0 12px 20px', lineHeight: 2 }}>
              <li>Debes tener al menos 18 años para usar Weeklink.</li>
              <li>Debes proporcionar información veraz al registrarte.</li>
              <li>Eres responsable de mantener la confidencialidad de tu contraseña.</li>
              <li>Una cuenta es para uso de una sola agencia o persona. No puedes compartir cuentas entre diferentes empresas.</li>
              <li>Weeklink se reserva el derecho de rechazar registros a su discreción.</li>
            </ul>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>3. Planes y pagos</h2>
            <p>Weeklink ofrece planes de suscripción mensuales y anuales. Los precios se muestran en pesos mexicanos (MXN) e incluyen IVA cuando aplique.</p>
            <ul style={{ margin: '12px 0 12px 20px', lineHeight: 2 }}>
              <li><strong>Prueba gratuita:</strong> 14 días sin tarjeta de crédito requerida.</li>
              <li><strong>Facturación:</strong> Los cargos se realizan al inicio de cada periodo de suscripción.</li>
              <li><strong>Renovación automática:</strong> Las suscripciones se renuevan automáticamente. Puedes cancelar antes de la fecha de renovación.</li>
              <li><strong>Reembolsos:</strong> No ofrecemos reembolsos por periodos parciales. Si cancelas, tendrás acceso hasta el final del periodo pagado.</li>
              <li><strong>Cambios de precio:</strong> Notificaremos cambios de precio con al menos 30 días de anticipación.</li>
            </ul>
            <p>Los pagos se procesan de forma segura a través de <strong>Stripe</strong>. Weeklink nunca almacena datos de tarjetas de crédito.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>4. Uso aceptable</h2>
            <p>Al usar Weeklink, te comprometes a <strong>no</strong>:</p>
            <ul style={{ margin: '12px 0 12px 20px', lineHeight: 2 }}>
              <li>Usar la plataforma para actividades ilegales o fraudulentas.</li>
              <li>Subir contenido que viole derechos de autor, marcas registradas u otros derechos de propiedad intelectual.</li>
              <li>Distribuir malware, spam o contenido malicioso.</li>
              <li>Intentar acceder a cuentas o datos de otros usuarios sin autorización.</li>
              <li>Hacer ingeniería inversa, descompilar o intentar extraer el código fuente de la plataforma.</li>
              <li>Usar la plataforma para hostigar, amenazar o discriminar a otras personas.</li>
              <li>Sobrecargar intencionalmente los servidores de Weeklink.</li>
              <li>Revender o sublicenciar el acceso a Weeklink sin autorización escrita.</li>
            </ul>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>5. Contenido del usuario</h2>
            <p>Eres el único propietario del contenido que subes a Weeklink (tareas, archivos, mensajes, información de clientes). Al subir contenido, nos otorgas una licencia limitada, no exclusiva, para almacenarlo y mostrarlo únicamente con el fin de proveer el servicio.</p>
            <p>Weeklink no vende ni comparte tu contenido con terceros. Puedes exportar o eliminar tu contenido en cualquier momento.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>6. Integración con Google</h2>
            <p>Weeklink se integra con Google Calendar y Google Meet para facilitar la creación de reuniones. El uso de esta integración está sujeto a los <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#7C3AED' }}>Términos de Servicio de Google</a>. Weeklink accede a tu Google Calendar únicamente para crear eventos y links de Meet, con tu autorización explícita.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>7. Disponibilidad del servicio</h2>
            <p>Nos esforzamos por mantener Weeklink disponible 99.5% del tiempo. Sin embargo, no garantizamos disponibilidad ininterrumpida. Pueden ocurrir interrupciones por mantenimiento (notificadas con anticipación), causas de fuerza mayor o factores fuera de nuestro control.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>8. Propiedad intelectual</h2>
            <p>Weeklink, su código, diseño, marca, logo y funcionalidades son propiedad de BoostMarketing y están protegidos por leyes de propiedad intelectual. No puedes copiar, modificar o distribuir ningún elemento de la plataforma sin autorización escrita.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>9. Limitación de responsabilidad</h2>
            <p>Weeklink se proporciona "tal cual". No somos responsables por pérdida de datos, lucro cesante, daños indirectos o consecuentes derivados del uso o imposibilidad de uso de la plataforma. Nuestra responsabilidad máxima se limita al monto pagado por el usuario en los últimos 3 meses.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>10. Cancelación y terminación</h2>
            <p>Puedes cancelar tu suscripción en cualquier momento desde Ajustes → Empresa → Gestionar suscripción. Weeklink puede suspender o terminar tu cuenta si:</p>
            <ul style={{ margin: '12px 0 12px 20px', lineHeight: 2 }}>
              <li>Violas estos términos.</li>
              <li>No pagas tu suscripción después de 15 días de aviso.</li>
              <li>Tu cuenta muestra actividad fraudulenta.</li>
            </ul>
            <p>Al terminar tu cuenta, tendrás 30 días para exportar tu información antes de que se elimine permanentemente.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>11. Modificaciones</h2>
            <p>Podemos modificar estos términos con al menos 30 días de anticipación. Te notificaremos por correo electrónico. El uso continuo de Weeklink después de esa fecha implica aceptación de los nuevos términos.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>12. Ley aplicable</h2>
            <p>Estos términos se rigen por las leyes de los <strong>Estados Unidos Mexicanos</strong>. Cualquier controversia se resolverá ante los tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponder.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>13. Contacto</h2>
            <p>Para cualquier duda sobre estos términos:</p>
            <ul style={{ margin: '12px 0 0 20px', lineHeight: 2 }}>
              <li><strong>Email:</strong> weeklinkapp@gmail.com</li>
              <li><strong>Plataforma:</strong> weeklink.com.mx</li>
              <li><strong>Responsable:</strong> BoostMarketing, México</li>
            </ul>

          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 16 }}>
            <Link href="/privacidad" style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>Política de Privacidad</Link>
            <Link href="/weeklink" style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>Inicio</Link>
            <Link href="/login" style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>Iniciar sesión</Link>
          </div>
          <p style={{ fontSize: 12, color: '#D1D5DB' }}>© {new Date().getFullYear()} Weeklink · BoostMarketing · México</p>
        </div>
      </main>
    </div>
  );
}
