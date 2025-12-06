// Fichier : app/activities/[id]/ReplayRace.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, Activity, Zap, TrendingUp, Gauge } from 'lucide-react'; // Ajout d'icônes
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import dynamic from 'next/dynamic';
import { ActivityStreams } from '../../../types/next-auth.d';


// --- CONFIGURATION DES ZONES ---
const ZONES_CONFIG = [
    { id: 'Z1', label: 'Récupération', color: '#a0a0a0', min: 0, max: 0.55 },
    { id: 'Z2', label: 'Endurance', color: '#3b82f6', min: 0.56, max: 0.75 },
    { id: 'Z3', label: 'Tempo', color: '#10b981', min: 0.76, max: 0.90 },
    { id: 'Z4', label: 'Seuil', color: '#f59e0b', min: 0.91, max: 1.05 },
    { id: 'Z5', label: 'VO2 Max', color: '#ef4444', min: 1.06, max: 1.20 },
    { id: 'Z6', label: 'Anaérobie', color: '#d04fd7', min: 1.21, max: 1.50 },
    { id: 'Z7', label: 'Neuro', color: '#8b5cf6', min: 1.51, max: 99.0 },
];

const ReplayMap = dynamic(() => import('./ReplayMap'), { 
    ssr: false,
    loading: () => <div style={{height:'100%', background:'#141419', borderRadius:'12px'}}></div>
});

const useReplayEngine = (duration: number) => {
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(20); 
    
    const requestRef = useRef<number | undefined>(undefined);
    const previousTimeRef = useRef<number | undefined>(undefined);

    const animate = (time: number) => {
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
    };

    useEffect(() => {
        if (isPlaying) {
            previousTimeRef.current = undefined;
            requestRef.current = requestAnimationFrame(animate);
        } else if (requestRef.current !== undefined) {
            cancelAnimationFrame(requestRef.current);
        }
        return () => { if(requestRef.current !== undefined) cancelAnimationFrame(requestRef.current); };
    }, [isPlaying, speed, duration]);

    return { currentTime, setCurrentTime, isPlaying, setIsPlaying, speed, setSpeed };
};

// --- NOUVEAU COMPOSANT : TÉLÉMÉTRIE ---
const TelemetryItem = ({ label, value, unit, color, icon: Icon }: any) => (
    <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '4px'
    }}>
        <div style={{fontSize:'0.65rem', color:'#888', textTransform:'uppercase', fontWeight:700, display:'flex', alignItems:'center', gap:'4px'}}>
            <Icon size={12} color={color} /> {label}
        </div>
        <div style={{fontSize:'1.2rem', fontWeight:800, color:'#fff', lineHeight:1}}>
            {value} <span style={{fontSize:'0.6rem', color:'#666', fontWeight:600}}>{unit}</span>
        </div>
    </div>
);

