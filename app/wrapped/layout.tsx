// Fichier : app/wrapped/layout.tsx
import React from 'react';

export const metadata = {
  title: 'PULSAR // WRAPPED 2025',
  description: 'Analyse de performance annuelle.',
};

export default function WrappedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen w-full bg-black">
      {/* On s'assure que rien du layout parent ne fuite ici si possible */}
      {children}
    </section>
  );
}