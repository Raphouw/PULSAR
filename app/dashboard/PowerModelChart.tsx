// Fichier : app/dashboard/PowerModelChart.tsx
'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type ModelData = {
  duration: string;
  seconds: number;
  real: number | null;
  model: number;
};

export const PowerModelChart = ({ 
  data, 
  metrics 
}: { 
  data: ModelData[], 
  metrics: { CP: number, WPrime: number } 
}) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* EN-TÊTE GLOBAL */}
      <div style={{ 
        marginBottom: '1.5rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        
        {/* GAUCHE : Titre */}
        <h3 style={{ color: 'var(--text)', margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
          Modèle de Puissance
        </h3>

        {/* DROITE : Groupe Métriques + Bouton */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            
            {/* 1. La Box des Métriques */}
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              background: 'var(--secondary)',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              alignItems: 'center'
            }}>
              {/* CP */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>CP (Aérobie)</span>
                <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.1rem' }}>
                  {metrics.CP.toFixed(0)} <span style={{ fontSize: '0.8rem' }}>W</span>
                </span>
              </div>

              {/* Séparateur */}
              <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }}></div>

              {/* W' */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>W' (Réserve)</span>
                <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '1.1rem' }}>
                  {(metrics.WPrime / 1000).toFixed(1)} <span style={{ fontSize: '0.8rem' }}>kJ</span>
                </span>
              </div>
            </div>

            {/* 2. Le Bouton Info */}
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
                }}
                title="Comprendre le modèle"
            >
                ?
            </button>
        </div>
      </div>

      {/* PANNEAU D'INFO */}
    {showInfo && (
        <div style={{
            position: 'absolute',
            top: '3rem',
            left: 0,
            right: 0,
            zIndex: 20,
            background: 'rgba(43, 43, 58, 0.95)',
            backdropFilter: 'blur(4px)',
            borderRadius: '8px',
            padding: '1.5rem',
            fontSize: '0.85rem',
            color: 'var(--text)',
            border: '1px solid var(--accent)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            animation: 'expandIn 0.2s ease-out'
        }}>
            <div style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#d04fd7', flexShrink: 0 }}></div>
                <div>
                    <strong style={{ color: '#d04fd7', fontSize: '0.95rem' }}>Modèle Prédictif (Monod & Scherrer) :</strong> 
                    <div style={{ opacity: 0.8, marginTop: '2px' }}>
                        Utilise tes records de 3 min et 12 min pour prédire ta puissance sur n'importe quelle durée.
                    </div>
                </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '6px' }}>
                <ul style={{ margin: 0, paddingLeft: '1rem', listStyle: 'none', fontSize: '0.8rem', opacity: 0.9, lineHeight: '1.6' }}>
                    <li>💜 <strong>CP (Critical Power) :</strong> Ta "ligne rouge". La puissance théorique que tu peux tenir ~45-60min sans t'épuiser.</li>
                    <li>🧡 <strong>W' (Réserve Anaérobie) :</strong> Ta batterie. Une quantité d'énergie finie (en kJ) que tu grilles dès que tu dépasses ton CP.</li>
                </ul>
            </div>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--secondary)" strokeDasharray="3 3" vertical={false} />
            
            <XAxis 
              dataKey="duration" 
              tick={{ fontSize: 10 }} 
              stroke="var(--text-secondary)" 
              tickLine={false} 
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            
            <YAxis 
              tick={{ fontSize: 11 }} 
              stroke="var(--text-secondary)" 
              tickLine={false} 
              axisLine={false} 
              domain={[0, 'auto']} 
            />
            
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--secondary)', borderRadius: '8px' }}
              formatter={(val: number) => [`${val.toFixed(0)} W`, 'Estimé']}
              labelStyle={{ color: 'var(--text-secondary)' }}
            />
            
            <Line 
              type="monotone" 
              dataKey="model" 
              name="Modèle (W')" 
              stroke="#d04fd7" 
              strokeWidth={3} 
              dot={false} 
              activeDot={{ r: 6 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};