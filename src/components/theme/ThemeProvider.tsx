'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="wl-theme"
      themes={['dark', 'light']}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
