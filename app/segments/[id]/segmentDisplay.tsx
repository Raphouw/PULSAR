'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { 
    Mountain, Zap, Clock, Trophy, Activity, ArrowUpRight, MapPin, 
    Navigation, ChevronLeft, Users, Heart, RotateCw, ArrowDown, 
    HelpCircle, Gauge, TrendingUp, Scale, User, Award, Target, ArrowUpDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SegmentDetail } from './page';

const SegmentProfileChart = dynamic(() => import('./segmentProfilChart'), { ssr: false, loading: () => <div className="h-full w-full bg-[#050505] animate-pulse rounded-2xl"></div> });
const SegmentMap = dynamic(() => import('./SegmentMap'), { ssr: false, loading: () => <div className="h-full w-full bg-[#050505] rounded-2xl"></div> });

type BadgeData = { label: string; color: string; textColor: string; border?: boolean; isManual?: boolean; };

// --- HELPERS MATHS ---
function getDist(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; const φ1 = lat1 * Math.PI / 180; const φ2 = lat2 * Math.PI / 180;
    const a = Math.sin(((lat2-lat1)*Math.PI/180)/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(((lon2-lon1)*Math.PI/180)/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const getSigmaLabel = (sigma: number) => {
    if (sigma < 0.8) return { label: "MÉTRONOME", color: "#10b981" }; 
    if (sigma < 1.5) return { label: "VARIÉ", color: "#3b82f6" }; 
    if (sigma < 2.5) return { label: "CASSE-PATTES", color: "#f59e0b" }; 
    return { label: "CHANTIER", color: "#ef4444" }; 
};

const calculatePulsarMetrics = (segment: SegmentDetail) => {
    const H = Math.max(1, segment.elevation_gain_m); 
    const L = Math.max(100, segment.distance_m); 
    const AvgP = Math.max(0, segment.average_grade); 
    const density = H / (L / 1000); 
    let sigma = 0;
    let maxAlt = -Infinity;
    let maxGrade = (segment.max_grade && segment.max_grade > AvgP) ? segment.max_grade : 0; 
    const shouldCalcMax = maxGrade === 0;
    let polyline: number[][] = [];
    if (segment.polyline && Array.isArray(segment.polyline) && segment.polyline.length > 0) {
        polyline = segment.polyline.map(p => [p[0], p[1], p[2] || 0]);
        maxAlt = polyline.reduce((max, p) => Math.max(max, p[2]), -Infinity);
        if (polyline.length > 5) {
            let distAccMax = 0; let lastEleMax = polyline[0][2];
            let distAccSigma = 0; let lastEleSigma = polyline[0][2];
            const sigmaGrades: number[] = [];
            for (let i = 1; i < polyline.length; i++) {
                const p = polyline[i]; const prevP = polyline[i-1];
                const stepDist = getDist(prevP[0], prevP[1], p[0], p[1]);
                distAccMax += stepDist; distAccSigma += stepDist;
                if (shouldCalcMax && distAccMax >= 5) {
                    const grade = ((p[2] - lastEleMax) / distAccMax) * 100;
                    if (grade > maxGrade && grade < 50) maxGrade = grade;
                    distAccMax = 0; lastEleMax = p[2];
                }
                if (distAccSigma >= 25) { 
                    sigmaGrades.push(((p[2] - lastEleSigma) / distAccSigma) * 100);
                    distAccSigma = 0; lastEleSigma = p[2];
                }
            }
            if (sigmaGrades.length > 1) {
                const mean = sigmaGrades.reduce((a, b) => a + b, 0) / sigmaGrades.length;
                sigma = Math.sqrt(sigmaGrades.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sigmaGrades.length);
            }
        }
    }
    if (maxAlt === -Infinity) maxAlt = H; 
    const Base = (20 * (Math.pow(H, 2) / L)) + (3 * H);
    const score = Base * (1 + (maxAlt / 8000)) * (1 + ((sigma * (AvgP - 8)) / 50));
    return { index: Math.round(score), sigma: Number(sigma.toFixed(2)), polyline, maxAlt, maxGrade, density };
};

const getSegmentBadges = (score: number, seg: SegmentDetail, density: number) => {
    const badges: BadgeData[] = [];
    let mainCat = score > 7500 ? 'ICONIC' : score > 6500 ? 'HC' : score > 5000 ? 'CAT 1' : score > 3000 ? 'CAT 2' : score > 1500 ? 'CAT 3' : score > 1000 ? 'CAT 4' : 'COTE REGION';
    if (seg.distance_m >= 50000 && density < 30) mainCat = 'BOUCLE MYTHIQUE';
    const getStyle = (l: string) => {
        if (l === 'ICONIC') return { label: l, color: '#000', textColor: '#d04fd7', border: true };
        if (l === 'HC') return { label: l, color: '#ef4444', textColor: '#fff' };
        if (l === 'BOUCLE MYTHIQUE') return { label: l, color: '#00f3ff', textColor: '#000' };
        return { label: l, color: '#3b82f6', textColor: '#fff' };
    };
    badges.push(getStyle(mainCat));
    if (seg.tags) seg.tags.forEach(t => badges.push({ label: t.label, color: t.color, textColor: '#fff' }));
    return badges;
};

const formatDuration = (s: number) => {
    const m = Math.floor(s / 60); const sec = s % 60;
    return `${m}' ${sec.toString().padStart(2, '0')}"`;
};

const GlassCard = ({ children, className = "", style = {} }: any) => (
    <div style={{ background: 'rgba(20, 20, 30, 0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', overflow: 'hidden', ...style }} className={className}>{children}</div>
);

const StatItem = ({ label, value, unit, color, icon: Icon }: any) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}><Icon size={12} color={color} /> {label}</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}<span style={{ fontSize: '0.6em', color: '#666', marginLeft: '4px' }}>{unit}</span></div>
    </div>
);

