'use client';

import React from 'react';
import { X, Crown, Trophy, MapPin, Calendar, Zap, Gauge, Timer } from 'lucide-react';

interface LegendDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'KOM' | 'TOP10';
  items: any[];
  isLoading: boolean;
}

export default function LegendDetailsModal({ isOpen, onClose, title, type, items, isLoading }: LegendDetailsModalProps) {
  if (!isOpen) return null;

  const color = type === 'KOM' ? '#d04fd7' : '#00f3ff'; // Violet pour KOM, Bleu pour Top 10
  const Icon = type === 'KOM' ? Crown : Trophy;

  // Formatage durée
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="bg-[#0f0f13] border w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]"
        style={{ borderColor: `${color}30` }}
      >
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#141419]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border`} style={{ backgroundColor: `${color}10`, borderColor: `${color}20` }}>
              <Icon size={20} style={{ color: color }} fill={type === 'KOM' ? "currentColor" : "none"} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">{title}</h2>
              <p className="text-xs text-gray-500 font-mono">{type === 'KOM' ? 'LISTE DES COURONNES' : 'LISTE DES PLACES D\'HONNEUR'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Liste Scrollable */}
        <div className="overflow-y-auto p-4 custom-scrollbar">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Icon size={32} className="animate-pulse opacity-50" style={{ color }} />
                    <span className="text-sm text-gray-500 font-mono">CHARGEMENT DES DONNÉES...</span>
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    Aucun segment trouvé pour cette catégorie.
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {items.map((item, idx) => (
                        <div key={idx} className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all gap-4">
                            
                            {/* Infos Segment */}
                            <div className="flex items-start gap-4">
                                <div className="text-lg font-black font-mono w-8 text-center opacity-50">#{item.rank || (idx + 1)}</div>
                                <div>
                                    <h4 className="font-bold text-white group-hover:text-[#d04fd7] transition-colors line-clamp-1">{item.segmentName}</h4>
                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400 font-mono uppercase">
                                        {item.segmentCity && <span className="flex items-center gap-1"><MapPin size={10} /> {item.segmentCity}</span>}
                                        <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(item.date).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Perf */}
                            <div className="flex items-center gap-4 md:gap-6 bg-black/20 p-2 rounded-lg justify-end">
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] text-gray-600 font-bold uppercase">Vitesse</span>
                                    <span className="text-sm font-bold text-white flex items-center gap-1">
                                        {item.speed.toFixed(1)} <span className="text-[9px] text-gray-500">km/h</span>
                                    </span>
                                </div>
                                <div className="w-px h-6 bg-white/10"></div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] text-gray-600 font-bold uppercase">Puissance</span>
                                    <span className="text-sm font-bold text-[#d04fd7] flex items-center gap-1">
                                        {Math.round(item.power)} <Zap size={10} fill="currentColor" />
                                    </span>
                                </div>
                                <div className="w-px h-6 bg-white/10"></div>
                                <div className="flex flex-col items-end min-w-[50px]">
                                    <span className="text-[9px] text-gray-600 font-bold uppercase">Chrono</span>
                                    <span className="text-sm font-mono font-bold text-white">
                                        {formatTime(item.duration)}
                                    </span>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}