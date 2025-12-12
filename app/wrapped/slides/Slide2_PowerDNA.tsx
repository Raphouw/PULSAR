'use client';

import { motion, Variants } from 'framer-motion';
import { Dna, Activity, Zap, Flame, Wind, Timer, Crosshair } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { WrappedStats } from '../../../types/wrapped';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item: Variants = {
  hidden: { x: 20, opacity: 0 },
  show: { x: 0, opacity: 1 }
};

// Fonction pour déterminer l'archétype du coureur selon ses scores
const getArchetype = (dna: WrappedStats['powerDNA']) => {
  const { neuromuscular, anaerobic, vo2max, oxidative } = dna;
  
  if (neuromuscular > 85 && anaerobic > 70) return { title: "PUR SPRINTER", desc: "Fibres rapides dominantes. Une terreur dans les 200 derniers mètres." };
  if (vo2max > 80 && anaerobic > 80) return { title: "PUNCHEUR EXPLOSIF", desc: "Capable de dynamiter la course dans les bosses de 3-5 minutes." };
  if (vo2max > 80 && oxidative > 75) return { title: "BAROUDEUR / ROULEUR", desc: "Gros moteur capable de tenir des échappées au long cours." };
  if (oxidative > 85) return { title: "DIESEL ENDURANT", desc: "Inépuisable. Plus c'est long, plus vous remontez les morts." };
  return { title: "POLYVALENT", desc: "Profil équilibré. À l'aise partout, mais maître nulle part." };
};

export default function SlidePowerDNA({ stats }: { stats: WrappedStats }) {
  
  // Préparation des données pour le Radar (Normalisé 0-100)
  // On ajoute la valeur brute (Watts) pour l'affichage dans le tooltip ou à côté
  const dnaData = [
    { subject: 'SPRINT', score: stats.powerDNA.neuromuscular, value: `${stats.phenotype.pmax} W`, icon: Zap },
    { subject: 'ANAÉROBIE', score: stats.powerDNA.anaerobic, value: 'High', icon: Flame }, // Basé sur 1min (non dispo dans phenotype direct mais dans DNA)
    { subject: 'VO2MAX', score: stats.powerDNA.vo2max, value: `${stats.phenotype.cp3} W`, icon: Wind }, // CP3 est un bon proxy VO2
    { subject: 'SEUIL', score: stats.powerDNA.glycolytic, value: `${stats.phenotype.cp20} W`, icon: Activity },
    { subject: 'ENDURANCE', score: stats.powerDNA.oxidative, value: `${stats.totalDistance} km`, icon: Timer },
  ];

  const archetype = getArchetype(stats.powerDNA);

  return (
    <div className="w-full max-w-6xl px-4 h-full flex flex-col justify-center items-center font-sans">
      
      {/* HEADER */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-3 mb-8 border-b border-cyan-900/50 pb-4 w-full"
      >
        <Dna size={24} className="text-cyan-500 animate-pulse" />
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase italic">
          EMPREINTE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">ÉNERGÉTIQUE</span>
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center w-full h-full max-h-[500px]">
        
        {/* GAUCHE : RADAR CHART */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 50, delay: 0.2 }}
          className="relative h-[400px] w-full bg-[#0a0a0a]/50 border border-white/10 rounded-3xl p-4 flex items-center justify-center shadow-[0_0_50px_rgba(0,243,255,0.05)]"
        >
          {/* Background FX */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 to-transparent opacity-50 pointer-events-none" />
          
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={dnaData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#00f3ff', fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' }} 
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              
              {/* Le Radar rempli */}
              <Radar
                name="Profil"
                dataKey="score"
                stroke="#00f3ff"
                strokeWidth={3}
                fill="#00f3ff"
                fillOpacity={0.2}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
                formatter={(val: number) => [`${val.toFixed(0)}/100`, 'Score']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* DROITE : ANALYSE & ARCHÉTYPE */}
        <motion.div 
          variants={container}
          initial="hidden" animate="show"
          className="flex flex-col gap-6"
        >
            {/* 1. CARTE ARCHÉTYPE */}
            <motion.div variants={item} className="bg-[#0f1219] border-l-4 border-cyan-500 p-6 rounded-r-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Crosshair size={100} className="text-white" />
                </div>
                
                <div className="text-[10px] text-gray-400 mb-2 font-mono uppercase tracking-widest">CLASSE DÉTECTÉE</div>
                <div className="text-4xl font-black text-white italic uppercase mb-2">{archetype.title}</div>
                <p className="text-sm text-cyan-400/80 font-mono leading-relaxed max-w-md">
                   "{archetype.desc}"
                </p>
            </motion.div>

            {/* 2. STATS DÉTAILLÉES (LES CHIFFRES CLÉS) */}
            <div className="grid grid-cols-2 gap-4">
                <motion.div variants={item} className="bg-white/5 border border-white/5 p-4 rounded hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-purple-400">
                        <Zap size={16} /> <span className="text-[10px] font-bold uppercase">Sprint (Pmax)</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.phenotype.pmax} <span className="text-xs text-gray-500">W</span></div>
                </motion.div>

                <motion.div variants={item} className="bg-white/5 border border-white/5 p-4 rounded hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-green-400">
                        <Wind size={16} /> <span className="text-[10px] font-bold uppercase">VO2 (~5m)</span>
                    </div>
                    {/* On utilise CP3 ou une estimation si CP5 n'est pas dispo dans phenotype, ici on affiche CP3 pour l'exemple */}
                    <div className="text-2xl font-bold text-white">{stats.phenotype.cp3} <span className="text-xs text-gray-500">W</span></div>
                </motion.div>

                <motion.div variants={item} className="bg-white/5 border border-white/5 p-4 rounded hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-yellow-400">
                        <Activity size={16} /> <span className="text-[10px] font-bold uppercase">Seuil (20m)</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.phenotype.cp20} <span className="text-xs text-gray-500">W</span></div>
                </motion.div>

                <motion.div variants={item} className="bg-white/5 border border-white/5 p-4 rounded hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-blue-400">
                        <Timer size={16} /> <span className="text-[10px] font-bold uppercase">Volume</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{(stats.totalDistance / 1000).toFixed(1)}k <span className="text-xs text-gray-500">km</span></div>
                </motion.div>
            </div>

            {/* 3. FIBRES MUSCULAIRES (Estime) */}
            <motion.div variants={item} className="flex items-center justify-between text-xs font-mono text-gray-500 border-t border-white/10 pt-4 mt-2">
                <span>ESTIMATION FIBRES:</span>
                <span className={`font-bold ${stats.powerDNA.neuromuscular > stats.powerDNA.oxidative ? 'text-purple-400' : 'text-blue-400'}`}>
                    {stats.powerDNA.neuromuscular > stats.powerDNA.oxidative ? 'TYPE II (RAPIDES)' : 'TYPE I (LENTES)'}
                </span>
            </motion.div>

        </motion.div>

      </div>
    </div>
  );
}