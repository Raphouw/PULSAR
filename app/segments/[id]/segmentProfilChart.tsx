// Fichier : app/segments/[id]/SegmentProfileChart.tsx
'use client';

import React, { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';

function getDist(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; const φ1 = lat1 * Math.PI / 180; const φ2 = lat2 * Math.PI / 180;
    const a = Math.sin(((lat2-lat1)*Math.PI/180)/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(((lon2-lon1)*Math.PI/180)/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

type ChartDataPoint = { index: number; km: number; ele: number; grade: number; lat: number; lon: number; };

export default function SegmentProfileChart({ 
    polyline, 
    onHover 
}: { 
    polyline: number[][], 
    onHover: (point: { lat: number, lon: number } | null) => void 
}) {
    
    const { data, yDomain } = useMemo(() => {
        if (!polyline || polyline.length < 2) return { data: [], yDomain: [0, 100] };

        const maxPoints = 400; 
        const step = Math.ceil(polyline.length / maxPoints);
        const res: ChartDataPoint[] = [];
        
        let distAcc = 0;
        let minEle = Infinity;
        let maxEle = -Infinity;

        for (let i = 0; i < polyline.length; i++) {
            const p = polyline[i];
            const ele = p[2];
            
            let localGrade = 0;
            if (i > 0) {
                const prev = polyline[i-1];
                const d = getDist(prev[0], prev[1], p[0], p[1]);
                distAcc += d;
                const eleDiff = ele - prev[2];
                if (d > 2) localGrade = (eleDiff / d) * 100;
            }

            if (ele < minEle) minEle = ele;
            if (ele > maxEle) maxEle = ele;

            if (i === 0 || i === polyline.length - 1 || i % step === 0) {
                res.push({
                    index: i,
                    km: Number((distAcc / 1000).toFixed(3)),
                    ele: Math.round(ele),
                    grade: Number(localGrade.toFixed(1)),
                    lat: p[0],
                    lon: p[1]
                });
            }
        }

        const heightDiff = maxEle - minEle;
        const paddingY = Math.max(10, heightDiff * 0.1);

        return { 
            data: res, 
            yDomain: [Math.floor(minEle - paddingY), Math.ceil(maxEle + paddingY)] 
        };
    }, [polyline]);

    if (data.length === 0) return null;

    return (
        <div style={{ width: '100%', height: '100%', userSelect: 'none' }} onMouseLeave={() => onHover(null)}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                    data={data} 
                    // 🔥 ZERO MARGES LATÉRALES
                    margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                    onMouseMove={(e: any) => {
                        if (e.activePayload && e.activePayload.length > 0) {
                            const pt = e.activePayload[0].payload;
                            onHover({ lat: pt.lat, lon: pt.lon });
                        }
                    }}
                >
                    <defs>
                        <linearGradient id="gradeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d04fd7" stopOpacity={0.6}/>
                            <stop offset="95%" stopColor="#d04fd7" stopOpacity={0.05}/>
                        </linearGradient>
                    </defs>

                    <YAxis domain={yDomain} hide />
                    
                    {/* 🔥 DOMAIN STRICT pour coller aux bords */}
                    <XAxis 
                        dataKey="km" 
                        type="number" 
                        domain={['dataMin', 'dataMax']} 
                        hide 
                    />
                    
                    <Area 
                        type="monotone" 
                        dataKey="ele" 
                        stroke="#d04fd7" 
                        strokeWidth={3} 
                        fill="url(#gradeGradient)" 
                        isAnimationActive={true}
                        animationDuration={800}
                    />
                    
                    <Tooltip 
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const pt = payload[0].payload;
                                const gradeColor = pt.grade > 10 ? '#ef4444' : pt.grade > 5 ? '#f59e0b' : '#10b981';
                                return (
                                    <div style={{ background: 'rgba(10,10,15,0.9)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '10px 16px', backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                                            DIST. {pt.km.toFixed(2)} KM
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{pt.ele}<small style={{fontSize:'0.5em', color:'#666'}}>m</small></span>
                                            <span style={{ fontSize: '1rem', fontWeight: 700, color: gradeColor }}>{pt.grade}%</span>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }} 
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}