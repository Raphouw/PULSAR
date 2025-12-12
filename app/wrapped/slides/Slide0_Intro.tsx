'use client';

import { motion } from 'framer-motion';
import { Zap, ChevronRight, Activity, TrendingUp } from 'lucide-react';
// 🔥 Import corrigé selon ta demande
import { WrappedStats } from '../../../types/wrapped';

interface SlideIntroProps {
  stats: WrappedStats;
  onNext: () => void;
}

export default function SlideIntro({ stats, onNext }: SlideIntroProps) {
  
  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative z-10 font-sans">
      
      {/* 1. VISUEL CENTRAL : LE COEUR DU RÉACTEUR */}
      <motion.div 
        initial={{ scale: 0, opacity: 0, rotate: 180 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.2 }}
        className="relative mb-12 group"
      >
        {/* Glow arrière */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 blur-[50px] opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
        
        {/* Cercle principal */}
        <div className="relative p-10 rounded-full border border-white/10 bg-[#0a0a0a] shadow-[0_0_40px_rgba(0,243,255,0.15)] overflow-hidden">
            {/* Texture interne */}
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
            
            <Zap size={80} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] relative z-10" />
        </div>

        {/* Orbitals (Effet technique) */}
        <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-4 border border-cyan-500/20 rounded-full border-dashed pointer-events-none"
        />
      </motion.div>

      {/* 2. TITRE & CONTEXTE */}
      <div className="text-center space-y-4 mb-16">
        
        {/* Badge Technique */}
        <motion.div 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-2 text-xs font-mono text-cyan-400 tracking-[0.3em] uppercase"
        >
            <Activity size={12} /> <span>Bilan de Performance</span>
        </motion.div>

        {/* Gros Titre */}
        <div className="relative">
            <motion.h1 
                initial={{ y: 30, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="text-7xl md:text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500"
                style={{ textShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
            >
                WRAPPED
            </motion.h1>
            
            {/* Année en superposition */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="absolute -right-4 top-0 text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500 italic tracking-tighter"
                style={{ WebkitTextStroke: '1px rgba(255,255,255,0.1)' }}
            >
                {stats.year}
            </motion.div>
        </div>
        
        {/* Ligne de séparation animée */}
        <motion.div 
            initial={{ scaleX: 0 }} 
            animate={{ scaleX: 1 }} 
            transition={{ delay: 0.8, duration: 0.8, ease: "circOut" }}
            className="h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
        />
      </div>

      {/* 3. TEASER DATA (Les chiffres clés) */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 1 }}
        className="flex items-center gap-8 mb-16 text-sm font-mono text-gray-500 bg-white/5 px-10 py-5 rounded-2xl border border-white/10 backdrop-blur-sm"
      >
        <div className="text-center group">
            <div className="text-white font-black text-2xl tabular-nums group-hover:text-cyan-400 transition-colors">
                {stats.count}
            </div>
            <div className="text-[10px] tracking-widest mt-1 uppercase">Sorties</div>
        </div>
        
        <div className="h-10 w-px bg-white/10" />
        
        <div className="text-center group">
            <div className="text-white font-black text-2xl tabular-nums group-hover:text-purple-400 transition-colors">
                {stats.totalDistance.toLocaleString()}
            </div>
            <div className="text-[10px] tracking-widest mt-1 uppercase">Kilomètres</div>
        </div>
        
        <div className="h-10 w-px bg-white/10" />
        
        <div className="text-center group">
            <div className="text-white font-black text-2xl tabular-nums flex items-center gap-1 justify-center">
                <TrendingUp size={16} className="text-green-500" />
            </div>
            <div className="text-[10px] tracking-widest mt-1 uppercase">Analyse</div>
        </div>
      </motion.div>

      {/* 4. BOUTON ACTION (PRO & TECHNIQUE) */}
      <motion.button
        onClick={onNext}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, type: "spring" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="group relative cursor-pointer"
      >
        <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
        <div className="relative px-[2px] py-[2px] rounded-full bg-gradient-to-r from-cyan-500 via-white to-purple-500">
            <div className="px-12 py-5 bg-[#050505] rounded-full flex items-center gap-4 relative overflow-hidden">
                {/* Shine effect au survol */}
                <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 group-hover:left-[100%] transition-all duration-700 ease-in-out" />
                
                <span className="font-black italic text-white tracking-widest text-lg group-hover:text-cyan-400 transition-colors">
                    OUVRIR LE RAPPORT
                </span>
                <ChevronRight size={24} className="text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-transform" />
            </div>
        </div>
      </motion.button>

      {/* FOOTER DISCRET */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 text-[10px] text-gray-600 font-mono tracking-[0.2em] uppercase"
      >
        Athlète ID: <span className="text-white font-bold">{stats.userName}</span>
      </motion.div>

    </div>
  );
}