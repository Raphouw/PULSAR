// Fichier : app/layout.tsx
import type { Metadata } from "next";
import "../styles/globals.css";
import Providers from "./providers"; 
import Sidebar from "../components/layout/sidebar";

export const metadata: Metadata = {
  title: "Pulsar",
  description: "Analyse d'activités",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark">
      <body className="bg-[#0a0a0c] text-white m-0 p-0 overflow-x-hidden">
        <Providers>
          {/* Flexbox qui gère l'alignement Sidebar + Contenu */}
          <div className="flex min-h-screen">
            
            {/* C'est ICI qu'elle doit être (et nulle part ailleurs) */}
            <Sidebar />

            <main className="flex-1 w-full transition-all duration-400">
              {children}
            </main>

          </div>
        </Providers>
      </body>
    </html>
  );
}