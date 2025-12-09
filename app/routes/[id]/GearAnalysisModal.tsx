'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../../components/ui/modal';
import { 
    Settings, AlertTriangle, CheckCircle2, 
    Zap, Activity, Timer, Lock, Unlock, Sparkles, 
} from 'lucide-react';
import { 
    ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area
} from 'recharts';

// --- TYPES & CONFIG ---
interface GearAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    maxGradient: number;
    gradientDistribution: { grade: number; km: number }[];
    userProfile: { weight: number; ftp: number; bike_weight?: number };
}

// Configuration Cassettes (Modèles génériques)
// On définit les extrémités, on générera les pignons intermédiaires dynamiquement
const CASSETTE_OPTIONS = [
    { label: 'Plaine', range: [11, 23], color: '#3b82f6', type: 'road' },
    { label: 'Polyvalent', range: [11, 28], color: '#10b981', type: 'road' },
    { label: 'Grimpeur', range: [11, 30], color: '#f59e0b', type: 'road' },
    { label: 'Montagne', range: [11, 32], color: '#f97316', type: 'road' },
    { label: 'Mur', range: [11, 34], color: '#ef4444', type: 'road' },
    { label: 'Extreme', range: [10, 36], color: '#d04fd7', type: 'road' }, // Souvent 12s
    { label: 'Gravel', range: [10, 44], color: '#a855f7', type: 'gravel' }, // XPLR
    { label: 'Mullet', range: [10, 52], color: '#ec4899', type: 'mtb' }, // Eagle
];

const CHAINRINGS_2X = [
    { label: 'Pro', small: 39, big: 53, value: '53/39' },
    { label: 'Semi-Compact', small: 36, big: 52, value: '52/36' },
    { label: 'Compact', small: 34, big: 50, value: '50/34' },
    { label: 'Sub-Compact', small: 32, big: 48, value: '48/32' },
    { label: 'Gravel 2x', small: 30, big: 46, value: '46/30' },
];

const CHAINRINGS_1X = [
    { label: 'Gravel S', small: 38, big: 38, value: '38T' },
    { label: 'Gravel M', small: 40, big: 40, value: '40T' },
    { label: 'Gravel L', small: 42, big: 42, value: '42T' },
    { label: 'Road 1x', small: 44, big: 44, value: '44T' },
    { label: 'TT 1x', small: 50, big: 50, value: '50T' },
];

// Helper pour générer les pignons en fonction du nombre de vitesses
const generateCogs = (min: number, max: number, speeds: number) => {
    const cogs = [min];
    // Algo simple de répartition semi-logarithmique pour simuler une cassette réelle
    const step = (max - min) / (speeds - 1);
    for (let i = 1; i < speeds - 1; i++) {
        cogs.push(Math.round(min + (step * i)));
    }
    cogs.push(max);
    return cogs.sort((a,b) => a-b);
};

// --- MOTEUR PHYSIQUE ---
const solveSpeed = (watts: number, weightKg: number, gradientPercent: number): number => {
    if (watts <= 0) return 0;
    const g = 9.81;
    const rho = 1.225; 
    const CdA = 0.32; 
    const Crr = 0.005; 
    const slope = gradientPercent / 100;
    
    // Newton-Raphson
    const F_resist = weightKg * g * (slope + Crr);
    let v = 5; 
    for(let i=0; i<10; i++) {
        const f_v = (0.5 * rho * CdA * Math.pow(v, 3)) + (F_resist * v) - watts;
        const f_prime = (1.5 * rho * CdA * Math.pow(v, 2)) + F_resist;
        const next_v = v - (f_v / f_prime);
        if (Math.abs(next_v - v) < 0.01) { v = next_v; break; }
        v = next_v;
    }
    return Math.max(0, v * 3.6); // km/h
};

