import { BrandingProvider } from '@/context/BrandingContext';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandingProvider>
      {/* Sin wrapper que limite el layout — cada página define su propio fondo */}
      {children}
    </BrandingProvider>
  );
}
