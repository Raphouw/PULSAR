'use client';

import { motion } from 'framer-motion';
import { Settings, Repeat, Ruler, Zap } from 'lucide-react';
import { WrappedStats } from '../../../types/wrapped';

export default function SlideBiomech({ stats }: { stats: WrappedStats }) {
  const { biomech, userHeight } = stats;

  return (
    <div className="w-full max-w-6xl px-4 h-full flex flex-col justify-center items-center">
      
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <h2 className="text-4xl font-black text-white tracking-widest uppercase italic">
          BIOMECH <span className="text-emerald-400">ANALYSIS</span>
        </h2>
        <p className="text-xs text-gray-500 font-mono mt-2">LEVERAGE & CADENCE OPTIMIZATION</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        
        {/* CARD 1: CADENCE STYLE */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <Repeat size={32} className={biomech.cadenceStyle === 'SPINNER' ? 'animate-spin-slow' : ''} />
          </div>
          <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Style de Pédalage</div>
          <div className="text-2xl font-black text-white uppercase italic">{biomech.cadenceStyle}</div>
          <div className="mt-4 text-4xl font-black text-emerald-400">{biomech.avgCadence} <span className="text-sm text-gray-500">RPM</span></div>
        </motion.div>

        {/* CARD 2: LEVERAGE (Tes 1m92) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/30 p-8 rounded-3xl relative overflow-hidden lg:col-span-1"
        >
          <div className="text-xs text-emerald-400 font-mono mb-4 uppercase tracking-widest">Mechanical Advantage</div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-5xl font-black text-white">x{biomech.legLengthFactor}</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed font-mono italic">
            Votre taille de {userHeight}cm vous offre des leviers naturels hors normes. Vous générez plus de couple par rotation qu'un coureur standard à puissance égale.
          </p>
          <div className="mt-6 flex items-center gap-3 p-3 bg-black/40 rounded-lg border border-white/5">
            <Ruler size={18} className="text-emerald-500" />
            <div className="text-[10px] text-white font-bold uppercase">Setup recommandé : {biomech.recommendedCrank}</div>
          </div>
        </motion.div>

        {/* CARD 3: TORQUE VS SPEED */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
          className="bg-white/5 border border-white/10 p-6 rounded-2xl"
        >
          <div className="flex items-center gap-2 mb-6">
            <Settings className="text-gray-500" size={18} />
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Efficacité du Couple</span>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-[10px] mb-2">
                <span className="text-gray-400">FORCE (TORQUE)</span>
                <span className="text-white">88%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '88%' }} transition={{ duration: 1.5 }} className="h-full bg-emerald-500" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-2">
                <span className="text-gray-400">VÉLOCITÉ (SPEED)</span>
                <span className="text-white">72%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '72%' }} transition={{ duration: 1.5 }} className="h-full bg-blue-500" />
              </div>
            </div>
          </div>

          <div className="mt-8 p-3 rounded bg-emerald-500/10 border border-emerald-500/20">
             <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-2 uppercase">
                <Zap size={12} /> Pro-Tip
             </div>
             <p className="text-[10px] text-gray-400 mt-1">
                À 1m92, attention aux cadences trop basses (&lt;70) en montée : vos genoux subissent des contraintes énormes vu votre bras de levier.
             </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}