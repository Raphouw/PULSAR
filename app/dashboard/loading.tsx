import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="max-w-[1600px] mx-auto p-4 animate-pulse pt-8">
      {/* 1. Header (Bonjour + mini stats + boutons) */}
      <div className="bg-[#1e1e2e] rounded-2xl p-8 mb-10 flex flex-wrap gap-8 justify-between items-center border border-white/5 shadow-xl">
        <div className="flex-1 min-w-[300px]">
          {/* Faux titre "Bonjour X" */}
          <div className="h-10 bg-white/10 rounded-md w-1/3 mb-6"></div>
          {/* Fausses mini-stats */}
          <div className="flex gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-3 bg-white/5 rounded w-16"></div>
                <div className="h-6 bg-white/10 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
        {/* Faux boutons à droite */}
        <div className="flex gap-4">
          <div className="h-9 bg-white/5 border border-white/10 rounded-full w-40"></div>
          <div className="h-10 bg-white/10 rounded-lg w-32"></div>
        </div>
      </div>

      {/* 2. Onglets (Vue d'ensemble / Stats / Graphiques) */}
      <div className="flex gap-4 p-2 bg-[#121212] rounded-xl border border-white/5 w-max mb-8">
        <div className="h-10 bg-white/10 rounded-lg w-32"></div>
        <div className="h-10 bg-transparent rounded-lg w-40"></div>
        <div className="h-10 bg-transparent rounded-lg w-28"></div>
      </div>

      {/* 3. Score Global centré */}
      <div className="flex flex-col items-center mb-8 pb-8 border-b border-white/10">
         <div className="h-4 bg-white/10 rounded w-48 mb-4"></div>
         <div className="h-12 bg-white/10 rounded w-32"></div>
      </div>

      {/* 4. Grille de 6 stats (Training Load, Distance, etc.) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-12">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-[110px] bg-[#121212] rounded-xl border border-white/5 p-6 flex flex-col justify-between">
            <div className="h-3 bg-white/5 rounded w-24"></div>
            <div className="h-8 bg-white/10 rounded w-20"></div>
          </div>
        ))}
      </div>

      {/* 5. Emplacements des Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="h-[350px] bg-[#121212] rounded-xl border border-white/5"></div>
         <div className="h-[350px] bg-[#121212] rounded-xl border border-white/5"></div>
      </div>
    </div>
  );
}