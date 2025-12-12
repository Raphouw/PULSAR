'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, TrendingDown, Zap, Timer, ChevronRight } from 'lucide-react';
import { WrappedStats } from '../../../types/wrapped';

export default function SlideResilience({ stats }: { stats: WrappedStats }) {
  const { resilience } = stats;

  return (
    <div className="w-full max-w-6xl px-4 h-full flex flex-col justify-center items-center">
      
      {/* HEADER BIOS */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
            <ShieldCheck className="text-cyan-400 animate-pulse" size={32} />
            <h2 className="text-4xl font-black text-white tracking-widest uppercase italic">
                RÉSILIENCE <span className="text-cyan-500">ENGINE</span>
            </h2>
        </div>
        <p className="text-sm text-gray-500 font-mono tracking-[0.3em]">ANALYSE DE LA DÉGRADATION DE PUISSANCE</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full items-center">
        
        {/* GAUCHE : VISUALISATION DE LA PENTE */}
        <div className="relative h-64 bg-black/40 border border-white/10 rounded-2xl overflow-hidden p-8 flex flex-col justify-between">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]" />
            
            <div className="flex justify-between items-start relative z-10">
                <div className="text-center">
                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">20 MIN POWER</div>
                    <div className="text-2xl font-black text-white">{stats.phenotype.cp20}W</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">60 MIN POWER</div>
                    <div className="text-2xl font-black text-white">{Math.round(stats.phenotype.cp20 * resilience.enduranceRatio)}W</div>
                </div>
            </div>

            {/* SVG de la pente */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                <motion.path
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    d={`M 0 100 L 1000 200`} // Approximation de la pente
                    stroke={resilience.decayRate === 'STABLE' ? '#22d3ee' : '#f43f5e'}
                    strokeWidth="4"
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>

            <div className="flex justify-between items-end relative z-10 mt-auto">
                <span className="text-[10px] font-mono text-cyan-500">START_BASELINE</span>
                <div className="text-right">
                    <div className="text-[10px] font-mono text-red-500 uppercase">Decay: -{Math.round((1 - resilience.enduranceRatio) * 100)}%</div>
                    <span className="text-[10px] font-mono text-gray-500 italic">FATIGUE_OFFSET</span>
                </div>
            </div>
        </div>

        {/* DROITE : DATA & RANK */}
        <motion.div 
            initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            className="space-y-6"
        >
            <div className="bg-[#0f1219] border-l-4 border-cyan-500 p-8 rounded-r-2xl">
                <div className="text-xs text-cyan-400 font-mono mb-2 uppercase tracking-widest">RANK_DURABILITY</div>
                <div className="text-4xl font-black text-white uppercase italic mb-4">
                    {resilience.durabilityRank}
                </div>
                
                <div className="flex gap-8">
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Endurance Ratio</div>
                        <div className="text-3xl font-black text-white">{resilience.enduranceRatio}</div>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Fatigue Resistance</div>
                        <div className="text-3xl font-black text-cyan-400">{resilience.fatigueResistance}%</div>
                    </div>
                </div>
            </div>

            <div className="bg-white/5 border border-white/5 p-6 rounded-xl relative overflow-hidden group">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-cyan-500/10 rounded-full text-cyan-500 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                        <Zap size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white mb-1 uppercase">Verdict Physiologique</h4>
                        <p className="text-xs text-gray-500 font-mono leading-relaxed">
                            {resilience.decayRate === 'STABLE' && "Moteur inépuisable. Vous êtes capable de maintenir une intensité proche de votre seuil pendant plusieurs heures sans dérive métabolique significative."}
                            {resilience.decayRate === 'MODERATE' && "Profil équilibré. Votre chute de puissance est conforme aux standards. Vous combinez bien explosivité et capacité de maintien."}
                            {resilience.decayRate === 'AGGRESSIVE' && "Profil 'Puncheur'. Très puissant sur les efforts courts, mais votre métabolisme fatigue vite sur la longue durée. Travaillez la base aérobie."}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>

      </div>
    </div>
  );
}