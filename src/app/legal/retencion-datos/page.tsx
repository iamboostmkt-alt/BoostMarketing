export const metadata = { title: 'Retención y Eliminación de Datos — Weeklink' };

export default function RetencionDatosPage() {
  return (
    <>
      <h1 className="text-[32px] font-bold text-[#111827] mb-2">Retención y Eliminación de Datos</h1>
      <p className="text-[13px] text-[#9CA3AF] mb-8">Última actualización: 16 de junio de 2026</p>
      <div className="space-y-8" style={{ color: '#374151', lineHeight: '1.75' }}>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-4">Períodos de retención</h2>
          <div className="space-y-3">
            {[
              { tipo: 'Datos del workspace activo', periodo: 'Mientras la suscripción esté activa', color: '#059669' },
              { tipo: 'Workspace cancelado', periodo: '90 días para recuperación, luego eliminación definitiva', color: '#D97706' },
              { tipo: 'Sesiones de IA', periodo: '30 días desde la última actividad', color: '#7C3AED' },
              { tipo: 'Logs de auditoría', periodo: '12 meses', color: '#2563EB' },
              { tipo: 'Registros de facturación', periodo: 'Conforme a obligaciones fiscales mexicanas (5 años)', color: '#6B7280' },
              { tipo: 'Archivos subidos', periodo: 'Hasta cancelación del workspace + 90 días', color: '#D97706' },
            ].map(r => (
              <div key={r.tipo} className="flex items-start gap-3 p-4 rounded-xl border border-[rgba(17,24,39,0.06)] bg-white">
                <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: r.color }} />
                <div>
                  <p className="text-[14px] font-semibold text-[#111827]">{r.tipo}</p>
                  <p className="text-[13px]">{r.periodo}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Solicitud de eliminación</h2>
          <p className="text-[14px]">Puedes solicitar la eliminación de tu cuenta y datos en cualquier momento desde Configuración → Cuenta, o contactando a Weeklink directamente. Procesaremos la solicitud en un máximo de 30 días hábiles.</p>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Portabilidad de datos</h2>
          <p className="text-[14px]">Tienes derecho a exportar tu información antes de cancelar. Weeklink te permite exportar tareas, clientes y archivos desde la configuración del workspace.</p>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Respaldos</h2>
          <p className="text-[14px]">Supabase realiza respaldos automáticos de la base de datos. Sin embargo, en etapa Founding Beta, recomendamos mantener respaldos propios de información crítica.</p>
        </section>
      </div>
    </>
  );
}
