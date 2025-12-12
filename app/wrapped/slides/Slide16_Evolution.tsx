'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Award, Activity, HeartPulse } from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Line, 
  Bar, 
  ComposedChart 
} from 'recharts';
import { WrappedStats } from '../../../types/wrapped';

export default function SlideEvolution({ stats }: { stats: WrappedStats }) {
  const { evolution } = stats;

  return (
    <div className="w-full max-w-6xl px-4 h-full flex flex-col justify-center items-center">
      
      {/* HEADER : Titre orienté Engineering / Data */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
            <TrendingUp className="text-purple-400" size={32} />
            <h2 className="text-4xl font-black text-white tracking-widest uppercase italic">
                AEROBIC <span className="text-purple-400">EFFICIENCY</span>
            </h2>
        </div>
        <p className="text-xs text-gray-500 font-mono tracking-[0.3em]">RATIO ANALYTICS : WATTS / BPM</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full">
        
        {/* GRAPHIQUE PRINCIPAL (3/4 de la largeur) */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 bg-black/40 border border-white/10 rounded-2xl p-6 h-[400px] relative"
        >
            <div className="absolute top-4 left-6 z-10 flex gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-cyan-500/20 rounded-sm" />
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">Charge (CTL)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-purple-500 rounded-full" />
                    <span className="text-[10px] font-mono text-purple-400 uppercase tracking-tighter font-bold">Efficience (W/BPM)</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={evolution.monthly} margin={{ top: 40, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                        dataKey="month" 
                        stroke="#444" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value: string) => {
                        if (value === "JUILLET") return "JUL"; // On différencie Juin (JUI) et Juillet (JUL)
                        return value.substring(0, 3);
    }}
                    />
                    
                    {/* Axe Fitness (Gauche) */}
                    <YAxis 
                        yAxisId="left" 
                        stroke="#666" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        domain={[0, 'auto']}
                    />
                    
                    {/* Axe Efficience (Droite) - Focus sur les petites variations */}
                    <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke="#a855f7" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        domain={['dataMin - 0.2', 'dataMax + 0.2']}
                    />

                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f1219', border: '1px solid #333', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '10px', textTransform: 'uppercase' }}
                        labelStyle={{ color: '#999', marginBottom: '4px' }}
                        // Le Tooltip affichera maintenant le nom complet (ex: JUILLET) donc plus d'erreur !
                    />

                    {/* Barres de fitness en background */}
                    <Bar 
                        yAxisId="left" 
                        dataKey="fitness" 
                        fill="#06b6d4" 
                        radius={[4, 4, 0, 0]} 
                        opacity={0.15} 
                        name="Fitness"
                    />
                    
                    {/* Ligne d'efficience (La Star de la slide) */}
                    <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="efficiency" 
                        stroke="#a855f7" 
                        strokeWidth={4} 
                        dot={{ r: 5, fill: '#a855f7', strokeWidth: 2, stroke: '#000' }} 
                        activeDot={{ r: 8, strokeWidth: 0 }}
                        name="Efficience"
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </motion.div>

        {/* INSIGHTS DATA (1/4 de la largeur) */}
        <div className="flex flex-col gap-4">
            <motion.div 
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                className="bg-[#0f1219] p-6 rounded-2xl border-l-4 border-purple-500 flex-1 flex flex-col justify-center shadow-xl"
            >
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-2">
                    <HeartPulse size={12} /> Gain Aérobie
                </div>
                <div className="text-4xl font-black text-white italic">
                    {evolution.efficiencyGain > 0 ? `+${evolution.efficiencyGain}` : evolution.efficiencyGain}%
                </div>
                <div className="text-[10px] text-purple-400 mt-2 font-mono uppercase leading-tight">
                    Optimisation du coût métabolique
                </div>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                className="bg-white/5 p-6 rounded-2xl border border-white/10 flex-1 flex flex-col justify-center"
            >
                <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Pic de Forme</div>
                <div className="text-3xl font-black text-white uppercase">{evolution.peakMonth}</div>
                <div className="text-[10px] text-cyan-400 mt-2 font-mono">
                    CHARGE MAX : {evolution.fitnessGrowth + 40} CTL
                </div>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                className="bg-purple-500/10 p-4 rounded-2xl border border-purple-500/20"
            >
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <Activity size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Analyse Ingénieur</span>
                </div>
                <p className="text-[10px] text-gray-400 font-mono leading-relaxed italic">
                    {evolution.efficiencyGain > 2 
                        ? "Votre système cardiovasculaire s'est structurellement amélioré. Plus de puissance pour moins de BPM."
                        : "Excellente stabilité du moteur. Votre base aérobie acquise est résiliente aux variations de charge."}
                </p>
            </motion.div>
        </div>

      </div>
    </div>
  );
}