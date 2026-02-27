'use client';

import { ThemeProvider } from 'next-themes';
import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    require('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider attribute="data-bs-theme" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}