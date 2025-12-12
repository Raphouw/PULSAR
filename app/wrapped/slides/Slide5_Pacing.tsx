'use client';

import { motion } from 'framer-motion';
import { Activity, Zap, Anchor, Info, MoveRight, Sigma } from 'lucide-react';
import { WrappedStats } from '../../../types/wrapped';

// Helper pour formater la date
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export default function SlidePacing({ stats }: { stats: WrappedStats }) {
  const { pacing } = stats;
  
  // On utilise la vraie valeur directement
  const vi = pacing.avgVI;

  // Calcul du niveau de chaos (0 à 1) pour l'intensité des couleurs
  const chaosLevel = Math.min(Math.max((vi - 1.0) / 0.3, 0), 1); // 0 = Métronome, 1 = Chaos total

  return (
    <div className="w-full max-w-6xl px-4 h-full flex flex-col justify-center items-center relative">
      
      {/* HEADER */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8 md:mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
            <Activity className="text-cyan-500 animate-pulse" size={32} />
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-widest uppercase italic">
                PACING <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">IQ</span>
            </h2>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 font-mono">
            <span>VARIABILITY INDEX (VI)</span>
            <span className="text-gray-700">•</span>
            <span>STABILITÉ MÉTABOLIQUE</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full h-full max-h-[600px]">
        
        {/* GAUCHE : LE SCORE & ARCHÉTYPE */}
        <motion.div 
            initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="flex flex-col gap-6"
        >
            {/* Archétype Card */}
            <div className="bg-[#0f1219] border-l-4 border-cyan-500 p-6 md:p-8 rounded-r-2xl relative overflow-hidden flex-1 flex flex-col justify-center">
                
                {/* Background Number */}
                <div className="absolute right-[-20px] top-[-20px] text-[120px] font-black text-white/5 pointer-events-none select-none">
                    {pacing.pacingScore}
                </div>

                <div className="text-xs text-cyan-400 font-mono mb-3 uppercase tracking-widest flex items-center gap-2">
                    <Sigma size={14} /> STYLE DÉTECTÉ
                </div>
                <div className="text-4xl md:text-5xl font-black text-white uppercase italic leading-tight mb-6 relative z-10">
                    {pacing.archetype}
                </div>
                
                <div className="grid grid-cols-2 gap-8 relative z-10">
                    <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">INDEX VI</span>
                        <div className="text-3xl font-bold text-white flex items-baseline gap-2">
                            {vi.toFixed(2)}
                            <span className="text-xs font-normal text-gray-600">x</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">NOTE PACING</span>
                        <div className={`text-3xl font-bold ${pacing.pacingScore > 80 ? 'text-green-400' : 'text-purple-400'}`}>
                            {pacing.pacingScore}<span className="text-sm text-gray-500">/100</span>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5">
                    <div className="flex items-start gap-3">
                        <Info size={16} className="text-gray-500 mt-1 shrink-0" />
                        <p className="text-xs text-gray-400 leading-relaxed font-mono">
                            {pacing.archetype === 'LE MÉTRONOME' && "Votre puissance Normalisée (NP) est identique à votre Moyenne. Une économie d'énergie parfaite, typique des spécialistes du chrono."}
                            {pacing.archetype === 'ROULEUR DIESEL' && "Très peu de déchets. Vous lissez naturellement l'effort, ce qui retarde l'épuisement du glycogène."}
                            {pacing.archetype === 'PUNCHEUR DYNAMIQUE' && "Votre courbe est hachée par des relances incessantes. Un style coûteux en énergie, mais qui fait mal aux adversaires."}
                            {pacing.archetype.includes('EXPLOSIF') && "C'est la guerre ! Votre NP est bien supérieure à votre Moyenne. Typique des courses en circuit, du VTT ou des sorties très fractionnées."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Perfect Ride Card */}
            {pacing.perfectRide && (
                <div className="bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 p-4 rounded-xl flex items-center justify-between group hover:border-yellow-500/40 transition-colors">
                    <div>
                        <div className="flex items-center gap-2 text-yellow-500 mb-1">
                            <Anchor size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">MASTERCLASS DE GESTION</span>
                        </div>
                        <div className="text-white font-bold">{formatDate(pacing.perfectRide.date)} • {pacing.perfectRide.dist.toFixed(0)} KM</div>
                        <div className="text-xs text-gray-500 font-mono mt-1">
                            VI RECORD: <span className="text-white bg-yellow-500/20 px-1 rounded">{pacing.perfectRide.vi}</span> (ROBOTIQUE)
                        </div>
                    </div>
                    <div className="h-12 w-12 bg-black rounded-full border border-yellow-500/30 flex items-center justify-center text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                        <Zap size={24} />
                    </div>
                </div>
            )}
        </motion.div>

        {/* DROITE : VISUALISATION "WOW" */}
        <motion.div 
            initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            className="bg-black/40 border border-white/10 rounded-2xl p-6 relative flex flex-col justify-center overflow-hidden"
        >
            {/* Grille de fond technique */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

            {/* Labels Techniques autour du graph */}
            <div className="absolute top-4 left-4 text-[9px] font-mono text-cyan-500/50 flex flex-col gap-1">
                <span>SIGNAL_SOURCE: POWER_METER</span>
                <span>SAMPLING: 1HZ</span>
                <span>GAIN: {(vi * 10).toFixed(1)}dB</span>
            </div>

            <div className="text-center relative z-10 mb-8 mt-4">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-6 flex items-center justify-center gap-2">
                    <Activity size={14} className="text-purple-400" />
                    OSCILLOSCOPE DE L'EFFORT
                </div>

                {/* VISUALISATION DES BARRES */}
                <div className="h-40 flex items-center justify-center gap-[2px] md:gap-1.5 mb-6 px-4">
                    {Array.from({ length: 45 }).map((_, i) => {
                        // Chaos calculé pour CETTE barre spécifique (un peu aléatoire pour faire vivant)
                        // Plus le VI est haut, plus le "chaos" est amplifié
                        const barChaos = Math.max((vi - 1.0) * 15, 0.2); 
                        
                        return (
                            <motion.div
                                key={i}
                                animate={{ 
                                    height: [
                                        `${15 + Math.random() * 10}%`, 
                                        `${25 + (Math.random() * 60 * barChaos)}%`, 
                                        `${15 + Math.random() * 10}%`
                                    ],
                                    // Changement de couleur dynamique pendant l'animation !
                                    backgroundColor: vi < 1.1 
                                        ? ["#06b6d4", "#22d3ee", "#06b6d4"] // Cyan calme
                                        : ["#8b5cf6", "#f43f5e", "#8b5cf6"] // Violet -> Rose (Agité)
                                }}
                                transition={{ 
                                    repeat: Infinity, 
                                    duration: 0.4 + Math.random() * 0.6, 
                                    ease: "easeInOut",
                                    delay: i * 0.02 // Petit décalage pour l'effet de vague
                                }}
                                className={`w-1.5 md:w-2 rounded-full shadow-[0_0_8px_currentColor]`}
                                style={{ 
                                    opacity: 0.6 + Math.random() * 0.4,
                                }}
                            />
                        );
                    })}
                </div>

                {/* Bloc Explication Flottant */}
                <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg p-3 inline-block max-w-sm mx-auto">
                    {/* 👇 J'ai remplacé <p> par <div> ici */}
                    <div className="text-[10px] text-gray-300 font-mono leading-tight text-left flex gap-3">
                        <div className={`h-full w-1 rounded-full shrink-0 ${vi < 1.1 ? 'bg-cyan-500' : 'bg-purple-500'}`} />
                        <span>
                            <strong className="text-white block mb-1">ANALYSE DU SIGNAL :</strong>
                            {vi < 1.1 
                                ? "Amplitude faible. Le signal montre un pédalage fluide et constant. Vous lissez le terrain."
                                : "Amplitude élevée. Le signal révèle de nombreux pics de puissance (sprints, relances). Vous subissez ou attaquez le terrain."
                            }
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer Gauge */}
            <div className="border-t border-white/10 pt-6 mt-auto relative z-10">
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mb-2 uppercase">
                    <span>1.00 <br/><span className="text-cyan-500">MÉTRONOME</span></span>
                    <span>1.30 <br/><span className="text-purple-500">CHAOTIQUE</span></span>
                </div>
                
                <div className="h-3 bg-gray-900 rounded-full overflow-hidden relative border border-white/5">
                    {/* Gradient de fond */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-900 via-purple-900 to-red-900 opacity-50" />
                    
                    {/* Curseur */}
                    <motion.div 
                        initial={{ left: '0%' }}
                        animate={{ left: `${Math.min(((vi - 1.0) / 0.3) * 100, 100)}%` }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                        className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_15px_white] z-20"
                    />
                    
                    {/* Zone utilisateur */}
                    <motion.div 
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.min(((vi - 1.0) / 0.3) * 100, 100)}%` }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className={`absolute top-0 bottom-0 left-0 ${vi < 1.1 ? 'bg-cyan-500' : 'bg-purple-500'} opacity-30`}
                    />
                </div>
            </div>

        </motion.div>

      </div>
    </div>
  );
}