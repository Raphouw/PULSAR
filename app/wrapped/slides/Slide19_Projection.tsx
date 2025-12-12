'use client';

import { motion } from 'framer-motion';
import { Rocket, TrendingUp, Calendar, ChevronRight, Target, Zap } from 'lucide-react';
import { WrappedStats } from '../../../types/wrapped';

export default function SlideProjection({ stats }: { stats: WrappedStats }) {
  const { projection, ftp, userWeight } = stats;

  return (
    <div className="w-full max-w-5xl px-6 h-full flex flex-col justify-center">
      
      {/* HEADER : VISION 2026 */}
      <div className="mb-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <div className="h-[2px] w-12 bg-blue-500" />
          <span className="text-blue-500 font-mono text-xs tracking-[0.3em] uppercase">Roadmap 2026</span>
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-6xl font-black text-white italic tracking-tighter uppercase"
        >
          NEXT <span className="text-transparent stroke-white stroke-2" style={{ WebkitTextStroke: '1px white' }}>LEVEL</span>
        </motion.h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        
        {/* SECTION 1 : LES SCÉNARIOS FTP */}
        <div className="space-y-6">
          <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <TrendingUp size={14} /> Prédiction de Puissance
          </h3>
          
          {projection.scenarios.map((s, i) => (
            <motion.div 
              key={s.label}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + (i * 0.1) }}
              className="relative group cursor-help"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000"></div>
              <div className="relative bg-[#0a0c10] border border-white/5 p-6 rounded-2xl flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-gray-500 font-black mb-1 tracking-tighter">{s.label}</div>
                  <div className="text-4xl font-black text-white tracking-tight">{s.ftp}<span className="text-sm text-gray-600 ml-1">W</span></div>
                </div>
                <div className="text-right">
                  <div className="text-blue-500 font-mono text-xl font-bold">{s.wkg}</div>
                  <div className="text-[10px] text-gray-600 font-bold uppercase">W/KG</div>
                </div>
              </div>
            </motion.div>
          ))}

          <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
             <p className="text-[11px] text-blue-400 font-mono leading-relaxed">
               <strong className="text-blue-200">CONSEIL DATA :</strong> Pour atteindre {projection.scenarios[1].ftp}W, privilégiez un bloc de 4 semaines en "Over-Under" au mois de Mars.
             </p>
          </div>
        </div>

        {/* SECTION 2 : OBJECTIFS DE VOLUME */}
        <div className="bg-white/2 border border-white/5 rounded-3xl p-8 flex flex-col justify-between">
          <div className="space-y-8">
            <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <Target size={14} /> Milestones Saisonnières
            </h3>

            {projection.targets.map((t, i) => (
              <div key={t.name} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                    {t.icon === 'Route' ? <ChevronRight size={20} /> : <Zap size={20} />}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-bold">{t.name}</div>
                    <div className="text-2xl font-black text-white tracking-tight">{t.value.toLocaleString()} {t.unit}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          
        </div>
      </div>

      {/* FOOTER STATS */}
      <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-end">
        <div className="max-w-xs">
          <div className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] mb-2">Focus Prioritaire</div>
          <div className="text-sm text-gray-300 font-medium leading-relaxed italic">
            "Optimiser la {projection.focusArea} pour transformer votre pic de forme estival en une base solide toute l'année."
          </div>
        </div>
        <div className="text-right">
          <Rocket className="text-white mb-2 ml-auto" size={32} />
          <div className="text-[10px] text-gray-600 font-mono">READY FOR SEASON 08 // RAPHAËL</div>
        </div>
      </div>

    </div>
  );
}