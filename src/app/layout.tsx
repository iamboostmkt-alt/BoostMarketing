import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BoostMarketing - Agencia Creativa & CRM Platform",
  description:
    "Escala tu marca con contenido y automatización. Producción de contenido, estrategia digital, CRM y analytics en una sola plataforma.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${mono.variable} antialiased bg-background text-foreground`}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