export default function SegmentDisplay({ segment, currentUserId }: { segment: SegmentDetail, currentUserId: string }) {
    const router = useRouter();
    const [hoveredPoint, setHoveredPoint] = useState<{ lat: number, lon: number } | null>(null);
    const [activeTab, setActiveTab] = useState<'personal' | 'global'>('personal');
    
    // --- ÉTATS TRIS & FILTRES ---
    const [sortBy, setSortBy] = useState('chrono');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filterWeight, setFilterWeight] = useState('All');
    const [filterAge, setFilterAge] = useState('All');

    const [showPulsarInfo, setShowPulsarInfo] = useState(false);
    const [showSigmaInfo, setShowSigmaInfo] = useState(false);

    const { index: pulsarIndex, sigma, polyline, maxAlt, maxGrade, density } = useMemo(() => calculatePulsarMetrics(segment), [segment]);
    const sigmaData = getSigmaLabel(sigma);
    const segmentBadges = getSegmentBadges(pulsarIndex, segment, density);

    const elevationLoss = useMemo(() => {
        let loss = 0;
        for (let i = 1; i < polyline.length; i++) {
            const diff = polyline[i][2] - polyline[i-1][2];
            if (diff < 0) loss += Math.abs(diff);
        }
        return loss;
    }, [polyline]);

    const handleSort = (key: string) => {
        if (sortBy === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder(key === 'chrono' || key === 'athlete' ? 'asc' : 'desc');
        }
    };

    const personalEfforts = useMemo(() => {
        return segment.efforts
            .filter(e => String(e.user_id) === String(currentUserId))
            .sort((a, b) => a.duration_s - b.duration_s);
    }, [segment.efforts, currentUserId]);

    const processedEfforts = useMemo(() => {
        let base = activeTab === 'personal' ? personalEfforts : segment.efforts;

        if (activeTab === 'global') {
            base = base.filter((e: any) => {
                const w = e.user?.weight || 75;
                const a = e.user?.age || 35;
                let weightMatch = true;
                if (filterWeight === '< 65kg') weightMatch = w < 65;
                else if (filterWeight === '65-80kg') weightMatch = w >= 65 && w <= 80;
                else if (filterWeight === '> 80kg') weightMatch = w > 80;
                let ageMatch = true;
                if (filterAge === 'Espoir') ageMatch = a < 30;
                else if (filterAge === 'Senior') ageMatch = a >= 30 && a <= 45;
                else if (filterAge === 'Master') ageMatch = a > 45;
                return weightMatch && ageMatch;
            });
        }

        return [...base].sort((a: any, b: any) => {
            let valA, valB;
            switch (sortBy) {
                case 'athlete': valA = a.user?.name || ''; valB = b.user?.name || ''; break;
                case 'date': valA = new Date(a.start_time).getTime(); valB = new Date(b.start_time).getTime(); break;
                case 'watts': valA = a.avg_power_w || 0; valB = b.avg_power_w || 0; break;
                case 'wkg': 
                    valA = (a.avg_power_w || 0) / (a.user?.weight || 75); 
                    valB = (b.avg_power_w || 0) / (b.user?.weight || 75); 
                    break;
                case 'speed': valA = a.avg_speed_kmh || 0; valB = b.avg_speed_kmh || 0; break;
                case 'heartrate': valA = a.avg_heartrate || 0; valB = b.avg_heartrate || 0; break;
                case 'cadence': valA = a.avg_cadence || 0; valB = b.avg_cadence || 0; break;
                default: valA = a.duration_s; valB = b.duration_s;
            }
            return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
        });
    }, [segment.efforts, activeTab, personalEfforts, filterWeight, filterAge, sortBy, sortOrder]);

    return (
        <div style={{ minHeight: '100vh', color: '#F1F1F1', fontFamily: '"Inter", sans-serif', display: 'flex', flexDirection: 'column', padding: '2rem', maxWidth: '1600px', margin: '0 auto', gap: '2rem' }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1rem' }}>
                        <button onClick={() => router.push('/segments')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '12px', color: '#ccc', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                            <ChevronLeft size={14} /> CATALOGUE
                        </button>
                        <div style={{ display: 'flex', gap: '6px' }}>{segmentBadges.map((b, i) => <span key={i} style={{ background: b.color, color: b.textColor, padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, border: b.border ? '1px solid #d04fd7' : 'none' }}>{b.label}</span>)}</div>
                    </div>
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 800, margin: 0, letterSpacing: '-1.5px', lineHeight: 1 }}>{segment.name}</h1>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(0,0,0,0.4)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.65rem', color: '#d04fd7', fontWeight: 800 }}>PULSAR INDEX</span>
                            <HelpCircle size={12} color="#888" onMouseEnter={() => setShowPulsarInfo(true)} onMouseLeave={() => setShowPulsarInfo(false)} />
                        </div>
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', lineHeight: 0.9 }}>{pulsarIndex}</span>
                    </div>
                    <div style={{ height: '30px', width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.8rem', color: sigmaData.color, fontWeight: 800 }}>{sigmaData.label}</span>
                        <span style={{ fontSize: '0.65rem', color: '#888' }}>Profil de pente</span>
                    </div>
                </div>
            </div>

            {/* GRID DASHBOARD */}
            {/* GRID DASHBOARD - RECTIFIÉE POUR LE TROU */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* MAP SATELLITE */}
                    <GlassCard style={{ height: '350px', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700 }}><MapPin size={12} color="#00f3ff" className="inline mr-2" /> VUE SATELLITE</div>
                        <SegmentMap polyline={polyline} hoveredPoint={hoveredPoint} segmentName={segment.name} category={segment.category} grade={segment.average_grade} />
                    </GlassCard>

                    {/* PROFIL ALTIMÉTRIQUE - flex: 1 pour combler le vide */}
                    <GlassCard style={{ flex: 1, padding: '1.5rem 2rem 0 0', display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
                        <div style={{ paddingLeft: '2rem', marginBottom: '5px', fontSize: '0.7rem', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Profil Altimétrique</div>
                        <div style={{ flex: 1 }}>
                            <SegmentProfileChart polyline={polyline} onHover={setHoveredPoint} />
                        </div>
                    </GlassCard>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* STATS RAPIDES - CENTRÉES */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <GlassCard style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><StatItem icon={Navigation} label="Distance" value={(segment.distance_m / 1000).toFixed(2)} unit="km" color="#fff" /></GlassCard>
                        <GlassCard style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><StatItem icon={Activity} label="Pente Moy." value={segment.average_grade.toFixed(1)} unit="%" color="#ef4444" /></GlassCard>
                        <GlassCard style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><StatItem icon={Mountain} label="Dénivelé +" value={Math.round(segment.elevation_gain_m)} unit="m" color="#10b981" /></GlassCard>
                        <GlassCard style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><StatItem icon={ArrowDown} label="Dénivelé -" value={Math.round(elevationLoss)} unit="m" color="#3b82f6" /></GlassCard>
                    </div>

                    {/* MÉTRIQUES AVANCÉES */}
                    <GlassCard style={{ padding: '1.5rem', display:'flex', flexDirection:'column', justifyContent:'center', gap:'10px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', color:'#888', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase' }}><Gauge size={16} /> Métriques Avancées</div>
                        <div style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.05)', paddingBottom:'8px' }}>
                            <span style={{fontSize:'0.9rem', color:'#ccc'}}>Pente Maximale</span>
                            <span style={{fontSize:'0.9rem', fontWeight:800}}>{maxGrade.toFixed(1)} %</span>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.05)', paddingBottom:'8px' }}>
                            <span style={{fontSize:'0.9rem', color:'#ccc'}}>Densité d'Effort</span>
                            <span style={{fontSize:'0.9rem', fontWeight:800}}>{density.toFixed(0)} <small>m/km</small></span>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between' }}>
                            <span style={{fontSize:'0.9rem', color:'#ccc'}}>Point Culminant</span>
                            <span style={{fontSize:'0.9rem', fontWeight:800}}>{Math.round(maxAlt)} m</span>
                        </div>
                    </GlassCard>

                    {/* 🔥 BLOC OBJECTIF TOP 1 (STYLE ORIGINAL) */}
                    <GlassCard style={{ 
                        flex: 1, padding: '2rem', background: 'linear-gradient(160deg, rgba(20,20,30,0.8), rgba(10,10,15,0.9))', 
                        border: '1px solid rgba(208, 79, 215, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                            <Trophy size={20} color="#d04fd7" />
                            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>OBJECTIF TOP 1</h3>
                        </div>
                        {segment.efforts.length > 0 ? (() => {
                            const top1 = [...segment.efforts].sort((a,b) => a.duration_s - b.duration_s)[0];
                            const myBest = personalEfforts[0];
                            if (myBest && myBest.id === top1.id) return (
                                <div style={{ textAlign: 'center', padding: '1rem' }}>
                                    <Zap size={40} color="#facc15" fill="#facc15" style={{ margin: '0 auto 15px' }} />
                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>ROI DU SEGMENT</div>
                                </div>
                            );
                            
                            const myWatts = myBest?.avg_power_w ?? 250;
                            const myTime = myBest?.duration_s ?? 1;
                            const estimatedTargetWatts = myBest ? Math.round(myWatts * (myTime / top1.duration_s)) : 350;
                            const wattGain = myBest ? estimatedTargetWatts - myWatts : null;

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Temps à battre</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>{formatDuration(top1.duration_s)}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#00f3ff' }}>Détenteur : {top1.user?.name || 'Anonyme'}</div>
                                    </div>

                                    <div style={{ height: '1px', width: '100%', background: 'rgba(255,255,255,0.05)' }}></div>

                                    <div style={{ background: 'rgba(208, 79, 215, 0.05)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(208, 79, 215, 0.1)' }}>
                                        <div style={{ fontSize: '0.65rem', color: '#d04fd7', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>Puissance Requise Est.</div>
                                        <div style={{ fontSize: '2.2rem', fontWeight: 950, color: '#fff', lineHeight: 1 }}>{estimatedTargetWatts}<small style={{ fontSize: '0.4em', marginLeft: '5px', color: '#666' }}>W</small></div>
                                        {wattGain !== null && <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 700, marginTop: '5px' }}>+{wattGain}W par rapport à votre PR</div>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.55rem', color: '#555', fontWeight: 800, textTransform: 'uppercase' }}>VAM Cible</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{Math.round((segment.elevation_gain_m / top1.duration_s) * 3600)} <small style={{color:'#444'}}>m/h</small></div>
                                        </div>
                                        <div style={{ flex: 1, textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.55rem', color: '#555', fontWeight: 800, textTransform: 'uppercase' }}>W/Kg Cible</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{(estimatedTargetWatts / 75).toFixed(2)} <small style={{color:'#444'}}>w/kg</small></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })() : <div style={{ color: '#555', fontSize: '0.8rem', textAlign: 'center' }}>Données insuffisantes.</div>}
                    </GlassCard>
                </div>
            </div>

            {/* SECTION TABLEAU AVEC TRIS */}
            <GlassCard style={{ padding: '0', marginTop: '1rem' }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 1rem', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex' }}>
                        <button onClick={() => setActiveTab('personal')} style={{ padding: '1.5rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'personal' ? '2px solid #d04fd7' : '2px solid transparent', color: activeTab === 'personal' ? '#fff' : '#666', fontWeight: 700, cursor: 'pointer' }}>HISTORIQUE</button>
                        <button onClick={() => setActiveTab('global')} style={{ padding: '1.5rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'global' ? '2px solid #00f3ff' : '2px solid transparent', color: activeTab === 'global' ? '#fff' : '#666', fontWeight: 700, cursor: 'pointer' }}>HALL OF LEGENDS</button>
                    </div>
                    {activeTab === 'global' && (
                        <div style={{ display: 'flex', gap: '8px', paddingRight: '1rem' }}>
                            <FilterSelect value={filterWeight} options={['All', '< 65kg', '65-80kg', '> 80kg']} onChange={setFilterWeight} icon={<Scale size={12}/>} />
                            <FilterSelect value={filterAge} options={['All', 'Espoir', 'Senior', 'Master']} onChange={setFilterAge} icon={<User size={12}/>} />
                        </div>
                    )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.2)', color: '#666', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 800 }}>
                                <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left' }}>RANG</th>
                                <SortHeader label="ATHLÈTE" active={sortBy === 'athlete'} onClick={() => handleSort('athlete')} />
                                <SortHeader label="DATE" active={sortBy === 'date'} onClick={() => handleSort('date')} />
                                <SortHeader label="TEMPS" active={sortBy === 'chrono'} onClick={() => handleSort('chrono')} center />
                                <SortHeader label="WATT" active={sortBy === 'watts'} onClick={() => handleSort('watts')} center />
                                <SortHeader label="W/KG" active={sortBy === 'wkg'} onClick={() => handleSort('wkg')} center color="#facc15" />
                                <SortHeader label="KM/H" active={sortBy === 'speed'} onClick={() => handleSort('speed')} center />
                                <SortHeader label="BPM" active={sortBy === 'heartrate'} onClick={() => handleSort('heartrate')} center color="#ef4444" />
                                <SortHeader label="RPM" active={sortBy === 'cadence'} onClick={() => handleSort('cadence')} center color="#eab308" />
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>DÉTAILS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedEfforts.map((effort: any, i) => {
                                const w = effort.user?.weight || 75;
                                const wkg = effort.avg_power_w ? (effort.avg_power_w / w).toFixed(2) : '-';
                                const h = effort.user?.height || 180;
                                const imc = (w / Math.pow(h/100, 2)).toFixed(1);
                                return (
                                    <tr key={effort.id} className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                        <td style={{ padding: '1.2rem 1.5rem', fontWeight: 800, color: i < 3 ? '#d04fd7' : '#444' }}>#{i + 1}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#222', overflow: 'hidden' }}>
                                                    {effort.user?.avatar_url && <img src={effort.user.avatar_url} alt="" style={{width:'100%'}} />}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: effort.user_id === currentUserId ? '#d04fd7' : '#fff' }}>{effort.user?.name || 'Anonyme'}</div>
                                                    <div style={{ fontSize: '0.6rem', color: '#555' }}>IMC {imc} • {w}kg</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', color: '#ccc', fontSize: '0.75rem' }}>{new Date(effort.start_time).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, fontSize: '1rem' }}>{formatDuration(effort.duration_s)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', color: '#00f3ff', fontWeight: 700 }}>{effort.avg_power_w || '-'}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', color: '#facc15', fontWeight: 900 }}>{wkg}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>{effort.avg_speed_kmh?.toFixed(1)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>{effort.avg_heartrate || '-'}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', color: '#eab308' }}>{effort.avg_cadence || '-'}</td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            <button onClick={() => router.push(`/activities/${effort.activity_id}`)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}><ArrowUpRight size={14} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}

function SortHeader({ label, active, onClick, center, color }: any) {
    return (
        <th onClick={onClick} style={{ padding: '1rem', textAlign: center ? 'center' : 'left', cursor: 'pointer', color: active ? '#fff' : (color || '#666'), borderBottom: active ? '2px solid #d04fd7' : 'none' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{label} <ArrowUpDown size={10} style={{ opacity: active ? 1 : 0.2 }} /></div>
        </th>
    );
}

function FilterSelect({ value, options, onChange, icon }: any) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#666' }}>{icon}</span>
            <select value={value} onChange={(e) => onChange(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                {options.map((opt: any) => (<option key={typeof opt === 'string' ? opt : opt.v} value={typeof opt === 'string' ? opt : opt.v} style={{background: '#0a0a0c'}}>{typeof opt === 'string' ? opt : opt.l}</option>))}
            </select>
        </div>
    );
}