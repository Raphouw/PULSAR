// Fichier : app/routes/[id]/ClimbDetailModal.tsx
'use client';

import React, { useMemo } from 'react';
import {
    Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ComposedChart, Scatter, LabelList
} from 'recharts';
import { Climb } from './routeDisplay';
import { Modal } from '../../../components/ui/modal';
import { Activity, TrendingUp, Mountain, Layers, MoveRight, Zap } from 'lucide-react';

interface ClimbDetailModalProps {
    climb: Climb | null;
    onClose: () => void;
    streams: any;
}

// Couleurs style Climbfinder / CyclingCols
const GRADE_COLORS = {
    flat: '#22c55e',      // < 3% (Vert)
    easy: '#84cc16',      // 3-5% (Vert clair)
    moderate: '#eab308',  // 5-7% (Jaune)
    hard: '#f97316',      // 7-9% (Orange)
    veryHard: '#ef4444',  // 9-12% (Rouge)
    extreme: '#7f1d1d',   // > 12% (Bordeaux/Noir)
};

const getClimbColor = (grade: number) => {
    if (grade < 3) return GRADE_COLORS.flat;
    if (grade < 5) return GRADE_COLORS.easy;
    if (grade < 7) return GRADE_COLORS.moderate;
    if (grade < 9) return GRADE_COLORS.hard;
    if (grade < 12) return GRADE_COLORS.veryHard;
    return GRADE_COLORS.extreme;
};

const getScoreColor = (score: number) => {
    if (score > 5000) return '#ef4444'; 
    if (score > 2500) return '#F77F00'; 
    if (score > 1500) return '#d04fd7'; 
    if (score > 1000) return '#8B5CF6'; 
    if (score > 500) return '#3B82F6';  
    return '#10B981';                   
};

// Lissage léger (WindowSize = 4)
const smoothAltitudeData = (data: number[], windowSize: number = 4): number[] => {
    if (data.length === 0) return data;
    
    const smoothed: number[] = [];
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - Math.floor(windowSize / 2));
        const end = Math.min(data.length, i + windowSize + 1);
        const subset = data.slice(start, end);
        const sum = subset.reduce((a, b) => a + b, 0);
        smoothed.push(sum / subset.length);
    }
    return smoothed;
};