export default function ReplayRace({ streams, ftp = 250 }: { streams: ActivityStreams, ftp?: number }) {
    
    const { timeData, raceData, mapPath, altitudeProfile, maxTime } = useMemo(() => {
        const times = streams.time || [];
        const watts = streams.watts || [];
        const latlngs = streams.latlng || [];
        const alts = streams.altitude || [];
        const dists = streams.distance || [];

        const computedRace: Record<string, number>[] = [];
        const currentTotals = { Z1:0, Z2:0, Z3:0, Z4:0, Z5:0, Z6:0, Z7:0 };
        const profile: { d: number, a: number }[] = [];
        const path: [number, number][] = [];

        for(let i=0; i<times.length; i++) {
            const w = watts[i] ?? 0;
            const pct = w / ftp;
            let zone = 'Z1';
            if (pct > 1.50) zone = 'Z7';
            else if (pct > 1.20) zone = 'Z6';
            else if (pct > 1.05) zone = 'Z5';
            else if (pct > 0.90) zone = 'Z4';
            else if (pct > 0.75) zone = 'Z3';
            else if (pct > 0.55) zone = 'Z2';

            const tCurrent = times[i] ?? 0;
            const tPrev = i > 0 ? (times[i-1] ?? 0) : 0;
            const dt = i > 0 ? (tCurrent - tPrev) : 1;

            if (dt > 0 && dt < 10) currentTotals[zone as keyof typeof currentTotals] += dt;

            if (i % 5 === 0 || i === times.length-1) {
                computedRace.push({ ...currentTotals });
                profile.push({ d: (dists[i] ?? 0) / 1000, a: alts[i] ?? 0 });
                const lat = latlngs[i]?.[0];
                const lng = latlngs[i]?.[1];
                if (typeof lat === 'number' && typeof lng === 'number') path.push([lat, lng]);
            }
        }

        return { 
            timeData: times, raceData: computedRace, mapPath: path, altitudeProfile: profile,
            maxTime: times.length > 0 ? (times[times.length-1] ?? 0) : 0
        };
    }, [streams, ftp]);

    const { currentTime, setCurrentTime, isPlaying, setIsPlaying, speed, setSpeed } = useReplayEngine(maxTime);

    const currentIndex = useMemo(() => {
        const rawIndex = timeData.findIndex(t => (t ?? 0) >= currentTime);
        return rawIndex === -1 ? timeData.length - 1 : rawIndex;
    }, [currentTime, timeData]);

    const displayIndex = Math.floor(currentIndex / 5); 
    const currentZones = raceData[displayIndex] || raceData[raceData.length-1];
    const pathIndex = Math.min(Math.floor(currentIndex / 5), mapPath.length - 1);
    const currentPos = mapPath[pathIndex] || null;
    const currentDistKm = streams.distance ? ((streams.distance[currentIndex] ?? 0) / 1000) : 0;

    // --- EXTRACTION DONNÉES INSTANTANÉES ---
    const instHR = streams.heartrate ? Math.round(streams.heartrate[currentIndex] ?? 0) : 0;
    const instCad = streams.cadence ? Math.round(streams.cadence[currentIndex] ?? 0) : 0;
    
    // Calcul de la vitesse instantanée (lissage sur 3 points pour éviter les sauts)
    const instSpeed = useMemo(() => {
        if (!streams.distance || !streams.time || currentIndex < 5) return 0;
        const d1 = streams.distance[currentIndex] ?? 0;
        const d0 = streams.distance[currentIndex - 5] ?? 0;
        const t1 = streams.time[currentIndex] ?? 0;
        const t0 = streams.time[currentIndex - 5] ?? 0;
        if (t1 - t0 <= 0) return 0;
        return ((d1 - d0) / (t1 - t0)) * 3.6;
    }, [currentIndex, streams]);

    // Calcul de la pente instantanée (lissage sur 10 points)
    const instGrade = useMemo(() => {
        if (!streams.altitude || !streams.distance || currentIndex < 10) return 0;
        const alt1 = streams.altitude[currentIndex] ?? 0;
        const alt0 = streams.altitude[currentIndex - 10] ?? 0;
        const dist1 = streams.distance[currentIndex] ?? 0;
        const dist0 = streams.distance[currentIndex - 10] ?? 0;
        if (dist1 - dist0 <= 10) return 0; // Pas assez de distance pour une pente fiable
        return ((alt1 - alt0) / (dist1 - dist0)) * 100;
    }, [currentIndex, streams]);

    // Couleur dynamique pour la pente
    const getGradeColor = (g: number) => {
        if (g > 8) return '#ef4444'; // Rouge (Mur)
        if (g > 4) return '#f59e0b'; // Orange (Côte)
        if (g < -2) return '#3b82f6'; // Bleu (Descente)
        return '#10b981'; // Vert (Plat)
    };

    const sortedZones = useMemo(() => {
        if (!currentZones) return [];
        const totalSeconds = Object.values(currentZones).reduce((a, b) => a + b, 0);
        return Object.entries(currentZones)
            .map(([id, seconds]) => ({ 
                seconds, 
                ...ZONES_CONFIG.find(z => z.id === id)!,
                percentage: totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0
            }))
            .sort((a, b) => b.seconds - a.seconds); 
    }, [currentZones]);

    const maxSeconds = sortedZones[0]?.seconds || 1;
    const maxProfileDist = altitudeProfile.length > 0 ? altitudeProfile[altitudeProfile.length-1].d : 1;
    const progressPercent = maxTime > 0 ? (currentTime / maxTime) * 100 : 0;

    return (
        <div style={styles.container}>
            <style jsx global>{`
                input[type=range].neon-slider { -webkit-appearance: none; width: 100%; background: transparent; cursor: pointer; }
                input[type=range].neon-slider::-webkit-slider-runnable-track { width: 100%; height: 6px; background: linear-gradient(90deg, #d04fd7 ${progressPercent}%, rgba(255,255,255,0.1) ${progressPercent}%); border-radius: 3px; border: none; }
                input[type=range].neon-slider::-webkit-slider-thumb { -webkit-appearance: none; height: 18px; width: 18px; border-radius: 50%; background: #fff; border: 2px solid #d04fd7; margin-top: -6px; box-shadow: 0 0 10px #d04fd7; transition: transform 0.1s; }
                input[type=range].neon-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
            `}</style>

            <div style={styles.header}>
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                    <button onClick={() => setIsPlaying(!isPlaying)} style={styles.btn}>
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button onClick={() => { setIsPlaying(false); setCurrentTime(0); }} style={styles.btn}>
                        <RotateCcw size={18} />
                    </button>
                    <div style={styles.speedControl}>
                        <span style={{fontSize:'0.7rem', color:'#888'}}>Vitesse:</span>
                        {[20, 100, 500].map(s => (
                            <button key={s} onClick={() => setSpeed(s)} style={{...styles.speedBtn, opacity: speed===s?1:0.5, color: speed===s?'#d04fd7':'#fff', border: speed===s?'1px solid #d04fd7':'none'}}>x{s}</button>
                        ))}
                    </div>
                </div>
                <div style={styles.timer}>
                    {formatTimeShort(currentTime)}
                </div>
            </div>

            <div style={styles.grid}>
                {/* COLONNE GAUCHE */}
                <div style={styles.raceColumn}>
                    {/* 1. Bar Race */}
                    <div style={{flex: 1, position:'relative', minHeight:'300px'}}>
                        <h3 style={styles.title}>Temps par Zone</h3>
                        <div style={styles.barsContainer}>
                            <AnimatePresence>
                                {sortedZones.map((zone, index) => (
                                    <motion.div
                                        key={zone.id}
                                        layout
                                        initial={false}
                                        animate={{ top: index * 42 }} 
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        style={{ position: 'absolute', width: '100%', height: '32px', display: 'flex', alignItems: 'center', gap: '10px' }}
                                    >
                                        <div style={{width:'30px', fontWeight:800, color: zone.color, fontSize:'0.9rem'}}>{zone.id}</div>
                                        <div style={{flex:1, height:'100%', background:'rgba(255,255,255,0.05)', borderRadius:'6px', overflow:'hidden', position:'relative'}}>
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(zone.seconds / maxSeconds) * 100}%` }}
                                                transition={{ type: "tween", ease: "linear", duration: 0.2 }}
                                                style={{ height:'100%', background: zone.color, borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:'10px', minWidth: '60px' }}
                                            >
                                                <span style={{color: index < 2 ? '#000' : '#fff', fontWeight:700, fontSize:'0.75rem', display: 'flex', gap: '6px', alignItems:'center'}}>
                                                    <span>{formatTimeShort(zone.seconds)}</span>
                                                    <span style={{fontSize:'0.65rem', opacity: 0.8, background:'rgba(0,0,0,0.2)', padding:'1px 4px', borderRadius:'4px'}}>
                                                        {zone.percentage.toFixed(0)}%
                                                    </span>
                                                </span>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* 2. 🔥 COCKPIT DE TÉLÉMÉTRIE (En bas à gauche) */}
                    <div style={{
                        marginTop: 'auto', 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '10px',
                        paddingTop: '20px',
                        borderTop: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <TelemetryItem label="PENTE" value={`${instGrade.toFixed(1)}`} unit="%" color={getGradeColor(instGrade)} icon={TrendingUp} />
                        <TelemetryItem label="VITESSE" value={Math.round(instSpeed)} unit="km/h" color="#00f3ff" icon={Gauge} />
                        <TelemetryItem label="CARDIO" value={instHR || '-'} unit="bpm" color="#ef4444" icon={Activity} />
                        <TelemetryItem label="CADENCE" value={instCad || '-'} unit="rpm" color="#10b981" icon={Zap} />
                    </div>
                </div>

                {/* COLONNE DROITE */}
                <div style={styles.visuColumn}>
                    <div style={styles.mapWrapper}>
                        {mapPath.length > 0 && <ReplayMap polyline={mapPath} currentPosition={currentPos} />}
                        <div style={styles.overlayStat}>
                            <div style={{color:'#fff', fontWeight:800, fontSize:'1.2rem', textShadow:'0 0 10px rgba(0,0,0,0.5)'}}>
                                {Math.round(streams.watts?.[currentIndex] ?? 0)} <span style={{fontSize:'0.6em', color:'#d04fd7'}}>W</span>
                            </div>
                            <div style={{color:'#ccc', fontSize:'0.8rem', fontWeight:600}}>
                                {(streams.altitude?.[currentIndex] ?? 0).toFixed(0)} m
                            </div>
                        </div>
                    </div>

                    <div style={styles.profileWrapper}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={altitudeProfile}>
                                <defs>
                                    <linearGradient id="gradAlt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#d04fd7" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#d04fd7" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Area 
                                    type="monotone" 
                                    dataKey="a" 
                                    stroke="#d04fd7" 
                                    fill="url(#gradAlt)" 
                                    strokeWidth={2}
                                    isAnimationActive={false}
                                />
                                {currentDistKm > 0 && maxProfileDist > 0 && (
                                    <line 
                                        x1={`${(currentDistKm / maxProfileDist) * 100}%`} y1="0%" 
                                        x2={`${(currentDistKm / maxProfileDist) * 100}%`} y2="100%" 
                                        stroke="#fff" strokeWidth={2} strokeDasharray="4 4"
                                    />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div style={styles.sliderContainer}>
                <input 
                    type="range" 
                    min={0} 
                    max={maxTime} 
                    value={currentTime} 
                    onChange={(e) => { setCurrentTime(Number(e.target.value)); setIsPlaying(false); }}
                    className="neon-slider" 
                />
            </div>
        </div>
    );
}

const formatTimeShort = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}h${m.toString().padStart(2, '0')}m${sec.toString().padStart(2, '0')}s`;
    return `${m}m${sec.toString().padStart(2, '0')}s`;
};

const styles: Record<string, React.CSSProperties> = {
    container: { background: 'linear-gradient(145deg, #181820 0%, #0e0e12 100%)', borderRadius: '24px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '650px', boxShadow: '0 20px 50px -10px rgba(0,0,0,0.5)' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' },
    btn: { background: '#fff', color: '#000', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 0 15px rgba(255,255,255,0.2)' },
    speedControl: { display:'flex', gap:'8px', marginLeft:'20px', alignItems:'center', background:'rgba(255,255,255,0.05)', padding:'4px 8px', borderRadius:'20px' },
    speedBtn: { background:'transparent', color:'#fff', border:'none', padding:'4px 8px', borderRadius:'12px', cursor:'pointer', fontSize:'0.75rem', fontWeight:600, transition:'all 0.2s' },
    timer: { fontFamily: 'monospace', fontSize: '1.8rem', fontWeight: 800, color: '#fff', textShadow: '0 0 20px rgba(255,255,255,0.2)' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1, minHeight: 0 },
    raceColumn: { position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }, // Ajout de flex-col
    title: { margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 },
    barsContainer: { position: 'relative', width: '100%', height: '100%' },
    visuColumn: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    mapWrapper: { flex: 2, background: '#000', borderRadius: '16px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' },
    overlayStat: { position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.6)', padding: '10px 16px', borderRadius: '12px', zIndex: 1000, backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', textAlign:'right' },
    profileWrapper: { flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '10px', border: '1px solid rgba(255,255,255,0.05)' },
    sliderContainer: { position: 'relative', height: '30px', display: 'flex', alignItems: 'center' }
};