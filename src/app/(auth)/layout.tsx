import { BrandingProvider } from '@/context/BrandingContext';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandingProvider>
      {/* Forzar fondo claro en páginas de auth — overrides el body oscuro del dashboard */}
      <div style={{ background: '#F6F7FB', minHeight: '100dvh', position: 'relative' }}>
        {children}
      </div>
    </BrandingProvider>
  );
}
