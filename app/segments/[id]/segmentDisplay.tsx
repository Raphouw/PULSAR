// Fichier : app/segments/[id]/segmentDisplay.tsx
'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Mountain, Zap, Clock, Trophy, Activity, ArrowUpRight, MapPin, Navigation, ChevronLeft, Users, Heart, RotateCw, ArrowDown, HelpCircle, Info, Gauge, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SegmentDetail } from './page';

const SegmentProfileChart = dynamic(() => import('./segmentProfilChart'), { ssr: false, loading: () => <div className="h-full w-full bg-[#050505] animate-pulse"></div> });
const SegmentMap = dynamic(() => import('./SegmentMap'), { ssr: false, loading: () => <div className="h-full w-full bg-[#050505]"></div> });

// EXTENSION DE TYPE GLOBALE


type BadgeData = { label: string; color: string; textColor: string; border?: boolean; isManual?: boolean; };

// --- HELPERS MATHS ---
function getDist(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; const φ1 = lat1 * Math.PI / 180; const φ2 = lat2 * Math.PI / 180;
    const a = Math.sin(((lat2-lat1)*Math.PI/180)/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(((lon2-lon1)*Math.PI/180)/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// --- VULGARISATION SIGMA (PRO) ---
const getSigmaLabel = (sigma: number) => {
    if (sigma < 0.8) return { label: "MÉTRONOME", desc: "Pente constante favorisant un effort lissé (Steady State).", color: "#10b981" }; 
    if (sigma < 1.5) return { label: "VARIÉ", desc: "Fluctuations modérées nécessitant une gestion active du braquet.", color: "#3b82f6" }; 
    if (sigma < 2.5) return { label: "CASSE-PATTES", desc: "Ruptures de rythme fréquentes sollicitant les filières anaérobies.", color: "#f59e0b" }; 
    return { label: "CHANTIER", desc: "Irrégularité extrême. Effort stochastique à haute charge neuromusculaire.", color: "#ef4444" }; 
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
        if (segment.polyline[0].length >= 3) polyline = segment.polyline as number[][];
        else polyline = segment.polyline.map(p => [p[0], p[1], 0]);

        maxAlt = polyline.reduce((max, p) => Math.max(max, p[2]), -Infinity);

        if (polyline.length > 5) {
            let distAccMax = 0;
            let lastEleMax = polyline[0][2];
            
            let distAccSigma = 0;
            let lastEleSigma = polyline[0][2];
            const sigmaGrades: number[] = [];

            for (let i = 1; i < polyline.length; i++) {
                const p = polyline[i];
                const prevP = polyline[i-1];
                const stepDist = getDist(prevP[0], prevP[1], p[0], p[1]);
                
                distAccMax += stepDist;
                distAccSigma += stepDist;

                if (shouldCalcMax && distAccMax >= 5) {
                    const eleDiff = p[2] - lastEleMax;
                    if (distAccMax > 0) {
                        const grade = (eleDiff / distAccMax) * 100;
                        if (grade > maxGrade && grade < 50) maxGrade = grade;
                    }
                    distAccMax = 0; lastEleMax = p[2];
                }

                if (distAccSigma >= 25) { 
                    const eleDiff = p[2] - lastEleSigma;
                    if (distAccSigma > 0) {
                        const grade = (eleDiff / distAccSigma) * 100;
                        sigmaGrades.push(grade);
                    }
                    distAccSigma = 0; lastEleSigma = p[2];
                }
            }
            
            if (sigmaGrades.length > 1) {
                const mean = sigmaGrades.reduce((a, b) => a + b, 0) / sigmaGrades.length;
                const variance = sigmaGrades.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sigmaGrades.length;
                sigma = Math.sqrt(variance);
            }
        }
    }
    
    if (maxAlt === -Infinity) maxAlt = H; 
    if (maxGrade < AvgP) maxGrade = AvgP + (sigma * 1.5);

    // Base Physique corrigée (20/3)
    const Base = (20 * (Math.pow(H, 2) / L)) + (3 * H);
    
    const Oxygen = 1 + (maxAlt / 8000);
    const Pivot = 1 + ((sigma * (AvgP - 8)) / 50);
    const rawScore = Base * Oxygen * Pivot;
    
    return { index: Math.round(rawScore), sigma: Number(sigma.toFixed(2)), polyline, maxAlt, maxGrade, density };
};

const getSegmentBadges = (score: number, seg: SegmentDetail, density: number) => {
    const badges: BadgeData[] = [];

    let mainCat: string = 'PLAT';
    
    // Logique de classification
    if (seg.distance_m >= 50000 && density < 30) {
        mainCat = 'BOUCLE MYTHIQUE';
    }
    else if (score > 7500) mainCat = 'ICONIC'; 
    else if (score > 6500) mainCat = 'HC'; 
    else if (score > 5000) mainCat = 'CAT 1'; 
    else if (score > 3000) mainCat = 'CAT 2'; 
    else if (score > 1500) mainCat = 'CAT 3'; 
    else if (score > 1000) mainCat = 'CAT 4'; 
    else if (score > 500) mainCat = 'COTE REGION';
    
    const getBadgeStyle = (label: string) => {
        switch (label) {
            case 'ICONIC': return { label, color: '#000', textColor: '#d04fd7', border: true };
            case 'HC': return { label, color: '#ef4444', textColor: '#fff' };
            case 'CAT 1': return { label, color: '#f97316', textColor: '#fff' };
            case 'CAT 2': return { label, color: '#eab308', textColor: '#000' };
            case 'CAT 3': return { label, color: '#84cc16', textColor: '#000' };
            case 'CAT 4': return { label, color: '#10b981', textColor: '#fff' };
            case 'COTE REGION': return { label, color: '#0077B6', textColor: '#fff' };
            case 'BOUCLE MYTHIQUE': return { label, color: '#00f3ff', textColor: '#000' };
            default: return { label, color: '#3b82f6', textColor: '#fff' };
        }
    };

    badges.push(getBadgeStyle(mainCat));
    
    const name = seg.name.toLowerCase();
    const catStr = seg.category?.toLowerCase() || '';

    if (name.includes('pavé') || catStr.includes('pavé')) badges.push({ label: 'PAVÉ *****', color: '#fbbf24', textColor: '#000' });
    if (name.includes('gravel') || catStr.includes('gravel')) badges.push({ label: 'GRAVEL', color: '#a8a29e', textColor: '#000' });

    if (seg.tags && Array.isArray(seg.tags)) {
        seg.tags.forEach(tag => {
            badges.push({
                label: tag.label || 'TAG',
                color: tag.color || '#4A00A0', 
                textColor: '#fff',
                isManual: true, 
            });
        });
    }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}><Icon size={12} color={color} /> {label}</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}<span style={{ fontSize: '0.6em', color: '#666', marginLeft: '4px' }}>{unit}</span></div>
    </div>
);

