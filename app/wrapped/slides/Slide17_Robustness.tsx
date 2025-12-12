'use client';

import { motion } from 'framer-motion';
import { ShieldAlert, BatteryLow, Activity, Zap } from 'lucide-react';
import { WrappedStats } from '../../../types/wrapped';

export default function SlideRobustness({ stats }: { stats: WrappedStats }) {
  const { robustness, userWeight } = stats;

  return (
    <div className="w-full max-w-6xl px-4 h-full flex flex-col justify-center items-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-12">
        <ShieldAlert className="text-red-500 mx-auto mb-4" size={48} />
        <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">
          ROBUSTNESS <span className="text-red-500">INDEX</span>
        </h2>
        <p className="text-xs text-gray-500 font-mono tracking-[0.3em]">FATIGUE RESISTANCE ANALYSIS</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <div className="bg-[#0f1219] border border-white/10 p-8 rounded-3xl relative overflow-hidden">
            <div className="text-5xl font-black text-white mb-2">{robustness.durabilityScore}%</div>
            <div className="text-xs text-red-500 font-bold uppercase tracking-widest mb-6">Indice de Durabilité</div>
            
            <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-gray-500">DÉRIVE CARDIAQUE MOYENNE</span>
                    <span className="text-red-400">+{robustness.efficiencyDegradation}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }} animate={{ width: `${100 - robustness.efficiencyDegradation}%` }}
                        className="h-full bg-gradient-to-r from-red-600 to-orange-500"
                    />
                </div>
            </div>
        </div>

        <div className="flex flex-col justify-center space-y-6">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-2 uppercase italic">{robustness.verdict}</h3>
                <p className="text-xs text-gray-400 font-mono leading-relaxed">
                    Votre capacité à maintenir un ratio <span className="text-white">Watts/BPM</span> stable après 2 heures d'effort est de <span className="text-red-400 font-bold">{robustness.powerRetention}%</span>. 
                    Cela indique un métabolisme qui {robustness.durabilityScore > 80 ? "utilise parfaitement les graisses comme carburant." : "dépend encore beaucoup du glycogène."}
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}