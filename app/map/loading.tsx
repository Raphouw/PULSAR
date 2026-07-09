import React from 'react';
import { Loader2 } from 'lucide-react'; 

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white">
      {/* Effet de lueur en arrière-plan */}
      <div className="absolute w-[200px] h-[200px] bg-purple-600/20 blur-[80px] rounded-full pointer-events-none" />
      
      {/* Spinner rotatif */}
      <Loader2 className="w-12 h-12 text-[#d04fd7] animate-spin mb-6 relative z-10" />
      
      {/* Texte stylisé */}
      <h2 className="text-xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-gray-500 relative z-10">
        Synchronisation
      </h2>
      <p className="text-xs text-gray-500 tracking-widest uppercase mt-2 font-mono relative z-10">
       Chargement en cours...
      </p>
    </div>
  );
}