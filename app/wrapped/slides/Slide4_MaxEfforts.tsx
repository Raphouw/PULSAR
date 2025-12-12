'use client';

import { motion } from 'framer-motion';
import { Trophy, Calendar, Zap, Flame, Wind, Mountain, ArrowUpRight } from 'lucide-react';
import { WrappedStats, BestEffort } from '../../../types/wrapped';

// Helper pour formatter la date (ex: "12 JUILLET")
const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }).toUpperCase();
};

// Composant Carte Individuelle
const EffortCard = ({ effort, index }: { effort: BestEffort, index: number }) => {
    
    // Config couleur/icone selon le type d'effort
    let color = "text-cyan-400";
    let border = "border-cyan-500/30";
    let bg = "bg-cyan-900/10";
    let Icon = Zap;

    if (index === 0) { color = "text-purple-400"; border = "border-purple-500/30"; Icon = Zap; } // Sprint
    if (index === 1) { color = "text-red-500"; border = "border-red-500/30"; Icon = Flame; }     // 1m
    if (index === 2) { color = "text-blue-400"; border = "border-blue-500/30"; Icon = Wind; }    // 5m
    if (index === 3) { color = "text-yellow-400"; border = "border-yellow-500/30"; Icon = Mountain; } // 20m

    return (
        <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 + (index * 0.1), type: "spring" }}
            whileHover={{ y: -10, scale: 1.02 }}
            className={`relative group p-6 rounded-2xl bg-[#0f1219] border ${border} flex flex-col justify-between h-full overflow-hidden`}
        >
            {/* Background Glow au survol */}
            <div className={`absolute inset-0 ${bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`} />
            
            {/* Header */}
            <div className="relative z-10 flex justify-between items-start mb-4">
                <div className={`p-3 rounded-full bg-white/5 ${color}`}>
                    <Icon size={24} />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-gray-500 uppercase tracking-widest border border-white/10 px-2 py-1 rounded">
                    <Calendar size={10} /> {formatDate(effort.date)}
                </div>
            </div>

            {/* Valeurs Principales */}
            <div className="relative z-10">
                <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">{effort.label}</div>
                <div className="flex items-baseline gap-2">
                    <div className="text-5xl font-black text-white tracking-tighter tabular-nums">
                        {Math.round(effort.value)}
                    </div>
                    <div className="text-sm font-bold text-gray-400">W</div>
                </div>
            </div>

            {/* Footer Stats */}
            <div className="relative z-10 mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase">Intensité</span>
                    <span className={`text-xl font-bold ${color} tabular-nums`}>{effort.wkg.toFixed(1)} <span className="text-[10px] text-gray-400">W/KG</span></span>
                </div>
                
                {/* Petit badge "PR" si c'est énorme (simulation visuelle) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                    <ArrowUpRight size={20} className="text-white" />
                </div>
            </div>

            {/* Decoration Pattern */}
            <div className="absolute -bottom-4 -right-4 text-white/5 opacity-0 group-hover:opacity-10 transition-opacity duration-500 rotate-[-15deg]">
                 <Icon size={120} />
            </div>
        </motion.div>
    );
};

export default function SlideMaxEfforts({ stats }: { stats: WrappedStats }) {
  return (
    <div className="w-full max-w-6xl px-4 h-full flex flex-col justify-center">
      
      {/* HEADER */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-4 mb-10 pl-2"
      >
        <Trophy size={32} className="text-yellow-500 animate-bounce-slow" />
        <div>
            <h2 className="text-4xl font-black text-white tracking-widest uppercase italic">
              MOMENTS <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">D'EXCEPTION</span>
            </h2>
            <p className="text-sm text-gray-500 font-mono">REPLAY DES MEILLEURES PERFORMANCES {stats.year}</p>
        </div>
      </motion.div>

      {/* GRID DES 4 CARTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[50vh] min-h-[400px]">
        {stats.bestEfforts.map((effort, i) => (
            effort.value > 0 ? (
                <EffortCard key={i} effort={effort} index={i} />
            ) : (
                // Placeholder si pas de data pour cette durée (ex: pas de sprint 1s)
                <div key={i} className="flex items-center justify-center border border-white/5 rounded-2xl bg-white/5 text-gray-600 font-mono text-xs">
                    NO_DATA_FOR_SLOT_{i}
                </div>
            )
        ))}
      </div>

      {/* FOOTER SCIENTIFIQUE */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
        className="mt-12 border-t border-white/10 pt-6 flex flex-col md:flex-row gap-8 text-xs text-gray-500 font-mono"
      >
        <div className="flex-1">
            <strong className="text-purple-400">PHOSPHAGÈNE (1s-10s)</strong><br/>
            C'est votre explosivité pure. Utile pour les attaques, les pancartes et les sprints finaux. Dépend de la créatine phosphate.
        </div>
        <div className="flex-1">
            <strong className="text-red-400">GLYCOLYTIQUE (1m)</strong><br/>
            Tolérance à la douleur. La capacité à produire de l'énergie quand les jambes brûlent (acidose).
        </div>
        <div className="flex-1">
            <strong className="text-blue-400">VO2MAX (5m)</strong><br/>
            La taille de votre moteur. C'est la quantité maximale d'oxygène que votre corps peut utiliser.
        </div>
        <div className="flex-1">
            <strong className="text-yellow-400">SEUIL (20m)</strong><br/>
            L'endurance de force. La puissance "utile" pour grimper les cols et rouler vite longtemps.
        </div>
      </motion.div>

    </div>
  );
}