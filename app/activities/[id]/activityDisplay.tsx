// Fichier : app/activities/[id]/activityDisplay.tsx
'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { 
  Activity as ActivityIcon, Calendar, Clock, MapPin, Zap, Heart, Gauge, 
  TrendingUp, Mountain, ArrowLeft, Share2, Layers, HelpCircle, Repeat,
  Thermometer
} from 'lucide-react';
import { 
  ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

import ClimbProfileChart from './climbProfileChart';
import { Activity } from './page'; 
import { ActivityStreams } from '../../../types/next-auth.d';
import {
  findMaxValue,
  detectClimbs,
  type DetectedClimb,
  calculateElevationGainLoss,
  calculateStreamAverages,
  calculateWork,
  calculateCardiacDrift,
  calculateMedian,
  calculateTerrainStats,
  findBestInterval,
} from '../../../lib/physics';

// --- UTILITAIRE DE SÉCURITÉ (CRITIQUE) ---
// Transforme n'importe quoi en tableau valide pour éviter le crash .filter is not a function
const safeArray = <T,>(input: any): T[] => {
  if (Array.isArray(input)) return input;
  if (!input) return [];
  // Si c'est un objet qui ressemble à un tableau (ex: {0: val, 1: val}), on tente de le convertir
  if (typeof input === 'object') return Object.values(input);
  return [];
};

// --- STYLES GLOBAUX ---
const loadingContainerStyle: React.CSSProperties = {
  height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
  background: '#141419', color: '#666', fontSize: '0.8rem', fontFamily: 'monospace', borderRadius: '12px'
};

// --- IMPORTS DYNAMIQUES ---
const ActivityMap = dynamic(() => import('./activityMap'), {
  ssr: false,
  loading: () => <div style={{...loadingContainerStyle, height: '500px'}}>Chargement Satellite...</div>,
});

const MiniMap = dynamic(() => import('../../../components/ui/miniMap'), {
  ssr: false,
  loading: () => <div style={{...loadingContainerStyle, height: '250px'}}>Chargement...</div>,
});

// --- HELPERS ---
const extractClimbStreams = (climb: DetectedClimb, streams: ActivityStreams): ActivityStreams => {
    const { startIndex, endIndex } = climb;
    
    // 🔥 CORRECTION TYPE : On précise <T | null>
    const sliceStream = <T,>(stream: any): (T | null)[] => {
        return safeArray<T | null>(stream).slice(startIndex, endIndex + 1);
    };
    
    return {
        time: sliceStream(streams.time),
        distance: sliceStream(streams.distance),
        altitude: sliceStream(streams.altitude),
        watts: sliceStream(streams.watts),
        heartrate: sliceStream(streams.heartrate),
        cadence: sliceStream(streams.cadence),
        latlng: sliceStream(streams.latlng),
    };
};

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}`;
};

const formatDuration = (seconds: number) => {
    if (seconds < 3600) {
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return formatTime(seconds);
}

const formatDate = (isoString: string) => {
    try {
        return new Date(isoString).toLocaleDateString('fr-FR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }).toUpperCase();
    } catch (e) {
        return isoString;
    }
};

const formatNumber = (num: number | null | undefined, unit: string, decimals: number = 0) => 
    (num !== null && num !== undefined && !isNaN(num)) ? `${num.toFixed(decimals)}${unit}` : '-';

// --- GÉNÉRATEUR DYNAMIQUE D'INTERVALLES ---
const generatePowerIntervals = (durationSeconds: number) => {
    const intervals = [
        { label: '3s', sec: 3 }, { label: '5s', sec: 5 }, { label: '30s', sec: 30 },
        { label: '1m', sec: 60 }, { label: '3m', sec: 180 }, { label: '5m', sec: 300 },
        { label: '10m', sec: 600 }, { label: '15m', sec: 900 }, { label: '20m', sec: 1200 },
        { label: '30m', sec: 1800 }, { label: '45m', sec: 2700 },
        { label: '1h', sec: 3600 }
    ];
    
    const extraHours: { label: string; sec: number }[] = [];
    const maxHour = Math.floor(durationSeconds / 3600);
    for (let h = 2; h <= maxHour; h++) {
        if (h <= 10 || h % 5 === 0) {
             extraHours.push({ label: `${h}h`, sec: h * 3600 });
        }
    }

    return [...intervals, ...extraHours];
};

// --- COMPOSANTS UI ---
const PulsarTooltip = ({ text }: { text: string }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div 
            onMouseEnter={() => setVisible(true)} 
            onMouseLeave={() => setVisible(false)}
            style={{ position: 'relative', display: 'inline-block', cursor: 'help', marginLeft: '5px', opacity: 1 }}
        >
            <HelpCircle size={14} color="#666" />
            {visible && (
                <div style={{
                    position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
                    padding: '8px 12px', width: 'max-content', maxWidth: '250px',
                    background: '#0E0E14', border: '1px solid #d04fd7', borderRadius: '8px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.8)', zIndex: 100,
                    fontSize: '0.75rem', color: '#e0e0e0', textAlign: 'center', lineHeight: '1.4',
                    pointerEvents: 'none', backdropFilter: 'blur(4px)'
                }}>
                    {text}
                    <div style={{
                        position: 'absolute', top: '100%', left: '50%', marginLeft: '-5px',
                        borderWidth: '5px', borderStyle: 'solid', borderColor: '#d04fd7 transparent transparent transparent'
                    }} />
                </div>
            )}
        </div>
    );
};

const HeroStatBox = ({ label, value, unit, icon: Icon, color, tooltipText, subValue, extraLabel }: any) => (
    <div style={{
        background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.8) 0%, rgba(20, 20, 25, 0.9) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.5rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative',
        boxShadow: `0 10px 30px -10px ${color}20`
    }}>
        <div style={{marginBottom: '8px', background: `${color}15`, padding: '10px', borderRadius: '50%', border: `1px solid ${color}30`}}>
            <Icon size={24} color={color} />
        </div>
        <div style={{fontSize: '2.2rem', fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: '4px', fontFamily: '"Inter", sans-serif'}}>
            {value}<span style={{fontSize: '0.5em', color: '#888', marginLeft: '4px', fontWeight: 600}}>{unit}</span>
        </div>
        <div style={{fontSize: '0.7rem', fontWeight: 700, color: '#888', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center'}}>
            {label}
            {tooltipText && <PulsarTooltip text={tooltipText} />}
        </div>
        {subValue && (
            <div style={{marginTop:'8px', paddingTop:'8px', borderTop:'1px solid rgba(255,255,255,0.1)', width:'100%', textAlign:'center'}}>
                 <span style={{fontSize:'0.75rem', color: color, fontWeight: 700}}>{subValue} </span>
                 <span style={{fontSize:'0.65rem', color:'#666'}}>{extraLabel}</span>
            </div>
        )}
    </div>
);

const DetailRow = ({ label, value, color = "#fff", subValue }: any) => (
    <div style={{display: 'flex', alignItems: 'baseline', padding: '4px 0'}}>
        <span style={{fontSize: '0.75rem', color: '#888', fontWeight: 500, whiteSpace:'nowrap'}}>{label}</span>
        <div style={{flex: 1, borderBottom: '1px dotted rgba(255,255,255,0.08)', margin: '0 6px', position:'relative', top:'-4px'}}></div>
        <div style={{textAlign: 'right'}}>
            <span style={{fontSize: '0.9rem', color: color, fontWeight: 700, fontFamily: 'monospace'}}>{value}</span>
            {subValue && <span style={{fontSize: '0.65rem', color: '#666', display: 'block', lineHeight: 1}}>{subValue}</span>}
        </div>
    </div>
);

const RatioBar = ({ labelLeft, labelRight, valueLeft, color }: any) => (
    <div style={{marginTop: '8px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#888', marginBottom: '3px'}}>
            <span>{labelLeft} <strong style={{color:'#fff'}}>{(valueLeft || 0).toFixed(0)}%</strong></span>
            <span>{labelRight} <strong style={{color:'#fff'}}>{(100 - (valueLeft || 0)).toFixed(0)}%</strong></span>
        </div>
        <div style={{height: '4px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden'}}>
            <div style={{height: '100%', width: `${valueLeft || 0}%`, background: color, borderRadius: '2px'}} />
        </div>
    </div>
);

const SimpleTabs = ({ activeTab, onChange, tabs }: { activeTab: string, onChange: (id: string) => void, tabs: {id: string, label: string}[] }) => (
    <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem' }}>
        {tabs.map(tab => (
            <button key={tab.id} onClick={() => onChange(tab.id)} style={{ 
                padding: '12px 0', background: 'transparent', border: 'none', 
                borderBottom: activeTab === tab.id ? '3px solid #d04fd7' : '3px solid transparent', 
                color: activeTab === tab.id ? '#fff' : '#666', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', fontFamily: '"Inter", sans-serif'
            }}>
                {tab.label}
            </button>
        ))}
    </div>
);

const RecordFlipCard = ({ record, forceFlipState }: { record: any, forceFlipState: boolean }) => {
    const [flipped, setFlipped] = useState(false);

    useEffect(() => {
        setFlipped(forceFlipState);
    }, [forceFlipState]);

    // Filtre Stricte NP : Uniquement si durée > 30 minutes (1800s)
    const showNP = record.npVal && record.seconds > 1800;

    return (
        <div onClick={() => setFlipped(!flipped)} style={{ perspective: '1000px', width: '130px', height: '110px', cursor: 'pointer' }}>
            <div style={{ position: 'relative', width: '100%', height: '100%', textAlign: 'center', transition: 'transform 0.6s', transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                
                {/* FACE AVANT : PUISSANCE */}
                <div style={{ 
                    position: 'absolute', inset: 0, backfaceVisibility: 'hidden', 
                    background: 'linear-gradient(135deg, rgba(25,25,30,0.95) 0%, rgba(35,20,40,0.9) 100%)', 
                    border: '1px solid #d04fd7', 
                    borderRadius: '12px', 
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '8px 4px',
                    boxShadow: '0 0 15px rgba(208, 79, 215, 0.15)'
                }}>
                    <div style={{fontSize:'0.7rem', color:'#aaa', fontWeight: 700, lineHeight: 1}}>{record.label}</div>
                    <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                        <div style={{fontSize:'1.5rem', fontWeight:900, color: '#fff', lineHeight: 0.9, textShadow: '0 0 10px rgba(255,255,255,0.3)'}}>
                            {record.watts} <small style={{fontSize:'0.4em', color:'#d04fd7', fontWeight: 600}}>W</small>
                        </div>
                        <div style={{fontSize:'0.7rem', fontWeight:600, color: '#d04fd7', marginTop: '2px'}}>
                            {record.wkg} <small style={{color:'#aaa', fontSize:'0.8em'}}>W/kg</small>
                        </div>
                    </div>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        padding: '0 4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px',
                        height: '18px'
                    }}>
                        <div style={{textAlign:'left', minWidth: '30px'}}>
                            {showNP ? (
                                <div style={{fontSize:'0.6rem', color: '#f0abfc', fontWeight: 700}}>
                                    NP <span style={{color: '#fff'}}>{record.npVal}</span>
                                </div>
                            ) : <span />}
                        </div>
                        <div style={{textAlign:'right'}}>
                             <div style={{fontSize:'0.6rem', color: '#666', fontWeight: 600}}>
                                <span style={{color: '#ccc'}}>{record.powerKm}</span> km
                            </div>
                        </div>
                    </div>
                </div>

                {/* FACE ARRIÈRE : CARDIO */}
                <div style={{ 
                    position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', 
                    background: 'linear-gradient(135deg, rgba(20,5,5,0.95) 0%, rgba(40,5,10,0.95) 100%)', 
                    border: '1px solid #ff003c', 
                    borderRadius: '12px', 
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '8px 4px',
                    boxShadow: '0 0 15px rgba(255, 0, 60, 0.2)'
                }}>
                     <div style={{fontSize:'0.65rem', color:'#ff003c', fontWeight: 700, letterSpacing: '1px'}}>MAX @ {record.label}</div>
                    <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                        <div style={{fontSize:'1.4rem', fontWeight:800, color: '#fff', lineHeight: 1, textShadow: '0 0 10px rgba(255,0,60,0.3)'}}>
                            {record.hrAvgRecord} <small style={{fontSize:'0.5em', color:'#aaa'}}>bpm</small>
                        </div>
                    </div>
                    <div style={{
                        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', 
                        padding: '0 4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px',
                        height: '18px'
                    }}>
                         <div style={{fontSize:'0.6rem', color: '#666', fontWeight: 600}}>
                            Départ <span style={{color: '#ccc'}}>{record.hrKm}</span> km
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const METRICS_CONFIG = {
    watts: { id: 'watts', label: 'Puissance', color: '#d04fd7', unit: 'W', icon: Zap, axisId: 'wattsAxis' },
    speed: { id: 'speed', label: 'Vitesse', color: '#00f3ff', unit: 'km/h', icon: ActivityIcon, axisId: 'speedAxis' },
    hr: { id: 'hr', label: 'Cardio', color: '#ef4444', unit: 'bpm', icon: Heart, axisId: 'hrAxis' },
    cadence: { id: 'cadence', label: 'Cadence', color: '#10b981', unit: 'rpm', icon: Repeat, axisId: 'cadAxis' },
    temp: { id: 'temp', label: 'Temp.', color: '#f97316', unit: '°C', icon: Thermometer, axisId: 'tempAxis' },
    altitude: { id: 'altitude', label: 'Altitude', color: '#f59e0b', unit: 'm', icon: Mountain, axisId: 'altAxis' },
};

// --- COMPOSANT GRAPHIQUE INTERACTIF ULTIME ---
const InteractiveAnalysisChart = ({ streams }: { streams: ActivityStreams }) => {
    const [activeMetrics, setActiveMetrics] = useState<Record<string, boolean>>({
        altitude: true, watts: true, hr: true, speed: false, cadence: false, temp: false
    });
    const [xAxisMode, setXAxisMode] = useState<'distance' | 'time'>('distance');

    // Fonction de calcul de vitesse sécurisée
    const calculateSpeedFromDistTime = useCallback((s: any, i: number, prevI: number) => {
        // 🔥 CORRECTION TYPE : On force le type <number> pour que TypeScript accepte les maths
        const distArr = safeArray<number>(s.distance);
        const timeArr = safeArray<number>(s.time);
        
        if (prevI < 0 || !distArr[i] || !timeArr[i]) return 0;
        
        const d = Number(distArr[i] ?? 0) - Number(distArr[prevI] ?? 0);
        const t = Number(timeArr[i] ?? 0) - Number(timeArr[prevI] ?? 0);
        
        if (t <= 0) return 0;
        const v = (d / t) * 3.6;
        return v > 120 ? 0 : parseFloat(v.toFixed(1));
    }, []);

    const streamData = useMemo(() => {
        const timeStream = safeArray(streams?.time);
        if (timeStream.length === 0) return [];

        const len = timeStream.length;
        const step = len > 3000 ? Math.ceil(len / 2000) : 1; // Subsampling
        const data: any[] = [];
        
        // Sécurisation des autres streams avec typage explicite <number>
        const distStream = safeArray<number>(streams.distance);
        const wattsStream = safeArray<number>(streams.watts);
        const hrStream = safeArray<number>(streams.heartrate);
        const cadenceStream = safeArray<number>(streams.cadence);
        const altStream = safeArray<number>(streams.altitude);
        const tempStream = safeArray<number>((streams as any).temp);
        
        for (let i = 0; i < len; i += step) {
            const speedKmh = streams.latlng ? calculateSpeedFromDistTime(streams, i, i-step) : 0;
            
            data.push({
                index: i,
                dist: distStream[i] ? parseFloat(((distStream[i] || 0) / 1000).toFixed(2)) : 0,
                time: timeStream[i] || 0,
                watts: wattsStream[i] ?? null,
                hr: hrStream[i] ?? null,
                cadence: cadenceStream[i] ?? null,
                altitude: altStream[i] ?? null,
                temp: tempStream[i] ?? null,
                speed: speedKmh
            });
        }
        return data;
    }, [streams, calculateSpeedFromDistTime]);

    const toggleMetric = (key: string) => setActiveMetrics(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
            <div style={{ 
                display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', 
                background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem' }}>
                    <button onClick={() => setXAxisMode('distance')} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: xAxisMode === 'distance' ? '#fff' : 'transparent', color: xAxisMode === 'distance' ? '#000' : '#888', border: xAxisMode === 'distance' ? 'none' : '1px solid rgba(255,255,255,0.2)' }} > DISTANCE </button>
                    <button onClick={() => setXAxisMode('time')} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: xAxisMode === 'time' ? '#fff' : 'transparent', color: xAxisMode === 'time' ? '#000' : '#888', border: xAxisMode === 'time' ? 'none' : '1px solid rgba(255,255,255,0.2)' }} > TEMPS </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {Object.entries(METRICS_CONFIG).map(([key, conf]) => {
                        // Vérification sécurisée de l'existence des données
                        const streamKey = key === 'hr' ? 'heartrate' : key;
                        const hasData = key === 'speed' ? true : safeArray((streams as any)[streamKey]).length > 0;
                        
                        if (!hasData) return null;

                        const isActive = activeMetrics[key];
                        return (
                            <button key={key} onClick={() => toggleMetric(key)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: isActive ? `${conf.color}20` : 'transparent', color: isActive ? conf.color : '#666', border: `1px solid ${isActive ? conf.color : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.2s' }} >
                                <conf.icon size={14} /> {conf.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div style={{ flex: 1, minHeight: '400px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={streamData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                        
                        <XAxis dataKey={xAxisMode === 'distance' ? 'dist' : 'time'} stroke="#666" fontSize={10} minTickGap={50} tickFormatter={(val) => xAxisMode === 'distance' ? `${val} km` : formatDuration(val)} />

                        <YAxis yAxisId="altAxis" orientation="left" stroke="#f59e0b" fontSize={10} hide={!activeMetrics.altitude} domain={['auto', 'auto']} />
                        {activeMetrics.watts && <YAxis yAxisId="wattsAxis" orientation="right" domain={[0, 'auto']} hide />}
                        {activeMetrics.hr && <YAxis yAxisId="hrAxis" orientation="right" domain={['auto', 'auto']} hide />}
                        {activeMetrics.speed && <YAxis yAxisId="speedAxis" orientation="right" domain={[0, 'auto']} hide />}
                        {activeMetrics.cadence && <YAxis yAxisId="cadAxis" orientation="right" domain={[0, 'auto']} hide />}
                        {activeMetrics.temp && <YAxis yAxisId="tempAxis" orientation="right" domain={['auto', 'auto']} hide />}

                        <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(10,10,15,0.95)', border: '1px solid #333', borderRadius: '8px', fontSize: '0.8rem' }}
                            labelStyle={{ color: '#aaa', marginBottom: '0.5rem', display: 'block' }}
                            labelFormatter={(val) => xAxisMode === 'distance' ? `${val} km` : formatDuration(val as number)}
                            formatter={(value: number, name: string) => {
                                const metricKey = Object.keys(METRICS_CONFIG).find(k => (METRICS_CONFIG as any)[k].label === name);
                                const conf = metricKey ? (METRICS_CONFIG as any)[metricKey] : null;
                                return [<span key={name} style={{ color: conf?.color || '#fff', fontWeight: 700 }}>{Math.round(value)} {conf?.unit}</span>, name];
                            }}
                        />

                        {activeMetrics.altitude && (
                            <Area type="monotone" dataKey="altitude" yAxisId="altAxis" name="Altitude" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={1} />
                        )}

                        {Object.keys(METRICS_CONFIG).filter(k => k !== 'altitude').map(key => {
                            if (!activeMetrics[key]) return null;
                            const conf = (METRICS_CONFIG as any)[key];
                            return <Line key={key} type="monotone" dataKey={key} yAxisId={conf.axisId} name={conf.label} stroke={conf.color} strokeWidth={1.5} dot={false} strokeDasharray={key === 'temp' ? '5 5' : ''} />;
                        })}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const EvolutionAverageChart = ({ streams }: { streams: ActivityStreams }) => {
    
    const calculateCumulativeAverage = (data: any[]) => {
        const safeData = safeArray<number>(data);
        if (safeData.length === 0) return [];
        
        const averages: number[] = [];
        let cumulativeSum = 0;
        
        for (let i = 0; i < safeData.length; i++) {
            const value = Number(safeData[i] ?? 0);
            cumulativeSum += value;
            averages.push(cumulativeSum / (i + 1));
        }
        return averages;
    };
    
    const START_DISCARD_POINTS = 100; 

    const cumulativeData = useMemo(() => {
        const timeStream = safeArray(streams?.time);
        if (timeStream.length === 0) return [];
        
        const len = timeStream.length;
        const step = len > 3000 ? Math.ceil(len / 2000) : 1; 

        // Initialisation et Subsampling
        const sampledWatts: number[] = [];
        const sampledHr: number[] = [];
        const sampledCadence: number[] = [];
        const sampledAltitudeRaw: number[] = [];
        const sampledDist: number[] = [];
        const sampledSpeed: number[] = []; 
        
        // 🔥 CORRECTION TYPE : Typage strict <number> pour permettre les maths
        const wattsStream = safeArray<number>(streams.watts);
        const hrStream = safeArray<number>(streams.heartrate);
        const cadenceStream = safeArray<number>(streams.cadence);
        const altStream = safeArray<number>(streams.altitude);
        const distStream = safeArray<number>(streams.distance);
        
        for (let i = 0; i < len; i += step) {
             sampledWatts.push(wattsStream[i] ?? 0);
             sampledHr.push(hrStream[i] ?? 0);
             sampledCadence.push(cadenceStream[i] ?? 0);
             sampledAltitudeRaw.push(altStream[i] ?? 0); 
             
             // 🔥 L'ARME ATOMIQUE : Number() sur les valeurs extraites
             const elapsedDist = Number(distStream[i] ?? 0);
             const elapsedTime = Number(timeStream[i] ?? 0);

             sampledDist.push(elapsedDist);
             const avgSpeed = elapsedTime > 0 ? (elapsedDist / elapsedTime) * 3.6 : 0;
             sampledSpeed.push(avgSpeed);
        }
        
        // Calculs Cumulatifs
        const cumulativeWatts = calculateCumulativeAverage(sampledWatts);
        const cumulativeHr = calculateCumulativeAverage(sampledHr);
        const cumulativeCadence = calculateCumulativeAverage(sampledCadence);

        const data: any[] = [];
        for (let i = 0; i < cumulativeWatts.length; i++) {
            data.push({
                dist: sampledDist[i] > 0 ? parseFloat((sampledDist[i] / 1000).toFixed(2)) : 0,
                watts: cumulativeWatts[i] ?? null,
                hr: cumulativeHr[i] ?? null,
                cadence: cumulativeCadence[i] ?? null,
                altitude: sampledAltitudeRaw[i] ?? null,
                speed: sampledSpeed[i] ?? 0,
            });
        }
        
        return data.slice(START_DISCARD_POINTS); 

    }, [streams]);


    // --- CALCULATION DES DOMAINES INDIVIDUELS ---
    const getMetricDomain = (key: 'watts' | 'hr' | 'cadence' | 'speed', padding: number = 0.05) => {
        const values = cumulativeData.map(d => d[key] || 0);
        if (values.length === 0) return ['auto', 'auto'];

        const max = Math.max(...values);
        const minValues = values.filter(v => v > 0);
        const min = minValues.length > 0 ? Math.min(...minValues) : 0;
        const range = max - min;

        if (range < 5) return [min * 0.9, max * 1.1]; 

        return [
            Math.max(0, min - range * padding), 
            max + range * padding
        ];
    };

    const wattDomain = getMetricDomain('watts');
    const hrDomain = getMetricDomain('hr');
    const cadenceDomain = getMetricDomain('cadence');
    const speedDomain = getMetricDomain('speed');


    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', marginTop: '1rem' }}>
            <h3 style={styles.sectionTitle}>ÉVOLUTION MOYENNE CUMULATIVE (DEPUIS LE DÉPART)</h3>
            <div style={{ flex: 1, minHeight: '300px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={cumulativeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                        
                        <XAxis dataKey="dist" stroke="#666" fontSize={10} minTickGap={50} tickFormatter={(val) => `${val} km`} />

                        {/* AXE Y (Gauche): Altitude (Context) */}
                        <YAxis yAxisId="altAxis" orientation="left" stroke="#f59e0b" fontSize={10} domain={['auto', 'auto']} />
                        
                        {/* Axes masqués */}
                        <YAxis yAxisId="wattsAxis" orientation="right" stroke="#d04fd7" domain={wattDomain} hide={true} />
                        <YAxis yAxisId="hrAxis" orientation="right" stroke="#ef4444" domain={hrDomain} hide={true} />
                        <YAxis yAxisId="cadenceAxis" orientation="right" stroke="#10b981" domain={cadenceDomain} hide={true} />
                        <YAxis yAxisId="speedAxis" orientation="right" stroke="#00f3ff" domain={speedDomain} hide={true} />

                        <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(10,10,15,0.95)', border: '1px solid #333', borderRadius: '8px', fontSize: '0.8rem' }}
                            labelFormatter={(val) => `Corrélation à ${val} km`}
                            formatter={(value: number, name: string) => {
                                const metricKey = Object.keys(METRICS_CONFIG).find(k => (METRICS_CONFIG as any)[k].label === name);
                                const conf = metricKey ? (METRICS_CONFIG as any)[metricKey] : null;
                                return [<span key={name} style={{ color: conf?.color || '#fff', fontWeight: 700 }}>{formatNumber(value, conf?.unit, 1)}</span>, name];
                            }}
                        />

                        {/* 1. Altitude (AREA) - Contexte */}
                        <Area type="linear" dataKey="altitude" yAxisId="altAxis" name="Altitude" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={1} />
                        
                        {/* 2. Performance (LINES) */}
                        <Line type="monotone" dataKey="watts" yAxisId="wattsAxis" name="Puissance" stroke="#d04fd7" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="hr" yAxisId="hrAxis" name="Cardio" stroke="#ef4444" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="cadence" yAxisId="cadenceAxis" name="Cadence" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="speed" yAxisId="speedAxis" name="Vitesse" stroke="#00f3ff" strokeWidth={2} dot={false} />
                        
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

function useAdvancedStats(activity: Activity, streams: ActivityStreams | null) {
  return useMemo(() => {
    // --- 1. CALCULS BASÉS SUR LES MÉTADONNÉES ---
    const workKj = calculateWork(activity.avg_power_w, activity.duration_s);
    
    // Calcul des calories
    const calories = workKj 
        ? Math.round(workKj / 1.00416) 
        : (activity.calories_kcal || 0);
        
    // Calcul de l'efficacité
    let efficiency = 0;
    if (activity.calories_kcal && workKj) {
        efficiency = (workKj / 4.184) / activity.calories_kcal * 100;
    }
    if (efficiency > 28 || efficiency < 18) efficiency = 24.0;

    // Métriques TSS/IF/W/kg
    const ftpCurrent = activity.user_ftp || 250;
    const npRaw = activity.np_w || activity.avg_power_w || 0;
    const scoreTSS = activity.tss || (npRaw && ftpCurrent ? (activity.duration_s * npRaw * (npRaw / ftpCurrent)) / (ftpCurrent * 3600) * 100 : 0);
    const intensityFactor = npRaw / ftpCurrent;
    
    const wKg = activity.avg_power_w && activity.user_weight ? activity.avg_power_w / activity.user_weight : null;
    const wKgNp = activity.np_w && activity.user_weight ? activity.np_w / activity.user_weight : null;

    // --- 2. GESTION DE L'ABSENCE DE STREAMS ---
    if (!streams) {
      return { 
          workKj, scoreTSS, intensityFactor, wKg, wKgNp, ftpCurrent, np: npRaw, calories, efficiency,
          climbs: [], pMax: null, fcMax: null, fcMoy: null, avgPowerNZ: null, gain: 0, loss: 0, altMax: null, altMin: null, rpmMax: null, powerCurve: [], 
          totalTime: 0, pauseTime: 0, vMoyTotale: 0, vMoyNZ: 0, vMoyElapsed: 0, vMaxSmooth: 0, 
          percentPedaling: 0, avgCadenceNonZero: 0, drift: 0, bpmPerWatt: '-', cadAvg: 0, cadMax: 0, cadMedian: 0, hrAvg: 0, hrMax: 0,
          terrain: { climb: {dist:0, speed:0, time:0}, flat: {dist:0, speed:0, time:0}, descent: {dist:0, speed:0, time:0} }
      };
    }

    // --- 3. PRÉPARATION ET NETTOYAGE DES STREAMS (BLINDAGE) ---

    // Utilitaire local pour filtrer uniquement les nombres
const filterNonNulls = (arr: any) => {
        const safe = safeArray(arr);
        if (!Array.isArray(safe)) return []; // Double check
        return safe.filter((n): n is number => typeof n === 'number' && !isNaN(n));
    };    
    // Nettoyage des streams critiques (suppression des nulls)
    const cleanWatts = filterNonNulls(streams.watts);
    const cleanAlt = filterNonNulls(streams.altitude);
    const cleanHR = filterNonNulls(streams.heartrate);
    const cleanCad = filterNonNulls(streams.cadence);
    const cleanTime = filterNonNulls(streams.time);
    const cleanDist = filterNonNulls(streams.distance);

    // --- 4. CALCULS AVANCÉS GLOBALES ---
    
    // Maxima et Minima
    const hrAvg = activity.avg_heartrate || (cleanHR.length > 0 ? Math.round(cleanHR.reduce((a, b) => a + b, 0) / cleanHR.length) : 0);
    const hrMax = findMaxValue(cleanHR);
    const pMax = findMaxValue(cleanWatts); 
    const rpmMax = findMaxValue(cleanCad);
    const altMax = findMaxValue(cleanAlt);
    const altMin = cleanAlt.length > 0 ? Math.min(...cleanAlt) : null;
    
    // Métriques physiologiques et de terrain
    const drift = calculateCardiacDrift(cleanWatts, cleanHR);
    const { gain, loss } = calculateElevationGainLoss(cleanAlt);
    
    // Pour terrain et averages, on passe l'objet streams complet mais sécurisé dans les fonctions helper
    const terrain = calculateTerrainStats(streams as ActivityStreams);
    const { avgPowerNonZero, avgCadenceNonZero } = calculateStreamAverages(streams as ActivityStreams);
    const bpmPerWatt = (activity.avg_power_w && hrAvg) ? (hrAvg / activity.avg_power_w).toFixed(2) : '-';

    // Vitesse, Temps et Cadence
    const totalTime = cleanTime.length > 0 ? cleanTime[cleanTime.length - 1] : activity.duration_s;
    const pauseTime = Math.max(0, totalTime - activity.duration_s);
    const vMoyTotale = totalTime > 0 ? (activity.distance_km / (totalTime / 3600)) : 0;
    
    // Calcul de la vitesse moyenne NZ
    let movingDist = 0;
    let movingTime = 0;
    for(let i=1; i<cleanDist.length; i++) {
        const d = cleanDist[i] - cleanDist[i-1];
        const t = cleanTime[i] - cleanTime[i-1];
        if(t > 0) {
            const speed = (d/t)*3.6;
            if(speed > 2) { 
                movingDist += d;
                movingTime += t;
            }
        }
    }
    const vMoyNZ = activity.avg_speed_kmh || (movingTime > 0 ? (movingDist / movingTime) * 3.6 : 0);
    const vMoyElapsed = vMoyTotale; 
    
    let vMaxSmooth = 0;
    if (cleanDist.length > 5 && cleanTime.length > 5) {
        for(let i=5; i<cleanDist.length; i++) {
             const d = cleanDist[i] - cleanDist[i-5];
             const t = cleanTime[i] - cleanTime[i-5];
             if(t>0) {
                 const s = (d/t)*3.6;
                 if(s > vMaxSmooth && s < 130) vMaxSmooth = s; 
             }
        }
    } else { vMaxSmooth = activity.max_speed_kmh; }

    const pedalingSamples = cleanCad.filter(c => c > 0).length;
    const percentPedaling = cleanCad.length > 0 ? (pedalingSamples / cleanCad.length) * 100 : 0;
    const cadAvg = cleanCad.length > 0 ? cleanCad.reduce((a,b)=>a+b,0)/cleanCad.length : 0;
    const cadMax = rpmMax || 0;
    const safeCad = Array.isArray(cleanCad) ? cleanCad : [];
const cadMedian = calculateMedian(safeCad.filter(c => c > 0));

    // --- 5. COURBE DE PUISSANCE ET RECORDS ---
    const intervals = generatePowerIntervals(activity.duration_s);
    const powerCurve = intervals.map(interval => {
        if (cleanTime.length > 0 && cleanTime[cleanTime.length-1] < interval.sec) return null;
        
        // Find best interval blindé
        const res = findBestInterval(cleanWatts, cleanTime, cleanDist, cleanHR, interval.sec, activity.user_weight || 75);
        
        if (!res) return null;

        return { 
            ...interval, 
            watts: res.watts,
            wkg: res.wkg,
            powerKm: res.powerKm, 
            npVal: Math.round(res.watts * 1.05), 
            hrAvgRecord: res.hrAvgRecord, 
            hrKm: res.hrKm 
        };
    }).filter((p): p is NonNullable<typeof p> => p !== null);
    
    const climbs = detectClimbs(streams as ActivityStreams, 800, 3.0); 

    // --- 6. RETOUR CONSOLIDÉ ---
    return {
      workKj, scoreTSS, intensityFactor, wKg, wKgNp, ftpCurrent, np: npRaw, calories, efficiency,
      climbs, pMax, fcMax: hrMax, fcMoy: hrAvg, avgPowerNZ: avgPowerNonZero, 
      gain, loss, drift, terrain,
      powerCurve, rpmMax, altMax, altMin,
      totalTime, pauseTime, vMoyTotale, vMoyNZ, vMoyElapsed, vMaxSmooth,
      percentPedaling, avgCadenceNonZero, bpmPerWatt,
      cadAvg, cadMax, cadMedian, hrAvg, hrMax
    };
  }, [streams, activity]);
}


// --- HOOK CALCULS AVANCÉS ---
export default function ActivityDisplay({ activity }: { activity: Activity }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('summary');
    const [highlightedArea, setHighlightedArea] = useState<{ startKm: number; endKm: number } | null>(null);
    const [selectedClimb, setSelectedClimb] = useState<DetectedClimb | null>(null);
    const [localStreams, setLocalStreams] = useState<ActivityStreams | null>(activity.streams_data);
    const [isLoading, setIsLoading] = useState(false);
    const [globalFlipState, setGlobalFlipState] = useState(false);
    
    // NOUVEAUX ÉTATS POUR LA TÉLÉMÉTRIE NARRATIVE (Onglet 'extra')
    const [narrative, setNarrative] = useState<string | null>(null);
    const [narrativeLoading, setNarrativeLoading] = useState(false);

    const advanced = useAdvancedStats(activity, localStreams);

    const handleLoadStreams = useCallback(async () => {
        if (!activity.strava_id) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/strava/streams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ strava_id: activity.strava_id }) });
            if (res.ok) { const data = await res.json(); setLocalStreams(data.streams); }
        } catch (err) { console.error(err); } finally { setIsLoading(false); }
    }, [activity.strava_id]);

    // Fonction pour récupérer la narration depuis l'API (RÉVISÉE)
    const fetchNarrative = useCallback(async () => {
        if (!activity.id || narrativeLoading || narrative) return;
        setNarrativeLoading(true);
        setNarrative(null); // Réinitialiser avant le chargement
        
        try {
            const res = await fetch('/api/analysis/narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activityId: activity.id }),
            });
            
            if (res.ok) {
                const data = await res.json();
                // Utilisation du message d'erreur si fourni par l'API
                setNarrative(data.narrative || data.error || "Récit non généré. Les données de stream sont manquantes ou incomplètes.");
            } else {
                const errorData = await res.json();
                setNarrative(`Erreur serveur (${res.status}) : ${errorData.error || 'Impossible de contacter le moteur narratif.'}`);
            }
        } catch (err) {
            setNarrative("Erreur réseau/générique lors de l'appel API.");
        } finally {
            setNarrativeLoading(false);
        }
    }, [activity.id, narrativeLoading, narrative]);


    useEffect(() => {
        if (!localStreams && !isLoading) handleLoadStreams();
    }, [localStreams, isLoading, handleLoadStreams]);

    // Effet : Déclencher le fetch de la narration lorsque l'onglet est sélectionné (MIS À JOUR)
    useEffect(() => {
        if (activeTab === 'extra' && !narrative && !narrativeLoading && localStreams) {
            fetchNarrative();
        }
    }, [activeTab, narrative, narrativeLoading, fetchNarrative, localStreams]);


    const polyline = (activity.polyline as any)?.polyline || (typeof activity.polyline === 'string' ? activity.polyline : null);
    const handleClimbSelect = useCallback((climb: DetectedClimb) => { setSelectedClimb(climb); }, []);
    return (
        <div style={styles.container}>
            <header style={styles.headerContainer}>
                {polyline && <div style={styles.headerMapBackground}><MiniMap encodedPolyline={polyline} /><div style={styles.headerGradient} /></div>}
                <div style={styles.headerContent}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <div>
                            <button onClick={() => router.push('/activities')} style={styles.backButton}><ArrowLeft size={16} /> RETOUR</button>
                            <h1 style={styles.title}>{activity.name}</h1>
                            <button 
    onClick={async () => {
        if(!confirm("Voulez-vous forcer la re-synchronisation de cette activité ?")) return;
        try {
            const res = await fetch('/api/strava/streams', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ strava_id: activity.strava_id }) 
            });
            if(res.ok) {
                alert("Réparation terminée ! La page va se recharger.");
                window.location.reload();
            } else {
                alert("Erreur lors de la réparation.");
            }
        } catch(e) { console.error(e); alert("Erreur réseau."); }
    }}
    style={{
        fontSize: '0.7rem', background: '#ef4444', color: 'white', border: 'none', 
        padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginTop: '5px'
    }}
