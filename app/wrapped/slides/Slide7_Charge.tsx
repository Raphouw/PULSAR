'use client';

import { motion } from 'framer-motion';
import { Activity, BatteryCharging, TrendingUp, AlertTriangle } from 'lucide-react';
import { Area, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';
import { WrappedStats } from '../../../types/wrapped';

// Helper date
const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
};

export default function SlideCharge({ stats }: { stats: WrappedStats }) {
  const { pmc } = stats;

  return (
    <div className="w-full max-w-6xl px-4 h-full flex flex-col justify-center items-center">
      
      {/* HEADER */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8 relative z-10"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
            <BatteryCharging className="text-green-500 animate-pulse" size={32} />
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-widest uppercase italic">
                CHARGE <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500">& ADAPTATION</span>
            </h2>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 font-mono">
             <span>FITNESS (CTL)</span>
             <span className="text-gray-700">vs</span>
             <span>FATIGUE (TSB)</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full h-[500px]">
        
        {/* KPI CARDS (Gauche) */}
        <motion.div 
            initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="flex flex-col gap-4 lg:col-span-1 justify-center"
        >
            {/* PIC DE FITNESS */}
            <div className="bg-[#0f1219] border-l-4 border-cyan-500 p-5 rounded-r-xl">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">PIC DE FITNESS (CTL)</div>
                <div className="text-4xl font-black text-white">{pmc.maxCTL}</div>
                <div className="text-xs text-cyan-400 mt-1 font-mono">NIVEAU ATTEINT</div>
            </div>

            {/* CREUX DE FATIGUE */}
            <div className="bg-[#0f1219] border-l-4 border-red-500 p-5 rounded-r-xl">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">FATIGUE MAX (TSB)</div>
                <div className="text-4xl font-black text-red-500">{pmc.minTSB}</div>
                <div className="text-xs text-red-400/70 mt-1 font-mono">ZONE ROUGE</div>
            </div>

            {/* PROFIL */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">TYPE DE SAISON</div>
                <div className="flex items-end gap-2">
        <div className="text-3xl font-black text-green-400">{pmc.trainingLoadScore}</div>
        <div className="text-xs text-gray-600 mb-1">/100</div>
                </div>
                {/* Petite barre de progression */}
    <div className="h-1 w-full bg-gray-800 rounded-full mt-3 overflow-hidden">
        <motion.div 
            initial={{ width: 0 }} animate={{ width: `${pmc.trainingLoadScore}%` }}
            className="h-full bg-green-500" 
        />
                </div>
                <div className="text-xl font-bold text-white italic uppercase">{pmc.profile}</div>
            </div>
        </motion.div>

        {/* CHART (Droite - Prend 3 cols) */}
        <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }}
            className="lg:col-span-3 bg-black/40 border border-white/10 rounded-2xl p-4 relative"
        >
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] pointer-events-none" />
            
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={pmc.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="tsbGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
                        </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDate} 
                        stroke="#666" 
                        tick={{fontSize: 10}} 
                        interval={30} // Un tick tous les mois
                    />
                    <YAxis stroke="#666" tick={{fontSize: 10}} />
                    
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#000', borderColor: '#333' }}
                        itemStyle={{ fontSize: '12px' }}
                        labelFormatter={formatDate}
                    />

                    <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />

                    {/* Zone TSB (Forme) - Area Chart */}
                    <Area 
                        type="monotone" 
                        dataKey="tsb" 
                        fill="url(#tsbGradient)" 
                        stroke="#facc15" 
                        strokeWidth={1}
                        name="Forme (TSB)"
                    />

                    {/* Ligne CTL (Fitness) - Line Chart */}
                    <Line 
                        type="monotone" 
                        dataKey="ctl" 
                        stroke="#06b6d4" 
                        strokeWidth={3} 
                        dot={false}
                        name="Fitness (CTL)"
                    />
                </ComposedChart>
            </ResponsiveContainer>

            {/* Légende Custom */}
            <div className="absolute top-4 right-4 flex gap-4 text-[10px] font-mono bg-black/60 p-2 rounded backdrop-blur-sm border border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-1 bg-cyan-500 rounded-full" />
                    <span className="text-cyan-400">FITNESS (CTL)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500/20 border border-yellow-500 rounded-sm" />
                    <span className="text-yellow-400">FORME (TSB)</span>
                </div>
            </div>
        </motion.div>

      </div>

      {/* FOOTER INTERPRETATION */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="mt-6 text-center max-w-2xl bg-white/5 p-3 rounded-lg border border-white/5"
      >
        <p className="text-xs text-gray-400 font-mono flex items-center justify-center gap-2">
            <AlertTriangle size={14} className="text-yellow-500" />
            <span className="text-gray-300">NOTE :</span>
            Plus la ligne Bleue monte, plus vous êtes fort.
            Quand la zone Jaune plonge, vous encaissez la fatigue.
            Le rebond Jaune vers le haut = Pic de forme (Affûtage).
        </p>
      </motion.div>

    </div>
  );
}