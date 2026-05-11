import { Clock, UserCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function WaitingAssignmentPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6 px-4">
      <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center">
        <Clock className="w-9 h-9 text-brand-light/70 animate-pulse" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-bold text-white">Tu cuenta está siendo configurada</h1>
        <p className="text-white/50 text-sm leading-relaxed">
          Tu project manager será asignado pronto. Recibirás acceso completo al portal
          una vez que tu equipo haya configurado tu cuenta.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-white/40">
          <UserCheck className="w-4 h-4" />
          <span>Esperando asignación de Project Manager</span>
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-brand/40 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-white/25 max-w-xs">
        Si crees que esto es un error, contacta a tu agencia o escribe a soporte.
      </p>
    </div>
  );
}