// --- COMPOSANT UI ---
const StatCard = ({ label, value, unit, icon: Icon, color }: any) => (
    <div style={styles.statCard}>
        <div style={{ ...styles.iconCircle, borderColor: `${color}40`, color: color, background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)` }}>
            <Icon size={20} />
        </div>
        <div style={styles.statContent}>
            <span style={styles.statLabel}>{label}</span>
            <span style={styles.statValue}>
                {value} <span style={styles.statUnit}>{unit}</span>
            </span>
        </div>
    </div>
);

export default function ClimbDetailModal({ climb, onClose, streams }: ClimbDetailModalProps) {
    const gradientId = useMemo(() => `cf-gradient-${climb?.id || Math.random()}`, [climb]);

    const { chartData, gradientStops, labelPoints, displayLabelPoints, maxAlt, minAlt, domainMin, totalDistKm, segmentSize } = useMemo(() => {
        const empty = { chartData: [], gradientStops: [], labelPoints: [], displayLabelPoints: [], maxAlt: 0, minAlt: 0, domainMin: 0, totalDistKm: 0, segmentSize: 100 };
        if (!climb || !streams || !streams.distance || streams.distance.length === 0) return empty;

        // 1. Délimitation
        const startIndex = climb.startIndex || 0;
        const endIndex = climb.endIndex || (streams.distance.length - 1);
        const startMeters = streams.distance[startIndex];
        const endMeters = streams.distance[endIndex];
        const totalLen = endMeters - startMeters;

        // 2. Définition de la taille du segment (Résolution)
        let SEGMENT_METERS = 100; 
        if (totalLen < 1000) SEGMENT_METERS = 50;
        else if (totalLen < 2000 ) SEGMENT_METERS = 100;
        else if (totalLen < 5000) SEGMENT_METERS = 250;
        else if (totalLen < 10000) SEGMENT_METERS = 500;
        else if (totalLen < 15000) SEGMENT_METERS = 750;
        else if (totalLen < 30000) SEGMENT_METERS = 1000;
        else if (totalLen < 60000) SEGMENT_METERS = 2000;

        else SEGMENT_METERS = 5000;

        const stops: React.ReactElement[] = [];
        const labelPoints: any[] = [];     
        const displayLabelPoints: any[] = []; 
        
        const rawAltitudeData = streams.altitude.slice(startIndex, endIndex + 1);
        const rawDistanceData = streams.distance.slice(startIndex, endIndex + 1);
        const smoothedAltitudeData = smoothAltitudeData(rawAltitudeData, 10);

        const fullProfileData: { dist: number; alt: number; originalDist: number }[] = []; 
        let absMinAlt = Infinity;
        let absMaxAlt = -Infinity;

        for (let i = 0; i <= (endIndex - startIndex); i++) {
            const d = rawDistanceData[i] - startMeters;
            const a = smoothedAltitudeData[i]; 
            if (a < absMinAlt) absMinAlt = a;
            if (a > absMaxAlt) absMaxAlt = a;
            fullProfileData.push({ dist: d / 1000, alt: a, originalDist: d });
        }

        const range = absMaxAlt - absMinAlt;
        const paddingBottom = range * 0.05;
        const domainMin = Math.floor(absMinAlt - paddingBottom); 

        for (let d = 0; d < totalLen; d += SEGMENT_METERS) {
            const segStart = d;
            const segEnd = Math.min(d + SEGMENT_METERS, totalLen);
            
            const findAltAtDist = (targetDist: number) => {
               const absoluteTarget = startMeters + targetDist;
               let idx = streams.distance.findIndex((x: number) => x >= absoluteTarget);
               if (idx === -1) idx = endIndex;
               if (idx < startIndex) idx = startIndex;
               return streams.altitude[idx]; 
            };

            const altStart = findAltAtDist(segStart);
            const altEnd = findAltAtDist(segEnd);
            
            const distDiff = segEnd - segStart;
            const altDiff = altEnd - altStart;
            const grade = distDiff > 0 ? (altDiff / distDiff) * 100 : 0;
            const color = getClimbColor(grade);

            const pctStart = (segStart / totalLen) * 100;
            const pctEnd = (segEnd / totalLen) * 100;

            stops.push(<stop key={`s-${d}`} offset={`${pctStart}%`} stopColor={color} stopOpacity={1} />);
            stops.push(<stop key={`e-${d}`} offset={`${pctEnd}%`} stopColor={color} stopOpacity={1} />);

            if (Math.abs(grade) >= 0.5) {
                const midDist = (segStart + segEnd) / 2;
                const midAlt = (altStart + altEnd) / 2; 

                labelPoints.push({
                    dist: midDist / 1000,
                    alt: midAlt + (absMaxAlt - absMinAlt) * 0.05,
                    label: `${grade.toFixed(0)}%`,
                });

                displayLabelPoints.push({
                    dist: midDist / 1000,
                    alt: domainMin,
                    label: `${grade.toFixed()}%`,
                });
            }
        }

        const paddingTop = range * 0.1;

        return {
            chartData: fullProfileData,
            gradientStops: stops,
            labelPoints: labelPoints, 
            displayLabelPoints: displayLabelPoints, 
            maxAlt: Math.ceil(absMaxAlt + paddingTop),
            minAlt: Math.floor(absMinAlt),
            domainMin: domainMin,
            totalDistKm: totalLen / 1000,
            segmentSize: SEGMENT_METERS
        };
    }, [climb, streams]);

    if (!climb) return null;

    const displayDistance = ((climb.endDist - climb.startDist) / 1000);
    const scoreValue = climb.score || 0;
    const scoreColor = getScoreColor(scoreValue);

    return (
        <Modal isOpen={!!climb} onClose={onClose} title={``}>
            <div style={styles.container}>
                
                <div style={styles.grid}>
                    <StatCard label="Distance" value={displayDistance.toFixed(2)} unit="km" icon={MoveRight} color="#ffffff" />
                    <StatCard label="Pente Moy." value={climb.avgGrade.toFixed(1)} unit="%" icon={TrendingUp} color={getClimbColor(climb.avgGrade)} />
                    <StatCard label="Dénivelé" value={Math.round(climb.elevationGain)} unit="m" icon={Mountain} color="#ef4444" />
                    <StatCard label="Sommet" value={Math.round(maxAlt)} unit="m" icon={Layers} color="#3b82f6" />
                    
                    {/* 🔥 NOUVEAU : INDEX PULSAR */}
                    <StatCard label="Index Pulsar" value={scoreValue} unit="pts" icon={Zap} color="#d04fd7" />
                </div>

                <div style={styles.chartPanel}>
                    <div style={styles.chartHeader}>
                        <Activity size={16} color="#d04fd7" />
                        <span style={styles.chartTitle}>SEGMENTATION PAR {segmentSize}M</span>
                    </div>
                    
                    <div style={styles.chartWrapper}>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                                            {gradientStops}
                                        </linearGradient>
                                    </defs>
                                    
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    
                                    <XAxis 
                                        dataKey="dist" 
                                        type="number"
                                        domain={[0, totalDistKm]}
                                        tick={{ fill: '#666', fontSize: 10 }} 
                                        tickFormatter={(val) => `${val.toFixed(1)}`}
                                        interval="preserveStartEnd"
                                        unit="km"
                                    />
                                    
                                    <YAxis 
                                        dataKey="alt" 
                                        domain={[domainMin, 'auto']} 
                                        tick={{ fill: '#666', fontSize: 10 }}
                                        width={45}
                                        unit="m"
                                    />
                                    

                                    <Area
                                        type="monotone" 
                                        dataKey="alt"
                                        stroke="rgba(255,255,255,0.9)"
                                        strokeWidth={2}
                                        fill={`url(#${gradientId})`}
                                        fillOpacity={1}
                                        baseValue="dataMin"
                                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 0 }}
                                        isAnimationActive={false}
                                    />

                                    {/* SCATTER 1: Calibration */}
                                    <Scatter 
                                        data={labelPoints} 
                                        line={false} 
                                        legendType="none"
                                        shape={() => <></>} 
                                    >
                                        <LabelList 
                                            dataKey="label" 
                                            style={{ fill: 'transparent' }} 
                                        />
                                    </Scatter>

                                    {/* SCATTER 2: Affichage */}
                                    <Scatter 
                                        data={displayLabelPoints} 
                                        line={false} 
                                        legendType="none"
                                        shape={() => <></>} 
                                    >
                                        <LabelList 
                                            dataKey="label" 
                                            position="top" 
                                            style={{ 
                                                fill: '#000000ff', 
                                                fontSize: '15px', 
                                                fontWeight: '900', 
                                                textShadow: '0px 0px 3px rgba(255,255,255,0.8)' 
                                            }} 
                                            offset={-15} 
                                        />
                                    </Scatter>

                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={styles.noData}>Données insuffisantes</div>
                        )}
                    </div>
                    
                    <div style={styles.legend}>
                        <div style={styles.legendItem}><span style={{...styles.dot, backgroundColor: GRADE_COLORS.flat}}/> &lt;3%</div>
                        <div style={styles.legendItem}><span style={{...styles.dot, backgroundColor: GRADE_COLORS.easy}}/> 3-5%</div>
                        <div style={styles.legendItem}><span style={{...styles.dot, backgroundColor: GRADE_COLORS.moderate}}/> 5-7%</div>
                        <div style={styles.legendItem}><span style={{...styles.dot, backgroundColor: GRADE_COLORS.hard}}/> 7-9%</div>
                        <div style={styles.legendItem}><span style={{...styles.dot, backgroundColor: GRADE_COLORS.veryHard}}/> 9-12%</div>
                        <div style={styles.legendItem}><span style={{...styles.dot, backgroundColor: GRADE_COLORS.extreme}}/> &gt;12%</div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// --- STYLES ---
