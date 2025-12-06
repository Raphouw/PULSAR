// Fichier : app/activities/[id]/ReplayRace.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
    Play, Pause, RotateCcw, Activity, Zap, TrendingUp, Gauge, Target, 
    Flame, MapPin, Mountain, ArrowRightLeft, Clock, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip 
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
        <div style={{ height: '100%', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{color: '#d04fd7', fontFamily: 'monospace', animation: 'pulse 1s infinite'}}>SATELLITE LINK...</div>
        </div>
    )
});

// --- HELPER COULEURS PENTE ---
const getGradeColor = (grade: number) => {
    if (grade >= 12) return '#000000'; 
    if (grade >= 10) return '#7f1d1d'; 
    if (grade >= 8) return '#ef4444';  
    if (grade >= 6) return '#f97316';  
    if (grade >= 4) return '#eab308';  
    if (grade >= 2) return '#10b981';  
    return '#3b82f6'; 
};

// --- ALGO PULSAR SCORE (Adapté pour Replay) ---
const calculatePulsarScore = (elevationGain: number, distance: number, avgGrade: number, maxAlt: number): number => {
    const H = Math.max(1, elevationGain); 
    const L = Math.max(100, distance); 
    const AvgP = Math.max(0, avgGrade); 
    
    // Sigma simplifié (car on n'a pas toute la polyline haute fréquence ici)
    let sigma = 0.5; 
    if (AvgP > 8) sigma = 1.2;
    else if (AvgP > 5) sigma = 0.9;

    const Alt = (maxAlt > 0) ? maxAlt : H;
    const Base = (20 * (Math.pow(H, 2) / L)) + (3 * H);
    const Oxygen = 1 + (Alt / 8000);
    const Pivot = 1 + ((sigma * (AvgP - 8)) / 50);
    
    return Math.round(Base * Oxygen * Pivot);
};

// --- TYPES ---
interface ProcessedPoint { dist: number; ele: number; index: number; smoothedSlope: number; time: number; watts: number; hr: number; }
interface Climb {
    id: string; startIndex: number; endIndex: number; startDist: number; endDist: number;
    startTime: number; endTime: number; totalElevation: number; avgGrade: number; maxGrade: number;
    distance: number; duration: number;
    powerStats: { avg: number; max: number; wkg: number; np: number; };
    difficulty: number; category: string; performance: 'good' | 'average' | 'bad';
    profile: { dist: number; ele: number; grade: number }[]; 
}

