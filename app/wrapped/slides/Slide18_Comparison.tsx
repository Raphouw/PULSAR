'use client';

import { motion } from 'framer-motion';
import { Trophy, Target, Zap, ShieldCheck, BarChart3, Info } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { WrappedStats } from '../../../types/wrapped';

export default function SlideComparison({ stats }: { stats: WrappedStats }) {
  const { comparison, userWeight } = stats;

  return (
    <div className="w-full max-w-7xl px-4 h-full flex flex-col justify-center items-center">
      
      {/* HEADER SCOUTING */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="text-yellow-500" size={32} />
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                PRO <span className="text-yellow-500">BENCHMARK</span>
            </h2>
        </div>
        <p className="text-xs text-gray-500 font-mono tracking-[0.4em]">WORLD TOUR COMPLIANCE REPORT // {userWeight}KG</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-center">
        
        {/* RADAR CHART (5/12) */}
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
            className="lg:col-span-5 bg-white/2 border border-white/5 rounded-3xl p-4 h-[400px] flex items-center justify-center"
        >
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={comparison.radar}>
                    <PolarGrid stroke="#333" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#999', fontSize: 10, fontWeight: 'bold' }} />
                    <Radar
                        name="Vous"
                        dataKey="percentile"
                        stroke="#eab308"
                        fill="#eab308"
                        fillOpacity={0.3}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </motion.div>

        {/* COMPARATIF DÉTAILLÉ (7/12) */}
        <motion.div 
            initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            className="lg:col-span-7 space-y-4"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {comparison.radar.map((item, i) => (
                    <div key={item.metric} className="bg-[#0f1219] p-5 rounded-2xl border border-white/5 group hover:border-yellow-500/30 transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.metric}</span>
                            <span className="text-[10px] font-mono text-yellow-500">{item.percentile.toFixed(0)}% OF PRO</span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-2xl font-black text-white">{item.userValue.toFixed(1)}</span>
                            <span className="text-xs text-gray-600 font-bold">{item.unit}</span>
                        </div>
                        {/* Progress Bar vers le niveau Pro */}
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }} animate={{ width: `${item.percentile}%` }}
                                transition={{ duration: 1.5, delay: 0.6 + (i * 0.1) }}
                                className="h-full bg-gradient-to-r from-yellow-700 to-yellow-400"
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* RANKING CARD */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-transparent border-l-4 border-yellow-500 p-6 rounded-r-2xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/20 rounded-full text-yellow-500">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <div className="text-[10px] text-yellow-500 font-bold uppercase mb-1">DÉTERMINATION DU RANG</div>
                        <div className="text-3xl font-black text-white italic uppercase tracking-tighter">
                            {comparison.overallRank}
                        </div>
                        <p className="text-[11px] text-gray-400 font-mono mt-1 leading-tight">
                            {comparison.analysis} Sur les efforts de {comparison.radar[2].metric}, vous êtes au plus proche des standards élites.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>

      </div>

      {/* FOOTER MASTERCLASS */}
      <div className="mt-8 flex gap-4 w-full">
         <div className="flex-1 bg-white/2 border border-white/5 p-4 rounded-xl flex items-center gap-3">
            <Target size={20} className="text-gray-600" />
            <span className="text-[10px] text-gray-500 font-mono uppercase">
                <strong className="text-white">Gap de Seuil :</strong> Il vous manque environ <span className="text-white">{(comparison.radar[3].proValue - comparison.radar[3].userValue).toFixed(1)} W/kg</span> pour intégrer un train de montagne World Tour.
            </span>
         </div>
         <div className="flex-1 bg-white/2 border border-white/5 p-4 rounded-xl flex items-center gap-3">
            <Zap size={20} className="text-gray-600" />
            <span className="text-[10px] text-gray-500 font-mono uppercase">
                <strong className="text-white">Point Fort :</strong> Votre explosivité à <span className="text-white">{comparison.radar[0].userValue.toFixed(1)} W/kg</span> est votre atout majeur en peloton.
            </span>
         </div>
      </div>

    </div>
  );
}