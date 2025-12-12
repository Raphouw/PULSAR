'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Globe, Zap, Mountain, Activity, Download, Share2, Award, Target } from 'lucide-react';
import { WrappedStats } from '../../../types/wrapped';
import html2canvas from 'html2canvas'; 

export default function SlideFinalRecap({ stats }: { stats: WrappedStats }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const totalElevation = stats.totalElevation || 0; 
  const wKgSeuil = (stats.ftp / stats.userWeight).toFixed(2); 

  const handleSave = async () => {
    if (cardRef.current) {
      try {
        const canvas = await html2canvas(cardRef.current, { 
          backgroundColor: '#050507',
          scale: 2,
          logging: false,
          useCORS: true,
          // 🔥 CETTE PARTIE EST LA CLÉ :
          // On nettoie le clone du DOM pour html2canvas
          onclone: (clonedDoc) => {
            const el = clonedDoc.body.querySelector('[data-capture="true"]') as HTMLElement;
            if (el) {
              // Supprime les ombres et gradients complexes qui utilisent souvent oklab/oklch
              const allElements = el.querySelectorAll('*');
              allElements.forEach((child) => {
                const style = window.getComputedStyle(child);
                // Si une couleur contient "okl", on la remplace par une valeur sûre
                if (style.color.includes('okl') || style.backgroundColor.includes('okl')) {
                    (child as HTMLElement).style.color = '#ffffff';
                    (child as HTMLElement).style.backgroundColor = 'transparent';
                }
              });
            }
          }
        });
        const link = document.createElement('a');
        link.download = `Pulsar_Wrapped_${stats.userName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error("Erreur capture image :", err);
        alert("Erreur lors de la création de l'image. Essayez une capture d'écran classique !");
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mon Pulsar Wrapped 2025',
          text: `J'ai bouclé ${stats.totalDistance}km et ${totalElevation}m de D+ cette année ! 🚴‍♂️🔥`,
          url: window.location.href,
        });
      } catch (err) { console.log(err); }
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      {/* LA CARTE - data-capture permet de l'identifier dans onclone */}
      <motion.div 
        ref={cardRef}
        data-capture="true"
        style={{ 
            backgroundColor: '#050507',
            borderColor: 'rgba(255,255,255,0.1)'
        }}
        className="relative w-full max-w-4xl p-8 md:p-12 overflow-hidden rounded-[3rem] border shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-10">
            <div>
              <p style={{ color: '#60a5fa' }} className="font-mono text-[10px] tracking-[0.4em] uppercase mb-2">Pulsar Analytics Official</p>
              <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">{stats.userName}</h1>
              <div className="flex gap-4 mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <span>{stats.userHeight}CM</span>
                <span>•</span>
                <span>{stats.userWeight}KG</span>
                <span>•</span>
                <span style={{ color: '#a855f7' }}>{stats.phenotype.name}</span>
              </div>
            </div>
            <div style={{ backgroundColor: '#2563eb' }} className="text-white px-6 py-3 rounded-2xl">
                <span className="font-black text-2xl italic">{stats.summary?.score || 0}</span>
                <span className="text-[10px] font-bold ml-1 opacity-80">PTS</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Distance', val: `${Math.round(stats.totalDistance).toLocaleString()}`, unit: 'KM', icon: Globe, color: '#22d3ee' },
              { label: 'Puissance', val: stats.ftp, unit: 'WATT', icon: Zap, color: '#facc15' },
              { label: 'Dénivelé', val: totalElevation.toLocaleString(), unit: 'M', icon: Mountain, color: '#4ade80' },
              { label: 'Activités', val: stats.count, unit: 'LOGS', icon: Activity, color: '#f87171' },
            ].map((s) => (
              <div key={s.label} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)' }} className="p-5 rounded-3xl border">
                <s.icon size={18} style={{ color: s.color }} className="mb-3" />
                <div className="text-2xl font-black text-white leading-none mb-1">{s.val}</div>
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Special Achievements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            <div style={{ backgroundColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)' }} className="border p-6 rounded-3xl flex items-center gap-4">
              <div style={{ backgroundColor: 'rgba(59,130,246,0.2)' }} className="p-3 rounded-xl"><Award className="text-[#3b82f6]" /></div>
              <div>
                <p className="text-[10px] font-bold text-[#3b82f6] uppercase tracking-widest">Efficiency Base</p>
                <p className="text-lg font-black text-white italic">{wKgSeuil} W/KG @ SEUIL</p>
              </div>
            </div>
            <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' }} className="border p-6 rounded-3xl flex items-center gap-4">
              <div style={{ backgroundColor: 'rgba(16,185,129,0.2)' }} className="p-3 rounded-xl"><Target className="text-[#10b981]" /></div>
              <div>
                <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest">Exploration</p>
                <p className="text-lg font-black text-white italic">{stats.territories.explorationScore}/100 SCORE</p>
              </div>
            </div>
          </div>

          <p className="text-center text-[9px] font-bold text-gray-700 uppercase tracking-[0.5em]">2025 // SEASON WRAPPED REPORT</p>
        </div>
      </motion.div>

      {/* Footer Buttons */}
      <div className="flex gap-4 mt-8 w-full max-w-4xl px-4">
        <button 
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-3 py-4 bg-white text-black font-black uppercase text-xs rounded-2xl hover:bg-cyan-400 transition-all active:scale-95"
        >
          <Download size={16} /> Save Image
        </button>
        <button 
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-3 py-4 bg-white/10 text-white font-black uppercase text-xs rounded-2xl border border-white/10 hover:bg-white/20 transition-all active:scale-95"
        >
          <Share2 size={16} /> Share Result
        </button>
      </div>
    </div>
  );
}