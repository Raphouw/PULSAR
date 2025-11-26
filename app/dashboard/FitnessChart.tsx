// Fichier : app/dashboard/FitnessChart.tsx
'use client';

import React, { useState } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

type FitnessData = {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
};

export const FitnessChart = ({ data }: { data: FitnessData[] }) => {
  const [showInfo, setShowInfo] = useState(false);

  const displayData = data.slice(-90).map(d => ({
    ...d,
    dateShort: new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }));

  return (
    // 🔥 AJOUT de position: 'relative' ici pour que l'absolute se cale par rapport à ce bloc
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      <div style={{ 
        marginBottom: '1rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
      }}>
        <h3 style={{ color: 'var(--text)', margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
          Fitness & Freshness
        </h3>
        
        <button 
          onClick={() => setShowInfo(!showInfo)}
          style={{
            background: showInfo ? 'var(--accent)' : 'transparent',
            color: showInfo ? '#fff' : 'var(--text-secondary)',
            border: '1px solid var(--text-secondary)',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s',
            zIndex: 30 // Au dessus de tout
          }}
          title="Comprendre ce graphique"
        >
          ?
        </button>
      </div>

      {/* PANNEAU D'EXPLICATION (Mode Overlay / Par dessus) */}
      {showInfo && (
        <div style={{
          position: 'absolute', // 🔥 C'est ça qui le sort du flux
          top: '3rem', // Juste en dessous du titre
          left: 0,
          right: 0,
          zIndex: 20, // Pour passer au dessus du graph
          background: 'rgba(43, 43, 58, 0.95)', // Fond très opaque pour cacher le graph dessous
          backdropFilter: 'blur(4px)', // Petit effet de flou sympa
          borderRadius: '8px',
          padding: '1.5rem',
          fontSize: '0.85rem',
          color: 'var(--text)',
          border: '1px solid var(--accent)', // Bordure colorée pour bien le délimiter
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          animation: 'expandIn 0.2s ease-out'
        }}>
          <div style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }}></div>
            <div>
                <strong style={{ color: '#3b82f6', fontSize: '0.95rem' }}>Fitness (CTL) :</strong> 
                <div style={{ opacity: 0.8, marginTop: '2px' }}>Charge chronique (42j). C'est la taille de ton moteur. Plus c'est haut, plus tu es entraîné.</div>
            </div>
          </div>
          
          <div style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#d946ef', flexShrink: 0 }}></div>
            <div>
                <strong style={{ color: '#d946ef', fontSize: '0.95rem' }}>Fatigue (ATL) :</strong> 
                <div style={{ opacity: 0.8, marginTop: '2px' }}>Charge aiguë (7j). La fatigue immédiate. Elle grimpe en flèche après un gros effort.</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', flexShrink: 0 }}></div>
            <div>
                <strong style={{ color: '#10b981', fontSize: '0.95rem' }}>Forme (TSB) :</strong> 
                <div style={{ opacity: 0.8, marginTop: '2px' }}>L'équilibre (Fitness - Fatigue). C'est ta fraîcheur.</div>
            </div>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '6px' }}>
            <ul style={{ margin: 0, paddingLeft: '1rem', listStyle: 'none', fontSize: '0.8rem', opacity: 0.9, lineHeight: '1.6' }}>
              <li>🟢 <strong>Positif (&gt; 0) :</strong> Frais et dispo. Idéal pour performer le jour J.</li>
              <li>🔴 <strong>Négatif (-10 à -30) :</strong> Phase de travail productif (Tu construis du fitness).</li>
              <li>⚠️ <strong>Très négatif (&lt; -30) :</strong> Attention au surentraînement, il faut reposer.</li>
            </ul>
          </div>
        </div>
      )}

      {/* GRAPHIQUE */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={displayData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tsbGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <CartesianGrid stroke="var(--secondary)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="dateShort" tick={{ fontSize: 10 }} stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" stroke="var(--text-secondary)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />

            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--secondary)', borderRadius: '8px' }}
              labelStyle={{ color: 'var(--text-secondary)' }}
            />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />

            <Area 
              yAxisId="right"
              type="monotone" 
              dataKey="tsb" 
              name="Forme (TSB)" 
              fill="#10b981" 
              stroke="#10b981"
              fillOpacity={0.1}
              strokeWidth={1}
            />

            <Line yAxisId="left" type="monotone" dataKey="ctl" name="Fitness (CTL)" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="atl" name="Fatigue (ATL)" stroke="#d946ef" strokeWidth={2} dot={false} />

            <ReferenceLine y={0} yAxisId="right" stroke="var(--text-secondary)" strokeDasharray="3 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};