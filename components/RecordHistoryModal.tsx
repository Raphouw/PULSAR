'use client';

import React, { useMemo } from 'react';
import { X, TrendingUp, Trophy, Crown, Calendar, Activity, Gauge } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Line, ComposedChart } from 'recharts';
import regression from 'regression';
import { formatDuration, UI_CONFIG } from './HallOfRecords';

interface RecordHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricId: string;
  metricLabel: string;
  unit: string;
  color: string;
  isInverse?: boolean;
  format?: 'time' | 'number';
  allRecords: any[];
}

export default function RecordHistoryModal({ isOpen, onClose, metricId, metricLabel, unit, color, isInverse = false, format = 'number', allRecords }: RecordHistoryModalProps) {
  
  const { chartData, yearlyBests, allTimeBest } = useMemo(() => {
    if (!allRecords || !metricId) return { chartData: [], yearlyBests: [], allTimeBest: 0 };

    const filtered = allRecords.filter((r) => r.safeKey === metricId.toLowerCase());

    const bestsByMonth: Record<string, any> = {};
    const bestsByYear: Record<string, number> = {};
    let globalBest = isInverse ? Infinity : 0;

    filtered.forEach((r) => {
      const dateObj = new Date(r.date_recorded);
      const monthKey = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
      const yearKey = dateObj.getFullYear().toString();
      const val = Number(r.value);

      if (isInverse) { if (val < globalBest) globalBest = val; } 
      else { if (val > globalBest) globalBest = val; }

      if (!bestsByYear[yearKey]) { bestsByYear[yearKey] = val; } 
      else {
        if (isInverse && val < bestsByYear[yearKey]) bestsByYear[yearKey] = val;
        if (!isInverse && val > bestsByYear[yearKey]) bestsByYear[yearKey] = val;
      }

      if (!bestsByMonth[monthKey]) { bestsByMonth[monthKey] = r; } 
      else {
        const currentMonthBest = Number(bestsByMonth[monthKey].value);
        if (isInverse && val < currentMonthBest) bestsByMonth[monthKey] = r;
        if (!isInverse && val > currentMonthBest) bestsByMonth[monthKey] = r;
      }
    });

    type ChartDataPoint = {
        date: string; monthLabel: string; value: number; original: any; trend?: number;
    };

    const data: ChartDataPoint[] = Object.values(bestsByMonth)
      .sort((a: any, b: any) => new Date(a.date_recorded).getTime() - new Date(b.date_recorded).getTime())
      .map((r: any) => ({
        date: new Date(r.date_recorded).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        monthLabel: new Date(r.date_recorded).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        value: Number(r.value),
        original: r
      }));

    if (data.length > 2) {
        const regressionData = data.map((d, index) => [index, d.value] as [number, number]);
        const result = regression.polynomial(regressionData, { order: 3, precision: 4 });
        data.forEach((d, index) => { d.trend = result.points[index][1]; });
    }

    const bestsArray = Object.entries(bestsByYear)
      .map(([year, val]) => ({ year, value: val }))
      .sort((a, b) => Number(b.year) - Number(a.year));

    return { chartData: data, yearlyBests: bestsArray, allTimeBest: globalBest };
  }, [allRecords, metricId, isInverse]);

  const formatDisplayValue = (val: number) => {
      if (format === 'time') return formatDuration(val);
      if (metricId.toLowerCase().includes('hr') || metricId.toLowerCase().includes('calories')) return Math.round(val);
      return val.toFixed(1);
  };

  // ⚡ HELPER NOUVEAU : Calcule la vitesse moyenne d'une ligne de record de distance/temps
  const calculateSpeedKmh = (mId: string, val: number) => {
      const idLower = mId.toLowerCase();
      const cfg = UI_CONFIG[metricId];
      if (!cfg) return null;

      if (cfg.tab === 'time_dist') {
          // target = mètres, val = secondes
          const targetMetres = cfg.target || 1000;
          const hours = val / 3600;
          return hours > 0 ? ((targetMetres / 1000) / hours).toFixed(1) : null;
      } 
      else if (cfg.tab === 'dist_time') {
          // duration = secondes, val = kilomètres
          const durationSec = cfg.duration || 300;
          const hours = durationSec / 3600;
          return hours > 0 ? (val / hours).toFixed(1) : null;
      }
      return null;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const dataPayload = payload.find((p:any) => p.dataKey === 'value');
        if (!dataPayload) return null;
        
        const data = dataPayload.payload;
        const originalRecord = data.original;
        const exactDate = new Date(originalRecord.date_recorded).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        const activityName = originalRecord.activities?.name || "Activité inconnue";

        // Vitesse calculée en direct
        const speedKmh = calculateSpeedKmh(metricId, data.value);

        return (
            <div className="bg-[#0a0a0c] border border-white/10 p-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] min-w-[220px]">
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">{data.monthLabel}</p>
                <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-black text-white" style={{ color: color }}>{formatDisplayValue(data.value)}</span>
                    <span className="text-xs font-bold text-gray-400">{unit}</span>
                </div>

                {speedKmh && (
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-2 bg-emerald-500/10 px-2 py-0.5 rounded w-fit">
                        <Gauge size={12} /> {speedKmh} km/h
                    </div>
                )}

                <div className="h-px bg-white/10 w-full mb-3" />
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-500" />
                        <span className="text-xs text-gray-300 font-medium">{exactDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity size={14} className="text-gray-500 shrink-0" />
                        <span className="text-xs text-gray-400 truncate max-w-[180px]" title={activityName}>{activityName}</span>
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
      <div className="bg-[#0f0f13] border border-white/10 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#141419]">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 shadow-inner">
              <TrendingUp size={24} style={{ color }} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none">{metricLabel}</h2>
              <p className="text-xs text-gray-500 font-mono mt-1">HISTORIQUE MENSUEL & ÉVOLUTION</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 h-[400px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis dataKey="date" stroke="#444" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} dy={10} />
                            <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(val) => format === 'time' ? formatDuration(val) : val} reversed={isInverse} dx={-5} />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20' }} />
                            <ReferenceLine y={allTimeBest} stroke={color} strokeDasharray="3 3" opacity={0.4} />
                            {chartData.length > 2 && <Line type="monotone" dataKey="trend" stroke="#ffffff" strokeWidth={2} dot={false} activeDot={false} opacity={0.3} strokeDasharray="5 5" />}
                            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={{ fill: '#0f0f13', stroke: color, r: 4, strokeWidth: 2 }} activeDot={{ r: 7, fill: color, stroke: '#fff', strokeWidth: 2 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="bg-black/40 rounded-2xl p-5 border border-white/5 h-full max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                    <h3 className="text-xs font-bold text-gray-400 mb-5 flex items-center gap-2 tracking-widest uppercase">
                        <Trophy size={14} /> Sommets Annuels
                    </h3>
                    <div className="flex flex-col gap-3">
                        {yearlyBests.map((item) => {
                            const isPR = isInverse ? item.value <= allTimeBest + 0.01 : item.value >= allTimeBest - 0.01;
                            const speedKmh = calculateSpeedKmh(metricId, item.value);

                            return (
                                <div key={item.year} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isPR ? `bg-[${color}]/10 border-[${color}]/40 shadow-lg` : 'bg-white/5 border-white/5'}`}>
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-400 bg-black/50 px-2 py-1 rounded-md font-mono">{item.year}</span>
                                            {isPR && <Crown size={16} className="text-yellow-500 animate-pulse" fill="currentColor" />}
                                        </div>
                                        {speedKmh && (
                                            <span className="text-[11px] font-bold text-emerald-400 font-mono">
                                                {speedKmh} km/h
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xl font-black text-white text-right">
                                        {formatDisplayValue(item.value)}
                                        {format !== 'time' && <span className="text-xs font-normal text-gray-500 ml-1">{unit}</span>}
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