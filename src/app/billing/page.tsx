'use client';

// Redirect a /dashboard/billing — la página real vive en el dashboard
// pero también accesible desde fuera via /billing
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BillingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/billing');
  }, [router]);
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 rounded-full border-2 border-[#7C3AED] border-t-transparent animate-spin" />
        <span style={{ color: '#6B7280', fontSize: '14px' }}>Redirigiendo a pagos...</span>
      </div>
    </div>
  );
}
