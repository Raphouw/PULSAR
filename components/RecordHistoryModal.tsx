'use client';

import React, { useMemo } from 'react';
import { X, TrendingUp, Trophy, Crown, Calendar, Activity } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface RecordHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricId: string;
  metricLabel: string;
  unit: string;
  color: string;
  allRecords: any[];
}

export default function RecordHistoryModal({
  isOpen,
  onClose,
  metricId,
  metricLabel,
  unit,
  color,
  allRecords
}: RecordHistoryModalProps) {
  
  // 1. Filtrage et Préparation des données
  const { chartData, yearlyBests, allTimeBest } = useMemo(() => {
    if (!allRecords || !metricId) return { chartData: [], yearlyBests: [], allTimeBest: 0 };

    // A. Filtrer par métrique
    const filtered = allRecords.filter((r) => r.metric_id === metricId);

    // B. Groupement "Best of Month"
    const bestsByMonth: Record<string, any> = {};
    const bestsByYear: Record<string, number> = {};
    let globalMax = 0;

    filtered.forEach((r) => {
      const dateObj = new Date(r.date_recorded);
      const monthKey = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
      const yearKey = dateObj.getFullYear().toString();
      const val = Number(r.value);

      if (val > globalMax) globalMax = val;

      if (!bestsByYear[yearKey] || val > bestsByYear[yearKey]) {
        bestsByYear[yearKey] = val;
      }

      if (!bestsByMonth[monthKey] || val > Number(bestsByMonth[monthKey].value)) {
        bestsByMonth[monthKey] = r;
      }
    });

    const data = Object.values(bestsByMonth)
      .sort((a: any, b: any) => new Date(a.date_recorded).getTime() - new Date(b.date_recorded).getTime())
      .map((r: any) => ({
        date: new Date(r.date_recorded).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        // Pour le header du tooltip
        monthLabel: new Date(r.date_recorded).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        value: Number(r.value),
        original: r // On garde l'objet complet pour avoir le nom et le jour exact
      }));

    const bestsArray = Object.entries(bestsByYear)
      .map(([year, val]) => ({ year, value: val }))
      .sort((a, b) => Number(b.year) - Number(a.year));

    return { chartData: data, yearlyBests: bestsArray, allTimeBest: globalMax };
  }, [allRecords, metricId]);

  // --- 2. COMPOSANT TOOLTIP PERSONNALISÉ ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const originalRecord = data.original;
        
        // Formatage de la date précise (ex: "12 Février")
        const exactDate = new Date(originalRecord.date_recorded).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        
        // Nom de l'activité (ou fallback)
        const activityName = originalRecord.activities?.name || "Activité inconnue";
        
        // Valeur formatée
        const displayValue = metricId.includes('HR') || metricId.includes('Cal') 
            ? Math.round(data.value) 
            : data.value.toFixed(1);

        return (
            <div className="bg-[#0a0a0c] border border-white/10 p-3 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] min-w-[200px]">
                {/* Header : Mois Année */}
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">{data.monthLabel}</p>
                
                {/* Valeur Principale */}
                <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-2xl font-black text-white" style={{ color: color }}>
                        {displayValue}
                    </span>
                    <span className="text-xs font-bold text-gray-400">{unit}</span>
                </div>

                {/* Séparateur */}
                <div className="h-px bg-white/10 w-full mb-2" />

                {/* Détails : Jour & Activité */}
                <div className="flex flex-col gap-1.5">
                    {/* Date précise */}
                    <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-gray-500" />
                        <span className="text-xs text-gray-300 font-medium">{exactDate}</span>
                    </div>

                    {/* Nom Activité (Tronqué) */}
                    <div className="flex items-center gap-2">
                        <Activity size={12} className="text-gray-500 shrink-0" />
                        <span className="text-xs text-gray-400 truncate max-w-[160px]" title={activityName}>
                            {activityName}
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-[#0f0f13] border border-white/10 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#141419]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <TrendingUp size={20} style={{ color }} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">{metricLabel}</h2>
              <p className="text-xs text-gray-500 font-mono">PROGRESSION MENSUELLE (RECORDS)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Colonne Gauche : Graphique */}
            <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 h-[350px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            
                            <XAxis 
                                dataKey="date" 
                                stroke="#444" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                minTickGap={30}
                                dy={10}
                            />
                            
                            <YAxis 
                                stroke="#444" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                domain={['dataMin', 'auto']}
                                unit={` ${unit}`}
                                dx={-5}
                            />
                            
                            {/* 🔥 ICI : On utilise notre Tooltip Custom */}
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20' }} />
                            
                            <ReferenceLine y={allTimeBest} stroke={color} strokeDasharray="3 3" opacity={0.3} />
                            
                            <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke={color} 
                                strokeWidth={3} 
                                dot={{ fill: '#0f0f13', stroke: color, r: 4, strokeWidth: 2 }} 
                                activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Colonne Droite : Stats Annuelles */}
            <div className="flex flex-col gap-4">
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 h-full overflow-y-auto custom-scrollbar">
                    <h3 className="text-xs font-bold text-gray-400 mb-4 flex items-center gap-2">
                        <Trophy size={14} /> RECORDS PAR ANNÉE
                    </h3>
                    <div className="flex flex-col gap-2">
                        {yearlyBests.map((item) => {
                            const isPR = item.value >= allTimeBest - 0.01;
                            return (
                                <div key={item.year} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isPR ? `bg-[${color}]/10 border-[${color}]/30` : 'bg-white/5 border-transparent'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded-md font-mono">{item.year}</span>
                                        {isPR && <Crown size={14} className="text-yellow-500" fill="currentColor" />}
                                    </div>
                                    <div className="text-lg font-black text-white">
                                        {metricId.includes('HR') || metricId.includes('Cal') ? Math.round(item.value) : item.value.toFixed(1)}
                                        <span className="text-xs font-normal text-gray-500 ml-1">{unit}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

        </div>

      </div>
    </div>
  );
}