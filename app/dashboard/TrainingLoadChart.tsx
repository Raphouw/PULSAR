// Fichier : app/dashboard/TrainingLoadChart.tsx
'use client';

import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type DailyTSSItem = { date: string; tss: number; };

type TrainingLoadChartProps = {
    dailyTSS: DailyTSSItem[];
};

export const TrainingLoadChart: React.FC<TrainingLoadChartProps> = ({ dailyTSS }) => {
    const [showInfo, setShowInfo] = useState(false);

    const formattedData = dailyTSS.map(item => ({
        ...item,
        name: new Date(item.date).toLocaleDateString('fr-FR', { weekday: 'short' }),
    }));

    return (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            
            {/* EN-TÊTE */}
            <div style={{ 
                marginBottom: '1rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
            }}>
                <h3 style={{ color: 'var(--text)', margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                    Training Load - Semaine Glissante
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
                        zIndex: 30
                    }}
                    title="Comprendre le TSS"
                >
                    ?
                </button>
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
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }}></div>
                        <div>
                            <strong style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>TSS (Training Stress Score) :</strong> 
                            <div style={{ opacity: 0.8, marginTop: '2px' }}>
                                Mesure la charge physiologique d'une séance. Prend en compte la durée ET l'intensité (par rapport à ta FTP).
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '6px' }}>
                        <ul style={{ margin: 0, paddingLeft: '1rem', listStyle: 'none', fontSize: '0.8rem', opacity: 0.9, lineHeight: '1.6' }}>
                            <li>🧘 <strong>&lt; 50 TSS :</strong> Récupération / Séance facile.</li>
                            <li>🚴 <strong>50 - 150 TSS :</strong> Entraînement constructif standard.</li>
                            <li>🔥 <strong>&gt; 150 TSS :</strong> Séance très dure, nécessite repos (24-48h).</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* GRAPHIQUE */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorTSS" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.1}/>
                            </linearGradient>
                        </defs>

                        <CartesianGrid stroke="var(--secondary)" strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            stroke="var(--text-secondary)" 
                            tickLine={false} 
                            axisLine={false} 
                            style={{ fontSize: 12 }} 
                        />
                        <YAxis 
                            dataKey="tss" 
                            stroke="var(--text-secondary)" 
                            tickLine={false} 
                            axisLine={false} 
                            domain={[0, 'dataMax + 20']} 
                            style={{ fontSize: 12 }} 
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--secondary)', borderRadius: '5px' }}
                            labelFormatter={(label) => `Jour: ${label}`}
                            formatter={(value: number) => [`${value} TSS`, 'Load']}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="tss" 
                            stroke="var(--accent)" 
                            fill="url(#colorTSS)" 
                            strokeWidth={2} 
                            dot={{ r: 4, strokeWidth: 2, fill: 'var(--accent)' }} 
                            activeDot={{ r: 6 }} 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};