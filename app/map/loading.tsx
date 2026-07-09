import React from 'react';

export default function MapLoading() {
  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden animate-pulse">
      
      {/* 1. Fond de Carte (Placeholder pour Leaflet Map) */}
      <div className="absolute inset-0 bg-[#121212]">
         {/* Effet visuel subtil de grille/lueurs en arrière-plan */}
         <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none" />
         <div className="absolute bottom-[20%] right-[20%] w-[350px] h-[350px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />
      </div>

      {/* 2. HUD RESPONSIVE : PANNEAU LATÉRAL UNIQUE (Desktop Focus) */}
      <div className="absolute z-[1000] top-[72px] left-6 w-[280px] bottom-auto translate-y-0 hidden md:block">
        
        {/* CONTENEUR PRINCIPAL MONOLITHIQUE (Reproduction du HUD) */}
        <div className="flex flex-col gap-2.5 bg-[#121217]/80 backdrop-blur-2xl border border-white/10 p-3 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            
            {/* --- SECTION 1 : STATS & SCORE --- */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    {/* Placeholder Title/Icon */}
                    <div className="flex items-center gap-1.5">
                        <div className="h-6 w-6 rounded-md bg-white/5 border border-white/10" />
                        <div className="h-4 bg-white/10 rounded w-24"></div>
                    </div>
                    {/* Placeholder Score */}
                    <div className="flex flex-col items-end gap-1">
                        <div className="h-2 bg-white/5 rounded w-16"></div>
                        <div className="h-5 bg-white/10 rounded w-20"></div>
                    </div>
                </div>

                {/* Grille de 4 StatBox vides */}
                <div className="grid grid-cols-2 gap-1.5">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-[42px] bg-white/5 p-1.5 rounded-xl border border-white/10 flex flex-col justify-between">
                            <div className="flex gap-1 items-center">
                                <div className="h-4 bg-white/10 rounded w-16"></div>
                                <div className="h-3 bg-white/5 rounded w-10"></div>
                            </div>
                            <div className="flex gap-1 items-center">
                                <div className="h-2 w-2 bg-white/10 rounded-sm" />
                                <div className="h-2 bg-white/5 rounded w-12"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <hr className="border-white/5 border-t border-dashed" />

            {/* --- SECTION 2 : CONTRÔLES TACTIQUES --- */}
            <div className="space-y-1.5">
                {/* Year Select Placeholder */}
                <div className="h-8 bg-white/10 border border-white/10 rounded-xl w-full"></div>

                {/* Toggles (4 colonnes de boutons d'icônes) */}
               <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-8 bg-white/5 border border-white/10 rounded-xl" />
                    ))}
                     {[1, 2, 3, 4].map(i => (
                        <div key={i+4} className="h-8 bg-white/5 border border-white/10 rounded-xl" />
                    ))}
                </div>

                {/* Mode Buttons (2 colonnes + error slot) */}
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                    <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5 col-span-2 gap-1">
                        <div className="flex-1 h-6 bg-white/10 rounded-md"></div>
                        <div className="flex-1 h-6 bg-white/10 rounded-md"></div>
                    </div>
                </div>

                {/* HUD Toggles / Ciblage Manuel & Blacklist Buttons (2 colonnes) */}
                <div className="flex items-center justify-between gap-1.5 mt-1">
                    <div className="h-8 bg-white/10 rounded-xl flex-1"></div>
                    <div className="h-8 bg-white/10 rounded-xl w-12"></div>
                </div>

                {/* Toolbar Principale (Ciblage & Blacklist) (2 colonnes) */}
                <div className="flex gap-1.5 pt-1">
                    <div className="h-8 bg-white/10 rounded-xl flex-1"></div>
                    <div className="h-8 bg-white/10 rounded-xl flex-1"></div>
                </div>
            </div>

        </div>
      </div>

       {/* Mobile Swipe Handle - Pour reproduire l'interface mobile masquée */}
       <div className="md:hidden w-full flex justify-center pb-2 pt-4 bg-gradient-to-t from-[#121217]/90 to-transparent absolute bottom-0 left-0 right-0 pointer-events-none">
            <div className="w-10 h-1 bg-white/20 rounded-full shadow-lg"></div>
       </div>

    </div>
  );
}