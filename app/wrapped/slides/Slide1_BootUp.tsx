'use client';

import { motion, Variants } from 'framer-motion';
import { Terminal, Cpu, Activity, Zap, CheckCircle2, ShieldCheck, Battery } from 'lucide-react';
import { WrappedStats } from '../../../types/wrapped';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item: Variants = {
  hidden: { x: -20, opacity: 0 },
  show: { x: 0, opacity: 1 }
};

const GlitchText = ({ text, color = "text-cyan-400" }: { text: string, color?: string }) => (
  <span className={`font-mono ${color} animate-pulse font-bold`}>{text}</span>
);

export default function SlideBootUp({ stats }: { stats: WrappedStats }) {
  const p = stats.phenotype;

  return (
    <div className="w-full max-w-5xl px-4 h-full flex flex-col justify-center font-mono text-sm md:text-base">
      
      {/* HEADER TERMINAL */}
      <div className="border-b border-cyan-900/50 pb-4 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Terminal size={20} className="text-cyan-500" />
            <div className="text-xs text-cyan-700 tracking-widest">
                SYSTEM_BOOT // {stats.year}_KERNEL // <span className="text-white">{stats.userName.toUpperCase()}</span>
            </div>
        </div>
        <div className="flex gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-ping" />
            <div className="text-[10px] text-green-500">ONLINE</div>
        </div>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        
        {/* SECTION 1: SYSTEM SPECS (Niveau & FTP) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* CARTE NIVEAU */}
            <motion.div variants={item} className="bg-[#0f1219] border-l-4 border-cyan-500 p-5 rounded-r flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ShieldCheck size={80} className="text-cyan-500" />
                </div>
                <div>
                    <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest">RIDER CLASSIFICATION</div>
                    <div className="text-3xl font-black italic text-white uppercase">{p.riderLevel}</div>
                </div>
                <div className="mt-4 flex gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-cyan-500 rounded-full" /> 
                         FTP: <span className="text-white font-bold">{stats.ftp} W</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-purple-500 rounded-full" /> 
                         RATIO: <span className="text-white font-bold">{p.wkgThreshold} W/kg</span>
                    </div>
                </div>
            </motion.div>

            {/* CARTE MOTEUR (VO2 & Work) */}
            <motion.div variants={item} className="bg-[#0f1219] border-l-4 border-purple-500 p-5 rounded-r flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Cpu size={80} className="text-purple-500" />
                </div>
                 <div>
                    <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest">ENGINE DISPLACEMENT (VO2)</div>
                    <div className="text-3xl font-black text-white flex items-baseline gap-2">
                        {p.vo2maxAbs} <span className="text-sm font-normal text-purple-400">mL/kg/min</span>
                    </div>
                </div>
                <div className="mt-4 flex gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                         <Battery size={14} className="text-gray-500" /> 
                         WORK: <span className="text-white font-bold">{(p.totalWorkkJ / 1000).toFixed(1)} MJ</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <Activity size={14} className="text-gray-500" /> 
                         LOAD: <span className="text-white font-bold">{p.totalLoad} TSS</span>
                    </div>
                </div>
            </motion.div>
        </div>

        {/* SEPARATEUR "CHECKING PERFS..." */}
        <motion.div variants={item} className="flex gap-4 items-center text-xs text-gray-600 font-mono py-2">
            <span>&gt; RUNNING PERFORMANCE DIAGNOSTICS...</span>
            <span className="text-green-500 animate-pulse">DONE</span>
        </motion.div>

        {/* SECTION 2: CP MATRIX VISUALIZER */}
        <motion.div variants={item} className="bg-black/40 border border-white/10 p-6 rounded-xl">
             <div className="flex justify-between items-end mb-4 border-b border-gray-800 pb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Durée critique</span>
                <span className="text-xs font-bold text-gray-500 uppercase">Puissance Max</span>
            </div>

            <div className="space-y-4">
                {[
                    { l: 'PMAX (Sprint)', v: p.pmax, c: 'bg-red-500' },
                    { l: 'CP3 (VO2max)', v: p.cp3, c: 'bg-orange-500' },
                    { l: 'CP12 (Anaérobie)', v: p.cp12, c: 'bg-yellow-500' },
                    { l: 'CP20 (Seuil)', v: p.cp20, c: 'bg-green-500' },
                ].map((row, i) => (
                    <div key={i} className="group">
                        <div className="flex justify-between items-center mb-1 text-xs">
                            <span className="text-gray-400 font-bold group-hover:text-white transition-colors">{row.l}</span>
                            <span className="text-white font-mono">{row.v} W</span>
                        </div>
                        {/* Barre de progression avec background sombre */}
                        <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: `${Math.min((row.v / p.pmax) * 100 * 1.5, 100)}%` }} // Scaling x1.5 pour que Pmax ne bouffe pas tout
                                transition={{ duration: 1, delay: 0.5 + (i * 0.1), type: "spring" }}
                                className={`h-full ${row.c} shadow-[0_0_10px_currentColor] opacity-80`} 
                            />
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>

        {/* SECTION 3: SYSTEM CONCLUSION */}
        <motion.div variants={item} className="flex items-start gap-3 mt-4 text-xs text-gray-500">
            <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
            <p>
                Diagnostic terminé. Le système présente une architecture <GlitchText text={p.profileType} color="text-white" />.
                Capacités opérationnelles optimales. Moteur prêt pour analyse approfondie.
            </p>
        </motion.div>

      </motion.div>
    </div>
  );
}