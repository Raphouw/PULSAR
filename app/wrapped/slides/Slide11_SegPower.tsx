// app/wrapped/slides/Slide11_SegPower.tsx
'use client';

import { motion } from 'framer-motion';
import { Activity, Zap, Gauge, Info, Mountain, Wind } from 'lucide-react';
import { WrappedStats } from '../../../types/wrapped';

export default function SlideSegPower({ stats }: { stats: WrappedStats }) {
  const { segPower, userWeight, userHeight, ftp } = stats;
  const wkg = (ftp / userWeight).toFixed(2);

  // 🧠 Algorithme de Diagnostic Universel
  const getDynamicVerdict = () => {
    // Cas 1 : Le Pur Grimpeur (Léger + Fort ratio)
    if (userWeight < 70 && parseFloat(wkg) >= 4.0) {
      return `Avec seulement ${userWeight}kg, vous possédez un rapport poids/puissance d'élite. Votre domination sur les pentes à ${segPower.bestSlope} confirme que la gravité est votre alliée naturelle.`;
    }
    
    // Cas 2 : Le Gabarit Imposant (Grand + Puissant)
    if (userHeight > 185 && userWeight > 80) {
      return `Votre physique de rouleur puissant vous rend redoutable. Si le plat est votre terrain de jeu, votre efficacité sur ${segPower.bestSlope} montre une force brute capable de briser n'importe quel peloton.`;
    }

    // Cas 3 : Le Grand Longiligne (Ton profil actuel, mais géré dynamiquement)
    if (userHeight > 190 && userWeight < 75) {
      return `Votre morphotype atypique (${userHeight}cm / ${userWeight}kg) vous offre des leviers exceptionnels. Vous effacez les forts pourcentages à ${segPower.bestSlope} grâce à une efficacité gravitationnelle hors norme.`;
    }

    // Cas 4 : Le Profil Équilibré / Puncheur
    if (segPower.bestSlope.includes('10-12') || segPower.bestSlope.includes('>13')) {
      return `Votre explosivité est votre signature. Vous excellez sur les pourcentages extrêmes (${segPower.bestSlope}), là où l'effort devient lactique et purement psychologique.`;
    }

    // Fallback standard
    return `Votre profil montre une polyvalence rare avec une efficacité maximale sur les pentes de ${segPower.bestSlope}. Un moteur régulier et fiable sur tous les terrains.`;
  };

  return (
    <div className="w-full max-w-7xl px-4 h-full flex flex-col justify-center">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
            <Gauge className="text-emerald-400" size={28} />
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                SEGMENT <span className="text-emerald-400">ANALYSIS</span>
            </h2>
        </div>
        <p className="text-[10px] text-gray-500 font-mono tracking-[0.4em] uppercase">
            {stats.userName} // {userHeight}cm • {userWeight}kg // {wkg} W/KG
        </p>
      </motion.div>

      {/* GRID 5 COLONNES */}
      <div className="flex flex-nowrap lg:grid lg:grid-cols-5 gap-4 w-full overflow-x-auto pb-4 no-scrollbar">
        {segPower.performances.map((perf, i) => (
            <motion.div
                key={perf.gradientRange}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`min-w-[220px] relative p-5 rounded-2xl border ${perf.gradientRange === segPower.bestSlope ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/5 bg-white/2'} overflow-hidden flex flex-col justify-between`}
            >
                <div className="relative z-10">
                    <div className="text-[9px] text-gray-500 font-mono mb-1 uppercase">Gradient</div>
                    <div className={`text-3xl font-black mb-4 ${perf.gradientRange === segPower.bestSlope ? 'text-emerald-400' : 'text-white'}`}>
                        {perf.gradientRange}
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-end border-b border-white/5 pb-1">
                            <span className="text-[9px] text-gray-400 uppercase">Power</span>
                            <span className="text-sm font-bold text-white">{perf.avgWatts}W</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-white/5 pb-1">
                            <span className="text-[9px] text-gray-400 uppercase">VAM</span>
                            <span className="text-sm font-bold text-emerald-400">{perf.vam > 0 ? perf.vam : '---'}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-white/5 pb-1">
                            <span className="text-[9px] text-gray-400 uppercase">W/KG</span>
                            <span className="text-sm font-bold text-gray-300">{perf.avgWkg}</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10">
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }} animate={{ width: `${perf.efficiencyScore}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className={`h-full ${perf.gradientRange === segPower.bestSlope ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]' : 'bg-white/30'}`}
                        />
                    </div>
                    <div className="mt-2 text-right text-[10px] font-bold text-gray-500 uppercase">{perf.efficiencyScore}% Eff.</div>
                </div>
            </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="mt-8 bg-[#0f1219] border-l-4 border-emerald-500 p-6 rounded-r-xl relative overflow-hidden"
      >
        <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-500 shrink-0">
                <Info size={24} />
            </div>
            <div>
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-widest">Verdict Physiologique</div>
                <div className="text-2xl font-black text-white uppercase italic mb-2">
                    {segPower.dominantTerrain}
                </div>
                <p className="text-sm text-emerald-400/80 font-mono leading-relaxed max-w-4xl">
                    {getDynamicVerdict()}
                </p>
            </div>
        </div>
      </motion.div>
    </div>
  );
}