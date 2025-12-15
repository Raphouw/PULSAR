// Fichier : app/layout.tsx
import type { Metadata } from "next";
import "../styles/globals.css";
import Providers from "./providers"; 
import Sidebar from "../components/layout/sidebar";
// 🔥 Importe ton nouveau composant (ajuste le chemin si besoin)
import AdminWorker from "./components/admin/AdminWorker"; 

export const metadata: Metadata = {
  title: "Pulsar",
  description: "Analyse d'activités",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark">
      <body className="bg-[#0a0a0c] text-white m-0 p-0 overflow-x-hidden">
        <Providers>
          {/* 🔥 LE MOTEUR INVISIBLE : Il tourne sur chaque page pour l'admin */}
          <AdminWorker />

          <div className="flex min-h-screen">
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