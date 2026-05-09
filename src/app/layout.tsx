import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BoostMarketing - Agencia Creativa & CRM Platform",
  description: "Escala tu marca con contenido y automatización. Producción de contenido, estrategia digital, CRM y analytics en una sola plataforma.",
  keywords: ["BoostMarketing", "agencia digital", "CRM", "automatización", "marketing", "contenido", "SEO", "branding"],
  authors: [{ name: "BoostMarketing" }],
  openGraph: {
    title: "BoostMarketing - Agencia Creativa & CRM Platform",
    description: "Escala tu marca con contenido y automatización.",
    siteName: "BoostMarketing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BoostMarketing - Agencia Creativa & CRM Platform",
    description: "Escala tu marca con contenido y automatización.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