// --- ALGOS DETECTION (LISSAGE WINDOW 20 + FIX DERNIER COL) ---
const detectClimbs = (points: ProcessedPoint[], userWeight: number, ftp: number): Climb[] => {
    const climbs: Climb[] = [];
    if (points.length < 100) return climbs;

    const SLOPE_THRESHOLD = 4;
    const SLOPE_CONTINUE = 2.2;
    const MAX_REPLAT_DISTANCE = 3000;
    const MIN_CLIMB_DISTANCE = 1500; 
    
    let isClimbing = false;
    let startIdx = 0;
    let lastClimbIdx = 0;
    let replatDistance = 0;

    // Fonction interne pour sauvegarder un col
    const saveClimb = (endIdxVal: number) => {
        const startP = points[startIdx];
        const endP = points[endIdxVal];
        const distInClimb = endP.dist - startP.dist;
        const eleGain = endP.ele - startP.ele;

        if (distInClimb >= MIN_CLIMB_DISTANCE && eleGain > 50) {
            const slice = points.slice(startIdx, endIdxVal + 1);
            const avgPower = slice.reduce((s, x) => s + (x.watts || 0), 0) / slice.length;
            const np = Math.pow(slice.reduce((s, x) => s + Math.pow(x.watts || 0, 4), 0) / slice.length, 0.25);
            const avgGrade = (eleGain / distInClimb) * 100;
            const maxAlt = Math.max(...slice.map(s => s.ele));
            
            // SCORE PULSAR
            const pulsarScore = calculatePulsarScore(eleGain, distInClimb, avgGrade, maxAlt);
            
            // Catégorisation Pulsar
            let cat = '4';
            if (pulsarScore > 1000) cat = 'HC'; // Seuils arbitraires à ajuster selon ta logique Pulsar
            else if (pulsarScore > 600) cat = '1';
            else if (pulsarScore > 300) cat = '2';
            else if (pulsarScore > 150) cat = '3';

            // SEGMENTATION
            const totalLen = distInClimb;
            let SEGMENT_METERS = 100; 
            if (totalLen < 1000) SEGMENT_METERS = 50;
            else if (totalLen < 2000 ) SEGMENT_METERS = 100;
            else if (totalLen < 5000) SEGMENT_METERS = 250;
            else if (totalLen < 10000) SEGMENT_METERS = 500;
            else if (totalLen < 15000) SEGMENT_METERS = 750;
            else if (totalLen < 30000) SEGMENT_METERS = 1000;
            else if (totalLen < 60000) SEGMENT_METERS = 2000;

            const detailProfile: { dist: number; ele: number; grade: number }[] = [];
            let currentSegStartDist = startP.dist;
            let currentSegStartIndex = 0;

            while(currentSegStartIndex < slice.length) {
                const targetDist = currentSegStartDist + SEGMENT_METERS;
                let nextIndex = slice.findIndex((pt, idx) => idx > currentSegStartIndex && pt.dist >= targetDist);
                if (nextIndex === -1) nextIndex = slice.length - 1;

                const pStart = slice[currentSegStartIndex];
                const pEnd = slice[nextIndex];
                const dDist = pEnd.dist - pStart.dist;
                const dEle = pEnd.ele - pStart.ele;
                const segGrade = dDist > 0 ? (dEle / dDist) * 100 : 0;

                detailProfile.push({
                    dist: pEnd.dist - startP.dist,
                    ele: pEnd.ele,
                    grade: segGrade
                });

                if (nextIndex === slice.length - 1) break;
                currentSegStartDist = pEnd.dist;
                currentSegStartIndex = nextIndex;
            }

            climbs.push({
                id: `C${climbs.length + 1}`, startIndex: startIdx, endIndex: endIdxVal,
                startDist: startP.dist, endDist: endP.dist, startTime: startP.time, endTime: endP.time,
                totalElevation: eleGain, avgGrade, maxGrade: Math.max(...slice.map(s=>s.smoothedSlope)),
                distance: distInClimb, duration: endP.time - startP.time,
                powerStats: { avg: avgPower, max: Math.max(...slice.map(s=>s.watts||0)), wkg: avgPower/userWeight, np },
                difficulty: pulsarScore, category: cat, // 🔥 ICI ON UTILISE LE SCORE PULSAR
                performance: (np/ftp > 0.95) ? 'good' : (np/ftp < 0.7) ? 'bad' : 'average',
                profile: detailProfile
            });
        }
    };

    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        
        if (isClimbing) {
            if (p.smoothedSlope >= SLOPE_CONTINUE) {
                lastClimbIdx = i;
                replatDistance = 0;
            } else {
                if (i > 0) replatDistance += (p.dist - points[i-1].dist);
                if (replatDistance >= MAX_REPLAT_DISTANCE) {
                    isClimbing = false;
                    saveClimb(lastClimbIdx);
                }
            }
        } else {
            if (p.smoothedSlope >= SLOPE_THRESHOLD) {
                isClimbing = true;
                startIdx = i;
                lastClimbIdx = i;
                replatDistance = 0;
            }
        }
    }

    // 🔥 FIX DERNIER COL : Si on finit en montant, on sauvegarde
    if (isClimbing) {
        saveClimb(lastClimbIdx);
    }

    return climbs;
};

// --- HOOK MOTEUR ---
const useReplayEngine = (duration: number) => {
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    
    const requestRef = useRef<number | null>(null);
    const prevTimeRef = useRef<number | null>(null);

    const animate = useCallback((time: number) => {
        if (prevTimeRef.current !== null && prevTimeRef.current !== undefined) {
            const dt = time - prevTimeRef.current;
            setCurrentTime(prev => {
                let next = prev + (dt / 1000) * speed;
                if (next >= duration) {
                    setIsPlaying(false); return duration;
                }
                return next;
            });
        }
        prevTimeRef.current = time;
        if (isPlaying) requestRef.current = requestAnimationFrame(animate);
    }, [isPlaying, speed, duration]);

    useEffect(() => {
        if (isPlaying) { 
            prevTimeRef.current = null;
            requestRef.current = requestAnimationFrame(animate); 
        } else if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [isPlaying, animate]);

    return { currentTime, setCurrentTime, isPlaying, setIsPlaying, speed, setSpeed };
};

// --- UI COMPONENTS ---
const TelemetryItem = ({ label, value, unit, color, icon: Icon, trend }: any) => (
    <div style={{
        background: 'rgba(20, 20, 25, 0.8)', border: `1px solid ${color}`, borderRadius: '12px', padding: '8px 12px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', minHeight: '75px', boxShadow: `0 0 15px ${color}20`
    }}>
        <div style={{position: 'absolute', right: -8, top: -8, opacity: 0.1}}><Icon size={55} color={color} /></div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2}}>
            <div style={{fontSize: '0.6rem', color: '#ccc', fontWeight: 700, textTransform: 'uppercase'}}>{label}</div>
            {trend !== undefined && <div style={{fontSize: '0.6rem', color: trend > 0 ? '#10b981' : '#ef4444', background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: '4px'}}>{trend > 0 ? '↗' : '↘'}</div>}
        </div>
        <div style={{zIndex: 2, marginTop:'2px'}}><div style={{fontSize: '1.4rem', fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: `0 0 10px ${color}60`}}>{value} <span style={{fontSize: '0.7rem', color: color, fontWeight: 600}}>{unit}</span></div></div>
    </div>
);

