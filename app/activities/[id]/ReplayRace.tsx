// Fichier : app/activities/[id]/ReplayRace.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
    Play, Pause, RotateCcw, Activity, Zap, TrendingUp, Gauge, Target, 
    Flame, MapPin, Mountain, ArrowRightLeft, ArrowUpRight, ArrowDownRight, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
    AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import dynamic from 'next/dynamic';
import { ActivityStreams } from '../../../types/next-auth';

// --- CONFIGURATION ---
const ZONES_CONFIG = [
    { id: 'Z1', label: 'Récup', color: '#a0a0a0', min: 0, max: 0.55 },
    { id: 'Z2', label: 'Endurance', color: '#00f3ff', min: 0.56, max: 0.75 },
    { id: 'Z3', label: 'Tempo', color: '#10b981', min: 0.76, max: 0.90 },
    { id: 'Z4', label: 'Seuil', color: '#f59e0b', min: 0.91, max: 1.05 },
    { id: 'Z5', label: 'VO2 Max', color: '#ef4444', min: 1.06, max: 1.20 },
    { id: 'Z6', label: 'Anaérobie', color: '#d04fd7', min: 1.21, max: 1.50 },
    { id: 'Z7', label: 'Neuro', color: '#8b5cf6', min: 1.51, max: 99.0 },
];

const SPEEDS = [1, 2, 5, 10, 20, 50, 100];