const Badge = ({ data }: { data: BadgeData }) => (
    <span style={{ background: data.color, color: data.textColor, padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.5px', border: data.border ? '1px solid #d04fd7' : 'none', boxShadow: data.border ? '0 0 10px #d04fd7' : 'none', whiteSpace: 'nowrap' }}>{data.label}</span>
);

export default function SegmentDisplay({ segment, currentUserId }: { segment: SegmentDetail, currentUserId: string }) {
    const router = useRouter();
    const [hoveredPoint, setHoveredPoint] = useState<{ lat: number, lon: number } | null>(null);
    const [activeTab, setActiveTab] = useState<'personal' | 'global'>('personal');
    
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

    const personalEfforts = useMemo(() => segment.efforts.filter(e => e.user_id === currentUserId), [segment.efforts, currentUserId]);
    const displayedEfforts = activeTab === 'personal' ? personalEfforts : segment.efforts;
    const top3Personal = personalEfforts.slice(0, 3);

    return (
        <div style={{ minHeight: '100vh', color: '#F1F1F1', fontFamily: '"Inter", sans-serif', display: 'flex', flexDirection: 'column', padding: '2rem', maxWidth: '1600px', margin: '0 auto', gap: '2rem' }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1rem' }}>
                        <button onClick={() => router.push('/segments')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '12px', color: '#ccc', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} className="hover:bg-white/10 hover:text-white">
                            <ChevronLeft size={14} /> CATALOGUE
                        </button>
                        <div style={{ display: 'flex', gap: '6px' }}>{segmentBadges.map((b, i) => <Badge key={i} data={b} />)}</div>
                    </div>
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 800, margin: 0, letterSpacing: '-1.5px', lineHeight: 1 }}>{segment.name}</h1>
                </div>
                
                {/* HEADER RIGHT */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', position: 'relative' }}>
                    
                    {/* BLOC SCORE */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(0,0,0,0.4)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', zIndex: 60 }}>
                        
                        {/* GAUCHE : PULSAR INDEX */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.65rem', color: '#d04fd7', fontWeight: 800, letterSpacing: '1px' }}>PULSAR INDEX</span>
                                <div 
                                    onMouseEnter={() => setShowPulsarInfo(true)} 
                                    onMouseLeave={() => setShowPulsarInfo(false)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <HelpCircle size={12} color="#888" />
                                </div>
                            </div>
                            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', lineHeight: 0.9, fontFamily: 'monospace' }}>{pulsarIndex}</span>
                        </div>
                        
                        <div style={{ height: '30px', width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                        
                        {/* DROITE : TYPE DE PROFIL (SIGMA) */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.8rem', color: sigmaData.color, fontWeight: 800, letterSpacing: '1px' }}>{sigmaData.label}</span>
                                <div 
                                    onMouseEnter={() => setShowSigmaInfo(true)} 
                                    onMouseLeave={() => setShowSigmaInfo(false)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <HelpCircle size={12} color="#888" />
                                </div>
                            </div>
                            <span style={{ fontSize: '0.65rem', color: '#888' }}>Type de profil</span>
                        </div>

                        {/* 🔥 TOOLTIP 1 : VULGARISATION PULSAR (MISE A JOUR DES SEUILS) */}
                        {showPulsarInfo && (
                            <div style={{ 
                                position: 'absolute', top: '110%', right: '0', width: '450px', zIndex: 100,
                                background: '#0E0E14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.5rem',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.9)', pointerEvents: 'none'
                            }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '15px' }}>
                                    <Zap size={20} color="#d04fd7" fill="#d04fd7" />
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>L'INDICE PULSAR</h4>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: '#888' }}>Indice composite évaluant la charge physiologique totale.</p>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                                        <h5 style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>1. TRAVAIL MÉCANIQUE (Gravité)</h5>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#aaa' }}>
                                            Le coût énergétique n'est pas linéaire. Pondération exponentielle du dénivelé (<span style={{fontFamily:'monospace'}}>H²/L</span>) pour refléter la fatigue musculaire accrue sur les fortes pentes.
                                        </p>
                                    </div>

                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                                        <h5 style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>2. FACTEUR HYPOXIQUE (Oxygène)</h5>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#aaa' }}>
                                            Pénalité liée à la baisse de la pression partielle d'oxygène. Au-delà de 1800m, la puissance aérobie chute, augmentant drastiquement la perception de l'effort.
                                        </p>
                                    </div>

                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                                        <h5 style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>3. COÛT DE L'IRRÉGULARITÉ (Sigma)</h5>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#aaa' }}>
                                            Modulation basée sur l'écart-type de la pente (σ). Sur une pente raide, l'irrégularité impose des relances coûteuses (surcoût métabolique).
                                        </p>
                                    </div>
                                </div>

                                {/* 🔥 ECHELLE DE DOULEUR RECALIBRÉE */}
                                <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                                    <h5 style={{ margin: '0 0 8px 0', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Échelle de Difficulté</h5>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '4px', textAlign: 'center' }}>
                                        <div style={{ background: '#3b82f6', color: '#fff', padding: '4px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800 }}>0-1000<br/>REGIONAL</div>
                                        <div style={{ background: '#10b981', color: '#000', padding: '4px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800 }}>1k-3k<br/>CAT 3/4</div>
                                        <div style={{ background: '#f59e0b', color: '#000', padding: '4px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800 }}>3k-5k<br/>CAT 1/2</div>
                                        <div style={{ background: '#ef4444', color: '#fff', padding: '4px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800 }}>5k-7.5k<br/>H.C</div>
                                        <div style={{ background: '#d04fd7', color: '#fff', padding: '4px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800 }}>7500+<br/>ICONIC</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 🔥 TOOLTIP 2 : VULGARISATION SIGMA (CORRECTION SYMBOLE) */}
                        {showSigmaInfo && (
                            <div style={{ 
                                position: 'absolute', top: '110%', right: '0', width: '350px', zIndex: 100,
                                background: '#0E0E14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.5rem',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.9)', pointerEvents: 'none'
                            }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                                    <Activity size={20} color="#3b82f6" />
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>PROFIL DE PENTE (SIGMA)</h4>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: '#ccc', lineHeight: '1.4', marginBottom: '12px' }}>
                                    Analyse statistique de la variance de la pente (σ) pour déterminer la stratégie d'effort optimale.
                                </p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li style={{ fontSize: '0.75rem', color: '#aaa' }}>
                                        <span style={{ color: '#10b981', fontWeight: 800 }}>MÉTRONOME (σ &lt; 0.8)</span> : Pente constante. Permet un effort lissé type "Contre-la-montre". Rendement mécanique optimal.
                                    </li>
                                    <li style={{ fontSize: '0.75rem', color: '#aaa' }}>
                                        <span style={{ color: '#3b82f6', fontWeight: 800 }}>VARIÉ (σ &lt; 1.5)</span> : Fluctuations naturelles. Nécessite une gestion active du braquet pour maintenir la cadence.
                                    </li>
                                    <li style={{ fontSize: '0.75rem', color: '#aaa' }}>
                                        <span style={{ color: '#f59e0b', fontWeight: 800 }}>CASSE-PATTES (σ &lt; 2.5)</span> : Ruptures de rythme fréquentes. Sollicite les filières anaérobies lactiques sur les portions raides.
                                    </li>
                                    <li style={{ fontSize: '0.75rem', color: '#aaa' }}>
                                        <span style={{ color: '#ef4444', fontWeight: 800 }}>CHANTIER (σ ≥ 2.5)</span> : Chaos total. Murs verticaux suivis de replats. Charge neuromusculaire élevée, impossible de lisser l'effort.
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>

                    <button onClick={() => router.push(`/simulations/new?segmentId=${segment.id}`)} style={{ background: 'linear-gradient(135deg, #d04fd7, #8a2be2)', border: 'none', borderRadius: '14px', padding: '16px 32px', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 0 30px rgba(208,79,215,0.4)', width: '100%', justifyContent: 'center' }}>
                        <Zap size={20} fill="white" /> LANCER SIMULATION
                    </button>
                </div>
            </div>

            {/* DASHBOARD GRID (Reste inchangé) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', height: '550px' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <GlassCard style={{ flex: 2, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.7rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={12} color="#00f3ff" /> VUE SATELLITE</div>
                        <SegmentMap polyline={polyline} hoveredPoint={hoveredPoint} segmentName={segment.name} category={segment.category} grade={segment.average_grade} />
                    </GlassCard>

                    <GlassCard style={{ flex: 1, padding: '1.5rem 2rem 0 0', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ paddingLeft: '2rem', marginBottom: '5px', fontSize: '0.7rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Profil Altimétrique</div>
                        <div style={{ flex: 1, width: '100%' }}>
                            <SegmentProfileChart polyline={polyline} onHover={setHoveredPoint} />
                        </div>
                    </GlassCard>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <GlassCard style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><StatItem icon={Navigation} label="Distance" value={(segment.distance_m / 1000).toFixed(2)} unit="km" color="#fff" /></GlassCard>
                        <GlassCard style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><StatItem icon={Activity} label="Pente Moy." value={segment.average_grade.toFixed(1)} unit="%" color={segment.average_grade > 5 ? '#ef4444' : '#f59e0b'} /></GlassCard>
                        <GlassCard style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><StatItem icon={Mountain} label="Dénivelé +" value={Math.round(segment.elevation_gain_m)} unit="m" color="#10b981" /></GlassCard>
                        <GlassCard style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><StatItem icon={ArrowDown} label="Dénivelé -" value={Math.round(elevationLoss)} unit="m" color="#3b82f6" /></GlassCard>
                    </div>

                    <GlassCard style={{ padding: '1.5rem', display:'flex', flexDirection:'column', justifyContent:'center', gap:'10px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', color:'#888', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px' }}>
                            <Gauge size={16} /> Métriques Avancées
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,0.05)', paddingBottom:'8px' }}>
                            <span style={{fontSize:'0.9rem', color:'#ccc'}}>Pente Maximale</span>
                            <span style={{fontSize:'0.9rem', fontWeight:700, color: maxGrade > 15 ? '#ef4444' : '#fff'}}>{maxGrade.toFixed(1)} %</span>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,0.05)', paddingBottom:'8px' }}>
                            <span style={{fontSize:'0.9rem', color:'#ccc'}}>Densité d'Effort</span>
                            <span style={{fontSize:'0.9rem', fontWeight:700, color:'#fff'}}>{(segment.elevation_gain_m / (segment.distance_m/1000)).toFixed(0)} <small>m/km</small></span>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span style={{fontSize:'0.9rem', color:'#ccc'}}>Point Culminant</span>
                            <span style={{fontSize:'0.9rem', fontWeight:700, color:'#fff'}}>{Math.round(maxAlt)} m</span>
                        </div>
                    </GlassCard>

                    {/* TOP 3 (Reste inchangé) */}
                    <GlassCard style={{ flex: 1, padding: '2rem', background: 'linear-gradient(160deg, rgba(20,20,30,0.8), rgba(10,10,15,0.9))', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                            <Trophy size={20} color="gold" />
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '1px', margin: 0 }}>TOP 3 PERSONNEL</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                            {top3Personal.length > 0 ? top3Personal.map((effort, i) => (
                                <div key={effort.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: i === 0 ? '1px solid rgba(255, 215, 0, 0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: i === 0 ? 'gold' : i === 1 ? 'silver' : '#cd7f32', color: '#000', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i+1}</div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>{formatDuration(effort.duration_s)}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#666' }}>{new Date(effort.start_time).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: '#00f3ff' }}>{effort.avg_power_w || '-'}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>{effort.avg_speed_kmh.toFixed(1)} km/h</div>
                                    </div>
                                </div>
                            )) : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontStyle: 'italic' }}>Aucun chrono enregistré</div>}
                        </div>
                    </GlassCard>
                </div>
            </div>

            <GlassCard style={{ padding: '0' }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
                    <button onClick={() => setActiveTab('personal')} style={{ padding: '1.5rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'personal' ? '2px solid #d04fd7' : '2px solid transparent', color: activeTab === 'personal' ? '#fff' : '#666', fontWeight: 700, cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}><Clock size={16} /> HISTORIQUE PERSONNEL</button>
                    <button onClick={() => setActiveTab('global')} style={{ padding: '1.5rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'global' ? '2px solid #00f3ff' : '2px solid transparent', color: activeTab === 'global' ? '#fff' : '#666', fontWeight: 700, cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}><Users size={16} /> CLASSEMENT GLOBAL</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.2)', color: '#666', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px' }}>
                                <th style={{ padding: '1rem 2rem', textAlign: 'left' }}>Rang</th>
                                {activeTab === 'global' && <th style={{ padding: '1rem', textAlign: 'left' }}>Athlète</th>}
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Temps</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Puissance</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Vitesse</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>FC</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Cadence</th>
                                <th style={{ padding: '1rem 2rem', textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedEfforts.map((effort, i) => (
                                <tr key={effort.id} className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                    <td style={{ padding: '1rem 2rem', color: '#888', fontWeight: 700 }}>{i + 1}</td>
                                    {activeTab === 'global' && (
                                        <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#333', overflow: 'hidden' }}>{effort.user?.avatar_url ? <img src={effort.user.avatar_url} alt="" style={{width:'100%', height:'100%'}} /> : <div style={{width:'100%', height:'100%', background: '#d04fd7'}}></div>}</div>
                                            <span style={{ color: effort.user_id === currentUserId ? '#d04fd7' : '#fff', fontWeight: 600 }}>{effort.user?.name || 'Athlète Inconnu'} {effort.user_id === currentUserId && '(Moi)'}</span>
                                        </td>
                                    )}
                                    <td style={{ padding: '1rem', color: '#ccc' }}>{new Date(effort.start_time).toLocaleDateString()}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: '#fff', fontSize: '1.1rem' }}>{formatDuration(effort.duration_s)}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center', fontFamily: 'monospace', color: '#00f3ff' }}>{effort.avg_power_w || '-'}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center', fontFamily: 'monospace' }}>{effort.avg_speed_kmh.toFixed(1)}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center', color: '#ef4444', fontWeight: 600 }}><div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'4px'}}><Heart size={12}/> {effort.avg_heartrate || '-'}</div></td>
                                    <td style={{ padding: '1rem', textAlign: 'center', color: '#eab308' }}><div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'4px'}}><RotateCw size={12}/> {effort.avg_cadence || '-'}</div></td>
                                    <td style={{ padding: '1rem 2rem', textAlign: 'right' }}><button onClick={() => router.push(`/activities/${effort.activity_id}`)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#888' }} className="hover:text-white"><ArrowUpRight size={14} /></button></td>
                                </tr>
                            ))}
                            {displayedEfforts.length === 0 && <tr><td colSpan={9} style={{ padding: '4rem', textAlign: 'center', color: '#666' }}>Aucune donnée disponible pour cet onglet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}