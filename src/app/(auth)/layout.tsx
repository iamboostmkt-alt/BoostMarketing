import { BrandingProvider } from '@/context/BrandingContext';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BrandingProvider>
      <div className="min-h-screen flex items-center justify-center bg-[#0b0b0f] hero-gradient">
        {children}
      </div>
    </BrandingProvider>
  );
}
