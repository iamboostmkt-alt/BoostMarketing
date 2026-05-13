import Link from 'next/link';

export default function ProspectPendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0b0f] px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
          <span className="text-4xl">📅</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Tu cita esta confirmada</h1>
          <p className="text-white/50 mt-3 leading-relaxed">
            Gracias por agendar una videollamada con nosotros. Pronto nos pondremos en contacto contigo.
          </p>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 text-left space-y-2">
          <p className="text-sm text-white/70 font-medium">Que sigue:</p>
          <ul className="space-y-1.5 text-sm text-white/40">
            <li>1. Revisa tu email con los detalles de la cita</li>
            <li>2. Un asesor te contactara antes de la llamada</li>
            <li>3. Una vez aprobada tu cuenta podras acceder al portal</li>
          </ul>
        </div>
        <Link href="/" className="inline-block text-sm text-white/30 hover:text-white transition-colors">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}