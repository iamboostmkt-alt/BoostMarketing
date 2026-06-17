import Link from 'next/link';

export const metadata = { title: 'Trust Center — Weeklink' };

const TRUST_ITEMS = [
  {
    icon: '🛡️',
    title: 'Seguridad',
    desc: 'Cifrado, autenticación, rate limiting y auditoría de accesos.',
    href: '/legal/seguridad',
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    icon: '🔒',
    title: 'Privacidad',
    desc: 'Cómo recopilamos, almacenamos y usamos tus datos personales.',
    href: '/privacidad',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    icon: '📄',
    title: 'Términos de uso',
    desc: 'Reglas del servicio, suscripciones y responsabilidades.',
    href: '/terminos',
    color: '#111827',
    bg: '#F9FAFB',
  },
  {
    icon: '🤖',
    title: 'Inteligencia Artificial',
    desc: 'Modelos disponibles, limitaciones y privacidad de los prompts.',
    href: '/legal/ia',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    icon: '🍪',
    title: 'Cookies',
    desc: 'Qué cookies usamos y cómo gestionarlas.',
    href: '/legal/cookies',
    color: '#D97706',
    bg: '#FFFBEB',
  },
  {
    icon: '🚀',
    title: 'Programa Founding',
    desc: 'Condiciones del programa Founding Lifetime y Beta.',
    href: '/legal/founding',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    icon: '⚖️',
    title: 'Uso aceptable',
    desc: 'Qué está prohibido dentro de Weeklink.',
    href: '/legal/uso-aceptable',
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    icon: '🗂️',
    title: 'Retención de datos',
    desc: 'Cuánto tiempo guardamos tu información y cómo eliminarla.',
    href: '/legal/retencion-datos',
    color: '#059669',
    bg: '#F0FDF4',
  },
];

export default function TrustPage() {
  return (
    <div style={{ background: '#F6F7FB', minHeight: '100vh', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link href="/weeklink" className="inline-flex items-center gap-1.5 text-[13px] mb-10 transition-colors" style={{ color: '#9CA3AF' }}>
          ← Volver a Weeklink
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 8px 24px rgba(124,58,237,0.25)' }}>
            <span className="text-2xl">🛡️</span>
          </div>
          <h1 className="text-[36px] font-bold text-[#111827] mb-3">Trust Center</h1>
          <p className="text-[16px] text-[#6B7280] max-w-xl mx-auto">
            Weeklink está construido para agencias que confían datos importantes de sus clientes.
            Aquí encontrarás todo lo relacionado con seguridad, privacidad y cumplimiento.
          </p>
        </div>

        {/* Badge Founding Beta */}
        <div className="rounded-2xl p-5 mb-10 flex items-start gap-4"
          style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', border: '1px solid #DDD6FE' }}>
          <span className="text-2xl shrink-0">🚀</span>
          <div>
            <p className="text-[15px] font-semibold text-violet-800 mb-1">Weeklink Founding Beta</p>
            <p className="text-[13px] text-violet-700">
              Estamos en una etapa de mejora continua. Implementamos medidas de seguridad razonables
              y mejoramos constantemente. Recomendamos no usar Weeklink como único repositorio de
              información crítica e irremplazable.
            </p>
          </div>
        </div>

        {/* Grid de documentos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {TRUST_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className="group rounded-2xl p-5 bg-white border border-[rgba(17,24,39,0.06)] hover:shadow-md transition-all hover:-translate-y-0.5"
              style={{ borderColor: 'rgba(17,24,39,0.06)' }}>
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: item.bg }}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#111827] group-hover:text-violet-700 transition-colors mb-0.5">{item.title}</p>
                  <p className="text-[13px] text-[#6B7280]">{item.desc}</p>
                </div>
                <span className="text-[#9CA3AF] group-hover:text-violet-500 transition-colors shrink-0 mt-0.5">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Estado del sistema */}
        <div className="rounded-2xl p-5 bg-white border border-[rgba(17,24,39,0.06)] mb-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[14px] font-semibold text-[#111827]">Todos los sistemas operativos</span>
              </div>
            </div>
            <a href="https://boostmarketingboost.com" target="_blank"
              className="text-[13px] text-[#7C3AED] hover:underline">
              Ver estado del sistema →
            </a>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['API', 'Dashboard', 'Chat RT', 'Billing'].map(s => (
              <div key={s} className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Contacto */}
        <div className="text-center">
          <p className="text-[13px] text-[#9CA3AF]">¿Tienes dudas sobre seguridad o privacidad?</p>
          <p className="text-[13px] text-[#9CA3AF] mt-1">
            Contáctanos en{' '}
            <a href="mailto:weeklinkapp@gmail.com" className="text-[#7C3AED] hover:underline">weeklinkapp@gmail.com</a>
          </p>
          <p className="text-[12px] text-[#D1D5DB] mt-6">© 2026 Weeklink · Hecho con 💜 en México</p>
        </div>
      </div>
    </div>
  );
}
