import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad — Weeklink',
  description: 'Política de privacidad de Weeklink. Conoce cómo recopilamos, usamos y protegemos tus datos personales.',
  alternates: { canonical: 'https://weeklink.com.mx/privacidad' },
};

export default function PrivacidadPage() {
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

        <h1 style={{ fontSize: 34, fontWeight: 800, color: '#111827', margin: '0 0 8px', lineHeight: 1.2 }}>Política de Privacidad</h1>
        <p style={{ color: '#9CA3AF', fontSize: 14, margin: '0 0 48px' }}>Última actualización: 19 de junio de 2026 · Vigente para weeklink.com.mx</p>

        <div style={{ background: 'white', borderRadius: 16, border: '1px solid rgba(17,24,39,0.06)', padding: '40px 40px' }}>
          <div style={{ color: '#374151', lineHeight: 1.75, fontSize: 15 }}>

            <p style={{ marginBottom: 24 }}>En <strong>Weeklink</strong> (operado por BoostMarketing, con domicilio en México), nos comprometemos a proteger tu privacidad y la de tus clientes. Esta política describe qué datos recopilamos, cómo los usamos y qué derechos tienes sobre ellos.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>1. Quiénes somos</h2>
            <p>Weeklink es una plataforma de gestión de proyectos y comunicación diseñada para agencias de marketing digital en México. El responsable del tratamiento de datos es BoostMarketing, con correo de contacto <strong>weeklinkapp@gmail.com</strong>.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>2. Datos que recopilamos</h2>
            <p>Recopilamos los siguientes tipos de información:</p>
            <ul style={{ margin: '12px 0 12px 20px', lineHeight: 2 }}>
              <li><strong>Datos de cuenta:</strong> nombre completo, dirección de correo electrónico, nombre de tu agencia, foto de perfil (opcional).</li>
              <li><strong>Datos de uso de la plataforma:</strong> tareas, proyectos, mensajes de chat, archivos adjuntos, comentarios, reuniones agendadas y clientes registrados en el sistema.</li>
              <li><strong>Datos de Google:</strong> si conectas tu cuenta de Google, accedemos a tu perfil básico (nombre, email, foto) y al calendario (para crear eventos de Google Meet). Nunca accedemos a otros datos de Google sin tu permiso explícito.</li>
              <li><strong>Datos de facturación:</strong> información de pago procesada de forma segura por Stripe. Weeklink nunca almacena datos de tarjetas de crédito.</li>
              <li><strong>Datos técnicos:</strong> dirección IP, tipo de navegador, sistema operativo, páginas visitadas y tiempo de uso para mejorar la plataforma.</li>
              <li><strong>Notificaciones push:</strong> si activas las notificaciones, almacenamos un token de suscripción para enviarte alertas. Puedes desactivarlas en cualquier momento.</li>
            </ul>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>3. Cómo usamos tus datos</h2>
            <p>Usamos tus datos exclusivamente para:</p>
            <ul style={{ margin: '12px 0 12px 20px', lineHeight: 2 }}>
              <li>Proveer y mejorar el servicio de Weeklink.</li>
              <li>Enviar notificaciones relacionadas con tu trabajo (tareas asignadas, aprobaciones, recordatorios de reuniones).</li>
              <li>Gestionar tu suscripción y facturación.</li>
              <li>Soporte técnico y atención al cliente.</li>
              <li>Cumplir obligaciones legales en México.</li>
            </ul>
            <p><strong>No vendemos, alquilamos ni compartimos tus datos con terceros para fines publicitarios.</strong></p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>4. Uso de Google Calendar y Google Meet</h2>
            <p>Weeklink solicita acceso a tu Google Calendar únicamente para crear eventos de reunión con links de Google Meet. El uso que hacemos de la información obtenida a través de las APIs de Google cumple con la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#7C3AED' }}>Política de Datos de Usuario de los Servicios de API de Google</a>, incluyendo los requisitos de Uso Limitado.</p>
            <ul style={{ margin: '12px 0 12px 20px', lineHeight: 2 }}>
              <li>Solo leemos y creamos eventos en tu calendario para generar links de reunión.</li>
              <li>No compartimos datos de tu Google Calendar con terceros.</li>
              <li>No usamos datos de Google Calendar para publicidad.</li>
              <li>Puedes revocar el acceso en cualquier momento desde <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: '#7C3AED' }}>myaccount.google.com/permissions</a>.</li>
            </ul>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>5. Almacenamiento y seguridad</h2>
            <p>Tus datos se almacenan en servidores seguros proporcionados por Supabase (PostgreSQL) y Vercel, con centros de datos en Estados Unidos y Europa. Implementamos medidas de seguridad técnicas y organizativas que incluyen:</p>
            <ul style={{ margin: '12px 0 12px 20px', lineHeight: 2 }}>
              <li>Cifrado HTTPS/TLS en todas las comunicaciones.</li>
              <li>Autenticación segura con NextAuth y bcrypt para contraseñas.</li>
              <li>Aislamiento de datos por workspace (multi-tenancy).</li>
              <li>Rate limiting para prevenir ataques de fuerza bruta.</li>
              <li>Headers de seguridad HTTP (CSP, HSTS, X-Frame-Options).</li>
            </ul>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>6. Cookies y tecnologías similares</h2>
            <p>Weeklink usa cookies estrictamente necesarias para mantener tu sesión activa. No usamos cookies de seguimiento ni publicitarias. Las cookies de sesión se eliminan al cerrar el navegador o al cerrar sesión.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>7. Tus derechos (LFPDPPP)</h2>
            <p>Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) de México, tienes derecho a:</p>
            <ul style={{ margin: '12px 0 12px 20px', lineHeight: 2 }}>
              <li><strong>Acceso:</strong> conocer qué datos tenemos sobre ti.</li>
              <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
              <li><strong>Cancelación:</strong> solicitar la eliminación de tus datos.</li>
              <li><strong>Oposición:</strong> oponerte al uso de tus datos para ciertos fines.</li>
              <li><strong>Portabilidad:</strong> recibir una copia de tus datos en formato legible.</li>
            </ul>
            <p>Para ejercer estos derechos, escríbenos a <strong>weeklinkapp@gmail.com</strong> con el asunto "Derechos ARCO". Responderemos en un plazo máximo de 20 días hábiles.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>8. Retención de datos</h2>
            <p>Conservamos tus datos mientras tu cuenta esté activa. Al cancelar tu suscripción, tus datos se conservan por 30 días para posible recuperación, después de los cuales se eliminan permanentemente, excepto lo que la ley mexicana exija conservar.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>9. Menores de edad</h2>
            <p>Weeklink no está dirigido a menores de 18 años. No recopilamos intencionalmente datos de menores. Si detectamos que un menor se ha registrado, eliminaremos su cuenta inmediatamente.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>10. Cambios a esta política</h2>
            <p>Podemos actualizar esta política periódicamente. Te notificaremos por correo electrónico con al menos 15 días de anticipación antes de que entren en vigor cambios significativos.</p>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '36px 0 12px' }}>11. Contacto</h2>
            <p>Para cualquier duda sobre privacidad o para ejercer tus derechos:</p>
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
            <Link href="/terminos" style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>Términos y Condiciones</Link>
            <Link href="/weeklink" style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>Inicio</Link>
            <Link href="/login" style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>Iniciar sesión</Link>
          </div>
          <p style={{ fontSize: 12, color: '#D1D5DB' }}>© {new Date().getFullYear()} Weeklink · BoostMarketing · México</p>
        </div>
      </main>
    </div>
  );
}
