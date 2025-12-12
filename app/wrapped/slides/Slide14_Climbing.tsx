'use client';

import { motion } from 'framer-motion';
import { Mountain, Map, Zap, Flame, Info, Crosshair } from 'lucide-react';
import { WrappedStats } from '../../../types/wrapped';

export default function SlideTerrain({ stats }: { stats: WrappedStats }) {
  const { terrain, userHeight, userWeight } = stats;

  return (
    <div className="w-full max-w-6xl px-4 h-full flex flex-col justify-center items-center">
      
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
            <Crosshair className="text-cyan-400" size={32} />
            <h2 className="text-4xl font-black text-white tracking-widest uppercase italic">
                PERFORMANCE <span className="text-cyan-400">RADAR</span>
            </h2>
        </div>
        <p className="text-xs text-gray-500 font-mono tracking-[0.3em]">MORPHO-DYNAMICS // {userHeight}CM // {userWeight}KG</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start">
        
        {/* JAUGES DE POTENTIEL (7 COLONNES) */}
        <div className="lg:col-span-7 space-y-6 bg-white/2 border border-white/5 p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] pointer-events-none" />
            
            {/* Montée */}
            <div className="relative z-10">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Gravity Efficiency (Climb)</span>
                    <span className="text-xl font-black text-white">{terrain.climbingPotency.toFixed(0)}%</span>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${terrain.climbingPotency}%` }} transition={{ duration: 1.5 }} className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
                </div>
            </div>

            {/* Plat */}
            <div className="relative z-10">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Aero Sustained (Flat)</span>
                    <span className="text-xl font-black text-white">{terrain.flatSpeedPotency.toFixed(0)}%</span>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${terrain.flatSpeedPotency}%` }} transition={{ duration: 1.5, delay: 0.1 }} className="h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]" />
                </div>
            </div>

            {/* Sprint */}
            <div className="relative z-10">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Neuromuscular Burst (Sprint)</span>
                    <span className="text-xl font-black text-white">{terrain.sprintPotency.toFixed(0)}%</span>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${terrain.sprintPotency}%` }} transition={{ duration: 1.5, delay: 0.2 }} className="h-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
                </div>
            </div>

            {/* EXPLICATIONS TECHNIQUES (En bas du bloc jauge) */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-white/5 text-[9px] font-mono leading-tight">
                <div className="text-emerald-500/70">
                    <strong className="text-emerald-400 block mb-1">CLIMB:</strong>
                    Basé sur le W/kg au seuil. Votre score reflète votre capacité à vaincre la gravité sur les cols longs.
                </div>
                <div className="text-cyan-500/70">
                    <strong className="text-cyan-400 block mb-1">FLAT:</strong>
                    Basé sur les Watts absolus. Analyse de votre capacité à maintenir une haute vélocité malgré votre CdA.
                </div>
                <div className="text-purple-500/70">
                    <strong className="text-purple-400 block mb-1">SPRINT:</strong>
                    Basé sur votre Pmax. Mesure l'efficacité de vos fibres rapides lors des accélérations brutales.
                </div>
            </div>
        </div>

        {/* VERDICT (5 COLONNES) */}
        <div className="lg:col-span-5 space-y-6">
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                className="bg-[#0f1219] border-l-4 border-cyan-500 p-8 rounded-r-2xl relative overflow-hidden h-full"
            >
                <div className="text-xs text-cyan-400 font-mono mb-2 uppercase tracking-widest">DNA_CLASS_DETECTED</div>
                <div className="text-4xl font-black text-white uppercase italic leading-tight mb-4">
                    {terrain.specialization.replace('_', ' ')}
                </div>
                <p className="text-sm text-gray-400 font-mono leading-relaxed italic">
                    "{terrain.terrainVerdict}"
                </p>
            </motion.div>
        </div>

      </div>
    </div>
  );
}