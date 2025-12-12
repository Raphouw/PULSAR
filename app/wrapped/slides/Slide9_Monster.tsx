'use client';

import { motion } from 'framer-motion';
import { Mountain, Timer, Zap, Flame, Compass, Activity, ShieldAlert } from 'lucide-react';
import { WrappedStats } from '../../../types/wrapped';

const formatDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }).toUpperCase();

export default function SlideMonsterRide({ stats }: { stats: WrappedStats }) {
  const ride = stats.monsterRide;

  if (!ride) return null;

  return (
    <div className="w-full max-w-6xl px-4 h-full flex flex-col justify-center">
      
      {/* HEADER TACTIQUE */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-4 mb-12 border-b border-red-900/30 pb-6"
      >
        <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/30">
            <ShieldAlert size={32} className="text-red-500 animate-pulse" />
        </div>
        <div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
                MONSTER <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">RIDE</span>
            </h2>
            <p className="text-xs text-gray-500 font-mono mt-1 tracking-[0.3em]">MISSION_LOG: {formatDate(ride.date)}</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* GAUCHE : LE RÉCAP (Prend 5 cols) */}
        <motion.div 
            initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="lg:col-span-5 space-y-4"
        >
            <div className="bg-[#0f1219] p-8 rounded-3xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Compass size={120} />
                </div>
                
                <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tight leading-tight">
                    {ride.name}
                </h3>

                <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                    <div className="space-y-1">
                        <div className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2">
                            <Compass size={12} className="text-cyan-400" /> Distance
                        </div>
                        <div className="text-3xl font-black text-white">{ride.distance} <span className="text-sm text-gray-500">KM</span></div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2">
                            <Mountain size={12} className="text-green-400" /> Dénivelé
                        </div>
                        <div className="text-3xl font-black text-white">{ride.elevation} <span className="text-sm text-gray-500">M</span></div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2">
                            <Timer size={12} className="text-purple-400" /> Durée
                        </div>
                        <div className="text-3xl font-black text-white">{formatDuration(ride.duration)}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2">
                            <Flame size={12} className="text-orange-500" /> Énergie
                        </div>
                        <div className="text-3xl font-black text-white">{ride.calories} <span className="text-sm text-gray-500">KCAL</span></div>
                    </div>
                </div>
            </div>
        </motion.div>

        {/* DROITE : ANALYSE PHYSIO (Prend 7 cols) */}
        <motion.div 
            initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
            {/* TSS Card */}
            <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 p-6 rounded-2xl">
                <div className="flex justify-between items-start mb-4">
                    <div className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Training Stress</div>
                    <Zap size={16} className="text-red-500" />
                </div>
                <div className="text-5xl font-black text-white mb-2">{ride.tss}</div>
                <div className="text-xs text-gray-500 font-mono italic">"Une charge brutale pour le système."</div>
            </div>

            {/* IF/VI Card */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col justify-between">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Facteur Intensité (IF)</span>
                        <span className="text-xl font-bold text-cyan-400">{ride.if}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Variabilité (VI)</span>
                        <span className="text-xl font-bold text-purple-400">{ride.vi}</span>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-gray-400 font-mono">
                    {ride.vi < 1.1 ? "GESTION_STABLE : RYTHME RÉGULIER" : "GESTION_NERVEUSE : RELANCES FRÉQUENTES"}
                </div>
            </div>

            {/* Analyse Narrative (Prend 2 colonnes en large) */}
            <div className="md:col-span-2 bg-[#050505] border border-white/5 p-6 rounded-2xl">
                 <div className="flex items-center gap-3 mb-3">
                    <Activity size={16} className="text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Diagnostic de l'effort</span>
                 </div>
                 <p className="text-sm text-gray-400 leading-relaxed font-mono">
                    Sur cette sortie, vous avez maintenu une puissance moyenne de <span className="text-white font-bold">{ride.avgPower}W</span>. 
                    {ride.tss > 300 ? " Le niveau de fatigue terminale était critique. C'est ici que le mental a pris le relais sur les jambes." : " Une sortie d'une grande maîtrise technique."}
                    {ride.if > 0.85 ? " L'intensité globale était proche de votre seuil, indiquant une performance de haut niveau." : ""}
                 </p>
            </div>
        </motion.div>

      </div>
    </div>
  );
}