const GradientMeter = ({ value, max, color, label }: any) => (
    <div style={{width: '100%'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
            <span style={{fontSize: '0.7rem', color: '#aaa', fontWeight: 600}}>{label}</span>
            <span style={{fontSize: '0.7rem', color: color, fontWeight: 700}}>{value.toFixed(0)}</span>
        </div>
        <div style={{height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden'}}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((value / max) * 100, 100)}%` }} style={{height: '100%', background: color, boxShadow: `0 0 8px ${color}`}} />
        </div>
    </div>
);

// --- COMPOSANT PROFIL CLIMBFINDER ---
const ClimbFinderProfile = ({ climb, currentDist }: { climb: Climb, currentDist: number }) => {
    const progress = Math.min(Math.max(currentDist - climb.startDist, 0), climb.distance);
    const progressPct = (progress / climb.distance) * 100;
    const gradientId = `climbGrad-${climb.id}`;
    
    const gradientStops = useMemo(() => {
        const stops: JSX.Element[] = [];
        const totalDist = climb.distance;
        let prevOffset = 0;
        climb.profile.forEach((pt, i) => {
            const offset = (pt.dist / totalDist) * 100;
            const color = getGradeColor(pt.grade);
            stops.push(<stop key={`s-${i}-1`} offset={`${prevOffset}%`} stopColor={color} />);
            stops.push(<stop key={`s-${i}-2`} offset={`${offset}%`} stopColor={color} />);
            prevOffset = offset;
        });
        return stops;
    }, [climb]);

    return (
        <div style={{width:'100%', height:'100%', display:'flex', flexDirection:'column', position:'relative'}}>
            <div style={{position:'absolute', top:5, left:10, zIndex:5, display:'flex', gap:'10px', alignItems:'center'}}>
                <div style={{background: getGradeColor(climb.avgGrade), color:'#fff', padding:'2px 6px', borderRadius:'4px', fontWeight:800, fontSize:'0.7rem'}}>{climb.category}</div>
                <div>
                    <div style={{fontSize:'0.8rem', fontWeight:800, color:'#fff', textShadow:'0 0 5px #000'}}>COL {climb.id.split('C')[1]}</div>
                    <div style={{fontSize:'0.65rem', color:'#ccc', fontWeight:600}}>{climb.distance < 1000 ? `${climb.distance.toFixed(0)}m` : `${(climb.distance/1000).toFixed(1)}km`} à {climb.avgGrade.toFixed(1)}%</div>
                </div>
            </div>
            <div style={{position:'absolute', top:5, right:10, zIndex:5, textAlign:'right'}}>
                <div style={{fontSize:'0.6rem', color:'#aaa'}}>SCORE PULSAR</div>
                <div style={{fontSize:'1rem', fontWeight:900, color:'#d04fd7'}}>{climb.difficulty.toFixed(0)}</div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={climb.profile} margin={{top:30, bottom:0, left:0, right:0}}>
                    <defs><linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">{gradientStops}</linearGradient></defs>
                    <XAxis hide /><YAxis hide domain={['dataMin', 'dataMax']} />
                    <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                                <div style={{background:'#000', border:'1px solid #333', padding:'4px 8px', borderRadius:'4px', fontSize:'0.7rem'}}>
                                    <div style={{color: getGradeColor(d.grade), fontWeight:700}}>{d.grade.toFixed(1)}%</div>
                                    <div style={{color:'#fff'}}>{d.ele.toFixed(0)}m</div>
                                    <div style={{color:'#888'}}>{(d.dist/1000).toFixed(1)}km</div>
                                </div>
                            );
                        }
                        return null;
                    }} />
                    <Area type="monotone" dataKey="ele" stroke="none" fill={`url(#${gradientId})`} fillOpacity={1} isAnimationActive={false} />
                </AreaChart>
            </ResponsiveContainer>
            <motion.div animate={{ left: `${progressPct}%` }} transition={{ type: "tween", ease: "linear", duration: 0.2 }} style={{position: 'absolute', top: 30, bottom: 0, width: '2px', background: '#fff', boxShadow: '0 0 10px #fff', zIndex: 10}}>
                <div style={{position:'absolute', top:'-18px', left:'50%', transform:'translateX(-50%)', background:'#d04fd7', color:'#fff', fontSize:'0.6rem', padding:'1px 4px', borderRadius:'3px', fontWeight:700, whiteSpace:'nowrap', boxShadow: '0 0 10px #d04fd7'}}>VOUS</div>
            </motion.div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export default function ReplayRace({ streams, ftp = 200, userWeight = 75 }: { streams: ActivityStreams, ftp?: number, userWeight?: number }) {
    
    // 1. DATA PROCESSING (LISSAGE INTÉGRÉ)
    const { 
        timeData, raceData, mapPath, altitudeProfile, powerData, 
        maxTime, totalNP, totalTSS, totalIF, maxDistance, chartSampling,
        liveMetricsHistory, climbs, fullResLatLngs 
    } = useMemo(() => {
        const times = streams.time || [];
        const watts = streams.watts || [];
        const latlngs = streams.latlng || [];
        const alts = streams.altitude || [];
        const dists = streams.distance || [];
        const hrs = streams.heartrate || [];
        
        if (times.length === 0) return { timeData:[], raceData:[], mapPath:[], altitudeProfile:[], powerData:[], maxTime:0, totalNP:0, totalTSS:0, totalIF:0, maxDistance:0, chartSampling:1, liveMetricsHistory:[], climbs:[], fullResLatLngs:[] };

        const maxT = times[times.length - 1] ?? 0;
        const maxD = (dists[dists.length - 1] ?? 0) / 1000;
        
        // --- PRÉPARATION + LISSAGE FENÊTRE 20 ---
        const processedPoints: ProcessedPoint[] = [];
        const WINDOW = 20; 
        for(let i=0; i<times.length; i++) {
            let slope = 0;
            if(i >= WINDOW && i < times.length) {
                const pCurr = { dist: dists[i]||0, ele: alts[i]||0 };
                const pPrev = { dist: dists[i-WINDOW]||0, ele: alts[i-WINDOW]||0 };
                const dDiff = pCurr.dist - pPrev.dist;
                const eDiff = pCurr.ele - pPrev.ele;
                if(dDiff > 10) slope = (eDiff/dDiff)*100;
            }
            processedPoints.push({ dist: dists[i]||0, ele: alts[i]||0, index: i, smoothedSlope: slope, time: times[i]||0, watts: watts[i]||0, hr: hrs[i]||0 });
        }
        
        const detectedClimbs = detectClimbs(processedPoints, userWeight, ftp);

        // MAIN LOOP
        const computedRace: Record<string, number>[] = [];
        const currentTotals = { Z1:0, Z2:0, Z3:0, Z4:0, Z5:0, Z6:0, Z7:0 };
        const profile: { time: number; alt: number; dist: number }[] = [];
        const path: [number, number][] = []; 
        const fullResPath: [number, number][] = []; 
        const pwrPoints: { time: number; w: number }[] = [];
        const liveHistory: { tss: number, np: number, avgPwr: number, gain: number, loss: number }[] = [];
        
        let rolling30s: number[] = [];
        let rollingSum4Pow = 0;
        let powerSum = 0;
        let currentGain = 0, currentLoss = 0;
        
        const chartSampling = Math.max(1, Math.floor(times.length / 500));
        const mapSampling = 2; 

        for (let i = 0; i < times.length; i++) {
            const t = times[i] ?? 0;
            const w = watts[i] ?? 0;
            const lat = latlngs[i]?.[0];
            const lng = latlngs[i]?.[1];

            if (typeof lat === 'number' && typeof lng === 'number') fullResPath.push([lat, lng]);
            else if (fullResPath.length > 0) fullResPath.push(fullResPath[fullResPath.length - 1]); 
            else fullResPath.push([0, 0]);

            if (i > 0) {
                const diff = (alts[i]??0) - (alts[i-1]??0);
                if (diff > 0) currentGain += diff; else currentLoss += Math.abs(diff);
            }

            const pct = w / ftp;
            let zoneId = 'Z1';
            if (pct > 1.50) zoneId = 'Z7'; else if (pct > 1.20) zoneId = 'Z6'; else if (pct > 1.05) zoneId = 'Z5'; else if (pct > 0.90) zoneId = 'Z4'; else if (pct > 0.75) zoneId = 'Z3'; else if (pct > 0.55) zoneId = 'Z2';
            const dt = i > 0 ? t - (times[i-1] ?? 0) : 1;
            if (dt > 0 && dt < 10) currentTotals[zoneId as keyof typeof currentTotals] += dt;

            rolling30s.push(w);
            if (rolling30s.length > 30) rolling30s.shift();
            const rollingAvg = rolling30s.reduce((a,b)=>a+b,0)/rolling30s.length;
            rollingSum4Pow += Math.pow(rollingAvg, 4);
            powerSum += w;

            let liveTSS = 0, liveNP = 0, liveAvg = 0;
            if (t > 0 && i > 0) {
                liveNP = Math.pow(rollingSum4Pow/i, 0.25);
                liveAvg = powerSum/i;
                liveTSS = (t * liveNP * (liveNP/ftp)) / (ftp*3600) * 100;
            }

            if (i % mapSampling === 0 && typeof lat === 'number' && typeof lng === 'number') path.push([lat, lng]);
            if (i % chartSampling === 0 || i === times.length - 1) {
                profile.push({ time: t, alt: alts[i]??0, dist: (dists[i]??0)/1000 });
                pwrPoints.push({ time: t, w: rollingAvg });
                computedRace.push({ ...currentTotals });
                liveHistory.push({ tss: liveTSS, np: liveNP, avgPwr: liveAvg, gain: currentGain, loss: currentLoss });
            }
        }

        const np = Math.pow(rollingSum4Pow/times.length, 0.25);
        return {
            timeData: times, raceData: computedRace, mapPath: path, altitudeProfile: profile, powerData: pwrPoints,
            maxTime: maxT, totalNP: np, totalTSS: (maxT*np*(np/ftp))/(ftp*3600)*100, totalIF: np/ftp, maxDistance: maxD,
            chartSampling, liveMetricsHistory: liveHistory, climbs: detectedClimbs, fullResLatLngs: fullResPath
        };
    }, [streams, ftp, userWeight]);

    const { currentTime, setCurrentTime, isPlaying, setIsPlaying, speed, setSpeed } = useReplayEngine(maxTime);
    const [autoZoom, setAutoZoom] = useState(true);

    const currentIndex = useMemo(() => {
        const idx = timeData.findIndex(t => (t ?? 0) >= currentTime);
        return idx === -1 ? timeData.length - 1 : idx;
    }, [currentTime, timeData]);

    const instWatts = streams.watts?.[currentIndex] ?? 0;
    const instHr = streams.heartrate?.[currentIndex] ?? 0;
    const instCad = streams.cadence?.[currentIndex] ?? 0;
    const instDist = (streams.distance?.[currentIndex] ?? 0) / 1000; 
    const instDistM = streams.distance?.[currentIndex] ?? 0;
    const instAlt = streams.altitude?.[currentIndex] ?? 0;
    const currentPos = fullResLatLngs[currentIndex] || mapPath[0] || [0,0];
    const chartIndex = Math.floor(currentIndex / chartSampling);
    const sparklineData = powerData.slice(Math.max(0, chartIndex - 30), chartIndex + 1);

    const { smoothSpeed, smoothGrade } = useMemo(() => {
        if (currentIndex < 5) return { smoothSpeed: 0, smoothGrade: 0 };
        const prevIdx = Math.max(0, currentIndex - 5);
        const dD = (streams.distance?.[currentIndex]??0) - (streams.distance?.[prevIdx]??0);
        const dT = (streams.time?.[currentIndex]??0) - (streams.time?.[prevIdx]??0);
        const dA = (streams.altitude?.[currentIndex]??0) - (streams.altitude?.[prevIdx]??0);
        const s = dT > 0 ? (dD/dT)*3.6 : 0;
        const g = dD > 10 ? (dA/dD)*100 : 0;
        return { smoothSpeed: s, smoothGrade: g };
    }, [currentIndex, streams]);

    const pctFtp = instWatts / ftp;
    const activeZone = ZONES_CONFIG.find(z => pctFtp >= z.min && pctFtp <= z.max) || ZONES_CONFIG[6];
    let displayLabel = activeZone.label; let displayColor = activeZone.color;
    if (instWatts === 0) { if (smoothSpeed > 5) { displayLabel = "ROUE LIBRE"; displayColor = "#60a5fa"; } else { displayLabel = "ARRÊT"; displayColor = "#444"; } }

    const raceDataIdx = Math.floor((currentIndex / timeData.length) * raceData.length);
    const currentZoneState = raceData[raceDataIdx] || raceData[raceData.length - 1] || {};
    const zoneDistribution = useMemo(() => {
        const total = Object.values(currentZoneState).reduce((a, b) => a + b, 0);
        return ZONES_CONFIG.map(z => ({ ...z, seconds: currentZoneState[z.id] || 0, percent: total > 0 ? ((currentZoneState[z.id] || 0) / total) * 100 : 0 })).sort((a, b) => b.percent - a.percent);
    }, [currentZoneState]);

    const metrics = liveMetricsHistory[chartIndex] || { tss: 0, np: 0, avgPwr: 0, gain: 0, loss: 0 };
    const activeClimb = climbs.find(c => currentTime >= c.startTime && currentTime <= c.endTime);

    const formatTime = (s: number) => { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = Math.floor(s%60); return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`; };

    return (
        <div style={styles.container}>
            <style jsx global>{`
                input[type=range].cyber-slider { -webkit-appearance: none; width: 100%; background: transparent; cursor: pointer; }
                input[type=range].cyber-slider::-webkit-slider-runnable-track { width: 100%; height: 2px; background: transparent; }
                input[type=range].cyber-slider::-webkit-slider-thumb { -webkit-appearance: none; height: 20px; width: 4px; background: #fff; margin-top: -10px; box-shadow: 0 0 10px #d04fd7; transition: transform 0.1s; border-radius: 2px; }
                input[type=range].cyber-slider:hover::-webkit-slider-thumb { transform: scaleY(1.5); background: #d04fd7; }
                .no-scroll::-webkit-scrollbar { display: none; } .no-scroll { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes pulse-glow { 0%,100% { opacity:0.6 } 50% { opacity:1 } }
            `}</style>

            {/* HEADER */}
            <div style={styles.header}>
                <div style={styles.headerGroup}>
                    <button onClick={() => setIsPlaying(!isPlaying)} style={styles.playBtn}>{isPlaying ? <Pause fill="#000" /> : <Play fill="#000" style={{marginLeft:'4px'}} />}</button>
                    <button onClick={() => setCurrentTime(0)} style={styles.iconBtn}><RotateCcw size={18} /></button>
                    <div style={styles.speedControl}>{SPEEDS.map(s => (<div key={s} onClick={() => setSpeed(s)} style={{...styles.speedItem, background: speed === s ? '#d04fd7' : 'transparent', color: speed === s ? '#fff' : '#666', fontWeight: speed === s ? 800 : 400}}>x{s}</div>))}</div>
                </div>
                <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                    <div style={styles.timerBig}>{formatTime(currentTime)} <span style={{fontSize:'1rem', color:'#444'}}>/ {formatTime(maxTime)}</span></div>
                    <div style={{fontSize:'0.8rem', color:'#888', display:'flex', gap:'12px', marginTop:'-4px', fontWeight:600}}>
                        <span style={{color:'#00f3ff'}}><MapPin size={10} style={{marginRight:'4px'}}/>{instDist.toFixed(1)} km</span>
                        <span style={{color:'#333'}}>|</span>
                        <span style={{color:'#666'}}><ArrowRightLeft size={10} style={{marginRight:'4px'}}/>{(maxDistance - instDist).toFixed(1)} km left</span>
                    </div>
                </div>
                <div style={styles.headerGroup}>
                    <div style={styles.ftpTag}><Flame size={12} style={{marginRight:'4px'}}/>FTP: {ftp}W</div>
                    <button onClick={()=>setAutoZoom(!autoZoom)} style={{...styles.iconBtn, color: autoZoom ? '#10b981' : '#666', borderColor: autoZoom ? '#10b98130' : 'rgba(255,255,255,0.1)', width:'auto', padding:'0 10px', fontSize:'0.7rem', fontWeight:600}}>
                        {autoZoom ? 'AUTO ZOOM' : 'MANUAL'}
                    </button>
                </div>
            </div>

            {/* GRID PRINCIPAL */}
            <div style={styles.gridMain}>
                
                {/* GAUCHE : DATA */}
                <div style={styles.colLeft}>
                    {/* PUISSANCE (REDUITE) */}
                    <div style={{...styles.gaugeCard, flex: 'none', height: '160px'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <div style={styles.cardLabel}>PUISSANCE</div>
                            <div style={{fontSize:'0.7rem', color: displayColor, fontWeight:700, background:`${displayColor}20`, padding:'2px 8px', borderRadius:'8px'}}>{activeZone.id}</div>
                        </div>
                        <div style={{position:'relative', zIndex:2, textAlign:'center'}}>
                            <div style={{fontSize:'3.5rem', fontWeight:900, lineHeight:0.9, color: displayColor, textShadow:`0 0 20px ${displayColor}40`}}>{instWatts}</div>
                            <div style={{fontSize:'0.8rem', fontWeight:700, color:'#fff', letterSpacing:'4px'}}>WATTS</div>
                            <div style={{marginTop:'5px', display:'inline-block', padding:'2px 10px', background:`linear-gradient(90deg, ${displayColor}20, transparent)`, borderLeft:`3px solid ${displayColor}`, color: displayColor, fontWeight:700, fontSize:'0.8rem'}}>{displayLabel}</div>
                        </div>
                        <div style={{position:'absolute', bottom:0, left:0, right:0, height:'40px', opacity:0.15}}>
                            <ResponsiveContainer width="100%" height="100%"><AreaChart data={sparklineData}><Area type="monotone" dataKey="w" stroke={displayColor} fill={displayColor} strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer>
                        </div>
                    </div>

                    {/* TÉLÉMÉTRIE */}
                    <div style={styles.telemetryGrid}>
                        <TelemetryItem label="VITESSE" value={smoothSpeed.toFixed(1)} unit="km/h" color="#00f3ff" icon={Gauge} trend={smoothSpeed > 30 ? 1 : 0} />
                        <TelemetryItem label="PENTE" value={smoothGrade.toFixed(1)} unit="%" color={getGradeColor(smoothGrade)} icon={TrendingUp} />
                        <TelemetryItem label="CADENCE" value={instCad} unit="rpm" color="#10b981" icon={Zap} />
                        <TelemetryItem label="CARDIO" value={instHr} unit="bpm" color="#ef4444" icon={Flame} />
                        <TelemetryItem label="W/KG" value={(instWatts/userWeight).toFixed(2)} unit="" color="#d04fd7" icon={Target} />
                        <TelemetryItem label="DÉNIVELÉ" value={<div style={{display:'flex', gap:'6px'}}><span style={{color:'#f59e0b'}}>+{metrics.gain.toFixed(0)}</span><span style={{color:'#333'}}>|</span><span style={{color:'#3b82f6'}}>-{metrics.loss.toFixed(0)}</span></div>} unit="" color="#8b5cf6" icon={Mountain} />
                    </div>

                    {/* METRIQUES AVANCÉES (AGRANDI) */}
                    <div style={{...styles.advancedCard, flex: 1}}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}><div style={styles.cardLabel}>CHARGE PHYSIO</div><Activity size={14} color="#666"/></div>
                        <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                            <GradientMeter label="INTENSITÉ (IF)" value={totalIF * 100} max={110} color="#d04fd7" />
                            <GradientMeter label="TSS (Stress)" value={metrics.tss} max={totalTSS} color="#8b5cf6" />
                            <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.75rem', marginTop:'4px'}}>
                                <span style={{color:'#aaa'}}>NP: <strong style={{color:'#fff'}}>{metrics.np.toFixed(0)} W</strong></span>
                                <span style={{color:'#aaa'}}>Moy: <strong style={{color:'#fff'}}>{metrics.avgPwr.toFixed(0)} W</strong></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CENTRE : CARTE ÉLARGIE */}
                <div style={styles.colCenter}>
                    <div style={{width:'100%', height:'100%', borderRadius:'16px', overflow:'hidden', position:'relative', border:'1px solid #1a1a1f'}}>
                        <ReplayMap polyline={mapPath} currentPosition={currentPos} />
                        {activeClimb && (
                            <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} style={styles.climbOverlay}>
                                <Mountain size={16} color="#d04fd7" style={{marginRight:'8px'}} />
                                <div>
                                    <div style={{fontSize:'0.7rem', color:'#d04fd7', fontWeight:700}}>COL {activeClimb.category} EN COURS</div>
                                    <div style={{fontSize:'0.9rem', fontWeight:800}}>{(activeClimb.distance/1000).toFixed(1)}km • {activeClimb.avgGrade.toFixed(1)}%</div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* DROITE : ZONES (FIXE) & COLS (EXPANDED) */}
                <div style={styles.colRight}>
                    {/* HAUT : ZONES */}
                    <div style={{...styles.card, height: '220px', overflow: 'hidden', display: 'flex', flexDirection: 'column', marginBottom:'16px'}}>
                        <div style={{marginBottom:'10px', borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <div style={styles.cardLabel}>ZONES</div>
                            <Layers size={14} color="#666"/>
                        </div>
                        <div style={{flex: 1, overflowY: 'auto'}} className="no-scroll">
                            {zoneDistribution.map(z => (
                                <div key={z.id} style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px'}}>
                                    <div style={{width:'20px', color:'#666', fontSize:'0.7rem', fontWeight:700}}>{z.id}</div>
                                    <div style={{flex:1, height:'24px', background:'rgba(255,255,255,0.03)', borderRadius:'4px', position:'relative', overflow:'hidden'}}>
                                        <motion.div initial={{width:0}} animate={{width:`${z.percent}%`}} style={{position:'absolute', top:0, left:0, bottom:0, background:z.color, opacity:0.3}} />
                                        <div style={{position:'absolute', inset:0, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 6px'}}>
                                            <span style={{fontSize:'0.65rem', fontWeight:600, color:z.color}}>{z.label}</span>
                                            <span style={{fontSize:'0.65rem', color:'#fff'}}>{z.percent.toFixed(0)}% ({(z.seconds/60).toFixed(0)}m)</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* BAS : LISTE DES COLS (Prend le reste) */}
                    <div style={{...styles.card, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
                        <div style={{marginBottom:'10px', borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <div style={styles.cardLabel}>COLS DÉTECTÉS ({climbs.length})</div>
                            <Mountain size={14} color="#666"/>
                        </div>
                        <div style={{flex: 1, overflowY: 'auto', paddingRight:'5px'}} className="no-scroll">
                            {climbs.length > 0 ? climbs.map((c, i) => (
                                <div key={i} onClick={()=>{setCurrentTime(c.startTime); setIsPlaying(false);}} style={{
                                    padding:'8px', marginBottom:'6px', borderRadius:'8px', cursor:'pointer',
                                    background: activeClimb?.id === c.id ? 'rgba(208, 79, 215, 0.15)' : 'rgba(255,255,255,0.03)',
                                    border: activeClimb?.id === c.id ? '1px solid #d04fd7' : '1px solid rgba(255,255,255,0.05)',
                                    display:'flex', alignItems:'center', gap:'8px'
                                }}>
                                    <div style={{background: getGradeColor(c.avgGrade), width:'20px', height:'20px', borderRadius:'4px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:800, color:'#fff'}}>{c.category}</div>
                                    <div style={{flex:1}}>
                                        <div style={{fontSize:'0.75rem', fontWeight:700, color:'#fff'}}>COL {c.id}</div>
                                        <div style={{fontSize:'0.65rem', color:'#888'}}>{(c.distance/1000).toFixed(1)}km à {c.avgGrade.toFixed(1)}%</div>
                                    </div>
                                    <div style={{textAlign:'right'}}>
                                        <div style={{fontSize:'0.7rem', fontWeight:700, color:'#d04fd7'}}>{Math.round(c.powerStats.avg)}W</div>
                                        <div style={{fontSize:'0.6rem', color:'#666'}}>Score: {c.difficulty.toFixed(0)}</div>
                                    </div>
                                </div>
                            )) : <div style={{textAlign:'center', color:'#666', fontSize:'0.8rem', marginTop:'20px'}}>Aucun col détecté</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER INTELLIGENT (Hybrid) */}
            <div style={styles.footer}>
                {activeClimb && autoZoom ? (
                    // MODE ZOOM COL (ClimbFinder Style)
                    <ClimbFinderProfile climb={activeClimb} currentDist={instDistM} />
                ) : (
                    // MODE GLOBAL PROFILE
                    <>
                        <div style={{display:'flex', gap:'20px', fontSize:'0.75rem', fontWeight:600, marginBottom:'5px', paddingLeft:'10px'}}>
                            <span style={{color:'#d04fd7'}}>ALT: {instAlt.toFixed(0)}m</span>
                            <span style={{color:'#666'}}>|</span>
                            <span style={{color: smoothGrade>0?'#f59e0b':'#3b82f6'}}>PENTE: {smoothGrade.toFixed(1)}%</span>
                        </div>
                        <div style={{flex:1, position:'relative', width:'100%'}}>
                            {/* MARKERS DES COLS SUR LA TIMELINE (SEGMENTS COLORÉS) */}
                            {climbs.map((c, i) => (
                                <div key={i} style={{
                                    position:'absolute', 
                                    left:`${(c.startTime/maxTime)*100}%`, 
                                    width:`${((c.endTime - c.startTime)/maxTime)*100}%`,
                                    top:'-4px', height:'4px', 
                                    background: getGradeColor(c.avgGrade), 
                                    zIndex:15, borderRadius:'2px',
                                    boxShadow:'0 0 5px rgba(0,0,0,0.5)'
                                }} title={`COL ${c.category}`} />
                            ))}
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
                    </>
                )}
                
                {/* LE SLIDER GLOBAL (INVISIBLE MAIS TOUJOURS LÀ AU DESSUS) */}
                <div style={{position:'absolute', inset:0, zIndex:20}}>
                    <input type="range" min={0} max={maxTime} value={currentTime} onChange={(e)=>{setCurrentTime(Number(e.target.value))}} className="cyber-slider" style={{width:'100%', height:'100%'}} />
                </div>
            </div>
        </div>
    );
}

// --- STYLES ---
const styles: Record<string, React.CSSProperties> = {
    container: { background: '#0a0a0c', color: '#fff', display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', borderRadius: '24px', border: '1px solid #222', overflow: 'hidden', height: '1000px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px', background: '#111', borderRadius: '16px', border: '1px solid #333', height: '60px' },
    headerGroup: { display: 'flex', gap: '10px', alignItems: 'center' },
    playBtn: { width:'40px', height:'40px', borderRadius:'50%', background:'#fff', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 0 15px rgba(255,255,255,0.2)', transition:'transform 0.1s' },
    iconBtn: { width:'32px', height:'32px', borderRadius:'8px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#ccc', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' },
    speedControl: { display:'flex', gap:'2px' },
    speedItem: { padding:'4px 8px', fontSize:'0.7rem', cursor:'pointer', borderRadius:'4px' },
    timerBig: { fontFamily: 'monospace', fontSize: '1.8rem', fontWeight: 900, color: '#d04fd7', textShadow: '0 0 15px rgba(208, 79, 215, 0.3)', lineHeight: 1 },
    ftpTag: { background: '#222', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#888', border: '1px solid #333', display:'flex', alignItems:'center' },
    gridMain: { display: 'grid', gridTemplateColumns: '320px 1fr 300px', gap: '12px', flex: 1, minHeight: 0 },
    colLeft: { display: 'flex', flexDirection: 'column', gap: '12px' },
    colCenter: { display: 'flex', flexDirection: 'column', gap: '12px' },
    colRight: { display: 'flex', flexDirection: 'column', gap: '12px' },
    card: { background: 'rgba(20, 20, 25, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '15px' },
    gaugeCard: { background: 'rgba(20, 20, 25, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
    telemetryGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', minHeight: '260px' },
    advancedCard: { background: 'rgba(20, 20, 25, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '15px' },
    cardLabel: { fontSize: '0.7rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' },
    climbOverlay: { position: 'absolute', bottom: 20, left: 20, background: 'rgba(0,0,0,0.8)', padding: '10px 15px', borderRadius: '12px', border: '1px solid #333', display: 'flex', alignItems: 'center', zIndex: 100 },
    footer: { height: '160px', background: '#0f0f12', borderRadius: '16px', border: '1px solid #222', position: 'relative', display: 'flex', flexDirection: 'column', padding: '10px' }
};