import React from 'react';

export default function LegendLoading() {
  return (
    <div className="min-h-screen bg-[#050505] pb-20 pt-24 animate-pulse">
      <div className="max-w-5xl mx-auto px-4">
        
        {/* 1. Titre central "PALMARÈS" avec son blur de fond */}
        <div className="flex flex-col items-center justify-center mb-10 gap-4 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-600/5 blur-[100px] rounded-full"></div>
          <div className="h-14 bg-white/10 rounded-lg w-72 relative z-10"></div>
          <div className="h-5 bg-white/5 rounded w-64 relative z-10"></div>
        </div>

        {/* 2. Tes 3 Onglets spécifiques (LegendTabs) */}
        <div className="flex justify-center mb-12">
          <div className="bg-[#0a0a0c] border border-white/10 p-1 rounded-xl flex gap-1">
            <div className="h-12 bg-white/10 rounded-lg w-52"></div>
            <div className="h-12 bg-transparent rounded-lg w-40"></div>
            <div className="h-12 bg-transparent rounded-lg w-32"></div>
          </div>
        </div>

        {/* 3. Liste des records/légendes */}
        <div className="flex flex-col gap-4 min-h-[500px]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-[#121212] border border-white/5 rounded-xl flex items-center p-6 gap-6">
               <div className="h-12 w-12 bg-white/10 rounded-full shrink-0"></div>
               <div className="flex flex-col gap-3 w-full">
                 <div className="h-5 bg-white/10 rounded w-1/3"></div>
                 <div className="h-3 bg-white/5 rounded w-1/4"></div>
               </div>
               <div className="h-8 bg-white/10 rounded-full w-24 shrink-0"></div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}