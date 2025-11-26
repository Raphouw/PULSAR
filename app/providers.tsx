// Fichier : app/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';
import dynamic from 'next/dynamic';
import { AnalysisProvider } from './context/AnalysisContext';

// L'appel dynamique (avec ssr: false) est maintenant DANS le Client Component
const LayoutContent = dynamic(() => import('./LayoutContent'), { ssr: false });

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* 🔥 ON ENVELOPPE TOUT ICI */}
      <AnalysisProvider>
        <LayoutContent>{children}</LayoutContent>
      </AnalysisProvider>
    </SessionProvider>
  );
}