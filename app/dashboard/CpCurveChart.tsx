// Fichier : app/dashboard/CpCurveChart.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type CpCurveData = { [key: string]: number };

export type CpCurveChartProps = {
    cpCurve: CpCurveData;
};

export const formatDurationTicks = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${seconds / 60}m`;
    return `${seconds / 3600}h`;
};

const CP_DURATIONS = [
    { key: 'P1s', seconds: 1, label: '1s' },
    { key: 'P5s', seconds: 5, label: '5s' },
    { key: 'P30s', seconds: 30, label: '30s' },
    { key: 'P1m', seconds: 60, label: '1m' },
    { key: 'CP3', seconds: 180, label: '3m' },
    { key: 'CP5', seconds: 300, label: '5m' },
    { key: 'CP10', seconds: 600, label: '10m' },
    { key: 'CP12', seconds: 720, label: '12m' },
    { key: 'CP20', seconds: 1200, label: '20m' },
    { key: 'CP60', seconds: 3600, label: '1h' },
];

const PSEUDO_LOG_EXP = 0.2;
const pseudoLog = (x: number) => Math.pow(x, PSEUDO_LOG_EXP);
const inversePseudoLog = (y: number) => Math.pow(y, 1 / PSEUDO_LOG_EXP);

export const CpCurveChart: React.FC<CpCurveChartProps> = ({ cpCurve }) => {
    const [showInfo, setShowInfo] = useState(false);

    const chartData = useMemo(() => {
        return CP_DURATIONS
            .map(dur => ({
                duration_s: pseudoLog(dur.seconds),
                realDuration: dur.seconds,
                power: Math.round(cpCurve[dur.key] || 0),
                label: dur.label, 
            }))
            .filter(item => item.power > 0);
    }, [cpCurve]);

    const logTicks = useMemo(() => CP_DURATIONS.map(d => pseudoLog(d.seconds)), []);

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
                    Courbe de Puissance (90 Jours)
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
                    title="Comprendre la courbe"
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
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }}></div>
                        <div>
                            <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>Profil de Puissance Record :</strong> 
                            <div style={{ opacity: 0.8, marginTop: '2px' }}>
                                Montre la puissance maximale que tu as tenue pour chaque durée sur les 90 derniers jours.
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '6px' }}>
                        <ul style={{ margin: 0, paddingLeft: '1rem', listStyle: 'none', fontSize: '0.8rem', opacity: 0.9, lineHeight: '1.6' }}>
                            <li>⚡ <strong>Gauche (Court) :</strong> Sprint & Explosivité (Neuromusculaire).</li>
                            <li>🔥 <strong>Milieu (1m-5m) :</strong> Capacité Anaérobie (W').</li>
                            <li>❤️ <strong>Droite (&gt; 20m) :</strong> Endurance & FTP (Aérobie).</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* GRAPHIQUE */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="var(--secondary)" strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                            dataKey="duration_s" 
                            type="number" 
                            scale="linear"
                            domain={[pseudoLog(1), pseudoLog(4000)]}
                            ticks={logTicks}
                            stroke="var(--text-secondary)" 
                            style={{ fontSize: 12 }}
                            tickFormatter={(val) => {
                                const real = inversePseudoLog(val as number);
                                return formatDurationTicks(Math.round(real));
                            }}
                            tickLine={false} 
                            axisLine={false}
                        />
                        <YAxis 
                            dataKey="power" 
                            stroke="var(--text-secondary)" 
                            style={{ fontSize: 12 }} 
                            domain={[0, 'dataMax']}
                            tickFormatter={(value) => `${value} W`}
                            tickLine={false} 
                            axisLine={false}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--secondary)', borderRadius: '5px' }}
                            labelFormatter={(val) => {
                                const real = inversePseudoLog(val as number);
                                return `Durée: ${formatDurationTicks(Math.round(real))}`;
                            }}
                            formatter={(value: number) => [`${value} W`, 'Puissance']}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="power" 
                            stroke="var(--primary)" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2, stroke: 'var(--secondary)' }} 
                            activeDot={{ r: 6 }} 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};