'use client';

import React, { useState, useMemo } from 'react';
import { Zap, Heart, Mountain, Trophy, Activity, Gauge, Map, Flame, Timer, Crown, ArrowUpRight, BarChart3 } from 'lucide-react';
import RecordHistoryModal from './RecordHistoryModal';

// --- CONFIGURATION D'AFFICHAGE ---
const UI_CONFIG: Record<string, any> = {
    // PUISSANCE
    'P1s': { label: 'P-Max (1s)', icon: Zap, unit: 'W', color: '#d04fd7' },
    'P5s': { label: 'Sprint (5s)', icon: Zap, unit: 'W', color: '#d04fd7' },
    'P30s': { label: 'Sprint (30s)', icon: Zap, unit: 'W', color: '#d04fd7' },
    'P1m': { label: 'Anaérobie (1m)', icon: Zap, unit: 'W', color: '#d04fd7' },
    'P5m': { label: 'PMA (5m)', icon: Activity, unit: 'W', color: '#d04fd7' },
    'P20m': { label: 'Seuil (20m)', icon: Activity, unit: 'W', color: '#d04fd7' },
    'P60m': { label: 'Endurance (1h)', icon: Trophy, unit: 'W', color: '#d04fd7' },
    'P_Avg': { label: 'Puissance Moy.', icon: Zap, unit: 'W', color: '#d04fd7' },

    // CARDIO
    'HR_Max': { label: 'FC Max (Peak)', icon: Heart, unit: 'BPM', color: '#ef4444' },
    'HR_Avg': { label: 'FC Moyenne', icon: Heart, unit: 'BPM', color: '#ef4444' },
    'HR_1m': { label: 'FC Max (1m)', icon: Heart, unit: 'BPM', color: '#ef4444' },
    'HR_5m': { label: 'FC Max (5m)', icon: Heart, unit: 'BPM', color: '#ef4444' },
    'HR_20m': { label: 'FC Seuil (20m)', icon: Heart, unit: 'BPM', color: '#ef4444' },
    'HR_60m': { label: 'FC Endurance (1h)', icon: Heart, unit: 'BPM', color: '#ef4444' },

    // PHYSIQUE
    'Dist_Max': { label: 'Distance Max', icon: Map, unit: 'km', color: '#3b82f6' },
    'Elev_Max': { label: 'D+ Max', icon: Mountain, unit: 'm', color: '#3b82f6' },
    'Speed_Max': { label: 'Vitesse Max', icon: Gauge, unit: 'km/h', color: '#3b82f6' },
    'Speed_Avg': { label: 'Vitesse Moyenne', icon: Gauge, unit: 'km/h', color: '#3b82f6' },
    'Duration_Max': { label: 'Durée Max', icon: Timer, unit: 'h', color: '#3b82f6' },
    'Cal_Max': { label: 'Calories Max', icon: Flame, unit: 'kcal', color: '#f59e0b' },
};

const ORDERED_KEYS = Object.keys(UI_CONFIG);

