// Fichier : app/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';
import dynamic from 'next/dynamic';
import { AnalysisProvider } from './context/AnalysisContext';
// 🔥 IMPORT 1 : Le nouveau contexte de synchronisation
import { BackfillProvider } from './context/BackfillContext';
// 🔥 IMPORT 2 : La barre de progression visuelle
import GlobalStatusBar from '../components/ui/GlobalStatusBar';

// L'appel dynamique (avec ssr: false) est maintenant DANS le Client Component
const LayoutContent = dynamic(() => import('./LayoutContent'), { ssr: false });

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* 🔥 AJOUT : On enveloppe avec BackfillProvider.
          Il est SOUS SessionProvider (pour auth) mais SUR AnalysisProvider 
          (au cas où l'analyse ait besoin de déclencher un backfill).
      */}
      <BackfillProvider>
        <AnalysisProvider>
          <LayoutContent>
            {children}
          </LayoutContent>
          
          {/* 🔥 AJOUT : La barre s'affiche par-dessus tout le reste (fixed position) */}
          <GlobalStatusBar />
          
        </AnalysisProvider>
      </BackfillProvider>
    </SessionProvider>
  );
}