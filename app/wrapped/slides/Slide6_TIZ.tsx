'use client';

import { motion } from 'framer-motion';
import { BarChart3, Flame, Layers } from 'lucide-react';
import { WrappedStats } from '../../../types/wrapped';

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    
    if (h === 0) return `${m}m`; // Ex: "45m"
    if (m === 0) return `${h}h`; // Ex: "12h"
    return `${h}h${m}`; // Ex: "12h30" (optionnel, ou juste garder `${h}h` pour faire court sur le graph)
};

export default function SlideTIZ({ stats }: { stats: WrappedStats }) {
  const { tiz } = stats;

  return (
    <div className="w-full max-w-6xl px-4 h-full flex flex-col justify-center items-center">
      
      {/* HEADER */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8 relative"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
            <BarChart3 className="text-cyan-500 animate-pulse" size={32} />
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-widest uppercase italic">
                TIME IN <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">ZONE</span>
            </h2>
        </div>
        
        {/* Badge FTP Used */}
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs font-mono text-gray-400 mt-2">
             <span>CALCULATED ON FTP:</span>
             <span className="text-white font-bold">{tiz.usedFtp} W</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full h-[550px]">
        
        {/* GRAPHIQUE CENTRAL (Histogramme) */}
        <div className="lg:col-span-2 bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 flex items-end justify-between gap-2 md:gap-3 relative">
             
             {/* Grille de fond */}
             <div className="absolute inset-0 flex flex-col justify-between p-8 opacity-5 pointer-events-none">
                {[...Array(5)].map((_, i) => <div key={i} className="border-t border-white w-full" />)}
             </div>

             {/* LES BARRES */}
             {tiz.zones.map((zone, i) => {
                 const maxPercent = Math.max(...tiz.zones.map(z => z.percent));
                 // On assure une hauteur minime pour qu'on voit la barre même si 1%
                 const height = Math.max((zone.percent / maxPercent) * 100, 2);
                 
                 return (
                    <div key={zone.zone} className="group relative flex-1 h-full flex flex-col justify-end items-center">
                        
                        {/* Valeurs AU-DESSUS de la barre (Fixe) */}
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1 + (i * 0.1) }}
                            className="mb-2 text-center"
                        >
                            <div className="text-[10px] md:text-xs font-bold text-white">{formatDuration(zone.timeSeconds)}</div>
                            <div className="text-[9px] text-gray-500 font-mono">{zone.percent}%</div>
                        </motion.div>

                        {/* La Barre */}
                        <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1, ease: "circOut" }}
                            className="w-full max-w-[50px] rounded-t-sm relative overflow-hidden cursor-pointer"
                            style={{ backgroundColor: zone.color }}
                        >
                             <div className="absolute top-0 left-0 w-full h-1 bg-white/30" />
                             <div className="absolute bottom-0 w-full h-full bg-gradient-to-t from-black/60 to-transparent" />
                        </motion.div>

                        {/* Label & Kcal EN-DESSOUS */}
                        <div className="mt-3 text-center w-full">
                            <div className="text-xs font-black text-white mb-0.5">{zone.zone}</div>
                            {/* Kcal display */}
                            <div className="flex items-center justify-center gap-1 text-[9px] text-gray-400 group-hover:text-orange-400 transition-colors">
                                <Flame size={8} />
                                {zone.kcal > 1000 ? `${(zone.kcal/1000).toFixed(1)}k` : zone.kcal}
                            </div>
                        </div>
                    </div>
                 )
             })}
        </div>

        {/* PANNEAU D'ANALYSE (Droite) */}
        <motion.div 
            initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex flex-col gap-4"
        >
            {/* Carte Distribution */}
            <div className="bg-[#0f1219] border-l-4 border-cyan-500 p-6 rounded-r-xl relative overflow-hidden flex-1 flex flex-col justify-center">
                <div className="absolute right-0 top-0 p-4 opacity-10">
                    <Layers size={80} className="text-white" />
                </div>
                <div className="text-xs text-cyan-400 font-mono mb-2 uppercase tracking-widest">ARCHITECTURE</div>
                <div className="text-3xl font-black text-white uppercase italic leading-tight mb-4">
                    {tiz.distributionType}
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-mono">
                    {tiz.distributionType === 'POLARIZED' && "Le modèle Élite. 80% facile pour le volume, 20% très dur pour le moteur. Pas de déchets."}
                    {tiz.distributionType === 'PYRAMIDAL' && "La base classique. Énorme volume Z1/Z2, avec une pointe d'intensité qui s'affine vers le haut."}
                    {tiz.distributionType === 'THRESHOLD' && "Le piège du 'Sweet Spot'. Beaucoup de Z3/Z4. Ça paye vite, mais attention à la stagnation."}
                    {tiz.distributionType === 'HIIT' && "Profil 'Time Crunched'. Peu d'heures, mais chaque minute compte. Intensité maximale."}
                </p>
            </div>

            {/* Carte Total Kcal */}
            <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                 <div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">TOTAL ÉNERGIE</div>
                    <div className="text-2xl font-bold text-orange-500 tabular-nums">
                        {(tiz.zones.reduce((acc, z) => acc + z.kcal, 0) / 1000).toFixed(1)} <span className="text-sm text-white">Mcal</span>
                    </div>
                 </div>
                 <Flame size={24} className="text-orange-500" />
            </div>

            {/* Stats Rapides */}
            <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white/5 p-3 rounded text-center">
                    <div className="text-[10px] text-gray-500 uppercase">HEURES TOTALES</div>
                    <div className="text-xl font-bold text-white">
                        {Math.round(tiz.zones.reduce((a,b) => a + b.timeSeconds, 0) / 3600)}h
                    </div>
                 </div>
                 <div className="bg-white/5 p-3 rounded text-center">
                    <div className="text-[10px] text-gray-500 uppercase">INTENSITÉ (Z1-2)</div>
                    <div className="text-xl font-bold text-red-400">
                        {Math.round(tiz.zones[0].percent + tiz.zones[1].percent)}%
                    </div>
                 </div>
            </div>

        </motion.div>

      </div>
    </div>
  );
}