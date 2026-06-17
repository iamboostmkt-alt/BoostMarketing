export const metadata = { title: 'Política de Seguridad — Weeklink' };

export default function SeguridadPage() {
  return (
    <>
      <h1 className="text-[32px] font-bold text-[#111827] mb-2">Política de Seguridad</h1>
      <p className="text-[13px] text-[#9CA3AF] mb-8">Última actualización: 16 de junio de 2026</p>
      <div className="space-y-8" style={{ color: '#374151', lineHeight: '1.75' }}>
        <section className="rounded-2xl p-5 bg-blue-50 border border-blue-100">
          <p className="text-[14px] text-blue-800">Weeklink implementa medidas de seguridad razonables conforme a estándares de la industria. Sin embargo, ningún sistema conectado a internet puede garantizar seguridad absoluta.</p>
        </section>
        {[
          { icon: '🔐', title: 'Autenticación', items: ['Contraseñas hasheadas con bcrypt', 'OAuth 2.0 con Google', 'Sesiones seguras con NextAuth y JWT', 'Tokens de invitación de un solo uso'] },
          { icon: '🛡️', title: 'Protección de datos', items: ['Conexiones HTTPS/TLS en tránsito', 'Supabase con cifrado en reposo', 'Aislamiento multi-tenant por workspaceId', 'Rate limiting en todos los endpoints'] },
          { icon: '💳', title: 'Pagos', items: ['Procesamiento 100% vía Stripe (PCI DSS Nivel 1)', 'Weeklink NO almacena datos de tarjeta', 'Webhooks verificados con firma HMAC', 'Claves de API nunca expuestas al cliente'] },
          { icon: '📋', title: 'Auditoría', items: ['Logs de acciones importantes (audit trail)', 'Registro de mutaciones en base de datos', 'Monitoreo de errores en producción', 'Revisiones de seguridad periódicas'] },
        ].map(s => (
          <section key={s.title}>
            <h2 className="text-[18px] font-semibold text-[#111827] mb-3">{s.icon} {s.title}</h2>
            <ul className="space-y-2">
              {s.items.map(item => (
                <li key={item} className="flex gap-2 text-[14px]">
                  <span className="text-green-600 shrink-0">✓</span>{item}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">⚠️ Limitaciones reconocidas</h2>
          <p className="text-[14px]">Weeklink se encuentra en etapa Founding Beta. Reconocemos que pueden existir vulnerabilidades no identificadas. Por eso recomendamos no almacenar información crítica como único repositorio.</p>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Reporte de vulnerabilidades</h2>
          <p className="text-[14px]">Si identificas una vulnerabilidad de seguridad, repórtala responsablemente a través de nuestros canales oficiales. No la divulgues públicamente antes de que hayamos podido atenderla.</p>
        </section>
      </div>
    </>
  );
}
