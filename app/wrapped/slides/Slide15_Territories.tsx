// app/wrapped/slides/Slide15_Territories.tsx
'use client';

import { motion } from 'framer-motion';
import { Globe, MapPin, Monitor, Navigation, Compass, Share2 } from 'lucide-react';
import { WrappedStats } from '../../../types/wrapped';

export default function SlideTerritories({ stats }: { stats: WrappedStats }) {
  const { territories, userName } = stats;

  return (
    <div className="w-full max-w-6xl px-4 h-full flex flex-col justify-center items-center relative overflow-hidden">
      
      {/* BACKGROUND RADAR EFFECT */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-[500px] h-[500px] border border-cyan-500 rounded-full"
        />
        <div className="absolute w-[300px] h-[300px] border border-cyan-500/30 rounded-full" />
      </div>

      {/* HEADER */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-16 relative z-10">
        <div className="flex items-center justify-center gap-3 mb-2">
            <Globe className="text-cyan-400" size={32} />
            <h2 className="text-4xl font-black text-white tracking-widest uppercase italic">
                GLOBAL <span className="text-cyan-400">FOOTPRINT</span>
            </h2>
        </div>
        <p className="text-xs text-gray-500 font-mono tracking-[0.3em]">GEOGRAPHICAL DISCOVERY INDEX</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full relative z-10">
        
        {/* GAUCHE : INDOOR VS OUTDOOR */}
        <motion.div 
            initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="space-y-8"
        >
            <div className="bg-[#0f1219] p-8 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">Environment Distribution</div>
                    <div className="text-xs font-mono text-cyan-400">STATUS: ANALYZED</div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Gauge Circulaire Custom */}
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                            <motion.circle 
                                cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                strokeDasharray={377}
                                initial={{ strokeDashoffset: 377 }}
                                animate={{ strokeDashoffset: 377 - (377 * territories.outdoorPercent) / 100 }}
                                transition={{ duration: 2, ease: "easeOut" }}
                                className="text-cyan-500"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-white">{territories.outdoorPercent}%</span>
                            <span className="text-[8px] text-gray-500 font-bold uppercase">Real World</span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                                <Navigation size={16} />
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase">Outdoor Explorer</div>
                                <div className="text-sm font-bold text-white">{territories.outdoorPercent}% des heures</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                <Monitor size={16} />
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase">Virtual Training</div>
                                <div className="text-sm font-bold text-white">{territories.indoorPercent}% des heures</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>

        {/* DROITE : METRICS D'EXPLORATION */}
        <motion.div 
            initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
            {/* Exploration Card */}
            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex flex-col justify-between group hover:border-cyan-500/30 transition-colors">
                <div className="flex justify-between items-start">
                    <Compass size={20} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                    <div className="text-right">
                        <div className="text-[9px] text-gray-500 uppercase font-bold">Discovery Score</div>
                        <div className="text-2xl font-black text-white">{territories.explorationScore}/100</div>
                    </div>
                </div>
                <p className="text-[10px] text-gray-400 font-mono leading-tight mt-4">
                    Basé sur la diversité de vos points de départ et votre volume de "Away rides".
                </p>
            </div>

            {/* Radius Card */}
            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex flex-col justify-between group hover:border-emerald-500/30 transition-colors">
                <div className="flex justify-between items-start">
                    <Share2 size={20} className="text-gray-500 group-hover:text-emerald-400 transition-colors" />
                    <div className="text-right">
                        <div className="text-[9px] text-gray-500 uppercase font-bold">Max Reach</div>
                        <div className="text-2xl font-black text-white">{territories.maxRadius} <span className="text-xs text-gray-500">KM</span></div>
                    </div>
                </div>
                <p className="text-[10px] text-gray-400 font-mono leading-tight mt-4">
                    Votre plus longue incursion en territoire inconnu cette saison.
                </p>
            </div>

            {/* Final Verdict Box */}
            <div className="md:col-span-2 bg-gradient-to-r from-cyan-500/10 to-transparent border border-cyan-500/20 p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute right-0 bottom-0 p-4 opacity-5">
                    <MapPin size={80} />
                </div>
                <h4 className="text-xs font-bold text-cyan-400 mb-2 uppercase tracking-widest italic">Navigator Insight</h4>
                <p className="text-[11px] text-gray-300 font-mono leading-relaxed relative z-10">
                    {territories.outdoorPercent > 70 
                        ? `Dominateur des routes réelles, ${userName}. Votre empreinte est celle d'un puriste de l'asphalte.` 
                        : `Maître de l'hybride. Vous optimisez votre temps entre les mondes virtuels et les routes d'Annecy.`
                    } Votre moyenne de <span className="text-white font-bold">{territories.avgDistance}km</span> par sortie montre une régularité de métronome.
                </p>
            </div>
        </motion.div>

      </div>
    </div>
  );
}