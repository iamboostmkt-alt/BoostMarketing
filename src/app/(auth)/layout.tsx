export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0b0f] hero-gradient">
      {children}
    </div>
  );
}
