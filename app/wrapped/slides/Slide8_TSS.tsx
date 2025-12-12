'use client';

import { motion } from 'framer-motion';
import { Calendar, Zap, Flame, Award, BarChart2, Hash } from 'lucide-react';
import { WrappedStats } from '../../../types/wrapped';

export default function SlideTSSHeatmap({ stats }: { stats: WrappedStats }) {
  const { heatmap } = stats;

  return (
    <div className="w-full max-w-6xl px-4 h-full flex flex-col justify-center items-center">
      
      {/* HEADER */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
            <Flame className="text-orange-500 animate-pulse" size={32} />
            <h2 className="text-4xl font-black text-white tracking-widest uppercase italic">
                TSS <span className="text-orange-500">ANATOMY</span>
            </h2>
        </div>
        <p className="text-xs text-gray-500 font-mono uppercase tracking-[0.3em]">Empreinte de fatigue cumulative sur 365 jours</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* HEATMAP MAIN BLOCK (8/12) */}
        <div className="lg:col-span-8 space-y-6">
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 relative">
                <div className="flex justify-between items-center text-[9px] font-mono text-gray-600 mb-4 px-1">
                    <span>JANV</span><span>MARS</span><span>MAI</span><span>JUIL</span><span>SEPT</span><span>NOV</span><span>DÉC</span>
                </div>
                
                {/* LA GRILLE (Plus dense et propre) */}
                <div className="flex flex-wrap gap-[3px] md:gap-[4px] justify-start">
                    {heatmap.points.map((p, i) => (
                        <motion.div
                            key={`${p.date}-${i}`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.0015 }}
                            className="w-[10px] h-[10px] md:w-[12px] md:h-[12px] rounded-[2px] relative group"
                            style={{ 
                                backgroundColor: p.tss === 0 ? 'rgba(255,255,255,0.03)' : `rgba(249, 115, 22, ${0.15 + p.intensity * 0.85})`,
                                border: p.tss > 150 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                            }}
                        >
                            {/* TOOLTIP NÉON AU SURVOL */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                                <div className="bg-black border border-orange-500 px-2 py-1 rounded text-[9px] whitespace-nowrap shadow-[0_0_10px_rgba(249,115,22,0.5)]">
                                    <span className="text-gray-400">{p.date}</span> : <span className="text-white font-bold">{p.tss} TSS</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Legend */}
                <div className="mt-6 flex items-center justify-between text-[9px] font-mono text-gray-500 border-t border-white/5 pt-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                            <span className="text-orange-500 font-bold uppercase">Meilleur mois : {heatmap.bestMonth.name} ({heatmap.bestMonth.value} TSS)</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>LÉGER</span>
                        <div className="flex gap-1">
                            {[0.2, 0.4, 0.7, 1].map(op => <div key={op} className="w-2.5 h-2.5 bg-orange-500 rounded-[1px]" style={{ opacity: op }} />)}
                        </div>
                        <span>BRUTAL</span>
                    </div>
                </div>
            </div>

            {/* BARRES DE RÉCAP MÉTRIQUES (Sous la heatmap) */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                    <div className="text-[9px] text-gray-500 uppercase mb-1">Moyenne / Sortie</div>
                    <div className="text-xl font-black text-white">{heatmap.avgTSSPerRide} <span className="text-[10px] text-gray-500">TSS</span></div>
                </div>
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-center">
                    <div className="text-[9px] text-gray-500 uppercase mb-1">Moyenne Hebdo</div>
                    <div className="text-xl font-black text-white">{heatmap.avgWeeklyTSS} <span className="text-[10px] text-gray-500">TSS</span></div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl text-right">
                    <div className="text-[9px] text-orange-500 uppercase mb-1">Volume Total</div>
                    <div className="text-xl font-black text-orange-500">{heatmap.totalTSS.toLocaleString()} <span className="text-[10px]">TSS</span></div>
                </div>
            </div>
        </div>

        {/* INSIGHT CARDS (4/12) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
             <motion.div 
                initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                className="bg-[#0f1219] border-l-4 border-orange-500 p-6 rounded-r-xl relative overflow-hidden h-full flex flex-col justify-center"
             >
                <div className="absolute right-[-10px] top-[-10px] opacity-5">
                    <Award size={120} className="text-white" />
                </div>
                <div className="flex items-center gap-2 text-orange-500 mb-2 uppercase font-bold text-[10px]">
                    <Zap size={14} /> CONSISTANCE_ID
                </div>
                <div className="text-5xl font-black text-white italic">{heatmap.streak}</div>
                <div className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-mono">Jours consécutifs</div>
                <p className="text-[11px] text-gray-500 mt-4 leading-relaxed font-mono">
                    Votre plus longue série d'activités sans interruption. La régularité est le premier facteur d'adaptation mitochondriale.
                </p>
             </motion.div>

             <motion.div 
                initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }}
                className="bg-white/5 border border-white/10 p-6 rounded-xl"
             >
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-3 flex items-center gap-2">
                    <BarChart2 size={12} /> ÉQUIVALENCE TRAVAIL
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 font-mono">TOUR DE FRANCE</span>
                        <div className="h-1 flex-1 mx-3 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-orange-500" style={{ width: `${Math.min((heatmap.totalTSS/6000)*100, 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-white font-bold">{(heatmap.totalTSS/6000).toFixed(1)}x</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 font-mono">ÉTAPES DU TOUR</span>
                        <span className="text-[10px] text-white font-bold">{(heatmap.totalTSS/250).toFixed(0)}</span>
                    </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-4 leading-tight italic">
                    Basé sur une dépense moyenne de 6000 TSS pour un Grand Tour professionnel.
                </p>
             </motion.div>
        </div>

      </div>
    </div>
  );
}