export default function HallOfRecords({ rawRecords, userWeight = 68 }: { rawRecords: any[], userWeight?: number }) {
  const [selectedYear, setSelectedYear] = useState('all');
  const [activeTab, setActiveTab] = useState('power');
  
  // --- STATE POUR LA MODAL ---
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // 1. Extraire les années
  const years = useMemo(() => {
    const y = new Set<string>();
    if (!rawRecords) return [];
    rawRecords.forEach(r => {
        if(r.date_recorded) {
            y.add(new Date(r.date_recorded).getFullYear().toString());
        }
    });
    return Array.from(y).sort((a, b) => b.localeCompare(a));
  }, [rawRecords]);

  // 2. Calculer les PR "All Time"
  const allTimeBests = useMemo(() => {
      const bests: Record<string, number> = {};
      if (!rawRecords) return bests;
      
      rawRecords.forEach(r => {
          if (!bests[r.metric_id] || Number(r.value) > bests[r.metric_id]) {
              bests[r.metric_id] = Number(r.value);
          }
      });
      return bests;
  }, [rawRecords]);

  // 3. Filtrer selon l'année choisie
  const filteredRecords = useMemo(() => {
      if (!rawRecords) return [];
      if (selectedYear === 'all') return rawRecords;
      return rawRecords.filter(r => new Date(r.date_recorded).getFullYear().toString() === selectedYear);
  }, [rawRecords, selectedYear]);

  const getBestForMetric = (metricId: string) => {
      const matches = filteredRecords.filter(r => r.metric_id === metricId);
      if (matches.length === 0) return null;
      return matches.reduce((prev, curr) => (Number(curr.value) > Number(prev.value) ? curr : prev));
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* HEADER & CONTROLS (Identique) */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 bg-[#0a0a0c] border border-white/5 p-4 rounded-2xl">
             <div className="flex bg-white/5 p-1 rounded-xl gap-2 overflow-x-auto max-w-full">
                 <button onClick={() => setActiveTab('power')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab==='power' ? 'bg-[#d04fd7] text-black shadow-[0_0_15px_#d04fd740]' : 'text-gray-400 hover:text-white'}`}>PUISSANCE</button>
                 <button onClick={() => setActiveTab('heartrate')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab==='heartrate' ? 'bg-[#ef4444] text-white shadow-[0_0_15px_#ef444440]' : 'text-gray-400 hover:text-white'}`}>CARDIO</button>
                 <button onClick={() => setActiveTab('physics')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab==='physics' ? 'bg-[#3b82f6] text-white shadow-[0_0_15px_#3b82f640]' : 'text-gray-400 hover:text-white'}`}>PHYSIQUE</button>
             </div>
             
             <div className="flex gap-2 overflow-x-auto pb-1 max-w-full scrollbar-hide">
                 <button onClick={() => setSelectedYear('all')} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all whitespace-nowrap ${selectedYear==='all' ? 'bg-white text-black border-white' : 'border-white/10 text-gray-500 hover:border-white/30'}`}>TOUT TEMPS</button>
                 {years.length > 0 && <div className="w-px h-4 bg-white/10 mx-1 self-center"></div>}
                 {years.map(y => (
                     <button key={y} onClick={() => setSelectedYear(y)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${selectedYear===y ? 'bg-white/10 text-white border-white/30' : 'border-white/10 text-gray-500 hover:border-white/30'}`}>{y}</button>
                 ))}
             </div>
        </div>

        {/* GRILLE DES RECORD */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {ORDERED_KEYS.map(key => {
                const config = UI_CONFIG[key];
                
                let categoryMatch = false;
                if (activeTab === 'power' && (key.startsWith('P') && !key.startsWith('Phy'))) categoryMatch = true;
                if (activeTab === 'heartrate' && key.startsWith('HR')) categoryMatch = true;
                if (activeTab === 'physics' && (key.startsWith('Dist') || key.startsWith('Elev') || key.startsWith('Speed') || key.startsWith('Duration') || key.startsWith('Cal'))) categoryMatch = true;
                
                if (!categoryMatch) return null;

                const record = getBestForMetric(key);
                const isPR = record && (Number(record.value) >= (allTimeBests[key] || 0) - 0.01); 
                const wkg = (activeTab === 'power' && record) ? (Number(record.value) / userWeight).toFixed(2) : null;

                if (!record) return (
                    <div key={key} className="bg-[#0a0a0c]/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 opacity-40 min-h-[160px]">
                        <config.icon size={24} className="text-gray-700" />
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{config.label}</span>
                        <span className="text-sm text-gray-700 font-mono">--</span>
                    </div>
                );

                let displayVal: string | number = Math.round(Number(record.value));
                if (config.unit === 'h') displayVal = (Number(record.value) / 3600).toFixed(1);
                else if (config.unit === 'km' || config.unit === 'km/h') displayVal = Number(record.value).toFixed(1);
                else if (config.unit === 'kcal') displayVal = Math.round(Number(record.value)).toLocaleString('fr-FR');

                return (
                    // --- RENDU CLIQUABLE ---
                    <div 
                        key={key}
                        onClick={() => setSelectedMetric(key)} // Ouvre la modal
                        className={`relative group overflow-hidden rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-1 min-h-[160px] flex flex-col justify-between cursor-pointer
                            ${isPR && selectedYear !== 'all' 
                                ? `bg-gradient-to-br from-[${config.color}]/10 to-transparent border-[${config.color}]/50 shadow-[0_0_20px_${config.color}20]` 
                                : 'bg-[#141419] border-white/10 hover:border-white/20 hover:bg-white/[0.03]'
                            }`}
                        style={{ borderColor: isPR && selectedYear !== 'all' ? config.color : undefined }}
                    >
                        {/* Indicateur visuel "Cliquable" au survol */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <BarChart3 size={14} className="text-gray-400" />
                        </div>

                        <div className="flex justify-between items-start mb-2 relative z-10">
                            <span className="text-[9px] font-black uppercase text-gray-400 flex gap-1.5 items-center tracking-widest">
                                <config.icon size={12} style={{ color: config.color }} /> 
                                {config.label}
                            </span>
                            
                            {isPR && selectedYear !== 'all' && (
                                <div className="bg-yellow-500/20 p-1.5 rounded-full text-yellow-500 animate-pulse">
                                    <Crown size={14} fill="currentColor" />
                                </div>
                            )}
                            
                            {isPR && selectedYear === 'all' && (
                                <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded text-gray-300 font-bold">PR</span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1 relative z-10">
                            <div className="text-3xl font-black text-white font-mono tracking-tighter leading-none mt-2">
                                {displayVal}
                                <span className="text-sm ml-1 text-gray-500 font-sans font-bold">{config.unit}</span>
                            </div>
                            
                            {wkg && (
                                <div className={`text-[10px] font-bold font-mono w-fit px-2 py-0.5 rounded flex items-center gap-1 mt-1 
                                    ${Number(wkg) > 5 ? 'bg-[#d04fd7] text-black shadow-[0_0_10px_#d04fd7]' : 'bg-white/5 text-gray-400'}`}>
                                    {wkg} W/kg
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t border-white/5 flex justify-between items-center relative z-10 mt-auto">
                             <span className="text-[9px] text-gray-500 font-mono">
                                {new Date(record.date_recorded).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                             </span>
                        </div>

                        {/* Effet de fond lumineux */}
                        <div 
                            className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" 
                            style={{ backgroundColor: config.color }}
                        />
                    </div>
                );
            })}
        </div>

        {/* --- MODAL D'HISTORIQUE --- */}
        {selectedMetric && UI_CONFIG[selectedMetric] && (
            <RecordHistoryModal 
                isOpen={!!selectedMetric}
                onClose={() => setSelectedMetric(null)}
                metricId={selectedMetric}
                metricLabel={UI_CONFIG[selectedMetric].label}
                unit={UI_CONFIG[selectedMetric].unit}
                color={UI_CONFIG[selectedMetric].color}
                allRecords={rawRecords}
            />
        )}
    </div>
  );
}