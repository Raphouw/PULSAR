'use client';

import React, { useMemo } from 'react';
import { X, TrendingUp, Trophy } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Scatter } from 'recharts';
import regression from 'regression';

interface RecordHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricName: string;
  records: any[]; // Tous les records de cette métrique spécifique
  formatValue: (v: number) => string; // ex: v => `${v}W` ou v => formatTime(v)
}

export default function RecordHistoryModal({ isOpen, onClose, metricName, records, formatValue }: RecordHistoryModalProps) {
  
  const chartData = useMemo(() => {
    if (!records || records.length === 0) return [];
    
    // Regrouper par Mois/Année et prendre le max
    const monthlyMax = new Map<string, { timestamp: number, value: number, label: string }>();
    
    records.forEach(r => {
      const date = new Date(r.date_recorded);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const val = Number(r.value);
      
      if (!monthlyMax.has(key) || val > monthlyMax.get(key)!.value) {
        monthlyMax.set(key, { 
          timestamp: date.getTime(), 
          value: val, 
          label: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) 
        });
      }
    });

    const sortedData = Array.from(monthlyMax.values()).sort((a, b) => a.timestamp - b.timestamp);

    // Calcul de la courbe de tendance polynomiale (degré 3)
    const regressionData = sortedData.map((d, i) => [i, d.value] as [number, number]);
    const result = regression.polynomial(regressionData, { order: 3 });

    return sortedData.map((d, i) => ({
      ...d,
      trend: result.points[i][1]
    }));
  }, [records]);

  const bestByYear = useMemo(() => {
    const yearly = new Map<number, number>();
    records.forEach(r => {
      const year = new Date(r.date_recorded).getFullYear();
      const val = Number(r.value);
      if (!yearly.has(year) || val > yearly.get(year)!) yearly.set(year, val);
    });
    return Array.from(yearly.entries()).sort((a, b) => b[0] - a[0]); // Plus récent au plus ancien
  }, [records]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#eab308]/20 text-[#eab308] rounded-lg"><TrendingUp size={24} /></div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase">{metricName}</h2>
              <p className="text-sm text-gray-500">Évolution de la performance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          
          {/* Chart Section (Left) */}
          <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-white/5">
            <h3 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-widest">Tendance Mensuelle</h3>
            <div className="h-[300px] md:h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141419', borderColor: '#333', borderRadius: '8px', color: 'white' }}
                    itemStyle={{ fontWeight: 'bold' }}
                    formatter={(val: number) => formatValue(val)}
                  />
                  {/* Points réels */}
                  <Line type="monotone" dataKey="value" stroke="#ffffff" strokeWidth={2} dot={{ r: 4, fill: "#eab308", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  {/* Courbe de tendance Polynomiale */}
                  <Line type="monotone" dataKey="trend" stroke="#eab308" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Yearly Records (Right) */}
          <div className="w-full md:w-72 bg-[#141419] p-6 overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-widest flex items-center gap-2"><Trophy size={16}/> Records par Année</h3>
            <div className="flex flex-col gap-4">
              {bestByYear.map(([year, value], index) => (
                <div key={year} className={`p-4 rounded-xl border ${index === 0 ? 'bg-[#eab308]/10 border-[#eab308]/30' : 'bg-white/5 border-white/5'}`}>
                  <div className="text-sm font-bold text-gray-500 mb-1">{year}</div>
                  <div className={`text-2xl font-black ${index === 0 ? 'text-[#eab308]' : 'text-white'}`}>
                    {formatValue(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}