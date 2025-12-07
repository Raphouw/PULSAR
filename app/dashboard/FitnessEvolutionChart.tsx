// Fichier : components/charts/FitnessEvolutionChart.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart
} from 'recharts';

// Types basés sur ta BDD
export interface FitnessHistoryItem {
  id: number;
  date_calculated: string;
  ftp_value: number | null;
  w_prime_value: number | null;
  cp3_value: number | null;
  model_cp3: number | null;
  model_cp12: number | null; 
  vo2max_value: number | null;
}

const RANGES = [
  { label: '30J', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1AN', days: 365 },
  { label: 'ACTIF', days: -1 }, // 🔥 Nouveau mode "Smart Crop"
  { label: 'TOUT', days: 9999 }
];

// Configuration des métriques
const METRICS = [
  { id: 'ftp_value', label: 'FTP', color: '#d04fd7', axisId: 'watts', unit: 'W' },
  { id: 'model_cp3', label: 'CP3 (Modèle)', color: '#00f3ff', axisId: 'watts', unit: 'W' },
  { id: 'model_cp12', label: 'CP12 (Modèle)', color: '#0080ffff', axisId: 'watts', unit: 'W' },
  { id: 'w_prime_value', label: "W' (Réserve)", color: '#f59e0b', axisId: 'joules', unit: 'J' },
  { id: 'vo2max_value', label: 'VO2max', color: '#10b981', axisId: 'vo2', unit: 'ml/kg' },
];

// Taux de décroissance journalier (doit matcher le moteur)
const DAILY_DECAY = 0.006; 

export const FitnessEvolutionChart = ({ data }: { data: FitnessHistoryItem[] }) => {
  // On met "ACTIF" par défaut pour que ce soit beau direct !
  const [range, setRange] = useState(-1); 
  const [activeMetrics, setActiveMetrics] = useState<string[]>(['ftp_value', 'w_prime_value', 'vo2max_value']);

  // 1. Filtrage, Tri et "Healing"
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // A. Tri Chronologique
    const sorted = [...data].sort((a, b) => new Date(a.date_calculated).getTime() - new Date(b.date_calculated).getTime());
    
    // B. Data Healing (Réparation des NULLs historiques)
    const sanitizedData = sorted.map((item, index) => {
        const cleanItem = { ...item };
        METRICS.forEach(m => {
            const key = m.id as keyof FitnessHistoryItem;
            if (!cleanItem[key]) {
                let lookbackIndex = index - 1;
                while (lookbackIndex >= 0) {
                    const prevVal = sorted[lookbackIndex][key];
                    if (prevVal) {
                        // @ts-ignore
                        cleanItem[key] = prevVal; 
                        break;
                    }
                    lookbackIndex--;
                }
            }
        });
        return cleanItem;
    });

    // C. Préparation des bornes temporelles
    const now = new Date();
    now.setHours(0,0,0,0); 
    
    let cutoff = new Date(now);

    // 🔥 LOGIQUE DU FILTRE "ACTIF"
    if (range === -1) {
        // On cherche le premier point "significatif"
        // Critère : Avoir un CP3 > 10 watts (ce qui exclut les 0 ou nulls initiaux)
        const firstActivePoint = sanitizedData.find(d => (d.model_cp3 || 0) > 10);
        
        if (firstActivePoint) {
            cutoff = new Date(firstActivePoint.date_calculated);
            // On enlève 1 jour pour que le graph commence "proprement" sur la montée
            cutoff.setDate(cutoff.getDate() - 7);
        } else {
            // Fallback si tout est à 0 : on montre les 30 derniers jours
            cutoff.setDate(cutoff.getDate() - 30);
        }
    } else {
        // Mode classique (30J, 6M...)
        cutoff.setDate(cutoff.getDate() - range);
    }

    // On ne garde que les points sources dans la plage (+ tampon)
    const relevantData = sanitizedData.filter(d => new Date(d.date_calculated).getTime() >= cutoff.getTime() - (86400000 * 5));

    if (relevantData.length === 0) return [];

    // D. Génération jour par jour (Interpolation)
    const filledData: any[] = [];
    const startDate = new Date(relevantData[0].date_calculated);
    const endDate = now;

    let currentPointer = 0;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const time = d.getTime();
        
        while (currentPointer < relevantData.length - 1 && new Date(relevantData[currentPointer + 1].date_calculated).getTime() <= time) {
            currentPointer++;
        }

        const prevPoint = relevantData[currentPointer];
        const nextPoint = relevantData[currentPointer + 1];

        const dayItem: any = {
            timestamp: time,
            fullDate: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
            isProjected: false
        };

        // CAS 1: Jour avec donnée réelle
        if (new Date(prevPoint.date_calculated).toDateString() === d.toDateString()) {
            METRICS.forEach(m => dayItem[m.id] = prevPoint[m.id as keyof FitnessHistoryItem]);
        }
        // CAS 2: Interpolation
        else if (nextPoint) {
            const tStart = new Date(prevPoint.date_calculated).getTime();
            const tEnd = new Date(nextPoint.date_calculated).getTime();
            const progress = (time - tStart) / (tEnd - tStart);

            METRICS.forEach(m => {
                const valStart = (prevPoint[m.id as keyof FitnessHistoryItem] as number) || 0;
                const valEnd = (nextPoint[m.id as keyof FitnessHistoryItem] as number) || 0;
                
                if (valStart > 0 && valEnd > 0) {
                    dayItem[m.id] = Math.round(valStart + (valEnd - valStart) * progress);
                } else {
                    dayItem[m.id] = valStart || valEnd;
                }
            });
        }
        // CAS 3: Projection future
        else {
            dayItem.isProjected = true;
            const daysSinceLast = (time - new Date(prevPoint.date_calculated).getTime()) / (1000 * 3600 * 24);
            
            METRICS.forEach(m => {
                const lastVal = (prevPoint[m.id as keyof FitnessHistoryItem] as number) || 0;
                const decayAmount = lastVal * DAILY_DECAY * daysSinceLast;
                dayItem[m.id] = Math.round(Math.max(0, lastVal - decayAmount));
            });
        }
        
        // On ne push que si on est après le vrai cutoff visuel
        if (time >= cutoff.getTime()) {
            filledData.push(dayItem);
        }
    }

    return filledData;

  }, [data, range]);

  const toggleMetric = (id: string) => {
    if (activeMetrics.includes(id)) {
      setActiveMetrics(activeMetrics.filter(m => m !== id));
    } else {
      setActiveMetrics([...activeMetrics, id]);
    }
  };

  const dateFormatter = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dateLabel = new Date(label).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
      const isProjected = payload[0]?.payload?.isProjected;

      return (
        <div style={{
          background: 'rgba(14, 14, 20, 0.95)',
          border: isProjected ? '1px dashed var(--accent)' : '1px solid var(--secondary)',
          borderRadius: '8px',
          padding: '1rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          fontSize: '0.85rem',
          zIndex: 100,
          backdropFilter: 'blur(4px)'
        }}>
          <p style={{ margin: '0 0 0.8rem 0', color: 'var(--text)', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            {dateLabel} {isProjected && <span style={{color: 'var(--accent)', marginLeft:'10px'}}>(Estimé)</span>}
          </p>
          
          {payload.map((p: any) => {
            const metricConfig = METRICS.find(m => m.id === p.dataKey);
            if (!p.value) return null;

            return (
              <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{metricConfig?.label}</span>
                </div>
                <strong style={{ color: p.color, fontFamily: 'monospace', fontSize: '1.1rem' }}>
                  {p.value?.toLocaleString('fr-FR')} <span style={{fontSize:'0.7em', opacity: 0.8}}>{metricConfig?.unit}</span>
                </strong>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--secondary)', padding: '1.5rem' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🧬 Évolution Physiologique
        </h3>
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => setRange(r.days)}
              style={{
                background: range === r.days ? 'var(--primary)' : 'transparent',
                color: range === r.days ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: range === r.days ? '0 0 10px rgba(230, 57, 70, 0.4)' : 'none'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* METRICS TOGGLE */}
      <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {METRICS.map(m => (
          <button
            key={m.id}
            onClick={() => toggleMetric(m.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: activeMetrics.includes(m.id) ? `${m.color}15` : 'transparent',
              border: `1px solid ${activeMetrics.includes(m.id) ? m.color : 'var(--secondary)'}`,
              color: activeMetrics.includes(m.id) ? m.color : 'var(--text-secondary)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: activeMetrics.includes(m.id) ? 1 : 0.3,
              boxShadow: activeMetrics.includes(m.id) ? `0 0 8px ${m.color}20` : 'none'
            }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: m.color }} />
            {m.label}
          </button>
        ))}
      </div>

      {/* CHART */}
      <div style={{ width: '100%', height: '400px' }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            
            <XAxis 
              dataKey="timestamp" 
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']} 
              stroke="var(--text-secondary)" 
              tickFormatter={dateFormatter}
              tick={{ fontSize: 11, fill: '#888' }} 
              tickLine={false} 
              axisLine={false}
              minTickGap={40}
              dy={10}
            />
            
            <YAxis yAxisId="watts" orientation="left" stroke="#d04fd7" tick={{ fontSize: 11, fill: '#d04fd7', opacity: 0.8 }} tickLine={false} axisLine={false} unit=" W" domain={['dataMin - 20', 'dataMax + 20']} />
            <YAxis yAxisId="joules" orientation="right" stroke="#f59e0b" tick={{ fontSize: 11, fill: '#f59e0b', opacity: 0.8 }} tickLine={false} axisLine={false} domain={['dataMin - 1000', 'dataMax + 1000']} />
            <YAxis yAxisId="vo2" orientation="right" hide={true} domain={['dataMin - 5', 'dataMax + 5']} />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} />

            {METRICS.map(m => (
              activeMetrics.includes(m.id) && (
                <Line
                  key={m.id}
                  yAxisId={m.axisId}
                  type="monotoneX" 
                  dataKey={m.id}
                  stroke={m.color}
                  strokeWidth={2.5}
                  dot={false} 
                  activeDot={{ r: 6, strokeWidth: 0, fill: m.color }}
                  animationDuration={500}
                  connectNulls={true} 
                />
              )
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};