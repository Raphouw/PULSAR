'use client';

import { motion } from 'framer-motion';
import { Wind, Gauge, Zap, TrendingDown, Info } from 'lucide-react';
import { WrappedStats } from '../../../types/wrapped';

export default function SlideAero({ stats }: { stats: WrappedStats }) {
  const { aero, userHeight } = stats;

  return (
    <div className="w-full max-w-6xl px-4 h-full flex flex-col justify-center items-center relative overflow-hidden">
      
      {/* ANIMATION FLUX D'AIR (Wind Tunnel Effect) */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent w-full"
            style={{ top: `${10 + i * 8}%` }}
            animate={{ x: [-1000, 1000] }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* HEADER */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-12 relative z-10">
        <div className="flex items-center justify-center gap-3 mb-2">
            <Wind className="text-cyan-400 animate-pulse" size={32} />
            <h2 className="text-4xl font-black text-white tracking-widest uppercase italic">
                AERO <span className="text-cyan-400">ESTIMATOR</span>
            </h2>
        </div>
        <p className="text-sm text-gray-500 font-mono tracking-[0.3em]">VIRTUAL WIND TUNNEL ANALYSIS // {userHeight}CM</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full relative z-10">
        
        {/* GAUCHE : LE SCORE CDA */}
        <motion.div 
            initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="bg-[#0f1219]/80 backdrop-blur-md border border-cyan-500/20 p-8 rounded-3xl flex flex-col justify-between"
        >
            <div>
                <div className="text-xs text-cyan-400 font-mono mb-2 uppercase tracking-widest">MORPHO_CDA_INDEX</div>
                <div className="text-6xl font-black text-white mb-2">{aero.estimatedCdA}</div>
                <div className="text-xl font-bold text-cyan-500 italic uppercase mb-6">{aero.aeroRank}</div>
                
                <p className="text-xs text-gray-400 font-mono leading-relaxed mb-8">
                    Avec votre taille de {userHeight}cm, votre surface frontale est un frein majeur. 
                    Votre CdA estimé de <span className="text-white">{aero.estimatedCdA}</span> m² est typique d'un coureur de votre gabarit en position mains aux cocottes.
                </p>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase font-bold mb-2">
                    <span>Performance à 40 km/h</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">{aero.wattsAt40kmh}</span>
                    <span className="text-sm text-gray-500 font-bold">WATTS</span>
                </div>
            </div>
        </motion.div>

        {/* DROITE : OPTIMISATION & GAINS */}
        <motion.div 
            initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            className="space-y-6"
        >
            <div className="bg-gradient-to-br from-cyan-500/20 to-transparent border border-cyan-500/30 p-8 rounded-3xl relative overflow-hidden">
                <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
                    <Zap size={150} />
                </div>
                
                <div className="text-xs text-cyan-400 font-mono mb-4 uppercase tracking-widest">POTENTIEL D'OPTIMISATION</div>
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-16 w-16 rounded-full bg-cyan-500 flex items-center justify-center text-black">
                        <TrendingDown size={32} />
                    </div>
                    <div>
                        <div className="text-4xl font-black text-white">-{aero.potentialSavings}W</div>
                        <div className="text-[10px] text-cyan-400 uppercase font-bold font-mono">Gain possible à 40km/h</div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-gray-500 uppercase">CdA Cible (Pro Position)</span>
                        <span className="text-white font-bold">{aero.optimalCdA}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: "100%" }} animate={{ width: "85%" }} transition={{ delay: 1, duration: 1.5 }}
                            className="h-full bg-cyan-500"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                 <div className="flex items-start gap-4">
                    <Info size={20} className="text-gray-500 mt-1 shrink-0" />
                    <div>
                        <h4 className="text-xs font-bold text-white mb-2 uppercase tracking-widest">Conseil Pulsar</h4>
                        <p className="text-[11px] text-gray-500 font-mono leading-relaxed">
                            Pour un coureur de <span className="text-white">1m92</span>, réduire l'espace entre le buste et le guidon est crucial. 
                            Passer sur une position "mains aux creux" ou utiliser des leviers inclinés vers l'intérieur pourrait vous faire gagner l'équivalent de <span className="text-cyan-400 font-bold">{aero.potentialSavings} Watts</span>, soit environ <span className="text-white">1.5 km/h</span> de vitesse pure gratuite.
                        </p>
                    </div>
                 </div>
            </div>
        </motion.div>

      </div>
    </div>
  );
}