>
    🛠️ RÉPARER DONNÉES
</button>   



                            <div style={{display: 'flex', gap: '15px', color: '#ccc', fontSize: '0.9rem', fontWeight: 500}}>
                                <span style={{display:'flex', alignItems:'center', gap:'6px'}}><Calendar size={14} color="#d04fd7"/> {formatDate(activity.start_time)}</span>
                                <span style={{display:'flex', alignItems:'center', gap:'6px'}}><Clock size={14} color="#00f3ff"/> {formatTime(activity.duration_s)}</span>
                            </div>
                        </div>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button style={styles.actionButton}><Share2 size={18} /></button>
                        </div>
                    </div>
                    <div style={styles.heroStatsGrid}>
                        <HeroStatBox label="Distance" value={activity.distance_km.toFixed(1)} unit="km" color="#fff" icon={MapPin} subValue={`${formatNumber(advanced.vMoyNZ, 'km/h', 1)}`} extraLabel="Moy. (Roule)" /> 
                        <HeroStatBox label="Dénivelé" value={Math.round(activity.elevation_gain_m)} unit="m" color="#f59e0b" icon={Mountain} subValue={`-${advanced.loss} m`} extraLabel="Perte (D-)" />
                        <HeroStatBox label="Temps Total" value={formatTime(advanced.totalTime)} unit="" color="#00f3ff" icon={Clock} subValue={formatTime(advanced.pauseTime)} extraLabel="Pause" />
                        <HeroStatBox 
                            label="TSS" 
                            value={Math.round(advanced.scoreTSS || 0)} 
                            unit="pts" 
                            color="#d04fd7" 
                            icon={Gauge} 
                            tooltipText="Charge physiologique totale." 
                            subValue={`${Math.round(advanced.calories)} kcal`} 
                            extraLabel="Énergie" 
                        />                    </div>
                </div>
            </header>

            <div style={styles.mainGrid}>
                <div style={{gridColumn: '1 / -1'}}>
                    <SimpleTabs activeTab={activeTab} onChange={setActiveTab} tabs={[{ id: 'summary', label: 'Résumé' }, { id: 'analysis', label: 'Analyse & Carte' }, { id: 'extra', label: 'Infos' }]} />
                </div>

                {activeTab === 'summary' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div style={styles.glassCard}>
                            <h3 style={styles.sectionTitle}><Zap size={16} color="#d04fd7" /> PUISSANCE GLOBALE</h3>
                            <div style={{marginTop:'1.5rem', display:'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap:'2rem'}}>
                                <div>
                                    <DetailRow label="Moyenne" value={`${Math.round(activity.avg_power_w || 0)} W`} />
                                    <DetailRow label="Moyenne (NZ)" value={`${advanced.avgPowerNZ} W`} />
                                    <DetailRow label="Normalisée (NP)" value={`${Math.round(advanced.np)} W`} color="#d04fd7" />
                                    <DetailRow label="Max (1s)" value={`${advanced.pMax} W`} />
                                </div>
                                <div>
                                    <DetailRow label="W/kg" value={advanced.wKg?.toFixed(2)} />
                                    <DetailRow label="W/kg (NP)" value={advanced.wKgNp?.toFixed(2)} color="#d04fd7" />
                                    <DetailRow label="Intensité (IF)" value={advanced.intensityFactor?.toFixed(2)} />
                                    <DetailRow label="FTP (Ref)" value={`${advanced.ftpCurrent} W`} />
                                </div>
                                <div>
                                    <DetailRow label="Travail" value={`${advanced.workKj} kJ`} color="#f97316" />
                                    <DetailRow label="Efficacité" value={`${advanced.efficiency.toFixed(1)}%`} />
                                    <DetailRow label="Coût (BPM/W)" value={advanced.bpmPerWatt} />
                                </div>
                            </div>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
                            <div style={styles.glassCard}>
                                <h3 style={styles.sectionTitle}><Heart size={16} color="#ef4444" /> PHYSIOLOGIE</h3>
                                <div style={{marginTop: '1.5rem'}}>
                                    <DetailRow label="FC Moyenne" value={`${Math.round(advanced.hrAvg)} bpm`} color="#ef4444" />
                                    <DetailRow label="FC Max" value={`${advanced.hrMax} bpm`} color="#ef4444" />
                                    <DetailRow label="Dérive Cardiaque" value={advanced.drift ? `${advanced.drift.toFixed(1)}%` : '-'} color={advanced.drift && advanced.drift > 5 ? '#ef4444' : '#10b981'} />
                                    <div style={{marginTop:'1rem', borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:'1rem'}}>
                                        <DetailRow label="Cadence Moy." value={`${Math.round(advanced.cadAvg)} rpm`} />
                                        <DetailRow label="Cadence (NZ)" value={`${advanced.avgCadenceNonZero} rpm`} />
                                        <DetailRow label="Cadence Max" value={`${advanced.cadMax} rpm`} />
                                    </div>
                                    <RatioBar labelLeft="Pédalage" labelRight="Roue libre" valueLeft={advanced.percentPedaling} color="#10b981" />
                                </div>
                            </div>
                            <div style={styles.glassCard}>
                                <h3 style={styles.sectionTitle}><ActivityIcon size={16} color="#00f3ff" /> DYNAMIQUE & TERRAIN</h3>
                                <div style={{marginTop: '1.5rem'}}>
                                    <DetailRow label="Vitesse Moy." value={`${activity.avg_speed_kmh.toFixed(1)} km/h`} color="#00f3ff" />
                                    <DetailRow label="Vit. Moy. (Écoulé)" value={`${(advanced.vMoyElapsed ?? 0).toFixed(1)} km/h`} />
                                    <DetailRow label="Vitesse Max (Lissée)" value={`${advanced.vMaxSmooth.toFixed(1)} km/h`} />
                                    <div style={{marginTop:'1rem', display:'flex', gap:'10px'}}>
                                        <div style={{flex:1, textAlign:'center', background:'rgba(255,255,255,0.03)', padding:'8px', borderRadius:'8px'}}>
                                            <div style={{fontSize:'0.6rem', color:'#888'}}>MONTÉE</div>
                                            <div style={{fontWeight:700}}>{advanced.terrain.climb.dist.toFixed(1)} km</div>
                                            <div style={{fontSize:'0.8rem', color:'#f59e0b'}}>{advanced.terrain.climb.speed.toFixed(1)} km/h</div>
                                        </div>
                                        <div style={{flex:1, textAlign:'center', background:'rgba(255,255,255,0.03)', padding:'8px', borderRadius:'8px'}}>
                                            <div style={{fontSize:'0.6rem', color:'#888'}}>PLAT</div>
                                            <div style={{fontWeight:700}}>{advanced.terrain.flat.dist.toFixed(1)} km</div>
                                            <div style={{fontSize:'0.8rem', color:'#10b981'}}>{advanced.terrain.flat.speed.toFixed(1)} km/h</div>
                                        </div>
                                        <div style={{flex:1, textAlign:'center', background:'rgba(255,255,255,0.03)', padding:'8px', borderRadius:'8px'}}>
                                            <div style={{fontSize:'0.6rem', color:'#888'}}>DESC.</div>
                                            <div style={{fontWeight:700}}>{advanced.terrain.descent.dist.toFixed(1)} km</div>
                                            <div style={{fontSize:'0.8rem', color:'#3b82f6'}}>{advanced.terrain.descent.speed.toFixed(1)} km/h</div>
                                        </div>
                                    </div>
                                    <div style={{marginTop:'1rem'}}>
                                         <DetailRow label="Altitude Min" value={`${advanced.altMin} m`} />
                                         <DetailRow label="Altitude Max" value={`${advanced.altMax} m`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={styles.glassCard}>
                            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem'}}>
                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                    <TrendingUp size={20} color="#d04fd7" />
                                    <h3 style={{fontSize:'1.1rem', fontWeight:800, color:'#fff', margin:0}}>RECORDS DE PUISSANCE</h3>
                                    <PulsarTooltip text="Records Indépendants : La face avant (Violet) montre votre meilleure puissance moyenne. La face arrière (Rouge) montre votre meilleure fréquence cardiaque moyenne sur la même durée." />
                                </div>
                                <button 
                                    onClick={() => setGlobalFlipState(!globalFlipState)}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px', color: '#aaa', fontSize: '0.75rem', fontWeight: 600,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                >
                                    <Repeat size={14} />
                                </button>
                            </div>
                            <div style={styles.powerGridAutoFit}>
                                {advanced.powerCurve.map((rec, i) => (
                                    <div key={i} style={{position:'relative'}}>
                                        <RecordFlipCard record={rec} forceFlipState={globalFlipState} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB ANALYSIS (FINAL) */}
                {activeTab === 'analysis' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '2rem' }}>
                        <div style={{display:'flex', flexDirection:'column', gap:'2rem'}}>
                            {polyline && <div style={styles.fullMapWrapper}><ActivityMap encodedPolyline={polyline} /></div>}
                            
                            {/* 1. GRAPHIQUE FLUX CONTINU (Haute Fréquence / Bruit) */}
                            {localStreams && (
                                <div style={{...styles.glassCard, padding: '1rem'}}>
                                    <InteractiveAnalysisChart streams={localStreams} />
                                </div>
                            )}

                            {/* 2. GRAPHIQUE ÉVOLUTION MOYENNE (Basse Fréquence / Tendance) */}
                            {localStreams && (
                                <div style={{...styles.glassCard, padding: '1rem'}}>
                                    <EvolutionAverageChart streams={localStreams} />
                                </div>
                            )}
                        </div>
                        
                        {/* COLONNE DROITE : LISTE DES MONTÉES (unchanged) */}
                        <div style={styles.mapColumn}>
                            <div style={{...styles.glassCard, padding: '1.5rem', maxHeight: '800px', overflowY: 'auto'}}>
                                <h3 style={styles.sectionTitle}><Layers size={16} /> MONTÉES ({advanced.climbs.length})</h3>
                                {advanced.climbs.length > 0 ? (
                                    <div style={styles.climbListContainer}>
                                        <div style={styles.climbListHeader}><span>#</span><span>DIST</span><span>PENTE</span><span>WATTS</span></div>
                                        {advanced.climbs.map((c: DetectedClimb, i: number) => (
                                            <div key={i} style={styles.climbRow} onClick={() => handleClimbSelect(c)}>
                                                <div style={styles.climbIdBadge}>{i+1}</div>
                                                <div style={{fontWeight: 700, color:'#fff'}}>{(c.distanceMetres/1000).toFixed(1)} km</div>
                                                <div style={{fontWeight: 700, color:'#f59e0b'}}>{c.averageGradient}%</div>
                                                <div style={{fontWeight: 700, color:'#d04fd7'}}>{c.avgPower} W</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p style={{color: '#666', fontSize: '0.8rem', marginTop: '10px'}}>Aucune montée détectée.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB INFOS (Télémétrie Narrative) */}
                {activeTab === 'extra' && (
                    <div style={styles.narrativeContainer}>
                        <h3 style={styles.narrativeTitle}>Télémétrie Narrative : Analyse Post-Mission</h3>
                        
                        {narrativeLoading && (
                            <div style={styles.loadingNarrative}>
                                <div style={styles.spinner} /> 
                                Génération du récit...
                            </div>
                        )}
                        
                        {!narrativeLoading && narrative && (
                            <div 
                                style={styles.narrativeContent}
                                dangerouslySetInnerHTML={{ __html: narrative }}
                            />
                        )}

                        {!narrativeLoading && !narrative && (
                            <div style={styles.emptyNarrative}>
                                Impossible de générer le récit. Vérifiez les données de stream.
                            </div>
                        )}
                    </div>
                )}
            </div> 
            
            {selectedClimb && localStreams && <ClimbProfileChart climbData={{ name: `Montée de ${selectedClimb.startKm.toFixed(1)} km`, streams: extractClimbStreams(selectedClimb, localStreams) }} onClose={() => setSelectedClimb(null)} />}
        </div>
    );
}


const AltitudePerformanceChart = ({ streams }: { streams: ActivityStreams }) => {
    // Taille des tranches d'altitude (50m)
    const BIN_SIZE = 50; 

    const chartData = useMemo(() => {
        const altStream = safeArray<number>(streams.altitude);
        if (altStream.length === 0) return [];
        
        // Filtrer les altitudes valides
        const validAltitudes = altStream.filter(a => typeof a === 'number');
        if (validAltitudes.length === 0) return [];

        const minAlt = Math.min(...validAltitudes);
        const maxAlt = Math.max(...validAltitudes);
        
        // Définition des buckets (key: MinAlt)
        const bins = new Map<number, { count: number; totalWatts: number; totalSpeed: number; totalHr: number; totalCadence: number; }>();
        
        // Accès sécurisé aux streams avec typage strict <number>
        const wattsStream = safeArray<number>(streams.watts);
        const hrStream = safeArray<number>(streams.heartrate);
        const cadenceStream = safeArray<number>(streams.cadence);

        // Initialisation et Agrégation des données
        for (let i = 0; i < altStream.length; i++) {
            const alt = altStream[i] || 0;
            const watts = wattsStream[i] ?? 0;
            const hr = hrStream[i] ?? 0;
            const cadence = cadenceStream[i] ?? 0;
            
            // Calcul de la clé du bin
            const binKey = Math.floor(alt / BIN_SIZE) * BIN_SIZE;
            
            if (!bins.has(binKey)) {
                bins.set(binKey, { count: 0, totalWatts: 0, totalSpeed: 0, totalHr: 0, totalCadence: 0 });
            }
            
            const bin = bins.get(binKey)!;
            bin.count += 1;
            bin.totalWatts += watts;
            bin.totalHr += hr;
            bin.totalCadence += cadence;
        }

        // Finalisation et conversion en tableau pour Recharts
        const results: any[] = [];
        
        for (let alt = Math.floor(minAlt / BIN_SIZE) * BIN_SIZE; alt <= Math.ceil(maxAlt / BIN_SIZE) * BIN_SIZE; alt += BIN_SIZE) {
            const bin = bins.get(alt);
            const midPoint = alt; 
            
            if (bin && bin.count > 0) {
                results.push({
                    name: `${alt}m`,
                    altitudeStart: midPoint,
                    watts: Math.round(bin.totalWatts / bin.count),
                    hr: Math.round(bin.totalHr / bin.count),
                    cadence: Math.round(bin.totalCadence / bin.count),
                });
            } else {
                 results.push({ name: `${alt}m`, altitudeStart: midPoint, watts: null, hr: null, cadence: null });
            }
        }
        
        return results.filter(r => r.watts !== null || r.hr !== null || r.cadence !== null);
    }, [streams]);

    const activeMetrics = { watts: true, hr: true, cadence: true }; // Vitesse exclue pour simplification

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', marginTop: '2rem' }}>
            <h3 style={styles.sectionTitle}>ÉVOLUTION MOYENNE PAR TRANCHE D'ALTITUDE ({BIN_SIZE}M)</h3>
            <div style={{ flex: 1, minHeight: '300px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                    {/* Utilisation de ComposedChart pour Barres multiples */}
                    <ComposedChart 
                        data={chartData} 
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        barGap={1} // Les barres sont jointives
                        barCategoryGap={1} // Épaisseur fine
                    >
                        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                        
                        {/* AXE X: Tranche d'Altitude */}
                        <XAxis 
                            dataKey="altitudeStart" 
                            stroke="#666" fontSize={10} 
                            minTickGap={20}
                            tickFormatter={(val) => `${val}m`}
                            label={{ value: 'Altitude (m)', position: 'insideBottom', offset: -5, fill: '#888' }}
                        />

                        {/* AXES Y: Watts (Gauche) et Cardio/Cadence (Droite) */}
                        <YAxis 
                            yAxisId="wattsAxis" 
                            orientation="left" 
                            stroke="#d04fd7" 
                            fontSize={10} 
                            label={{ value: 'Watts', angle: -90, position: 'insideLeft', fill: '#d04fd7' }} 
                            domain={[0, 'dataMax']}
                            tickLine={false}
                        />
                        
                        {/* 🔥 CORRECTION: Rendre l'axe HR/Cadence lisible */}
                        <YAxis 
                            yAxisId="hrCadAxis" // Axe unique pour HR et Cadence
                            orientation="right" 
                            stroke="#ef4444" 
                            fontSize={10} 
                            label={{ value: 'BPM / RPM', angle: 90, position: 'insideRight', offset: -10, fill: '#ef4444' }} 
                            domain={[0, 'dataMax']} 
                            tickLine={false}
                        />
                        
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(10,10,15,0.95)', border: '1px solid #333', borderRadius: '8px', fontSize: '0.8rem' }}
                            labelFormatter={(val) => `Tranche : ${val}m – ${val + BIN_SIZE}m`}
                            formatter={(value: number, name: string) => {
                                const metricKey = Object.keys(METRICS_CONFIG).find(k => (METRICS_CONFIG as any)[k].label === name);
                                return [<span key={name} style={{ color: '#fff', fontWeight: 700 }}>{Math.round(value)}</span>, name];
                            }}
                        />

                        {/* RENDU : BARS pour les moyennes */}
                        {activeMetrics.watts && 
                            <Bar dataKey="watts" yAxisId="wattsAxis" name="Puissance" fill="#d04fd7" fillOpacity={0.8} />}

                        {activeMetrics.hr && 
                            <Bar dataKey="hr" yAxisId="hrCadAxis" name="Cardio" fill="#ef4444" fillOpacity={0.8} />}
                        
                        {/* 🔥 CORRECTION: Cadence est maintenant une BARRE pour la cohérence */}
                        {activeMetrics.cadence && 
                            <Bar dataKey="cadence" yAxisId="hrCadAxis" name="Cadence" fill="#10b981" fillOpacity={0.8} />}
                        
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- STYLES ---
const styles: Record<string, React.CSSProperties> = {
    container: { minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: '"Inter", sans-serif', paddingBottom: '4rem' },
    header: { padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 },
    headerContainer: { position: 'relative', minHeight: '400px', overflow: 'hidden', marginBottom: '2rem' },
    headerMapBackground: { position: 'absolute', inset: 0, zIndex: 0, opacity: 0.35, filter: 'grayscale(30%) contrast(120%)' },
    headerGradient: { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(5,5,5,0.2) 0%, rgba(5,5,5,1) 100%)', zIndex: 1 },
    headerContent: { position: 'relative', zIndex: 10, maxWidth: '1400px', margin: '0 auto', padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
    backButton: { background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600, backdropFilter: 'blur(5px)' },
    title: { fontSize: '3rem', fontWeight: 900, margin: 0, letterSpacing: '-1px', textShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    tagDate: { fontSize: '0.8rem', color: '#ccc', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 },
    tagSport: { fontSize: '0.7rem', color: '#d04fd7', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, background: 'rgba(208, 79, 215, 0.2)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(208, 79, 215, 0.3)' },
    actionButton: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    heroStatsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginTop: '3rem' },
    mainGrid: { maxWidth: '1400px', margin: '0 auto', padding: '0 2rem', display: 'flex', flexDirection: 'column', gap: '2rem' },
    glassCard: { background: 'rgba(20, 20, 30, 0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.5rem' },
    sectionTitle: { fontSize: '0.8rem', fontWeight: 800, color: '#666', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '1px', textTransform:'uppercase' },
    mapColumn: { position: 'sticky', top: '20px', display:'flex', flexDirection:'column', gap:'1rem' },
    fullMapWrapper: { height: '600px', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' },
    climbListContainer: { background: 'rgba(20, 20, 30, 0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' },
    climbListHeader: { display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', color: '#666', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px' },
    climbRow: { display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', alignItems: 'center', cursor: 'pointer' },
    climbIdBadge: { width: '24px', height: '24px', borderRadius: '50%', background: '#333', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 },
    noStreamsMessage: { color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem', background: 'var(--surface)', borderRadius: '12px' },
    extraContent: { padding: '4rem', textAlign: 'center', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--secondary)' },
    extraText: { color: 'var(--text-secondary)' },
    powerGridAutoFit: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginTop: '1.5rem' },
    narrativeContainer: { maxWidth: '1000px', margin: '0 auto', padding: '2rem 0', display: 'flex', flexDirection: 'column' },
    narrativeTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#00f3ff', marginBottom: '1.5rem', letterSpacing: '1px' },
    narrativeContent: { 
        background: 'rgba(20, 20, 30, 0.6)', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: '16px', 
        padding: '2rem', 
        fontSize: '1rem', 
        lineHeight: 1.8, 
        whiteSpace: 'pre-wrap', 
        maxHeight: '600px', 
        overflowY: 'auto',
        color: '#ccc',
        fontFamily: 'monospace'
    },
    loadingNarrative: { textAlign: 'center', padding: '3rem', color: '#d04fd7', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' },
    spinner: { width: '20px', height: '20px', borderRadius: '50%', border: '3px solid rgba(208, 79, 215, 0.3)', borderTopColor: '#d04fd7', animation: 'spin 1s linear infinite' },
    emptyNarrative: { textAlign: 'center', padding: '3rem', color: '#ef4444', fontSize: '1rem', border: '1px dashed #ef4444', borderRadius: '12px' }
};