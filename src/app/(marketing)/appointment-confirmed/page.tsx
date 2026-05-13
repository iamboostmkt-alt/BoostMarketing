'use client';

export default function AppointmentConfirmedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-brand/15 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-brand-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Cita recibida</h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Gracias por agendar tu videollamada. Nuestro equipo te contactara pronto para confirmar los detalles.
          </p>
        </div>
        <a href="/" className="inline-flex items-center gap-2 rounded-xl bg-brand hover:bg-brand-dark text-white px-6 py-2.5 text-sm font-medium transition-colors">
          Volver al inicio
        </a>
      </div>
    </main>
  );
}