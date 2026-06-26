'use client';

import React, { useState, useMemo } from 'react';
import { Zap, Heart, Mountain, Trophy, Activity, Gauge, Map, Flame, Timer, Crown, BarChart3, TrendingUp } from 'lucide-react';
import RecordHistoryModal from './RecordHistoryModal';

export const UI_CONFIG: Record<string, any> = {
    // PUISSANCE
    'p1s': { label: 'P-Max (1s)', icon: Zap, unit: 'W', color: '#d04fd7', tab: 'power' },
    'p5s': { label: 'Sprint (5s)', icon: Zap, unit: 'W', color: '#d04fd7', tab: 'power' },
    'p15s': { label: 'Sprint (15s)', icon: Zap, unit: 'W', color: '#d04fd7', tab: 'power' },
    'p30s': { label: 'Sprint (30s)', icon: Zap, unit: 'W', color: '#d04fd7', tab: 'power' },
    'p1m': { label: 'Anaérobie (1m)', icon: Zap, unit: 'W', color: '#d04fd7', tab: 'power' },
    'p5m': { label: 'PMA (5m)', icon: Activity, unit: 'W', color: '#d04fd7', tab: 'power' },
    'p20m': { label: 'Seuil (20m)', icon: Activity, unit: 'W', color: '#d04fd7', tab: 'power' },
    'p60m': { label: 'Endurance (1h)', icon: Trophy, unit: 'W', color: '#d04fd7', tab: 'power' },
    'p_avg': { label: 'P-Moy Max', icon: Zap, unit: 'W', color: '#d04fd7', tab: 'power' },

    // CARDIO
    // CARDIO
    'hr_max': { label: 'FC Max', icon: Heart, unit: 'BPM', color: '#ef4444', tab: 'cardio' },
    'hr_1m': { label: 'FC Max (1m)', icon: Heart, unit: 'BPM', color: '#ef4444', tab: 'cardio' },
    'hr_5m': { label: 'FC Max (5m)', icon: Heart, unit: 'BPM', color: '#ef4444', tab: 'cardio' },
    'hr_20m': { label: 'FC Max (20m)', icon: Heart, unit: 'BPM', color: '#ef4444', tab: 'cardio' },
    'hr_60m': { label: 'FC Max (1h)', icon: Heart, unit: 'BPM', color: '#ef4444', tab: 'cardio' },
    'hr_2h': { label: 'FC Max (2h)', icon: Heart, unit: 'BPM', color: '#ef4444', tab: 'cardio' },
    'hr_3h': { label: 'FC Max (3h)', icon: Heart, unit: 'BPM', color: '#ef4444', tab: 'cardio' },
    'hr_5h': { label: 'FC Max (5h)', icon: Heart, unit: 'BPM', color: '#ef4444', tab: 'cardio' },
    'hr_8h': { label: 'FC Max (8h)', icon: Heart, unit: 'BPM', color: '#ef4444', tab: 'cardio' },
    'hr_avg': { label: 'FC Moy Max', icon: Heart, unit: 'BPM', color: '#ef4444', tab: 'cardio' },

    // PHYSIQUE
    'physical_distance': { label: 'Distance Max', icon: Map, unit: 'km', color: '#3b82f6', tab: 'physics' },
    'physical_elevation': { label: 'D+ Max', icon: Mountain, unit: 'm', color: '#3b82f6', tab: 'physics' },
    'physical_speed_max': { label: 'Vitesse Max', icon: Gauge, unit: 'km/h', color: '#3b82f6', tab: 'physics' },
    'physical_speed_avg': { label: 'Vitesse Moy Max', icon: Gauge, unit: 'km/h', color: '#3b82f6', tab: 'physics' },
    'physical_duration': { label: 'Durée Max', icon: Timer, unit: '', color: '#3b82f6', tab: 'physics', format: 'time' },
    'physical_calories': { label: 'Calories Max', icon: Flame, unit: 'kcal', color: '#f59e0b', tab: 'physics' },

    // VAM
    'vam_max': { label: 'VAM Max', icon: Mountain, unit: 'Vm/h', color: '#10b981', tab: 'vam' },
    'vam_1m': { label: 'VAM 1m', icon: Mountain, unit: 'Vm/h', color: '#10b981', tab: 'vam' },
    'vam_5m': { label: 'VAM 5m', icon: Mountain, unit: 'Vm/h', color: '#10b981', tab: 'vam' },
    'vam_10m': { label: 'VAM 10m', icon: Mountain, unit: 'Vm/h', color: '#10b981', tab: 'vam' },
    'vam_20m': { label: 'VAM 20m', icon: Mountain, unit: 'Vm/h', color: '#10b981', tab: 'vam' },
    'vam_30m': { label: 'VAM 30m', icon: Mountain, unit: 'Vm/h', color: '#10b981', tab: 'vam' },
    'vam_1h': { label: 'VAM 1h', icon: Mountain, unit: 'Vm/h', color: '#10b981', tab: 'vam' },

    // TEMPS / KM (inverse: true)
    'time_1k': { label: '1 km', icon: Timer, unit: '', color: '#00f3ff', tab: 'time_dist', inverse: true, format: 'time' },
    'time_3k': { label: '3 km', icon: Timer, unit: '', color: '#00f3ff', tab: 'time_dist', inverse: true, format: 'time' },
    'time_5k': { label: '5 km', icon: Timer, unit: '', color: '#00f3ff', tab: 'time_dist', inverse: true, format: 'time' },
    'time_10k': { label: '10 km', icon: Timer, unit: '', color: '#00f3ff', tab: 'time_dist', inverse: true, format: 'time' },
    'time_20k': { label: '20 km', icon: Timer, unit: '', color: '#00f3ff', tab: 'time_dist', inverse: true, format: 'time' },
    'time_30k': { label: '30 km', icon: Timer, unit: '', color: '#00f3ff', tab: 'time_dist', inverse: true, format: 'time' },
    'time_40k': { label: '40 km', icon: Timer, unit: '', color: '#00f3ff', tab: 'time_dist', inverse: true, format: 'time' },
    'time_50k': { label: '50 km', icon: Timer, unit: '', color: '#00f3ff', tab: 'time_dist', inverse: true, format: 'time' },
    'time_100k': { label: '100 km', icon: Timer, unit: '', color: '#00f3ff', tab: 'time_dist', inverse: true, format: 'time' },

    // KM / TEMPS
    'dist_5m': { label: '5 min', icon: Map, unit: 'km', color: '#f43f5e', tab: 'dist_time' },
    'dist_15m': { label: '15 min', icon: Map, unit: 'km', color: '#f43f5e', tab: 'dist_time' },
    'dist_30m': { label: '30 min', icon: Map, unit: 'km', color: '#f43f5e', tab: 'dist_time' },
    'dist_1h': { label: '1 heure', icon: Map, unit: 'km', color: '#f43f5e', tab: 'dist_time' },
    'dist_2h': { label: '2 heures', icon: Map, unit: 'km', color: '#f43f5e', tab: 'dist_time' },
    'dist_3h': { label: '3 heures', icon: Map, unit: 'km', color: '#f43f5e', tab: 'dist_time' },
    'dist_4h': { label: '4 heures', icon: Map, unit: 'km', color: '#f43f5e', tab: 'dist_time' },
    'dist_5h': { label: '5 heures', icon: Map, unit: 'km', color: '#f43f5e', tab: 'dist_time' },
};

