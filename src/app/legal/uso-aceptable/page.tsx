export const metadata = { title: 'Política de Uso Aceptable — Weeklink' };

export default function UsoAceptablePage() {
  return (
    <>
      <h1 className="text-[32px] font-bold text-[#111827] mb-2">Política de Uso Aceptable</h1>
      <p className="text-[13px] text-[#9CA3AF] mb-8">Última actualización: 16 de junio de 2026</p>
      <div className="space-y-8" style={{ color: '#374151', lineHeight: '1.75' }}>
        <section>
          <p className="text-[14px]">Weeklink está diseñado para agencias de marketing que trabajan de forma profesional y ética. Esta política define lo que no está permitido dentro de la plataforma.</p>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Usos prohibidos</h2>
          <div className="space-y-3">
            {[
              { icon: '🚫', title: 'Actividades ilícitas', desc: 'No puedes usar Weeklink para actividades que violen las leyes mexicanas o internacionales aplicables.' },
              { icon: '📧', title: 'Spam y comunicaciones no solicitadas', desc: 'Prohibido usar el sistema de chat, notificaciones o correos para enviar mensajes masivos no solicitados.' },
              { icon: '🦠', title: 'Malware y código malicioso', desc: 'No se permite subir, compartir o distribuir archivos que contengan virus, troyanos, spyware o cualquier software malicioso.' },
              { icon: '🔓', title: 'Acceso no autorizado', desc: 'Está prohibido intentar acceder a cuentas, datos o sistemas de otros usuarios sin autorización.' },
              { icon: '📁', title: 'Contenido ilegal', desc: 'No se puede almacenar ni distribuir material que infrinja derechos de autor, datos robados, contenido ilícito o información confidencial de terceros obtenida ilegalmente.' },
              { icon: '⚙️', title: 'Abuso de integraciones', desc: 'No se permite usar las APIs o integraciones de Weeklink para automatizar acciones que violen los términos de servicios terceros conectados.' },
              { icon: '🤖', title: 'Scraping o extracción masiva', desc: 'Está prohibido extraer datos de Weeklink de forma automatizada sin autorización expresa.' },
              { icon: '👤', title: 'Suplantación de identidad', desc: 'No puedes hacerte pasar por otro usuario, empleado de Weeklink o cualquier tercero dentro de la plataforma.' },
            ].map(u => (
              <div key={u.title} className="flex gap-3 p-4 rounded-xl border border-[rgba(17,24,39,0.06)] bg-white">
                <span className="text-xl shrink-0">{u.icon}</span>
                <div>
                  <p className="text-[14px] font-semibold text-[#111827]">{u.title}</p>
                  <p className="text-[13px] mt-0.5">{u.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Consecuencias</h2>
          <p className="text-[14px]">El incumplimiento de esta política puede resultar en la suspensión temporal o cancelación permanente de la cuenta, sin derecho a reembolso. En casos graves, Weeklink podrá reportar la actividad a las autoridades competentes.</p>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Reportar un abuso</h2>
          <p className="text-[14px]">Si detectas un uso inapropiado de la plataforma, puedes reportarlo a través de los canales oficiales de Weeklink. Tomamos todos los reportes en serio.</p>
        </section>
      </div>
    </>
  );
}
