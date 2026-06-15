import Link from 'next/link';

export const metadata = { title: 'Política de Privacidad — Weeklink' };

export default function PrivacidadPage() {
  return (
    <div style={{ background: '#F6F7FB', minHeight: '100vh', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/weeklink" className="inline-flex items-center gap-1.5 text-[13px] mb-8 transition-colors" style={{ color: '#9CA3AF' }}>
          ← Volver a Weeklink
        </Link>
        <h1 className="text-[32px] font-bold text-[#111827] mb-2">Política de Privacidad</h1>
        <p className="text-[13px] text-[#9CA3AF] mb-8">Última actualización: 15 de junio de 2026</p>

        <div className="space-y-8" style={{ color: '#374151', lineHeight: '1.75' }}>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">1. Qué datos recopilamos</h2>
            <ul className="list-disc list-inside space-y-1 text-[14px] ml-2">
              <li><strong>Información de cuenta:</strong> nombre, email, nombre de agencia</li>
              <li><strong>Datos de uso:</strong> tareas, mensajes, archivos, clientes que gestiones en la plataforma</li>
              <li><strong>Datos de pago:</strong> procesados por Stripe — Weeklink nunca almacena datos de tarjetas</li>
              <li><strong>Datos técnicos:</strong> logs de acceso, dirección IP, tipo de dispositivo</li>
            </ul>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">2. Cómo usamos tus datos</h2>
            <ul className="list-disc list-inside space-y-1 text-[14px] ml-2">
              <li>Operar y mejorar la plataforma</li>
              <li>Enviarte notificaciones del servicio (tareas, reuniones, actualizaciones)</li>
              <li>Procesar pagos y gestionar tu suscripción</li>
              <li>Soporte técnico y atención al cliente</li>
            </ul>
            <p className="text-[14px] mt-3">No vendemos, alquilamos ni compartimos tus datos con terceros para fines comerciales.</p>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">3. Almacenamiento y seguridad</h2>
            <p className="text-[14px]">Tus datos se almacenan en Supabase (PostgreSQL) con cifrado en reposo y en tránsito (TLS). Las contraseñas se hashean con bcrypt. Los archivos se almacenan en UploadThing con URLs firmadas.</p>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">4. Cookies</h2>
            <p className="text-[14px]">Usamos cookies esenciales para mantener tu sesión activa (NextAuth). No usamos cookies de rastreo publicitario.</p>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">5. Tus derechos</h2>
            <ul className="list-disc list-inside space-y-1 text-[14px] ml-2">
              <li>Acceder a tus datos en cualquier momento desde tu perfil</li>
              <li>Solicitar la eliminación de tu cuenta y datos</li>
              <li>Exportar tus datos (próximamente)</li>
              <li>Actualizar tu información desde Configuración</li>
            </ul>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">6. Retención de datos</h2>
            <p className="text-[14px]">Al cancelar tu cuenta, conservamos tus datos por 30 días antes de eliminarlos permanentemente. Los datos de facturación se conservan por 5 años por requerimientos fiscales.</p>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">7. Cambios a esta política</h2>
            <p className="text-[14px]">Te notificaremos por email con al menos 15 días de anticipación ante cambios significativos en esta política.</p>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">8. Contacto</h2>
            <p className="text-[14px]">Para ejercer tus derechos o consultas de privacidad: <strong>privacidad@weeklink.app</strong></p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[rgba(17,24,39,0.08)]">
          <Link href="/terminos" className="text-[13px] hover:underline" style={{ color: '#7C3AED' }}>
            Ver Términos y Condiciones →
          </Link>
        </div>
      </div>
    </div>
  );
}
