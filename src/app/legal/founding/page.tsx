export const metadata = { title: 'Programa Founding Lifetime — Weeklink' };

export default function FoundingPage() {
  return (
    <>
      <h1 className="text-[32px] font-bold text-[#111827] mb-2">Programa Founding Lifetime</h1>
      <p className="text-[13px] text-[#9CA3AF] mb-8">Última actualización: 16 de junio de 2026</p>
      <div className="space-y-8" style={{ color: '#374151', lineHeight: '1.75' }}>
        <section className="rounded-2xl p-5 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100">
          <p className="text-[15px] font-semibold text-violet-800 mb-1">🚀 Founding Beta Program</p>
          <p className="text-[14px] text-violet-700">Los primeros usuarios de Weeklink obtienen beneficios exclusivos por ser parte del crecimiento inicial de la plataforma.</p>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-4">Niveles del programa</h2>
          <div className="space-y-4">
            <div className="rounded-2xl p-5 border-2 border-violet-200 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🥇</span>
                <span className="text-[15px] font-bold text-violet-700">Founding Lifetime</span>
                <span className="text-[11px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Primeros 20</span>
              </div>
              <p className="text-[14px] mb-3">Los primeros 20 usuarios en suscribirse obtienen el precio del plan Business bloqueado de por vida, mientras mantengan activa su suscripción.</p>
              <ul className="space-y-1 text-[13px]">
                <li className="flex gap-2"><span className="text-green-600">✓</span> Precio Business por siempre</li>
                <li className="flex gap-2"><span className="text-green-600">✓</span> Acceso a todas las funcionalidades actuales</li>
                <li className="flex gap-2"><span className="text-green-600">✓</span> Badge exclusivo en tu workspace</li>
                <li className="flex gap-2"><span className="text-green-600">✓</span> Voz en el roadmap y decisiones del producto</li>
              </ul>
            </div>
            <div className="rounded-2xl p-5 border border-[rgba(17,24,39,0.08)] bg-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🥈</span>
                <span className="text-[15px] font-bold text-[#111827]">Founding Beta</span>
                <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Usuarios 21–100</span>
              </div>
              <p className="text-[14px] mb-3">Los siguientes 80 usuarios obtienen precio preferencial del plan Pro bloqueado mientras la suscripción esté activa.</p>
              <ul className="space-y-1 text-[13px]">
                <li className="flex gap-2"><span className="text-green-600">✓</span> Precio Pro preferencial bloqueado</li>
                <li className="flex gap-2"><span className="text-green-600">✓</span> Acceso prioritario a nuevas funcionalidades</li>
                <li className="flex gap-2"><span className="text-green-600">✓</span> Soporte con respuesta prioritaria</li>
              </ul>
            </div>
          </div>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Condiciones para mantener el beneficio</h2>
          <ul className="space-y-2 text-[14px]">
            <li className="flex gap-2"><span className="text-green-600">✓</span> La suscripción debe mantenerse activa de forma continua.</li>
            <li className="flex gap-2"><span className="text-green-600">✓</span> Es personal e intransferible — no puede cederse a otra agencia.</li>
            <li className="flex gap-2"><span className="text-amber-500">⚠</span> Una cancelación de más de 90 días puede resultar en pérdida del beneficio Founding.</li>
            <li className="flex gap-2"><span className="text-red-500">✗</span> No incluye futuras funcionalidades premium que requieran infraestructura adicional significativa.</li>
            <li className="flex gap-2"><span className="text-red-500">✗</span> No incluye consumos extraordinarios de IA más allá del límite del plan.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Pérdida del beneficio</h2>
          <p className="text-[14px]">El beneficio Founding se pierde si: (a) cancelas tu suscripción por más de 90 días, (b) intentas transferirlo a otra cuenta, o (c) incumples los Términos y Condiciones de Weeklink.</p>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Cambios al programa</h2>
          <p className="text-[14px]">Weeklink podrá modificar las condiciones del programa Founding con previo aviso de 30 días a los usuarios afectados. Los beneficios ya otorgados se respetarán en la medida de lo posible.</p>
        </section>
      </div>
    </>
  );
}
