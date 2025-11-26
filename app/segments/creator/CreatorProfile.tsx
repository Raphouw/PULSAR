// Fichier : app/segments/creator/CreatorProfile.tsx
'use client';

import React, { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip, ReferenceLine } from 'recharts';

// Helper distance
function getDist(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const a = Math.sin(((lat2-lat1)*Math.PI/180)/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(((lon2-lon1)*Math.PI/180)/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 1. TYPE INTERMÉDIAIRE (Calcul lourd)
type ProcessedPoint = {
    originalIndex: number;
    km: number;
    ele: number;
    grade: number;
};

// 2. TYPE FINAL (Affichage Graphique)
type ChartDataPoint = ProcessedPoint & {
    ghostEle: number;
    activeEle: number | null;
};

export default function CreatorProfile({ 
    fullTrace, startIdx, endIdx, onHover 
}: { 
    fullTrace: any[], startIdx: number, endIdx: number, onHover: (idx: number | null) => void 
}) {
    
    // --- 1. PRÉ-CALCUL LOURD (Memoized sur fullTrace uniquement) ---
    const baseData = useMemo(() => {
        if (!fullTrace || fullTrace.length < 2) return [];

        let distAcc = 0;
        const data: ProcessedPoint[] = [];
        
        // Downsampling initial si fichier énorme
        const step = fullTrace.length > 2000 ? Math.ceil(fullTrace.length / 2000) : 1;

        for (let i = 0; i < fullTrace.length; i++) {
            const p = fullTrace[i];
            
            if (i > 0) {
                distAcc += getDist(fullTrace[i-1].lat, fullTrace[i-1].lon, p.lat, p.lon);
            }

            if (i === 0 || i === fullTrace.length - 1 || i % step === 0) {
                let grade = 0;
                if (i > step) {
                    const prevP = fullTrace[i-step];
                    const distDiff = getDist(prevP.lat, prevP.lon, p.lat, p.lon);
                    if (distDiff > 5) grade = ((p.ele - prevP.ele) / distDiff) * 100;
                }
                
                data.push({
                    originalIndex: i,
                    km: distAcc / 1000,
                    ele: Math.round(p.ele),
                    grade: Number(grade.toFixed(1))
                });
            }
        }
        return data;
    }, [fullTrace]);

    // --- 2. CALCUL LÉGER (Memoized sur les sliders) ---
    const { chartData, yDomain, xDomain, startKm, endKm } = useMemo(() => {
        if (baseData.length === 0) return { chartData: [], yDomain: [0, 100], xDomain: [0, 1], startKm: 0, endKm: 0 };

        const maxVisualPoints = 300;
        const visualStep = Math.ceil(baseData.length / maxVisualPoints);

        let sKm = 0;
        let eKm = 0;
        let minEle = Infinity;
        let maxEle = -Infinity;
        
        // Trouver les KM des bornes
        const startPoint = baseData.find(p => p.originalIndex >= startIdx) || baseData[0];
        const endPoint = baseData.find(p => p.originalIndex >= endIdx) || baseData[baseData.length-1];
        sKm = startPoint.km;
        eKm = endPoint.km;

        // Calcul min/max local pour zoom Y
        const activeData = baseData.filter(p => p.originalIndex >= startIdx && p.originalIndex <= endIdx);
        if (activeData.length > 0) {
            minEle = Math.min(...activeData.map(p => p.ele));
            maxEle = Math.max(...activeData.map(p => p.ele));
        } else {
            minEle = Math.min(...baseData.map(p => p.ele));
            maxEle = Math.max(...baseData.map(p => p.ele));
        }
        
        // 🔥 FIX: Typage explicite du tableau final ici
        const finalData: ChartDataPoint[] = [];
        
        for (let i = 0; i < baseData.length; i++) {
            if (i === 0 || i === baseData.length - 1 || i % visualStep === 0 || baseData[i].originalIndex === startIdx || baseData[i].originalIndex === endIdx) {
                const p = baseData[i];
                const isActive = p.originalIndex >= startIdx && p.originalIndex <= endIdx;
                
                finalData.push({
                    ...p,
                    km: Number(p.km.toFixed(3)),
                    ghostEle: p.ele,
                    activeEle: isActive ? p.ele : null
                });
            }
        }

        // Marges Zoom
        const heightDiff = maxEle - minEle;
        const paddingY = Math.max(5, heightDiff * 0.2);
        
        const segmentLen = eKm - sKm;
        const paddingX = Math.max(0.2, segmentLen * 0.15);

        // Sécurité pour éviter crash si finalData est vide (rare)
        const maxKm = finalData.length > 0 ? finalData[finalData.length-1].km : 0;

        return {
            chartData: finalData,
            yDomain: [Math.floor(minEle - paddingY), Math.ceil(maxEle + paddingY)],
            xDomain: [Math.max(0, sKm - paddingX), Math.min(maxKm, eKm + paddingX)],
            startKm: sKm,
            endKm: eKm
        };

    }, [baseData, startIdx, endIdx]);

    if (chartData.length === 0) return null;

    return (
        <div style={{ width: '100%', height: '100%', userSelect: 'none' }} onMouseLeave={() => onHover(null)}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                    data={chartData} 
                    margin={{ top: 5, right: 0, left: -60, bottom: 0 }}
                    onMouseMove={(e: any) => {
                        if (e.activePayload && e.activePayload.length > 0) {
                            onHover(e.activePayload[0].payload.originalIndex);
                        }
                    }}
                >
                    <defs>
                        <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d04fd7" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#d04fd7" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="ghostGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#333" stopOpacity={0.5}/>
                            <stop offset="95%" stopColor="#333" stopOpacity={0.1}/>
                        </linearGradient>
                    </defs>

                    <YAxis domain={yDomain} hide />
                    <XAxis dataKey="km" type="number" domain={xDomain} hide allowDataOverflow={true} />
                    
                    <Area type="monotone" dataKey="ghostEle" stroke="#444" strokeWidth={1} fill="url(#ghostGradient)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="activeEle" stroke="#d04fd7" strokeWidth={2} fill="url(#activeGradient)" isAnimationActive={false} connectNulls={true} />
                    
                    <ReferenceLine x={startKm} stroke="#10b981" strokeDasharray="3 3" />
                    <ReferenceLine x={endKm} stroke="#ef4444" strokeDasharray="3 3" />
                    
                    <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const pt = payload[0].payload;
                            const gradeColor = pt.grade > 10 ? '#ef4444' : pt.grade > 5 ? '#f59e0b' : '#10b981';
                            return (
                                <div style={{ background: 'rgba(20,20,30,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', backdropFilter: 'blur(4px)' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#888' }}>KM {pt.km.toFixed(2)}</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{pt.ele} m</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: gradeColor }}></div>
                                        <span style={{ fontSize: '0.8rem', color: gradeColor, fontWeight: 600 }}>{pt.grade}%</span>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    }} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}