const styles = {
    container: { display: 'flex', flexDirection: 'column' as const, gap: '1.5rem', color: '#f1f1f1' },
    // 🔥 AJUSTEMENT GRID POUR 5 ÉLÉMENTS (responsive auto-fit)
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' },
    statCard: { backgroundColor: 'rgba(30, 30, 46, 0.6)', borderRadius: '10px', border: '1px solid #2B2B3A', padding: '1rem', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', textAlign: 'center' as const, gap: '0.75rem' },
    iconCircle: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid' },
    statContent: { display: 'flex', flexDirection: 'column' as const },
    statLabel: { fontSize: '10px', color: '#A0A0A0', textTransform: 'uppercase' as const, fontWeight: '700' as const, letterSpacing: '0.05em' },
    statValue: { fontSize: '1.25rem', fontWeight: '800' as const, color: '#ffffff', fontFamily: 'monospace' },
    statUnit: { fontSize: '.75rem', color: '#A0A0A0', fontWeight: '600' as const },
    chartPanel: { width: '96%',  backgroundColor: 'rgba(30, 30, 46, 0.6)', borderRadius: '16px', padding: '1.5rem', border: '1px solid #27272a', position: 'relative' as const },
    chartHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' },
    chartTitle: { fontSize: '0.8rem', fontWeight: '700' as const, color: '#d04fd7', letterSpacing: '0.1em', textTransform: 'uppercase' as const },
    chartWrapper: { height: '400px', width: '100%' },
    tooltipContent: { backgroundColor: '#000', border: '1px solid #333', borderRadius: '6px', fontSize: '12px', padding: '8px 12px' },
    noData: { width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#555' },
    legend: { display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' as const },
    legendItem: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#888' },
    dot: { width: '8px', height: '8px', borderRadius: '2px'}
};


