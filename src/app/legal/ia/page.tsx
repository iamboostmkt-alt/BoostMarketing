export const metadata = { title: 'Política de Inteligencia Artificial — Weeklink' };

export default function IaPage() {
  return (
    <>
      <h1 className="text-[32px] font-bold text-[#111827] mb-2">Política de Inteligencia Artificial</h1>
      <p className="text-[13px] text-[#9CA3AF] mb-8">Última actualización: 16 de junio de 2026</p>
      <div className="space-y-8" style={{ color: '#374151', lineHeight: '1.75' }}>
        <section className="rounded-2xl p-5 bg-violet-50 border border-violet-100">
          <p className="text-[14px] text-violet-800 font-medium">Weeklink integra modelos de IA para ayudarte a trabajar más rápido. Esta política explica cómo funcionan, qué puedes esperar de ellos y sus limitaciones.</p>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Modelos disponibles</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Claude Sonnet', provider: 'Anthropic', tier: 'Premium' },
              { name: 'Gemini 2.0 Flash', provider: 'Google', tier: 'Básico' },
              { name: 'DeepSeek V3', provider: 'DeepSeek', tier: 'Medio' },
              { name: 'Llama 3.3 70B', provider: 'Meta / Groq', tier: 'Básico' },
            ].map(m => (
              <div key={m.name} className="rounded-xl p-3 border border-[rgba(17,24,39,0.06)] bg-white">
                <p className="text-[13px] font-semibold text-[#111827]">{m.name}</p>
                <p className="text-[11px] text-[#9CA3AF]">{m.provider}</p>
                <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{m.tier}</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Limitaciones importantes</h2>
          <div className="space-y-3">
            {[
              'Las respuestas generadas por IA pueden contener errores, imprecisiones o información desactualizada.',
              'La IA no sustituye asesoría legal, financiera, médica ni ninguna asesoría profesional especializada.',
              'Siempre revisa y valida el contenido generado antes de usarlo en decisiones importantes.',
              'El rendimiento puede variar según el modelo y la complejidad de la consulta.',
              'Weeklink no garantiza la disponibilidad continua de modelos específicos — pueden cambiar o actualizarse.',
            ].map((l, i) => (
              <div key={i} className="flex gap-2.5 text-[13px]">
                <span className="text-amber-500 shrink-0 mt-0.5">⚠️</span>
                <span>{l}</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Privacidad y tus datos</h2>
          <p className="text-[14px] mb-3">Los mensajes enviados al asistente de IA son procesados por los proveedores de modelos correspondientes. Weeklink aplica estas medidas:</p>
          <ul className="space-y-2 text-[14px]">
            <li className="flex gap-2"><span className="text-green-600">✓</span> Las conversaciones se guardan en tu workspace y son visibles solo a ti.</li>
            <li className="flex gap-2"><span className="text-green-600">✓</span> Las sesiones de IA inactivas se eliminan automáticamente después de 30 días.</li>
            <li className="flex gap-2"><span className="text-green-600">✓</span> No vendemos ni compartimos tus prompts con terceros para publicidad.</li>
            <li className="flex gap-2"><span className="text-amber-500">⚠</span> Los prompts son enviados a los proveedores de modelos para generar respuestas. Consulta sus políticas individuales.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Uso responsable</h2>
          <p className="text-[14px]">No uses la IA de Weeklink para generar contenido engañoso, dañino, ilegal o que viole derechos de terceros. El incumplimiento puede resultar en la suspensión del acceso a las funcionalidades de IA.</p>
        </section>
      </div>
    </>
  );
}