// --- COMPOSANT VISUEL ---
const DrivetrainVisualizer = ({ cogs, chainring, activeRatio, isMono }: any) => {
    // Coordonnées
    const CX_FRONT = 80;
    const CY_FRONT = 100;
    const CX_REAR = 280;
    const CY_REAR = 100;

    // Echelle
    const scaleTooth = 1.8;
    const rRear = 10 + (activeRatio.rear * scaleTooth);
    const rFront = 10 + (activeRatio.front * scaleTooth);
    
    // Tangentes Chaîne
    const dist = CX_REAR - CX_FRONT;
    const angle = Math.asin((rFront - rRear) / dist);
    
    const frontTop = { x: CX_FRONT + rFront * Math.sin(angle), y: CY_FRONT - rFront * Math.cos(angle) };
    const rearTop = { x: CX_REAR + rRear * Math.sin(angle), y: CY_REAR - rRear * Math.cos(angle) };
    const rearBot = { x: CX_REAR + rRear * Math.sin(angle), y: CY_REAR + rRear * Math.cos(angle) };
    const frontBot = { x: CX_FRONT + rFront * Math.sin(angle), y: CY_FRONT + rFront * Math.cos(angle) };

    const chainPath = `
        M ${frontTop.x} ${frontTop.y}
        L ${rearTop.x} ${rearTop.y}
        A ${rRear} ${rRear} 0 1 1 ${rearBot.x} ${rearBot.y}
        L ${frontBot.x} ${frontBot.y}
        A ${rFront} ${rFront} 0 1 1 ${frontTop.x} ${frontTop.y}
    `;

    return (
        <div style={styles.visualizerContainer}>
            <svg width="100%" height="100%" viewBox="0 0 360 200" style={{overflow: 'visible'}}>
                <defs>
                    <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <linearGradient id="chain-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#888" />
                        <stop offset="50%" stopColor="#fff" />
                        <stop offset="100%" stopColor="#888" />
                    </linearGradient>
                </defs>

                {/* CASSETTE ARRIÈRE */}
                <g transform={`translate(${CX_REAR}, ${CY_REAR})`}>
                    {/* Axe */}
                    <circle r={5} fill="#222" stroke="#444" strokeWidth="1"/>
                    
                    {/* Pignons statiques */}
                    {cogs.map((t: number, i: number) => (
                        <circle 
                            key={i} 
                            r={10 + (t * scaleTooth)} 
                            fill="none" 
                            stroke="#444" 
                            strokeWidth={1}
                            strokeOpacity={0.6}
                        />
                    ))}
                    
                    {/* PIGNON ACTIF (Celui qui tourne) */}
                    {/* 🔥 FIX ROTATION : transform-box: fill-box + origin center */}
                    <circle 
                        r={rRear} 
                        fill="none" 
                        stroke="#00f3ff" 
                        strokeWidth="3" 
                        strokeDasharray="4 3" 
                        className="spin-reverse-perfect"
                        style={{ filter: 'url(#neon-glow)' }}
                    />
                    <text y="4" textAnchor="middle" fill="#00f3ff" fontSize="10" fontWeight="bold" style={{textShadow:'0 0 5px #00f3ff'}}>{activeRatio.rear}T</text>
                </g>

                {/* PLATEAU AVANT */}
                <g transform={`translate(${CX_FRONT}, ${CY_FRONT})`}>
                    <circle r={5} fill="#222" stroke="#444" strokeWidth="1"/>
                    {!isMono && (
                        <circle r={10 + (chainring.small * scaleTooth)} fill="none" stroke="#333" strokeWidth="1" strokeDasharray="2 2" />
                    )}
                    <circle r={10 + (chainring.big * scaleTooth)} fill="none" stroke="#333" strokeWidth="1" strokeDasharray="2 2" opacity={isMono ? 0 : 1} />
                    
                    {/* PLATEAU ACTIF */}
                    <circle 
                        r={rFront} 
                        fill="none" 
                        stroke="#d04fd7" 
                        strokeWidth="3" 
                        strokeDasharray="10 5" 
                        className="spin-perfect"
                        style={{ filter: 'url(#neon-glow)' }}
                    />
                    <text y="4" textAnchor="middle" fill="#d04fd7" fontSize="10" fontWeight="bold" style={{textShadow:'0 0 5px #d04fd7'}}>{activeRatio.front}T</text>
                </g>

                {/* CHAINE */}
                <path 
                    d={chainPath} 
                    fill="none" 
                    stroke="url(#chain-grad)" 
                    strokeWidth="2.5" 
                    strokeDasharray="10 4"
                    strokeLinecap="round"
                    className="chain-dash"
                />
            </svg>
            <style jsx>{`
                /* 🔥 FIX CRITIQUE : transform-box: fill-box force le centre de rotation sur l'objet lui-même */
                .spin-perfect { 
                    transform-box: fill-box; 
                    transform-origin: center; 
                    animation: spin 6s linear infinite; 
                }
                .spin-reverse-perfect { 
                    transform-box: fill-box; 
                    transform-origin: center; 
                    animation: spin-rev 6s linear infinite; 
                }
                .chain-dash { animation: dash 0.5s linear infinite; }
                
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes spin-rev { 100% { transform: rotate(-360deg); } }
                @keyframes dash { to { stroke-dashoffset: -14; } }
            `}</style>
        </div>
    );
};