const ReplayMap = dynamic(() => import('./ReplayMap'), { 
    ssr: false,
    loading: () => (
        <div style={{ height: '100%', background: '#050505', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #222' }}>
            <div style={{color: '#d04fd7', fontFamily: 'monospace', animation: 'pulse 1s infinite'}}>SATELLITE LINK...</div>
        </div>
    )
});

// --- HOOK MOTEUR ---
const useReplayEngine = (duration: number) => {
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    
    const requestRef = useRef<number | undefined>(undefined);
    const previousTimeRef = useRef<number | undefined>(undefined);

    const animate = useCallback((time: number) => {
        if (previousTimeRef.current !== undefined) {
            const deltaTime = time - previousTimeRef.current;
            setCurrentTime(prev => {
                const next = prev + (deltaTime / 1000) * speed;
                if (next >= duration) {
                    setIsPlaying(false);
                    return duration;
                }
                return next;
            });
        }
        previousTimeRef.current = time;
        if (isPlaying) requestRef.current = requestAnimationFrame(animate);
    }, [isPlaying, speed, duration]);

    useEffect(() => {
        if (isPlaying) {
            previousTimeRef.current = undefined;
            requestRef.current = requestAnimationFrame(animate);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [isPlaying, animate]);

    return { currentTime, setCurrentTime, isPlaying, setIsPlaying, speed, setSpeed };
};

// --- COMPOSANTS UI ---
const TelemetryItem = ({ label, value, unit, color, icon: Icon, trend }: any) => (
    <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${color}20`,
        borderRadius: '12px',
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '75px'
    }}>
        <div style={{position: 'absolute', right: -8, top: -8, opacity: 0.1}}>
            <Icon size={55} color={color} />
        </div>
        
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2}}>
            <div style={{fontSize: '0.6rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px'}}>{label}</div>
            {trend !== undefined && (
                <div style={{fontSize: '0.6rem', color: trend > 0 ? '#10b981' : '#ef4444', background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: '4px'}}>
                    {trend > 0 ? '↗' : '↘'}
                </div>
            )}
        </div>

        <div style={{zIndex: 2, marginTop:'2px'}}>
            <div style={{fontSize: '1.4rem', fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: `0 0 15px ${color}30`}}>
                {value} <span style={{fontSize: '0.7rem', color: color, fontWeight: 600}}>{unit}</span>
            </div>
        </div>
    </div>
);

const GradientMeter = ({ value, max, color, label }: any) => {
    const safeValue = Math.min(Math.max(value, 0), max);
    const pct = (safeValue / max) * 100;
    return (
        <div style={{width: '100%'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                <span style={{fontSize: '0.7rem', color: '#aaa', fontWeight: 600}}>{label}</span>
                <span style={{fontSize: '0.7rem', color: color, fontWeight: 700}}>{value.toFixed(0)}</span>
            </div>
            <div style={{height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden'}}>
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    style={{height: '100%', background: color, boxShadow: `0 0 8px ${color}`}}
                />
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export default function ReplayRace({ 
    streams, 
    ftp = 200, 
    userWeight = 75 
}: { 
    streams: ActivityStreams, 
    ftp?: number,
    userWeight?: number 
}) {
    // 1. DATA PROCESSING (LOURD : CALCUL PHYSIQUE RÉEL & LIVE)
    const { 
        timeData, raceData, mapPath, altitudeProfile, powerData, 
        maxTime, totalNP, totalTSS, totalIF, maxDistance, chartSampling,
        liveMetricsHistory // 🔥 Historique complet des métriques calculées
    } = useMemo(() => {
        const times = streams.time || [];
        const watts = streams.watts || [];
        const latlngs = streams.latlng || [];
        const alts = streams.altitude || [];
        const dists = streams.distance || [];
        
        if (times.length === 0) return { 
            timeData: [], raceData: [], mapPath: [], altitudeProfile: [], powerData: [], 
            maxTime: 0, totalNP: 0, totalTSS: 0, totalIF: 0, maxDistance: 0, chartSampling: 1, liveMetricsHistory: []
        };

        const maxT = times[times.length - 1] ?? 0;
        const maxD = (dists[dists.length - 1] ?? 0) / 1000;
        
        const computedRace: Record<string, number>[] = [];
        const currentTotals = { Z1:0, Z2:0, Z3:0, Z4:0, Z5:0, Z6:0, Z7:0 };
        const profile: { time: number; alt: number; dist: number }[] = [];
        const path: [number, number][] = []; 
        const pwrPoints: { time: number; w: number }[] = [];
        const liveHistory: { tss: number, np: number, avgPwr: number, gain: number, loss: number }[] = [];
        
        let rolling30s: number[] = [];
        let rollingSum4Pow = 0; // Somme cumulée des puissances^4
        let powerSum = 0; // Somme cumulée puissance
        
        let currentGain = 0;
        let currentLoss = 0;

        const chartSampling = Math.max(1, Math.floor(times.length / 500));
        const mapSampling = 2; 

        for (let i = 0; i < times.length; i++) {
            const t = times[i] ?? 0;
            const w = watts[i] ?? 0;
            const lat = latlngs[i]?.[0];
            const lng = latlngs[i]?.[1];
            
            // Calcul Gain/Loss Instantané
            if (i > 0) {
                const altDiff = (alts[i] ?? 0) - (alts[i-1] ?? 0);
                if (altDiff > 0) currentGain += altDiff;
                if (altDiff < 0) currentLoss += Math.abs(altDiff);
            }

            // Zones
            const pct = w / ftp;
            let zoneId = 'Z1';
            if (pct > 1.50) zoneId = 'Z7';
            else if (pct > 1.20) zoneId = 'Z6';
            else if (pct > 1.05) zoneId = 'Z5';
            else if (pct > 0.90) zoneId = 'Z4';
            else if (pct > 0.75) zoneId = 'Z3';
            else if (pct > 0.55) zoneId = 'Z2';

            const dt = i > 0 ? t - (times[i-1] ?? 0) : 1;
            if (dt > 0 && dt < 10) currentTotals[zoneId as keyof typeof currentTotals] += dt;

            // --- CALCULS LIVE (NP, Pmoy, TSS) ---
            rolling30s.push(w);
            if (rolling30s.length > 30) rolling30s.shift();
            const rollingAvg = rolling30s.reduce((sum, val) => sum + val, 0) / rolling30s.length;
            
            rollingSum4Pow += Math.pow(rollingAvg, 4);
            powerSum += w;

            const elapsedTime = t - (times[0] ?? 0);
            let liveTSS = 0;
            let liveNP = 0;
            let liveAvg = 0;
            
            if (elapsedTime > 0 && i > 0) {
                liveNP = Math.pow(rollingSum4Pow / i, 0.25);
                liveAvg = powerSum / i;
                const liveIF = liveNP / ftp;
                liveTSS = (elapsedTime * liveNP * liveIF) / (ftp * 3600) * 100;
            }
            
            // 3. PUSH DATA
            if (i % mapSampling === 0 && lat && lng) {
                path.push([lat, lng]);
            }
            if (i % chartSampling === 0 || i === times.length - 1) {
                profile.push({ time: t, alt: alts[i] ?? 0, dist: (dists[i] ?? 0) / 1000 });
                pwrPoints.push({ time: t, w: rollingAvg });
                computedRace.push({ ...currentTotals });
                
                // On sauvegarde l'état complet à cet instant
                liveHistory.push({
                    tss: liveTSS,
                    np: liveNP,
                    avgPwr: liveAvg,
                    gain: currentGain,
                    loss: currentLoss
                });
            }
        }

        const np = Math.pow(rollingSum4Pow / times.length, 0.25);
        const intensity = np / ftp;
        const score = (maxT * np * intensity) / (ftp * 3600) * 100;
        const avgPwr = powerSum / times.length;

        return {
            timeData: times, raceData: computedRace, mapPath: path, altitudeProfile: profile, 
            powerData: pwrPoints, maxTime: maxT, totalNP: np, totalTSS: score, 
            totalIF: intensity, totalAvgPower: avgPwr, maxDistance: maxD, chartSampling,
            liveMetricsHistory: liveHistory
        };
    }, [streams, ftp]);

    const { currentTime, setCurrentTime, isPlaying, setIsPlaying, speed, setSpeed } = useReplayEngine(maxTime);

    // 2. INSTANT CALCULATIONS
    const currentIndex = useMemo(() => {
        const idx = timeData.findIndex(t => (t ?? 0) >= currentTime);
        return idx === -1 ? timeData.length - 1 : idx;
    }, [currentTime, timeData]);

    const instWatts = streams.watts?.[currentIndex] ?? 0;
    const instHr = streams.heartrate?.[currentIndex] ?? 0;
    const instCad = streams.cadence?.[currentIndex] ?? 0;
    const instDist = (streams.distance?.[currentIndex] ?? 0) / 1000;
    const instAlt = streams.altitude?.[currentIndex] ?? 0;
    
    // Sparkline Index
    const chartIndex = Math.floor(currentIndex / chartSampling);
    const sparklineData = powerData.slice(Math.max(0, chartIndex - 30), chartIndex + 1);

    // Map Index
    const mapIndex = useMemo(() => {
        const progress = currentIndex / timeData.length; 
        const idx = Math.floor(progress * mapPath.length);
        return Math.min(idx, mapPath.length - 1);
    }, [currentIndex, timeData.length, mapPath.length]);

    const currentPos = mapPath[mapIndex] || mapPath[0];

    const { smoothSpeed, smoothGrade } = useMemo(() => {
        if (currentIndex < 5) return { smoothSpeed: 0, smoothGrade: 0 };
        const prevIdx = Math.max(0, currentIndex - 5);
        const dDist = (streams.distance?.[currentIndex] ?? 0) - (streams.distance?.[prevIdx] ?? 0);
        const dTime = (streams.time?.[currentIndex] ?? 0) - (streams.time?.[prevIdx] ?? 0);
        const dAlt = (streams.altitude?.[currentIndex] ?? 0) - (streams.altitude?.[prevIdx] ?? 0);
        const s = dTime > 0 ? (dDist / dTime) * 3.6 : 0;
        const g = dDist > 10 ? (dAlt / dDist) * 100 : 0;
        return { smoothSpeed: s, smoothGrade: g };
    }, [currentIndex, streams]);

    const instWkg = (instWatts / userWeight).toFixed(1);
    
    // GESTION AFFICHAGE ARRÊT vs ROUE LIBRE vs ZONE
    const pctFtp = instWatts / ftp;
    const activeZone = ZONES_CONFIG.find(z => pctFtp >= z.min && pctFtp <= z.max) || ZONES_CONFIG[6];
    
    let displayLabel = activeZone.label;
    let displayColor = activeZone.color;

    if (instWatts === 0) {
        if (smoothSpeed > 5) {
            displayLabel = "ROUE LIBRE";
            displayColor = "#60a5fa";
        } else {
            displayLabel = "ARRÊT";
            displayColor = "#444";
        }
    }

    const raceDataIndex = Math.floor((currentIndex / timeData.length) * raceData.length);
    const currentZoneState = raceData[raceDataIndex] || raceData[raceData.length - 1] || {};
    const zoneDistribution = useMemo(() => {
        const totalSeconds = Object.values(currentZoneState).reduce((a, b) => a + b, 0);
        return ZONES_CONFIG.map(z => ({
            ...z,
            seconds: currentZoneState[z.id] || 0,
            percent: totalSeconds > 0 ? ((currentZoneState[z.id] || 0) / totalSeconds) * 100 : 0
        })).sort((a, b) => b.percent - a.percent);
    }, [currentZoneState]);

    // 🔥 RÉCUPÉRATION DES MÉTRIQUES LIVE 🔥
    const currentMetrics = liveMetricsHistory[chartIndex] || { tss: 0, np: 0, avgPwr: 0, gain: 0, loss: 0 };

    return (
        <div style={styles.container}>
            <style jsx global>{`
                input[type=range].cyber-slider {
                    -webkit-appearance: none; width: 100%; background: transparent; cursor: pointer;
                }
                input[type=range].cyber-slider::-webkit-slider-runnable-track {
                    width: 100%; height: 2px; background: rgba(255,255,255,0.1);
                }
                input[type=range].cyber-slider::-webkit-slider-thumb {
                    -webkit-appearance: none; height: 16px; width: 6px; 
                    background: #fff; margin-top: -7px; border-radius: 2px;
                    box-shadow: 0 0 10px #d04fd7, 0 0 20px #d04fd7;
                    transition: transform 0.1s;
                }
                input[type=range].cyber-slider:hover::-webkit-slider-thumb {
                    transform: scaleY(1.5);
                    background: #d04fd7;
                }
            `}</style>

            {/* HEADER */}
            <div style={styles.header}>
                <div style={styles.headerGroup}>
                    <button onClick={() => setIsPlaying(!isPlaying)} style={styles.playBtn}>
                        {isPlaying ? <Pause fill="#000" /> : <Play fill="#000" style={{marginLeft:'4px'}} />}
                    </button>
                    <button onClick={() => setCurrentTime(0)} style={styles.iconBtn}>
                        <RotateCcw size={18} />
                    </button>
                    
                    <div style={styles.speedPill}>
                        {SPEEDS.map(s => (
                            <div 
                                key={s} onClick={() => setSpeed(s)}
                                style={{
                                    ...styles.speedItem,
                                    background: speed === s ? '#d04fd7' : 'transparent',
                                    color: speed === s ? '#fff' : '#666',
                                    fontWeight: speed === s ? 800 : 400
                                }}
                            >
                                x{s}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                    <div style={styles.timerBig}>
                        {formatTime(currentTime)} <span style={{fontSize:'1rem', color:'#444'}}>/ {formatTime(maxTime)}</span>
                    </div>
                    <div style={{fontSize:'0.8rem', color:'#888', display:'flex', gap:'12px', marginTop:'-4px', fontWeight: 600}}>
                        <span style={{color:'#00f3ff', display:'flex', alignItems:'center', gap:'4px'}}>
                            <MapPin size={10} /> {instDist.toFixed(1)} km
                        </span>
                        <span style={{color:'#333'}}>|</span>
                        <span style={{color:'#666', display:'flex', alignItems:'center', gap:'4px'}}>
                            <ArrowRightLeft size={10} /> {(maxDistance - instDist).toFixed(1)} km restants
                        </span>
                    </div>
                </div>

                <div style={styles.headerGroup}>
                    <div style={styles.ftpTag}>FTP: {ftp}W</div>
                    <div style={styles.ftpTag}>Poids: {userWeight}kg</div>
                </div>
            </div>

            {/* GRID MAIN */}
            <div style={styles.gridMain}>
                
                {/* COLONNE GAUCHE (Data) */}
                <div style={styles.colLeft}>
                    {/* GAUGE PUISSANCE */}
                    <div style={styles.gaugeCard}>
                        <div style={styles.cardLabel}>PUISSANCE INSTANTANÉE</div>
                        <div style={{position: 'relative', zIndex: 2, textAlign: 'center'}}>
                            <div style={{
                                fontSize: '4.5rem', fontWeight: 900, lineHeight: 0.9, 
                                color: displayColor, textShadow: `0 0 30px ${displayColor}40`
                            }}>
                                {instWatts}
                            </div>
                            <div style={{fontSize: '1rem', fontWeight: 700, color: '#fff', letterSpacing: '4px'}}>WATTS</div>
                            <div style={{
                                marginTop: '10px', display: 'inline-block', padding: '4px 12px', 
                                background: `linear-gradient(90deg, ${displayColor}20, transparent)`,
                                borderLeft: `3px solid ${displayColor}`, color: displayColor, fontWeight: 700
                            }}>
                                {displayLabel}
                            </div>
                        </div>
                        <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', opacity: 0.15}}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sparklineData}>
                                    <Area 
                                        type="monotone" dataKey="w" stroke={displayColor} fill={displayColor} 
                                        strokeWidth={2} isAnimationActive={false} 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* GRILLE TELEMETRIE 6 BOITES */}
                    <div style={styles.telemetryGrid}>
                        <TelemetryItem label="VITESSE" value={smoothSpeed.toFixed(1)} unit="km/h" color="#00f3ff" icon={Gauge} trend={smoothSpeed > 30 ? 1 : 0} />
                        <TelemetryItem label="PENTE" value={smoothGrade.toFixed(1)} unit="%" color={smoothGrade > 0 ? '#f59e0b' : '#3b82f6'} icon={TrendingUp} />
                        <TelemetryItem label="CADENCE" value={instCad} unit="rpm" color="#10b981" icon={Zap} />
                        <TelemetryItem label="CARDIO" value={instHr} unit="bpm" color="#ef4444" icon={Flame} />
                        <TelemetryItem label="W/KG" value={instWkg} unit="" color="#d04fd7" icon={Target} />
                        
                        {/* 🔥 BOÎTE DÉNIVELÉ (REMPLACE ALTITUDE) */}
                        <TelemetryItem 
                            label="DÉNIVELÉ" 
                            value={
                                <div style={{display:'flex', gap:'8px', fontSize:'1.1rem'}}>
                                    <span style={{color:'#f59e0b'}}>+{currentMetrics.gain.toFixed(0)}</span>
                                    <span style={{color:'#333'}}>|</span>
                                    <span style={{color:'#3b82f6'}}>-{currentMetrics.loss.toFixed(0)}</span>
                                </div>
                            } 
                            unit="" color="#8b5cf6" icon={Mountain} 
                        />
                    </div>

                    {/* METRIQUES AVANCEES */}
                    <div style={styles.advancedCard}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px', alignItems:'center'}}>
                            <div style={styles.cardLabel}>CHARGE & INTENSITÉ</div>
                            <Activity size={14} color="#666" />
                        </div>
                        <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                            <GradientMeter label="INTENSITÉ (IF)" value={totalIF * 100} max={110} color="#d04fd7" />
                            <GradientMeter label="TSS (Charge)" value={currentMetrics.tss} max={totalTSS} color="#8b5cf6" />
                            
                            {/* 🔥 NOUVELLES INFOS EN DESSOUS DU TSS */}
                            <div style={{display:'flex', justifyContent:'space-between', marginTop:'4px', padding:'0 4px'}}>
                                <div style={{fontSize:'0.75rem', color:'#aaa'}}>
                                    NP: <strong style={{color:'#fff'}}>{currentMetrics.np.toFixed(0)} W</strong>
                                </div>
                                <div style={{fontSize:'0.75rem', color:'#aaa'}}>
                                    Moy: <strong style={{color:'#fff'}}>{currentMetrics.avgPwr.toFixed(0)} W</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CENTRE (Carte) */}
                <div style={styles.colCenter}>
                    <div style={{width:'100%', height:'100%', borderRadius:'16px', overflow:'hidden', position:'relative', border:'1px solid #333'}}>
                        <ReplayMap polyline={mapPath} currentPosition={currentPos} />
                    </div>
                </div>

                {/* DROITE (Zones) */}
                <div style={styles.colRight}>
                    <div style={{...styles.card, height:'100%', display:'flex', flexDirection:'column'}}>
                        <div style={{marginBottom:'10px', borderBottom:'1px solid #333', paddingBottom:'10px'}}>
                            <div style={styles.cardLabel}>DISTRIBUTION ZONES</div>
                        </div>
                        <div style={{flex:1, display:'flex', flexDirection:'column', gap:'6px', overflowY:'auto'}}>
                            {zoneDistribution.map((z) => (
                                <div key={z.id} style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'0.75rem'}}>
                                    <div style={{width:'20px', color:'#666', fontWeight:700}}>{z.id}</div>
                                    <div style={{flex:1, height:'42px', background:'rgba(255,255,255,0.03)', borderRadius:'4px', position:'relative', overflow:'hidden', border:'1px solid rgba(255,255,255,0.05)'}}>
                                        <motion.div 
                                            initial={{width: 0}}
                                            animate={{width: `${z.percent}%`}}
                                            transition={{type:'spring', damping:20}}
                                            style={{position:'absolute', top:0, left:0, bottom:0, background: z.color, opacity: 0.25}}
                                        />
                                        {activeZone.id === z.id && instWatts > 0 && (
                                            <div style={{position:'absolute', left:0, top:0, bottom:0, width:'3px', background:z.color, boxShadow:`0 0 8px ${z.color}`}} />
                                        )}
                                        <div style={{position:'absolute', inset:0, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 8px'}}>
                                            <span style={{fontWeight:600, color: z.color}}>{z.label}</span>
                                            <div style={{textAlign:'right'}}>
                                                <div style={{fontWeight:700, color:'#fff'}}>{formatFullTime(z.seconds)}</div>
                                                <div style={{fontSize:'0.65rem', color:'#888'}}>{z.percent.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div style={styles.footer}>
                <div style={{display:'flex', gap:'20px', paddingLeft:'10px', marginBottom:'5px', fontSize:'0.75rem', fontWeight:600, zIndex: 20, position:'relative'}}>
                    <span style={{color:'#d04fd7', display:'flex', alignItems:'center', gap:'4px'}}><Mountain size={10}/> {instAlt.toFixed(0)} m</span>
                    <span style={{color:'#666'}}>|</span>
                    <span style={{color:'#fff', display:'flex', alignItems:'center', gap:'4px'}}><Clock size={10}/> {formatTime(currentTime)}</span>
                    <span style={{color:'#666'}}>|</span>
                    <span style={{color: smoothGrade > 0 ? '#f59e0b' : '#3b82f6', display:'flex', alignItems:'center', gap:'4px'}}><TrendingUp size={10}/> {smoothGrade.toFixed(1)}%</span>
                </div>

                <div style={{flex: 1, width: '100%', position: 'relative'}}>
                    <div style={{position: 'absolute', inset: 0, zIndex: 10}}>
                        <input 
                            type="range" min={0} max={maxTime} value={currentTime} 
                            onChange={(e) => { setIsPlaying(false); setCurrentTime(Number(e.target.value)); }}
                            className="cyber-slider"
                            style={{width: '100%', height: '100%'}}
                        />
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={altitudeProfile} margin={{top:5, right:0, left:0, bottom:0}}>
                            <defs>
                                <linearGradient id="gradProfile" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#d04fd7" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#d04fd7" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="alt" stroke="#d04fd7" strokeWidth={2} fill="url(#gradProfile)" animationDuration={0} />
                            <ReferenceLine x={currentTime} stroke="#fff" strokeWidth={1} strokeDasharray="3 3" />
                            <XAxis dataKey="time" hide />
                            <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

// --- UTILS ---
const formatTime = (s: number) => {
    const h = Math.floor(s/3600);
    const m = Math.floor((s%3600)/60);
    const sec = Math.floor(s%60);
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
}

const formatFullTime = (s: number) => {
    const h = Math.floor(s/3600);
    const m = Math.floor((s%3600)/60);
    const sec = Math.floor(s%60);
    if(h > 0) return `${h}h ${m}m ${sec}s`;
    return `${m}m ${sec}s`;
}

// --- STYLES ---
const styles: Record<string, React.CSSProperties> = {
    container: {
        background: '#0a0a0c', color: '#fff', display: 'flex', flexDirection: 'column',
        gap: '12px', padding: '12px', borderRadius: '24px', border: '1px solid #222',
        overflow: 'hidden', height: '900px'
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 20px', background: '#111', borderRadius: '16px', border: '1px solid #333',
        height: '60px'
    },
    headerGroup: { display: 'flex', gap: '10px', alignItems: 'center' },
    playBtn: {
        width:'40px', height:'40px', borderRadius:'50%', background:'#fff', border:'none',
        display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
        boxShadow: '0 0 15px rgba(255,255,255,0.2)', transition: 'transform 0.1s'
    },
    iconBtn: {
        width:'32px', height:'32px', borderRadius:'8px', background:'rgba(255,255,255,0.05)',
        border:'1px solid rgba(255,255,255,0.1)', color:'#ccc', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'
    },
    speedPill: {
        display:'flex', background:'#000', borderRadius:'8px', overflow:'hidden', border:'1px solid #333', marginLeft:'10px'
    },
    speedItem: {
        padding:'6px 10px', fontSize:'0.7rem', cursor:'pointer', transition:'all 0.2s', minWidth:'30px', textAlign:'center'
    },
    timerBig: {
        fontFamily: 'monospace', fontSize: '1.8rem', fontWeight: 900, color: '#d04fd7',
        textShadow: '0 0 15px rgba(208, 79, 215, 0.3)', lineHeight: 1
    },
    ftpTag: {
        background: '#222', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', 
        fontWeight: 700, color: '#888', border: '1px solid #333'
    },
    gridMain: {
        display: 'grid', gridTemplateColumns: '340px 1fr 280px', gap: '12px', flex: 1, minHeight: 0
    },
    colLeft: { display: 'flex', flexDirection: 'column', gap: '12px' },
    colCenter: { display: 'flex', flexDirection: 'column', gap: '12px' },
    colRight: { display: 'flex', flexDirection: 'column', gap: '12px' },
    
    card: {
        background: 'rgba(20, 20, 25, 0.6)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '15px'
    },
    gaugeCard: {
        background: 'rgba(20, 20, 25, 0.6)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '15px',
        flex: 1.2, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden'
    },
    telemetryGrid: {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', minHeight: '260px'
    },
    advancedCard: {
        background: 'rgba(20, 20, 25, 0.6)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '15px'
    },
    cardLabel: {
        fontSize: '0.7rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px'
    },
    mapOverlay: {
        position: 'absolute', bottom: 15, left: 15, background: 'rgba(0,0,0,0.8)',
        color: '#fff', padding: '6px 12px', borderRadius: '20px', border: '1px solid #333',
        fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
    },
    footer: {
        height: '140px', background: '#0f0f12', borderRadius: '16px', border: '1px solid #222',
        position: 'relative', display: 'flex', flexDirection: 'column', padding: '10px'
    }
};