const ORDERED_KEYS = Object.keys(UI_CONFIG);

export const formatDuration = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
};

export default function HallOfRecords({ rawRecords, userWeight = 68 }: { rawRecords: any[], userWeight?: number }) {
  const [selectedYear, setSelectedYear] = useState('all');
  const [activeTab, setActiveTab] = useState('power');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // ⚡ Normalisation des clés pour éviter tout bug d'affichage (P1s vs p1s)
  const safeRecords = useMemo(() => {
      if (!rawRecords) return [];
      return rawRecords.map(r => ({
          ...r,
          safeKey: (r.type || r.metric_id || '').toLowerCase()
      }));
  }, [rawRecords]);

  const years = useMemo(() => {
    const y = new Set<string>();
    safeRecords.forEach(r => {
        if(r.date_recorded) y.add(new Date(r.date_recorded).getFullYear().toString());
    });
    return Array.from(y).sort((a, b) => b.localeCompare(a));
  }, [safeRecords]);

  const allTimeBests = useMemo(() => {
      const bests: Record<string, number> = {};
      safeRecords.forEach(r => {
          const type = r.safeKey;
          const val = Number(r.value);
          const isInverse = UI_CONFIG[type]?.inverse;

          if (!bests[type]) {
              bests[type] = val;
          } else {
              if (isInverse) {
                  if (val < bests[type]) bests[type] = val;
              } else {
                  if (val > bests[type]) bests[type] = val;
              }
          }
      });
      return bests;
  }, [safeRecords]);

  const filteredRecords = useMemo(() => {
      if (selectedYear === 'all') return safeRecords;
      return safeRecords.filter(r => new Date(r.date_recorded).getFullYear().toString() === selectedYear);
  }, [safeRecords, selectedYear]);

  const getBestForMetric = (metricId: string, isInverse: boolean) => {
      const matches = filteredRecords.filter(r => r.safeKey === metricId);
      if (matches.length === 0) return null;
      return matches.reduce((prev, curr) => {
          if (isInverse) return (Number(curr.value) < Number(prev.value) ? curr : prev);
          return (Number(curr.value) > Number(prev.value) ? curr : prev);
      });
  };

  const TABS = [
      { id: 'power', label: 'PUISSANCE', color: '#d04fd7' },
      { id: 'cardio', label: 'CARDIO', color: '#ef4444' },
      { id: 'physics', label: 'PHYSIQUE', color: '#3b82f6' },
      { id: 'vam', label: 'VAM', color: '#10b981' },
      { id: 'time_dist', label: 'TEMPS/KM', color: '#00f3ff' },
      { id: 'dist_time', label: 'KM/TEMPS', color: '#f43f5e' },
  ];

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="flex flex-col xl:flex-row justify-between items-center gap-4 mb-8 bg-[#0a0a0c] border border-white/5 p-4 rounded-2xl">
             {/* ⚡ CLASSES POUR CACHER LA SCROLLBAR SUR LE DEFILEMENT HORIZONTAL */}
             <div className="flex bg-white/5 p-1 rounded-xl gap-2 overflow-x-auto max-w-full w-full xl:w-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                 {TABS.map(tab => (
                     <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)} 
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-white'}`}
                        style={{ backgroundColor: activeTab === tab.id ? tab.color : 'transparent', boxShadow: activeTab === tab.id ? `0 0 15px ${tab.color}40` : 'none' }}
                    >
                        {tab.label}
                    </button>
                 ))}
             </div>
             
             <div className="flex gap-2 overflow-x-auto pb-1 max-w-full w-full xl:w-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                 <button onClick={() => setSelectedYear('all')} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all whitespace-nowrap ${selectedYear==='all' ? 'bg-white text-black border-white' : 'border-white/10 text-gray-500 hover:border-white/30'}`}>TOUT TEMPS</button>
                 {years.length > 0 && <div className="w-px h-4 bg-white/10 mx-1 self-center shrink-0"></div>}
                 {years.map(y => (
                     <button key={y} onClick={() => setSelectedYear(y)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all shrink-0 ${selectedYear===y ? 'bg-white/10 text-white border-white/30' : 'border-white/10 text-gray-500 hover:border-white/30'}`}>{y}</button>
                 ))}
             </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {ORDERED_KEYS.map(key => {
                const config = UI_CONFIG[key];
                if (config.tab !== activeTab) return null;

                const isInverse = !!config.inverse;
                const record = getBestForMetric(key, isInverse);
                
                let isPR = false;
                if (record) {
                    if (isInverse) {
                        isPR = Number(record.value) <= (allTimeBests[key] || Infinity) + 0.01;
                    } else {
                        isPR = Number(record.value) >= (allTimeBests[key] || 0) - 0.01; 
                    }
                }

                const wkg = (activeTab === 'power' && record && !key.includes('avg')) ? (Number(record.value) / userWeight).toFixed(2) : null;

                if (!record) return (
                    <div key={key} className="bg-[#0a0a0c]/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 opacity-40 min-h-[160px]">
                        <config.icon size={24} className="text-gray-700" />
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest text-center">{config.label}</span>
                        <span className="text-sm text-gray-700 font-mono">--</span>
                    </div>
                );

                let displayVal: string | number = Math.round(Number(record.value));
                if (config.format === 'time') {
                    displayVal = formatDuration(Number(record.value));
                } else if (config.unit === 'km' || config.unit === 'km/h' || config.unit === 'm/km') {
                    displayVal = Number(record.value).toFixed(1);
                } else if (config.unit === 'kcal') {
                    displayVal = Math.round(Number(record.value)).toLocaleString('fr-FR');
                }

                return (
                    <div 
                        key={key}
                        onClick={() => setSelectedMetric(key)}
                        className={`relative group overflow-hidden rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-1 min-h-[160px] flex flex-col justify-between cursor-pointer
                            ${isPR && selectedYear !== 'all' 
                                ? 'bg-white/[0.05]' 
                                : 'bg-[#141419] border-white/10 hover:border-white/20 hover:bg-white/[0.03]'
                            }`}
                        style={{ 
                            borderColor: isPR && selectedYear !== 'all' ? config.color : undefined,
                            boxShadow: isPR && selectedYear !== 'all' ? `0 0 20px ${config.color}20` : undefined
                        }}
                    >
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
                                {config.unit && <span className="text-sm ml-1 text-gray-500 font-sans font-bold">{config.unit}</span>}
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

                        <div 
                            className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" 
                            style={{ backgroundColor: config.color }}
                        />
                    </div>
                );
            })}
        </div>

        {selectedMetric && UI_CONFIG[selectedMetric] && (
            <RecordHistoryModal 
                isOpen={!!selectedMetric}
                onClose={() => setSelectedMetric(null)}
                metricId={selectedMetric}
                metricLabel={UI_CONFIG[selectedMetric].label}
                unit={UI_CONFIG[selectedMetric].unit}
                color={UI_CONFIG[selectedMetric].color}
                isInverse={UI_CONFIG[selectedMetric].inverse}
                format={UI_CONFIG[selectedMetric].format}
                allRecords={safeRecords} // On passe les records normalisés
            />
        )}
    </div>
  );
}