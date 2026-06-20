import type { Metadata } from "next";
import { SplashScreen } from "@/components/pwa/SplashScreen";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { headers } = await import('next/headers');
  const host = headers().get('host') || '';
  const isBoost = host.includes('boostmarketing') || host.includes('boost-marketing');
  if (isBoost) {
    return {
      title: 'BoostMarketing — Agencia de Marketing Digital',
      description: 'Estrategia, contenido y resultados para tu marca.',
    };
  }

  return {
    title: {
      default: 'Weeklink — Software para Agencias de Marketing en México',
      template: '%s | Weeklink',
    },
    description: 'Weeklink es el software todo-en-uno para agencias de marketing en México. Gestiona tareas, proyectos, chat con clientes, entregas y aprobaciones en un solo lugar.',
    keywords: [
      'software para agencias de marketing',
      'CRM para agencias México',
      'gestión de proyectos agencias',
      'portal cliente agencia marketing',
      'herramienta gestión agencia digital',
      'software agencia marketing México',
      'plataforma agencia marketing',
      'gestión tareas agencia',
      'chat cliente agencia',
      'aprobaciones diseño marketing',
      'weeklink',
    ],
    authors: [{ name: 'Weeklink', url: 'https://weeklink.com.mx' }],
    creator: 'Weeklink',
    publisher: 'Weeklink',
    metadataBase: new URL('https://weeklink.com.mx'),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'es_MX',
      url: 'https://weeklink.com.mx',
      siteName: 'Weeklink',
      title: 'Weeklink — Software para Agencias de Marketing en México',
      description: 'Gestiona tareas, proyectos, chat con clientes y aprobaciones de entregas en un solo lugar. La plataforma que tu agencia necesita.',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'Weeklink — Software para Agencias de Marketing',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Weeklink — Software para Agencias de Marketing en México',
      description: 'Gestiona tareas, proyectos, chat con clientes y aprobaciones en un solo lugar.',
      images: ['/og-image.png'],
      creator: '@weeklink',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: 'google9161df5b0197df54',
    },
  };
}

async function getSettings() {
  try {
    return await db.siteSettings.findFirst();
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  return (
    <html lang="es">
      <head>
        {/* Script inline: establece tema antes del primer render — ÚNICO punto de control */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  try {
    var t = localStorage.getItem('wl-theme') || 'dark';
    var cl = document.documentElement.classList;
    cl.remove('dark','light');
    cl.add(t);
    // Solo poner fondo oscuro si NO estamos en una página clara (billing/login)
    var path = window.location.pathname;
    var isLight = path.startsWith('/billing') || path.startsWith('/login') ||
                  path.startsWith('/register') || path.startsWith('/weeklink') ||
                  path.startsWith('/p/');
    document.documentElement.style.background = isLight ? '#F6F7FB' : '#080808';
  } catch(e) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.background = '#080808';
  }
})();
        ` }} />
        {settings?.faviconUrl ? (
          <link rel="icon" href={settings.faviconUrl} />
        ) : (
          <link rel="icon" href="/favicon.ico" />
        )}
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8B5CF6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Weeklink" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144.png" />
        <link rel="apple-touch-icon" sizes="128x128" href="/icons/icon-128.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        {/* App nativa — deshabilitar bounce scroll en iOS */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${inter.variable} ${mono.variable} antialiased text-foreground`} style={{ background: "#080808" }}>
        <ThemeProvider>
        <SplashScreen />
        {/* Inject branding into localStorage before React hydrates — eliminates logo flash */}
        {settings?.logoUrl && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  localStorage.setItem('brand_logoUrl', ${JSON.stringify(settings.logoUrl)});
                  localStorage.setItem('brand_agencyName', ${JSON.stringify(settings.agencyName || 'BoostMarketing')});
                } catch(e) {}
              `,
            }}
          />
        )}
        {children}
        <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