// --- COMPOSANT PRINCIPAL ---
export default function GearAnalysisModal({ isOpen, onClose, maxGradient, gradientDistribution, userProfile }: GearAnalysisModalProps) {
    // Etats de configuration
    const [speeds, setSpeeds] = useState(12); // Nombre de vitesses
    const [isMono, setIsMono] = useState(false);
    const [cassetteIdx, setCassetteIdx] = useState(2); // 11-30 par défaut
    const [chainringIdx, setChainringIdx] = useState(2); // 50/34 par défaut
    const [powerTarget, setPowerTarget] = useState(userProfile.ftp * 0.85); 

    const totalWeight = userProfile.weight + (userProfile.bike_weight || 8);
    const currentChainrings = isMono ? CHAINRINGS_1X : CHAINRINGS_2X;

    // Reset index si changement de type
    useEffect(() => { setChainringIdx(isMono ? 2 : 2); }, [isMono]);

    // Génération dynamique des pignons
    const currentCassetteRange = CASSETTE_OPTIONS[cassetteIdx];
    const currentCogs = useMemo(() => 
        generateCogs(currentCassetteRange.range[0], currentCassetteRange.range[1], speeds), 
    [currentCassetteRange, speeds]);

    // --- MOTEUR D'OPTIMISATION (IA) ---
    const optimizeGear = () => {
        // Objectif : Trouver la config qui permet d'être le plus proche de 75 RPM sur le MaxGradient
        // Sans être en dessous de 60 RPM
        
        let bestScore = Infinity;
        let bestConfig = { mono: false, cassIdx: 0, ringIdx: 0, speeds: 12 };

        // On teste tout (Mono et Double)
        [false, true].forEach(monoMode => {
            const rings = monoMode ? CHAINRINGS_1X : CHAINRINGS_2X;
            
            rings.forEach((ring, rIdx) => {
                CASSETTE_OPTIONS.forEach((cass, cIdx) => {
                    // On prend la config 12 vitesses pour la simu
                    const maxCog = cass.range[1];
                    const minRing = ring.small;
                    const ratio = minRing / maxCog;

                    // Simulation physique
                    const speedAtMax = solveSpeed(powerTarget, totalWeight, maxGradient);
                    const rpm = (speedAtMax * 1000/60) / (2.10 * ratio);

                    // Score de pénalité
                    // On vise 75 rpm. 
                    // Si rpm < 60 : Pénalité MASSIVE (c'est non)
                    // Si rpm > 90 : Pénalité (moulinette inutile)
                    let score = Math.abs(75 - rpm); 
                    if (rpm < 60) score += 1000; // Disqualifié
                    
                    // Préférence pour le double plateau sur route si gradient < 15% (moins de trous)
                    if (!monoMode && maxGradient < 15) score -= 5;

                    if (score < bestScore) {
                        bestScore = score;
                        bestConfig = { mono: monoMode, cassIdx: cIdx, ringIdx: rIdx, speeds: 12 };
                    }
                });
            });
        });

        // Appliquer la meilleure config
        setIsMono(bestConfig.mono);
        setCassetteIdx(bestConfig.cassIdx);
        setChainringIdx(bestConfig.ringIdx);
        setSpeeds(12); // Standard moderne optimal
    };

    // --- CALCULS ANALYTIQUES (En Temps Réel) ---
    const analysis = useMemo(() => {
        const chainring = currentChainrings[chainringIdx];
        const easiestRatio = chainring.small / currentCogs[currentCogs.length - 1];
        
        // Graphique
        const chartData: { grade: number; rpm: number; speed: string }[] = [];        for (let g = 0; g <= 20; g+=0.5) {
            const speedKmh = solveSpeed(powerTarget, totalWeight, g);
            const speedM_min = (speedKmh * 1000) / 60;
            const rpm = speedM_min / (2.10 * easiestRatio);
            chartData.push({ grade: g, rpm: Math.min(130, Math.round(rpm)), speed: speedKmh.toFixed(1) });
        }

        // Stats Critiques
        const speedAtMax = solveSpeed(powerTarget, totalWeight, maxGradient);
        const rpmAtMax = (speedAtMax * 1000/60) / (2.10 * easiestRatio);

        // Temps Perdu
        let timeLost = 0;
        let grindingKm = 0;
        gradientDistribution.forEach(segment => {
            if (segment.grade > 3) {
                const sKmh = solveSpeed(powerTarget, totalWeight, segment.grade);
                const sRpm = (sKmh * 1000/60) / (2.10 * easiestRatio);
                if (sRpm < 60) {
                    const efficiency = 1 - ((60 - sRpm) * 0.008);
                    grindingKm += segment.km;
                    const t_ideal = (segment.km * 3600) / sKmh;
                    const sReal = solveSpeed(powerTarget * efficiency, totalWeight, segment.grade);
                    timeLost += ((segment.km * 3600) / sReal) - t_ideal;
                }
            }
        });

        return { chartData, rpmAtMax, chainring, timeLost, grindingKm, easiestRatio };
    }, [cassetteIdx, chainringIdx, powerTarget, totalWeight, maxGradient, gradientDistribution, currentChainrings, currentCogs]);

    const isOptimal = analysis.rpmAtMax > 65;
    const isCritical = analysis.rpmAtMax < 55;

    // Helper couleur Slider
    const getSliderColor = (val: number) => val < userProfile.ftp * 0.75 ? '#3b82f6' : val < userProfile.ftp * 0.95 ? '#10b981' : '#ef4444';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div style={styles.container}>
                
                {/* HEADER */}
                <div style={styles.header}>
                    <div>
                        <h2 style={styles.title}>ANALYSE BRAQUET <span style={{color:'#d04fd7'}}>PULSAR</span></h2>
                        <div style={styles.subtitle}>
                            Optimisation dynamique pour {userProfile.weight}kg + {userProfile.bike_weight}kg
                        </div>
                    </div>
                    
                    {/* BOUTON MAGIC OPTIMIZE */}
                    <button onClick={optimizeGear} style={styles.magicBtn}>
                        <Sparkles size={16} /> RECOMMANDATION
                    </button>
                </div>

                {/* VISUALISATION */}
                <div style={styles.gridMain}>
                    
                    <div style={styles.visuBox}>
                        <div style={styles.visuLabel}>SIMULATION MÉCANIQUE</div>
                        <DrivetrainVisualizer 
                            cogs={currentCogs}
                            chainring={analysis.chainring} 
                            activeRatio={{front: analysis.chainring.small, rear: currentCogs[currentCogs.length-1]}} // Visu sur le plus petit braquet
                            isMono={isMono}
                        />
                        <div style={styles.ratioStats}>
                            <div>Braquet Min: <strong style={{color:'#00f3ff'}}>{analysis.chainring.small}x{currentCogs[currentCogs.length-1]}</strong></div>
                            <div>Ratio: <strong style={{color:'#d04fd7'}}>{analysis.easiestRatio.toFixed(2)}</strong></div>
                        </div>
                    </div>

                    <div style={styles.controls}>
                        
                        {/* SELECTEUR VITESSES */}
                        <div style={styles.controlRow}>
                            <div style={styles.label}>VITESSES</div>
                            <div style={styles.pillContainer}>
                                {[10, 11, 12, 13].map(s => (
                                    <div 
                                        key={s} 
                                        onClick={() => setSpeeds(s)}
                                        style={speeds === s ? styles.pillActive : styles.pill}
                                    >
                                        {s}v
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SELECTEUR TRANSMISSION */}
                        <div style={styles.controlRow}>
                            <div style={styles.label}>TYPE</div>
                            <div style={styles.pillContainer}>
                                <button onClick={()=>setIsMono(false)} style={!isMono ? styles.pillActive : styles.pill}><Lock size={12}/> 2x</button>
                                <button onClick={()=>setIsMono(true)} style={isMono ? styles.pillActive : styles.pill}><Unlock size={12}/> 1x</button>
                            </div>
                        </div>

                        {/* SELECTEUR CASSETTE */}
                        <div style={styles.controlSection}>
                            <div style={styles.label}>CASSETTE ({speeds}V)</div>
                            <div style={styles.gridButtons}>
                                {CASSETTE_OPTIONS.map((c, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => setCassetteIdx(i)}
                                        style={i === cassetteIdx ? {...styles.optionBtn, borderColor: c.color, background: `${c.color}20`, color:'#fff'} : styles.optionBtn}
                                    >
                                        <b>{c.range[0]}-{c.range[1]}</b> <span style={{opacity:0.6, fontSize:'0.6rem'}}>{c.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                         {/* SELECTEUR PLATEAU */}
                         <div style={styles.controlSection}>
                            <div style={styles.label}>PLATEAU</div>
                            <div style={styles.gridButtons}>
                                {currentChainrings.map((c, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => setChainringIdx(i)}
                                        style={i === chainringIdx ? {...styles.optionBtn, borderColor: '#d04fd7', background: `#d04fd720`, color:'#fff'} : styles.optionBtn}
                                    >
                                        <b>{c.value}</b> <span style={{opacity:0.6, fontSize:'0.6rem'}}>{c.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* SLIDER PUISSANCE */}
                        <div style={{marginTop:'auto'}}>
                            <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.75rem', marginBottom:'5px', color:'#888'}}>
                                <span>Simuler à :</span>
                                <span style={{color: getSliderColor(powerTarget), fontWeight:'bold'}}>{Math.round(powerTarget)} W</span>
                            </div>
                            <input 
                                type="range" min={100} max={450} value={powerTarget} onChange={(e) => setPowerTarget(Number(e.target.value))}
                                style={{width: '100%', accentColor: getSliderColor(powerTarget), height: '4px', cursor:'col-resize'}}
                            />
                        </div>

                    </div>
                </div>

                {/* ANALYSE */}
                <div style={styles.gridStats}>
                    <div style={styles.chartContainer}>
                        <div style={styles.chartTitle}>CADENCE PROJETÉE</div>
                        <ResponsiveContainer width="100%" height={160}>
                            <ComposedChart data={analysis.chartData} margin={{top:10, right:10, left:-20, bottom:0}}>
                                <defs>
                                    <linearGradient id="rpmGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#00f3ff" stopOpacity={0.4}/>
                                        <stop offset="100%" stopColor="#00f3ff" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="grade" stroke="#666" fontSize={10} tickFormatter={(v)=>`${v}%`} />
                                <YAxis stroke="#666" fontSize={10} domain={[0, 120]} />
                                <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="3 3" />
                                <Area type="monotone" dataKey="rpm" stroke="#00f3ff" fill="url(#rpmGrad)" strokeWidth={2} />
                                <ReferenceLine x={maxGradient} stroke="#d04fd7" label={{value:`MUR ${maxGradient}%`, fill:'#d04fd7', fontSize:9, position:'insideTopRight'}} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* KPI */}
                    <div style={styles.kpiColumn}>
                        <div style={{...styles.kpiCard, borderLeft: isCritical ? '3px solid #ef4444' : '3px solid #10b981'}}>
                            <div style={styles.kpiLabel}><Activity size={14}/> RPM MINIMUM</div>
                            <div style={{fontSize:'2rem', fontWeight:'900', color: isCritical ? '#ef4444' : '#fff', lineHeight:1}}>
                                {Math.round(analysis.rpmAtMax)}
                            </div>
                            <div style={styles.kpiSub}>Dans le passage le plus dur</div>
                        </div>

                        <div style={{...styles.kpiCard, borderLeft: analysis.timeLost > 20 ? '3px solid #f59e0b' : '3px solid #333'}}>
                            <div style={styles.kpiLabel}><Timer size={14}/> PERTE EFFICACITÉ</div>
                            <div style={{fontSize:'2rem', fontWeight:'900', color: analysis.timeLost > 20 ? '#f59e0b' : '#888', lineHeight:1}}>
                                +{Math.round(analysis.timeLost)}s
                            </div>
                            <div style={styles.kpiSub}>Sur temps total montée</div>
                        </div>
                    </div>
                </div>

            </div>
        </Modal>
    );
}

// --- STYLES ---
const styles: Record<string, React.CSSProperties> = {
    container: { color: '#f1f1f1', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: '1.2rem' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' },
    title: { margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.5px' },
    subtitle: { fontSize: '0.75rem', color: '#888' },

    magicBtn: { background: 'linear-gradient(135deg, #d04fd7 0%, #8b5cf6 100%)', border: 'none', padding: '8px 16px', borderRadius: '20px', color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 0 15px rgba(208, 79, 215, 0.4)' },
    
    gridMain: { display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem' },
    
    visuBox: { background: '#0a0a0f', borderRadius: '12px', border: '1px solid #222', height: '320px', position: 'relative', overflow: 'hidden' },
    visuLabel: { position: 'absolute', top: 12, left: 12, fontSize: '0.65rem', fontWeight: 800, color: '#444', letterSpacing: '1px' },
    visualizerContainer: { width: '100%', height: '100%' },
    ratioStats: { position: 'absolute', bottom: 12, right: 15, textAlign: 'right', fontSize: '0.75rem', color: '#666', lineHeight: 1.4 },

    controls: { display: 'flex', flexDirection: 'column', gap: '0.8rem' },
    controlRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    controlSection: { display: 'flex', flexDirection: 'column', gap: '5px' },
    label: { fontSize: '0.65rem', fontWeight: 800, color: '#666' },

    pillContainer: { display: 'flex', background: '#111', borderRadius: '6px', padding: '2px' },
    pill: { padding: '4px 10px', fontSize: '0.75rem', color: '#666', cursor: 'pointer', borderRadius: '4px', display:'flex', gap:'4px', alignItems:'center' },
    pillActive: { padding: '4px 10px', fontSize: '0.75rem', background: '#333', color: '#fff', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', display:'flex', gap:'4px', alignItems:'center' },

    gridButtons: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' },
    optionBtn: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '8px', color: '#888', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize:'0.8rem' },

    gridStats: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' },
    chartContainer: { background: '#0a0a0f', borderRadius: '12px', padding: '10px', border: '1px solid #222' },
    chartTitle: { fontSize: '0.65rem', fontWeight: 800, color: '#444', marginBottom: '5px' },
    
    kpiColumn: { display: 'flex', flexDirection: 'column', gap: '8px' },
    kpiCard: { background: '#0a0a0f', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' },
    kpiLabel: { fontSize: '0.6rem', fontWeight: 800, color: '#666', marginBottom: '4px', display: 'flex', gap: '4px', alignItems: 'center' },
    kpiSub: { fontSize: '0.65rem', color: '#444', marginTop: '2px' },
};