// app/wrapped/slides/Slide3_CPCurve.tsx
'use client';

import { motion } from 'framer-motion';
import { Activity, Zap, Info, Flame, Battery, TrendingUp, Crosshair } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { WrappedStats } from '../../../types/wrapped';

const formatDuration = (s: number) => {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m`;
  return `${Math.floor(s/3600)}h`;
};

export default function SlideCPCurve({ stats }: { stats: WrappedStats }) {
  const { cpCurve } = stats;
  const wPrimeKj = (cpCurve.wPrime / 1000).toFixed(1);

  return (
    <div className="w-full max-w-7xl px-4 h-full flex flex-col justify-center">
      
      {/* HEADER */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b border-purple-900/50 pb-4"
      >
        <div className="flex items-center gap-3">
          <Activity size={28} className="text-purple-500 animate-pulse" />
          <div>
            <h2 className="text-3xl font-black text-white tracking-widest uppercase italic">
              CP <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">HYPERCURVE</span>
            </h2>
            <p className="text-xs text-gray-500 font-mono">MODEL: GOLDEN ENVELOPE (SEASON BEST)</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[60vh]">
        
        {/* GRAPHIQUE AVEC ANIMATION DE BALAYAGE */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-8 bg-black/40 border border-white/10 rounded-xl p-4 relative flex flex-col overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] pointer-events-none" />
          
          {/* 🔥 La Motion Div pour l'effet de dessin "gauche à droite" progressif */}
          <motion.div 
            className="w-full h-full"
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cpCurve.points} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="20%" stopColor="#d04fd7" />
                    <stop offset="100%" stopColor="#00f3ff" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis 
                  dataKey="duration" 
                  tickFormatter={formatDuration} 
                  stroke="#666" 
                  tick={{fill: '#666', fontSize: 10}}
                  type="number"
                  scale="log" 
                  // Fixation du domaine pour éviter les sauts d'animation logarithmique
                  domain={[1, 10800]}
                  ticks={[1, 5, 30, 60, 300, 1200, 3600, 7200, 10800]}
                />
                <YAxis stroke="#666" tick={{fill: '#666', fontSize: 10}} domain={[0, 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', borderColor: '#333' }}
                  itemStyle={{ color: '#fff' }}
                  labelFormatter={(v) => formatDuration(v as number)}
                  formatter={(value: number) => [`${value} W`, 'Puissance']}
                />
                <ReferenceLine 
                    y={cpCurve.criticalPower} 
                    stroke="#00f3ff" 
                    strokeDasharray="3 3" 
                    label={{ position: 'insideTopRight', value: 'CP (Seuil)', fill: '#00f3ff', fontSize: 10 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="watts" 
                  stroke="url(#lineGradient)" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 6, fill: '#00f3ff' }}
                  isAnimationActive={false} // Désactivé ici car géré par le clipPath global pour plus de fluidité
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

        {/* ANALYSE & STATS */}
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-4 flex flex-col gap-4"
        >
            {/* 1. CARTE PRINCIPALE : CP & W/KG */}
            <div className="bg-[#0f1219] border border-cyan-500/30 p-5 rounded-xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity size={80} className="text-cyan-500" />
                </div>
                <div className="text-[10px] text-cyan-400 mb-1 uppercase tracking-widest font-bold">Capacité Aérobie</div>
                <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-black text-white">{cpCurve.criticalPower}</div>
                    <div className="text-sm font-bold text-gray-500">WATTS</div>
                </div>
                <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-cyan-900/30 rounded border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                    <TrendingUp size={12} />
                    {cpCurve.wkgCP} W/KG @ CP
                </div>
            </div>

            {/* 2. CARTE "ALLUMETTES" (W') */}
            <div className="bg-[#0f1219] border border-purple-500/30 p-5 rounded-xl flex-1 flex flex-col justify-center relative overflow-hidden">
                 <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-[10px] text-purple-400 uppercase tracking-widest font-bold">Batterie Anaérobie (W')</div>
                        <div className="text-2xl font-bold text-white">{wPrimeKj} <span className="text-sm text-gray-500">kJ</span></div>
                    </div>
                    <Battery size={24} className="text-purple-500" />
                 </div>
                 
                 <div className="space-y-2">
                    <div className="flex gap-1 h-2">
                        {Array.from({ length: Math.max(1, Math.ceil(cpCurve.matches)) }).map((_, i) => (
                             <motion.div 
                                key={i}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ delay: 0.8 + (i * 0.1) }}
                                className={`flex-1 rounded-full origin-left ${i < cpCurve.matches ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]' : 'bg-gray-800'}`}
                             />
                        ))}
                    </div>
                    <div className="text-xs text-gray-400 font-mono text-right">
                        {cpCurve.matches} "MATCHES" DISPONIBLES
                    </div>
                 </div>
                 
                 <p className="text-[10px] text-gray-500 mt-3 leading-tight italic">
                    C'est votre réserve pour les attaques. 1 Match ≈ une accélération violente de 30-45s.
                 </p>
            </div>

            {/* 3. SCIENTIFIC DATA */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded border border-white/5">
                    <div className="text-[10px] text-gray-500 mb-1">FTP / CP RATIO</div>
                    <div className="text-xl font-bold text-white">{cpCurve.ftpToCpRatio}%</div>
                </div>
                <div className="bg-white/5 p-3 rounded border border-white/5">
                    <div className="text-[10px] text-gray-500 mb-1">PMAX / CP RATIO</div>
                    <div className="text-xl font-bold text-white">
                        {(cpCurve.points[0].watts / (cpCurve.criticalPower || 1)).toFixed(1)}x
                    </div>
                </div>
            </div>

        </motion.div>
      </div>
    </div>
  );
}