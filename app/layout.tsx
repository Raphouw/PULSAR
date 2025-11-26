// Fichier : app/layout.tsx
import type { Metadata } from "next";
import "../styles/globals.css";
// Utilisation directe du composant Providers
import Providers from "./providers"; 

export const metadata: Metadata = {
  title: "Pulsar",
  description: "Analyse d'activités",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-theme="dark">
      <body>
        <Providers>
          {/* Les enfants (la page principale) sont passés à Providers */}
          {children} 
        </Providers>
      </body>
    </html>
  );
}