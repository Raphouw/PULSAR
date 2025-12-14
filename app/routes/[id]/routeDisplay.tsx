'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, Activity, Mountain, TrendingUp, Info,
  Map as MapIcon, Zap, BarChart3, Layers, Gauge, HelpCircle, ChevronRight, Flag, Settings2, Trophy
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { Route, UserProfile } from "./page";
import { Modal } from '../../../components/ui/modal';
import ClimbDetailModal from './ClimbDetailModal';
import GearAnalysisModal from './GearAnalysisModal'; // 🔥 IMPORT NOUVEAU

// DYNAMIC IMPORTS
const ActivityMap = dynamic(() => import('../../activities/[id]/activityMap'), {
  ssr: false,
  loading: () => <div style={skeletons.map}>Initialisation cartographique...</div>,
});
const AltitudeChart = dynamic(() => import('./altitudeChart'), { 
  ssr: false,
  loading: () => <div style={skeletons.chart}>Calcul du profil...</div>
});
const AltitudeChartAny = AltitudeChart as any;

// --- TYPES ---
export interface Climb {
  id: number;
  startDist: number;
  endDist: number;
  avgGrade: number;
  elevationGain: number;
  maxGradient?: number; 
  startKm: number;
  endKm: number;
  startIndex?: number;
  endIndex?: number;
  score?: number; 
  category?: { label: string; color: string; textColor: string };
}

type ProcessedPoint = {
    dist: number;
    ele: number;
    smoothedSlope: number;
    index: number;
};

// --- HELPERS ---
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const getGradeColor = (grade: number) => {
    if (grade >= 10) return '#d04fd7';
    if (grade >= 8) return '#ef4444';
    if (grade >= 6) return '#f97316';
    if (grade >= 4) return '#eab308';
    return '#10b981';
};

const getScoreColor = (score: number) => {
    if (score > 5000) return '#ef4444'; 
    if (score > 2500) return '#F77F00'; 
    if (score > 1500) return '#d04fd7'; 
    if (score > 1000) return '#8B5CF6'; 
    if (score > 500) return '#3B82F6';  
    return '#10B981';                   
};

// --- ALGORYTHME PULSAR SCORING ---
const calculateClimbScore = (climb: Climb, streams: any) => {
    const H = Math.max(1, climb.elevationGain); 
    const L = Math.max(100, climb.endDist - climb.startDist); 
    const AvgP = Math.max(0, climb.avgGrade); 
    
    let maxAlt = -Infinity;
    let sigma = 0;
    let sigmaGrades: number[] = []; 

    if (streams && streams.latlng && streams.altitude && climb.startIndex !== undefined && climb.endIndex !== undefined) {
        const startIndex = climb.startIndex;
        const endIndex = climb.endIndex;
        
        for (let i = startIndex; i <= endIndex; i++) {
            if (streams.altitude[i] > maxAlt) maxAlt = streams.altitude[i];
        }

        if ((endIndex - startIndex) > 5) {
            let distAccSigma = 0;
            let lastEleSigma = streams.altitude[startIndex];
            let lastLat = streams.latlng[startIndex][0];
            let lastLon = streams.latlng[startIndex][1];

            for (let i = startIndex + 1; i <= endIndex; i++) {
                const lat = streams.latlng[i][0];
                const lon = streams.latlng[i][1];
                const ele = streams.altitude[i];
                
                const stepDist = getDistance(lastLat, lastLon, lat, lon);
                distAccSigma += stepDist;
                lastLat = lat; 
                lastLon = lon;

                if (distAccSigma >= 25) { 
                    const eleDiff = ele - lastEleSigma;
                    if (distAccSigma > 0) {
                        const grade = (eleDiff / distAccSigma) * 100;
                        sigmaGrades.push(grade);
                    }
                    distAccSigma = 0; 
                    lastEleSigma = ele;
                }
            }
        }
        if (sigmaGrades.length > 1) {
            const mean = sigmaGrades.reduce((a, b) => a + b, 0) / sigmaGrades.length;
            const variance = sigmaGrades.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sigmaGrades.length;
            sigma = Math.sqrt(variance);
        }
    }
    
    const Alt = (maxAlt > -Infinity && maxAlt > 0) ? maxAlt : H;
    if (sigma === 0) { if (AvgP > 3) sigma = 1.2; else sigma = 0.5; }

    const Base = (20 * (Math.pow(H, 2) / L)) + (3 * H);
    const Oxygen = 1 + (Alt / 8000);
    const Pivot = 1 + ((sigma * (AvgP - 8)) / 50);
    const rawScore = Base * Oxygen * Pivot;
    
    return Math.round(Math.max(rawScore,0));
};

const getClimbCategory = (score: number) => {
    if (score > 7500) return { label: 'ICONIC', color: '#000', textColor: '#d04fd7', border: true }; 
    if (score > 6500) return { label: 'HC', color: '#ef4444', textColor: '#fff' }; 
    if (score > 5000) return { label: 'CAT 1', color: '#f97316', textColor: '#fff' }; 
    if (score > 3000) return { label: 'CAT 2', color: '#eab308', textColor: '#000' }; 
    if (score > 1500) return { label: 'CAT 3', color: '#84cc16', textColor: '#000' }; 
    if (score > 1000) return { label: 'CAT 4', color: '#10b981', textColor: '#fff' }; 
    if (score > 500) return { label: 'RÉGIONAL', color: '#0077B6', textColor:'#fff' }; 
    return { label: 'CÔTE', color: '#3b82f6', textColor:'#fff' };
};

const analyzeRoute = (route: Route, points: [number, number, number][]) => {
    const { distance_km, elevation_gain_m } = route;
    let minAlt = Infinity;
    let maxAlt = -Infinity;
    const slopeStats = {
        steepDescent: { km: 0, ele: 0 }, hardDescent: { km: 0, ele: 0 }, medDescent: { km: 0, ele: 0 },
        flatDown: { km: 0, ele: 0 }, flatUp: { km: 0, ele: 0 }, falseFlat: { km: 0, ele: 0 },
        climb: { km: 0, ele: 0 }, hard: { km: 0, ele: 0 }, extreme: { km: 0, ele: 0 }
    };
    const distributionMap = new Map<number, number>();
    for (let i = -20; i <= 25; i++) distributionMap.set(i, 0);

    let rawGradients: number[] = [];
    const MIN_DIST_STEP = 30; 
    let accumDist = 0;
    let accumEleDiff = 0;

    for (let i = 1; i < points.length; i++) {
        const [lon1, lat1, ele1] = points[i-1];
        const [lon2, lat2, ele2] = points[i];
        const dDist = getDistance(lat1, lon1, lat2, lon2);
        const currentEle2 = typeof ele2 === 'number' ? ele2 : 0;
        accumDist += dDist;
        accumEleDiff += (currentEle2 - (typeof ele1 === 'number' ? ele1 : 0));

        if (currentEle2 < minAlt) minAlt = currentEle2;
        if (currentEle2 > maxAlt) maxAlt = currentEle2;

        if (accumDist >= MIN_DIST_STEP) {
            const gradient = (accumEleDiff / accumDist) * 100;
            rawGradients.push(gradient);
            const dDistKm = accumDist / 1000;

            if (gradient < -10) { slopeStats.steepDescent.km += dDistKm; slopeStats.steepDescent.ele += accumEleDiff; }
            else if (gradient < -5) { slopeStats.hardDescent.km += dDistKm; slopeStats.hardDescent.ele += accumEleDiff; }
            else if (gradient < -2) { slopeStats.medDescent.km += dDistKm; slopeStats.medDescent.ele += accumEleDiff; }
            else if (gradient < 0) { slopeStats.flatDown.km += dDistKm; slopeStats.flatDown.ele += accumEleDiff; }
            else if (gradient < 2) { slopeStats.flatUp.km += dDistKm; slopeStats.flatUp.ele += accumEleDiff; }
            else if (gradient < 5) { slopeStats.falseFlat.km += dDistKm; slopeStats.falseFlat.ele += accumEleDiff; }
            else if (gradient < 8) { slopeStats.climb.km += dDistKm; slopeStats.climb.ele += accumEleDiff; }
            else if (gradient < 12) { slopeStats.hard.km += dDistKm; slopeStats.hard.ele += accumEleDiff; }
            else { slopeStats.extreme.km += dDistKm; slopeStats.extreme.ele += accumEleDiff; }

            const clampedGradient = Math.max(-20, Math.min(25, Math.round(gradient)));
            distributionMap.set(clampedGradient, (distributionMap.get(clampedGradient) || 0) + dDistKm);
            accumDist = 0; accumEleDiff = 0;
        }
    }

    const gradientDistribution = Array.from(distributionMap.entries()).sort((a, b) => a[0] - b[0]).map(([grade, km]) => ({ grade, km }));
    let maxGradient = rawGradients.length > 0 ? Math.min(35, Math.max(...rawGradients)) : 0;
    const maxAltLocal = maxAlt === -Infinity ? elevation_gain_m : maxAlt;
    const pulsarScore = Math.round((distance_km * 2) + (elevation_gain_m * 0.2) + (slopeStats.hard.km * 100) + (slopeStats.extreme.km * 250));
    
    const distanceClimbingKm = slopeStats.falseFlat.km + slopeStats.climb.km + slopeStats.hard.km + slopeStats.extreme.km;
    const elevationGainClimbing = slopeStats.falseFlat.ele + slopeStats.climb.ele + slopeStats.hard.ele + slopeStats.extreme.ele;
    const avgGrade = distanceClimbingKm > 0 ? (elevationGainClimbing / (distanceClimbingKm * 1000)) * 100 : 0;

    return { minAlt: minAlt === Infinity ? 0 : minAlt, maxAlt: maxAltLocal, maxGradient, avgGrade, slopeStats, pulsarScore, gradientDistribution };
};

// --- 🔥 HELPER DE SAUVEGARDE POUR L'ALGO ---
function saveClimb(climbs: Climb[], startPoint: ProcessedPoint, endPoint: ProcessedPoint, allPoints: ProcessedPoint[], minClimbDistance: number) {
    if (!startPoint || !endPoint) return;
    
    const dist = endPoint.dist - startPoint.dist;
    if (dist < minClimbDistance) return;

    const eleGain = endPoint.ele - startPoint.ele;
    if (eleGain <= 0) return; // Sécurité

    const avgGrade = (eleGain / dist) * 100;

    climbs.push({
        id: climbs.length + 1,
        startDist: startPoint.dist,
        endDist: endPoint.dist,
        startKm: startPoint.dist / 1000,
        endKm: endPoint.dist / 1000,
        elevationGain: eleGain,
        avgGrade: avgGrade,
        startIndex: startPoint.index,
        endIndex: endPoint.index,
        maxGradient: 0
    });
}

// --- 🔥 ALGO DE DÉTECTION (CUSTOM USER) ---
const detectClimbs = (points: [number, number, number][], distances: number[]) => {
    const climbs: Climb[] = [];
    if (points.length < 10) return climbs;

    // 1. Préparation des points avec lissage de la pente
    const allPoints: ProcessedPoint[] = distances.map((d, i) => ({
        dist: d,
        ele: points[i][2],
        index: i,
        smoothedSlope: 0
    }));

    const WINDOW = 20; // Fenêtre de lissage
    for (let i = WINDOW; i < allPoints.length; i++) {
        const pPrev = allPoints[i - WINDOW];
        const pCurr = allPoints[i];
        const dDiff = pCurr.dist - pPrev.dist;
        const eDiff = pCurr.ele - pPrev.ele;
        if (dDiff > 10) {
            allPoints[i].smoothedSlope = (eDiff / dDiff) * 100;
        }
    }

    // 2. Algorithme Utilisateur
    const SLOPE_THRESHOLD = 4;
    const SLOPE_CONTINUE = 2.2;
    const MAX_REPLAT_DISTANCE = 3000;
    const MIN_CLIMB_DISTANCE = 1500; 

    let isClimbing = false;
    let currentClimbStartPoint: ProcessedPoint | null = null;
    let lastClimbPoint: ProcessedPoint | null = null;
    let replatDistance = 0;

    for (let i = 0; i < allPoints.length; i++) {
        const point = allPoints[i];
        const slope = point.smoothedSlope;

        if (isClimbing) {
            if (slope >= SLOPE_CONTINUE) {
                lastClimbPoint = point;
                replatDistance = 0;
            } else {
                if (i > 0) { 
                    replatDistance += (point.dist - allPoints[i-1].dist);
                }
                
                if (replatDistance >= MAX_REPLAT_DISTANCE) {
                    isClimbing = false;
                    if (currentClimbStartPoint && lastClimbPoint) {
                        saveClimb(climbs, currentClimbStartPoint, lastClimbPoint, allPoints, MIN_CLIMB_DISTANCE);
                    }
                }
            }

        } else {
            if (slope >= SLOPE_THRESHOLD) {
                isClimbing = true;
                currentClimbStartPoint = point;
                lastClimbPoint = point;
                replatDistance = 0;
            }
        }
    }

    if (isClimbing && currentClimbStartPoint && lastClimbPoint) {
        saveClimb(climbs, currentClimbStartPoint, lastClimbPoint, allPoints, MIN_CLIMB_DISTANCE);
    }

    return climbs;
};

// --- UI COMPONENTS ---
const StatCard = ({ label, value, unit, icon: Icon, color = "#fff", subValue, borderColor, tooltip }: any) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <div style={{...styles.statCard, borderLeft: borderColor ? `3px solid ${borderColor}` : '1px solid var(--secondary)'}}>
            <div style={styles.statHeader}>
                <div style={{...styles.iconBox, color: color, borderColor: `${color}40`}}>
                    {Icon && <Icon size={16} />}
                </div>
                <span style={styles.statLabel}>{label}</span>
                {tooltip && (
                    <div style={styles.tooltipTrigger} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                        <HelpCircle size={12} color="#888" />
                        {isHovered && <div style={styles.customTooltip}>{tooltip}<div style={styles.tooltipArrow} /></div>}
                    </div>
                )}
            </div>
            <div style={styles.statValueContainer}>
                <span style={{...styles.statValue, color: color}}>{value}</span>
                <span style={styles.statUnit}>{unit}</span>
            </div>
            {subValue && <div style={styles.statSub}>{subValue}</div>}
        </div>
    );
};

const SlopeBar = ({ label, data, totalKm, color }: any) => {
    const percent = totalKm > 0 ? (data.km / totalKm) * 100 : 0;
    if (percent < 1) return null;
    return (
        <div style={{marginBottom: '0.8rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#ccc', marginBottom: '4px'}}>
                <span>{label}</span>
                <span style={{fontFamily: 'monospace'}}>
                    <span style={{color: color, fontWeight: 'bold'}}>{data.km.toFixed(1)} km</span>
                    <span style={{color: '#666', margin: '0 6px'}}>|</span>
                    <span style={{color: data.ele > 0 ? '#f59e0b' : '#3b82f6'}}>{data.ele > 0 ? `+${Math.round(data.ele)}m` : `${Math.round(data.ele)}m`}</span>
                </span>
            </div>
            <div style={{width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden'}}>
                <div style={{width: `${percent}%`, height: '100%', background: color, borderRadius: '3px'}} />
            </div>
        </div>
    );
}

const Tag = ({ text, color }: any) => (
    <span style={{background: `${color}15`, color: color, padding: '6px 12px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '1px', border: `1px solid ${color}30`, display: 'inline-block', marginRight: '0.5rem', marginBottom: '0.5rem'}}>{text}</span>
);

// --- MAIN COMPONENT ---
export default function RouteDisplay({ route, userProfile }: { route: Route, userProfile: UserProfile }) {
    const router = useRouter();
    const [showScoreModal, setShowScoreModal] = useState(false);
    const [showTopologyModal, setShowTopologyModal] = useState(false);
    const [showGearModal, setShowGearModal] = useState(false); // 🔥 STATE GEAR
    const [selectedClimb, setSelectedClimb] = useState<Climb | null>(null);
    const [highlightedClimb, setHighlightedClimb] = useState<Climb | null>(null);
    const climbListRef = useRef<HTMLDivElement>(null);

    const { streams, encodedPolyline, analytics, climbs } = useMemo(() => {
        if (!route.gpx_data) return { streams: null, encodedPolyline: null, analytics: null, climbs: [] };
        const gpxData = route.gpx_data;
        let normalizedPoints: [number, number, number][] = [];
        let finalEncodedPolyline = null;

        if (gpxData.geometry?.coordinates) { 
            normalizedPoints = gpxData.geometry.coordinates.map((p: any) => [p[0], p[1], p[2] || 0]);
            finalEncodedPolyline = gpxData.map_polyline; 
        } else if (gpxData.points) { 
            normalizedPoints = gpxData.points.map((p: any) => [p.lon, p.lat, p.ele || 0]);
            finalEncodedPolyline = gpxData.map_polyline;
        }

        if (normalizedPoints.length === 0) return { streams: null, encodedPolyline: null, analytics: null, climbs: [] };

        let cumulativeDistance: number[] = [0];
        let totalDistMeters = 0;
        for (let i = 1; i < normalizedPoints.length; i++) {
            const [lon1, lat1] = normalizedPoints[i-1];
            const [lon2, lat2] = normalizedPoints[i];
            totalDistMeters += getDistance(lat1, lon1, lat2, lon2);
            cumulativeDistance.push(totalDistMeters);
        }

        const streamsObj = { 
            distance: cumulativeDistance, 
            altitude: normalizedPoints.map(p => p[2]), 
            latlng: normalizedPoints.map(p => [p[1], p[0]] as [number, number]),
            time: [], watts: [], heartrate: [], cadence: [] 
        };

        const detectedClimbs = detectClimbs(normalizedPoints, cumulativeDistance);
        
        const enrichedClimbs = detectedClimbs.map(c => {
            const score = calculateClimbScore(c, streamsObj);
            const category = getClimbCategory(score);
            return { ...c, score, category };
        });

        return { 
            streams: streamsObj,
            encodedPolyline: finalEncodedPolyline, 
            analytics: analyzeRoute(route, normalizedPoints), 
            climbs: enrichedClimbs 
        };
    }, [route]);

    const [matchedSegments, setMatchedSegments] = useState<any[]>([]);
    const [loadingSegments, setLoadingSegments] = useState(false);

    // Scroll to climb logic
    useEffect(() => {
        if (highlightedClimb && climbListRef.current) {
            const element = document.getElementById(`climb-item-${highlightedClimb.id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [highlightedClimb]);

    useEffect(() => {
        if (route.id) {
            setLoadingSegments(true);
            fetch('/api/routes/match-segments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ routeId: route.id })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setMatchedSegments(data.segments);
                }
            })
            .catch(err => console.error("Erreur scan segments", err))
            .finally(() => setLoadingSegments(false));
        }
    }, [route.id]);

    if (!analytics) return <div style={styles.errorContainer}><AlertTriangle size={48} /> DONNÉES CORROMPUES</div>;

    const getScoreColor = (score: number) => score < 500 ? '#10B981' : score < 1000 ? '#3B82F6' : score < 1500 ? '#8B5CF6' : score < 2500 ? '#D04FD7': score < 5000 ? '#F77F00': '#EF4444';
    const scoreColor = getScoreColor(analytics.pulsarScore);

    const handleClimbHover = (climb: Climb | null) => {
        setHighlightedClimb(climb);
    };

    const handleClimbClick = (climb: Climb) => {
        setSelectedClimb(climb);
    };

    const getTags = () => {
        const tags: { t: string; c: string }[] = []; 
        const ratio = route.distance_km > 0 ? route.elevation_gain_m / route.distance_km : 0;
        
        if (route.distance_km > 250) tags.push({ t: "ULTRA", c: "#ff00ff" });
        else if (route.distance_km > 125 && route.distance_km <= 250) tags.push({ t: "LONGUE", c: "#00ffff" });
        else if (route.distance_km > 80 && route.distance_km <= 125 && route.distance_km != 100) tags.push({ t: "MOYENNE", c: "#39ff14" });
        else if (route.distance_km <= 80) tags.push({ t: "COURTE", c: "#ff0080" });
        else if (route.distance_km == 100) tags.push({ t: "100 !!!", c: "#ffd700" });
        
        if (ratio > 25) tags.push({ t: "HAUTE MONTAGNE", c: "#ff073a" });
        else if (ratio > 15) tags.push({ t: "MOYENNE MONTAGNE", c: "#ffaa00" });
        else if (ratio > 8 && route.distance_km > 50) tags.push({ t: "VALLONNÉ", c: "#ffea00" });
        else if (ratio > 8 && route.distance_km < 50) tags.push({ t: "RYTMHÉ", c: "#00ff88" });
        else tags.push({ t: "ROULANT", c: "#00ffbf" });
        
        if (analytics.maxGradient > 15) tags.push({ t: "MURS > 15%", c: "#ff0066" });
        if (analytics.maxGradient < 5) tags.push({ t: "PLAT", c: "#9d4dff" });
        
        return tags;
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <div style={{marginBottom: '0.5rem'}}>{getTags().map((t, i) => <Tag key={i} text={t.t} color={t.c} />)}</div>
                    <h1 style={styles.title}>{route.name}</h1>
                    <div style={styles.meta}>
                        <span>Créé le {new Date(route.created_at).toLocaleDateString('fr-FR')}</span>
                        <span style={{color: 'var(--secondary-text)'}}>•</span>
                        <span style={{fontFamily: 'var(--font-sans)', opacity: 0.7}}>ID {route.id}</span>
                    </div>
                </div>
                <div style={{display:'flex', gap:'1rem'}}>
                    {/* 🔥 BOUTON GEAR ANALYSIS */}
                    <button onClick={() => setShowGearModal(true)} style={styles.secondaryButton}>
                        <Settings2 size={18} /> ANALYSER BRAQUET
                    </button>
                    <button onClick={() => router.push(`/simulations/new?routeId=${route.id}`)} style={styles.ctaButton}>
                        <Zap size={18} /> CHARGER LA SIMULATION
                    </button>
                </div>
            </div>

            <div style={styles.grid}>
                <div style={styles.leftCol}>
                    <div style={{...styles.painCard, borderColor: `${scoreColor}50`, background: `${scoreColor}10`}}>
                        <div style={{...styles.painHeader, color: scoreColor}}><Activity size={20} /> <span>PULSAR SCORE</span> <Info size={14} style={{cursor:'pointer', opacity:0.7}} onClick={() => setShowScoreModal(true)} /></div>
                        <div style={{...styles.painValue, color: scoreColor, textShadow: `0 0 20px ${scoreColor}40`}}>{analytics.pulsarScore}</div>
                        <div style={styles.painVerdict}>{analytics.pulsarScore > 5000 ? "MYTHIQUE" : analytics.pulsarScore > 2500 ? "LÉGENDAIRE" : analytics.pulsarScore > 1500 ? "TRÈS DIFFICILE" : analytics.pulsarScore > 1000 ? "DIFFICILE" : analytics.pulsarScore > 500 ? "SPORTIF" : "ACCESSIBLE"}</div>
                    </div>

                    <div style={styles.metricsGrid}>
                        <StatCard label="DISTANCE" value={route.distance_km.toFixed(1)} unit="km" icon={Activity} color="#fff" borderColor="#fff" />
                        <StatCard label="DÉNIVELÉ" value={route.elevation_gain_m} unit="m" icon={Mountain} color="#f59e0b" borderColor="#f59e0b" />
                        <StatCard label="PENTE MOY." value={analytics.avgGrade.toFixed(1)} unit="%" icon={Gauge} color="#fff" subValue="En Montée (>2%)" tooltip="Moyenne sur les portions montantes" />
                        <StatCard label="PENTE MAX" value={analytics.maxGradient.toFixed(1)} unit="%" icon={TrendingUp} color={analytics.maxGradient > 15 ? '#ef4444' : '#f59e0b'} borderColor={analytics.maxGradient > 15 ? '#ef4444' : '#f59e0b'} />
                    </div>

                    <div style={styles.panel}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
                            <h3 style={{...styles.panelTitle, margin:0}}><BarChart3 size={16} /> Topologie Détaillée</h3>
                            <div onClick={() => setShowTopologyModal(true)} style={{cursor:'pointer', opacity:0.8, display:'flex', alignItems:'center', gap:'5px', fontSize:'0.7rem', color:'var(--accent)'}}><Activity size={14} /> DISTRIBUTION</div>
                        </div>
                        <div style={{paddingTop: '0.5rem'}}>
                            <SlopeBar label="Mur en Descente (< -10%)" data={analytics.slopeStats.steepDescent} totalKm={route.distance_km} color="#1e3a8a" />
                            <SlopeBar label="Descente Raide (-10% à -5%)" data={analytics.slopeStats.hardDescent} totalKm={route.distance_km} color="#1d4ed8" />
                            <SlopeBar label="Descente (-5% à -2%)" data={analytics.slopeStats.medDescent} totalKm={route.distance_km} color="#3b82f6" />
                            <SlopeBar label="Faux-plat Desc. (-2% à 0%)" data={analytics.slopeStats.flatDown} totalKm={route.distance_km} color="#2dd4bf" />
                            <SlopeBar label="Faux-plat Mont. (0% à 2%)" data={analytics.slopeStats.flatUp} totalKm={route.distance_km} color="#4ade80" />
                            <SlopeBar label="Roulant (2% à 5%)" data={analytics.slopeStats.falseFlat} totalKm={route.distance_km} color="#facc15" />
                            <SlopeBar label="Montée (5% à 8%)" data={analytics.slopeStats.climb} totalKm={route.distance_km} color="#fb923c" />
                            <SlopeBar label="Difficile (8% à 12%)" data={analytics.slopeStats.hard} totalKm={route.distance_km} color="#f87171" />
                            <SlopeBar label="Mur (> 12%)" data={analytics.slopeStats.extreme} totalKm={route.distance_km} color="#d04fd7" />
                        </div>
                    </div>
                </div>

                <div style={styles.rightCol}>
                    <div style={styles.mapContainer}>
                        <div style={styles.panelHeaderAbsolute}><MapIcon size={14} color="#00f3ff"/> Vue Satellite</div>
                        {encodedPolyline ? <ActivityMap encodedPolyline={encodedPolyline} /> : <div style={styles.fallback}>Signal GPS perdu</div>}
                    </div>

                    {/* CHART CONTAINER */}
                    <div style={styles.chartContainer}>
                        <div style={styles.chartHeader}>
                            <h3 style={styles.panelTitle}><Layers size={16} /> Profil Altimétrique {climbs.length > 0 && <span style={{marginLeft: '10px', fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: '4px'}}>{climbs.length} Montées</span>}</h3>
                            <div style={styles.altTags}><span style={styles.tag}>MIN {Math.round(analytics.minAlt)}m</span><span style={styles.tag}>MAX {Math.round(analytics.maxAlt)}m</span></div>
                        </div>
                        
                        <div style={{ height: '300px', width: '100%', minWidth: '400px', minHeight: '300px', position: 'relative' }}>
                            <AltitudeChartAny 
                                streams={streams} 
                                climbs={climbs} 
                                highlightedArea={highlightedClimb} 
                                onClimbClick={(c: Climb) => handleClimbClick(c)} 
                                onClimbHover={(c: Climb | null) => handleClimbHover(c)}
                                themeColor="#d04fd7"
                            />
                        </div>

                        {/* TABLEAU MISSION LOG */}
                        {climbs.length > 0 && (
                            <div style={styles.climbListContainer} ref={climbListRef}>
                                <div style={styles.climbListHeader}>
                                    <span style={{textAlign: 'center'}}>#</span>
                                    <span>CAT</span>
                                    <span style={{textAlign: 'center'}}>INDEX</span>
                                    <span>DIST</span>
                                    <span>% MOY</span>
                                    <span>D+</span>
                                    <span style={{textAlign: 'right'}}>MONTÉE (KM)</span>
                                    <span></span>
                                </div>
                                
                                {climbs.map((climb) => {
                                    const isHighlighted = highlightedClimb?.id === climb.id;
                                    const gradeColor = getGradeColor(climb.avgGrade);
                                    const scoreValue = climb.score || 0;
                                    const scoreColor = getScoreColor(scoreValue);
                                    // @ts-ignore
                                    const badge = climb.category;
                                    
                                    return (
                                        <div 
                                            key={climb.id}
                                            id={`climb-item-${climb.id}`}
                                            style={{
                                                ...styles.climbRow,
                                                background: isHighlighted 
                                                    ? 'linear-gradient(90deg, rgba(208, 79, 215, 0.15) 0%, rgba(0,0,0,0) 100%)' 
                                                    : 'rgba(255,255,255,0.01)',
                                                borderLeft: isHighlighted 
                                                    ? '3px solid #d04fd7' 
                                                    : '3px solid transparent',
                                                boxShadow: isHighlighted 
                                                    ? '0 0 20px rgba(208, 79, 215, 0.05)' 
                                                    : 'none'
                                            }}
                                            onMouseEnter={() => setHighlightedClimb(climb)}
                                            onMouseLeave={() => setHighlightedClimb(null)}
                                            onClick={() => setSelectedClimb(climb)}
                                        >
                                            {/* ID */}
                                            <div style={{display: 'flex', justifyContent: 'center'}}>
                                                <div style={{
                                                    width: '20px', height: '20px', borderRadius: '50%', 
                                                    background: isHighlighted ? '#d04fd7' : '#333', 
                                                    color: isHighlighted ? '#fff' : '#888',
                                                    fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {climb.id}
                                                </div>
                                            </div>

                                            {/* BADGE CAT */}
                                            <div>
                                                {badge && (
                                                    <span style={{
                                                        background: badge.color === '#000' ? 'transparent' : badge.color + '20',
                                                        color: badge.textColor,
                                                        border: badge.label === 'ICONIC' ? `1px solid ${badge.textColor}` : `1px solid ${badge.color}40`,
                                                        padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.5px',
                                                        boxShadow: badge.label === 'ICONIC' ? `0 0 10px ${badge.textColor}40` : 'none'
                                                    }}>
                                                        {badge.label}
                                                    </span>
                                                )}
                                            </div>

                                            {/* SCORE */}
                                            <div style={{textAlign: 'center', fontWeight: 800, color: scoreColor, fontSize: '0.9rem', fontFamily: 'monospace'}}>
                                                {scoreValue}
                                            </div>

                                            {/* DISTANCE */}
                                            <div style={{color: '#fff', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem'}}>
                                                {((climb.endDist - climb.startDist)/1000).toFixed(1)} <span style={{fontSize:'0.6rem', color:'#666'}}>km</span>
                                            </div>

                                            {/* PENTE */}
                                            <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                                <span style={{color: gradeColor, fontWeight: 800, fontSize: '0.9rem', textShadow: isHighlighted ? `0 0 10px ${gradeColor}` : 'none'}}>
                                                    {climb.avgGrade.toFixed(1)}%
                                                </span>
                                                <div style={{height: '4px', width: '30px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px'}}>
                                                    <div style={{height: '100%', width: `${Math.min(100, climb.avgGrade * 8)}%`, background: gradeColor, borderRadius: '2px'}} />
                                                </div>
                                            </div>

                                            {/* D+ */}
                                            <div style={{color: '#f59e0b', fontWeight: 600, fontFamily: 'monospace'}}>
                                                +{Math.round(climb.elevationGain)}<span style={{fontSize:'0.6rem', color:'#888'}}>m</span>
                                            </div>

                                            {/* KM */}
                                            <div style={{textAlign: 'right', color: '#888', fontSize: '0.7rem', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px'}}>
                                                <span>{climb.startKm.toFixed(1)}</span>
                                                <div style={{height: '1px', width: '10px', background: '#444'}} />
                                                <span>{climb.endKm.toFixed(1)}</span>
                                            </div>

                                            {/* ICON */}
                                            <div style={{display: 'flex', justifyContent: 'center'}}>
                                                {isHighlighted ? <ChevronRight size={14} color="#d04fd7" /> : <Flag size={12} color="#444" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div style={{ background: 'rgba(20, 20, 30, 0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.5rem', marginTop: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '1px' }}>
                            <Trophy size={16} color="#d04fd7" /> SEGMENTS ({loadingSegments ? '...' : matchedSegments.length})
                        </h3>

                        {loadingSegments && <div style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>Analyse du tracé en cours...</div>}

                        {!loadingSegments && matchedSegments.length === 0 && (
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>Aucun segment officiel détecté sur ce parcours.</div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                            {matchedSegments.map((seg) => (
                                <div key={seg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', transition: 'transform 0.2s' }}>
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                                            {seg.name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', gap: '8px', marginTop: '2px' }}>
                                            <span>{(seg.distance_m / 1000).toFixed(1)}km</span>
                                            <span style={{ color: seg.average_grade > 7 ? '#ef4444' : (seg.average_grade > 4 ? '#f59e0b' : '#10b981') }}>
                                                {seg.average_grade}%
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {seg.category && (
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#d04fd7', background: 'rgba(208, 79, 215, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(208, 79, 215, 0.2)' }}>
                                            {seg.category}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
                

            

            {/* MODALS */}
            <Modal isOpen={showScoreModal} onClose={() => setShowScoreModal(false)} title="PULSAR SCORE">
                <div style={{color: 'var(--text)'}}>
                    <p>Le PULSAR SCORE est calculé ainsi :</p>
                    <code style={{display:'block', background:'rgba(255,255,255,0.05)', padding:'10px', borderRadius:'6px', margin:'10px 0', fontSize:'0.8rem'}}>(Km * 2) + (D+ * 0.2) + (Km &gt; 8% * 100) + (Km &gt; 12% * 250)</code>
                    <ul style={{marginTop: '1rem', paddingLeft: '1.5rem', lineHeight: '2', listStyle: 'none'}}>
                        <li style={{color: '#10B981'}}>⬤ <strong>0 - 500 : ACCESSIBLE</strong></li>
                        <li style={{color: '#3B82F6'}}>⬤ <strong>500 - 1000 : SPORTIF</strong></li>
                        <li style={{color: '#8B5CF6'}}>⬤ <strong>1000 - 1500 : DIFFICILE</strong></li>
                        <li style={{color: '#D04FD7'}}>⬤ <strong>1500 - 2500 : TRÈS DIFFICILE</strong></li>
                        <li style={{color: '#F77F00'}}>⬤ <strong>2500 - 5000 : LÉGENDAIRE</strong></li>
                        <li style={{color: '#EF4444'}}>⬤ <strong>5000+ : MYTHIQUE</strong></li>
                    </ul>
                </div>
            </Modal>

            <Modal isOpen={showTopologyModal} onClose={() => setShowTopologyModal(false)} title="Distribution Pente / Distance">
                <div style={{width: '100%', height: '350px', marginTop: '1rem'}}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.gradientDistribution} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="splitColor" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset={(0 - (-20)) / (25 - (-20))} stopColor="#3b82f6" stopOpacity={1} />
                                    <stop offset={(0 - (-20)) / (25 - (-20))} stopColor="#d04fd7" stopOpacity={1} />
                                </linearGradient>
                                <linearGradient id="splitColorFill" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset={(0 - (-20)) / (25 - (-20))} stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset={(0 - (-20)) / (25 - (-20))} stopColor="#d04fd7" stopOpacity={0.4} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="grade" stroke="#888" tickFormatter={(val) => `${val}%`} type="number" domain={[-20, 25]} tick={{fontSize: 10}} padding={{ left: 0, right: 0 }} />
                            <YAxis stroke="#888" tick={{fontSize: 10}} unit="km" />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }} labelStyle={{ color: '#fff', fontWeight: 'bold' }} formatter={(value: number) => [`${value.toFixed(1)} km`, 'Distance']} labelFormatter={(label) => `Pente : ${label}%`} />
                            <ReferenceLine x={0} stroke="#fff" strokeDasharray="3 3" opacity={0.5} />
                            <Area type="monotone" dataKey="km" stroke="url(#splitColor)" strokeWidth={3} fill="url(#splitColorFill)" animationDuration={1500} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <p style={{textAlign: 'center', fontSize: '0.8rem', color: '#888', marginTop: '1rem'}}>Distribution de pente du parcours <br/><span style={{color: '#3b82f6'}}>Descente </span> VS <span style={{color: '#d04fd7'}}>Montée</span> </p>
            </Modal>

            {/* 🔥 MODAL GEAR */}
            <GearAnalysisModal 
                isOpen={showGearModal} 
                onClose={() => setShowGearModal(false)}
                maxGradient={analytics.maxGradient}
                gradientDistribution={analytics.gradientDistribution}
                userProfile={userProfile}
            />

            <ClimbDetailModal 
                climb={selectedClimb} 
                onClose={() => setSelectedClimb(null)} 
                streams={streams} 
            />
        </div>
    );
}

// --- STYLES ---
const styles: Record<string, React.CSSProperties> = {
  container: { paddingBottom: '4rem', color: '#f1f1f1' },
  errorContainer: { height: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontWeight: 'bold', gap: '1rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  title: { fontSize: '2.5rem', fontWeight: 900, margin: 0, lineHeight: 1.1, background: 'linear-gradient(90deg, #fff, #a0a0a0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  meta: { display: 'flex', gap: '1rem', color: '#aaa', fontSize: '0.95rem', marginTop: '0.8rem', fontFamily: 'var(--font-sans)', fontWeight: 500 },
  
  ctaButton: { background: 'linear-gradient(135deg, #d04fd7 0%, #8b5cf6 100%)', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 0 20px rgba(208, 79, 215, 0.3)', transition: 'transform 0.2s', fontSize: '1rem' },
  secondaryButton: { background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid #333', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', transition: 'all 0.2s' },

  grid: { display: 'grid', gridTemplateColumns: '380px 1fr', gap: '2rem', alignItems: 'start' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  painCard: { border: '1px solid', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' },
  painHeader: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.5rem' },
  painValue: { fontSize: '4rem', fontWeight: 900, lineHeight: 1 },
  painVerdict: { fontSize: '1rem', fontWeight: 800, letterSpacing: '2px', marginTop: '0.5rem', opacity: 0.9 },
  metricsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  statCard: { background: 'var(--surface)', border: '1px solid var(--secondary)', borderRadius: '12px', padding: '1rem' },
  statHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', position: 'relative' },
  iconBox: { width: '24px', height: '24px', borderRadius: '6px', border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '0.7rem', color: '#888', fontWeight: 700, letterSpacing: '0.5px' },
  statValueContainer: { display: 'flex', alignItems: 'baseline', gap: '2px' },
  statValue: { fontSize: '1.4rem', fontWeight: 800 },
  statUnit: { fontSize: '0.8rem', color: '#666', fontWeight: 600 },
  statSub: { fontSize: '0.75rem', color: '#666', marginTop: '4px' },
  tooltipTrigger: { marginLeft: 'auto', cursor: 'help', position: 'relative', display: 'flex', alignItems: 'center' },
  customTooltip: { position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '10px', padding: '8px 12px', background: '#000', border: '1px solid var(--secondary)', borderRadius: '8px', fontSize: '0.7rem', color: '#fff', width: '200px', zIndex: 100, textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' },
  tooltipArrow: { position: 'absolute', top: '100%', left: '50%', marginLeft: '-5px', borderWidth: '5px', borderStyle: 'solid', borderColor: '#000 transparent transparent transparent' },
  panel: { background: 'var(--surface)', border: '1px solid var(--secondary)', borderRadius: '16px', padding: '1.25rem' },
  panelTitle: { fontSize: '0.9rem', color: '#fff', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' },
  mapContainer: { width: '100%', height: '450px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--secondary)', position: 'relative', background: '#000' },
  panelHeaderAbsolute: { position: 'absolute', top: '15px', left: '15px', zIndex: 10, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' },
  chartContainer: { background: 'var(--surface)', border: '1px solid var(--secondary)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  altTags: { display: 'flex', gap: '0.5rem' },
  tag: { background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#aaa', fontWeight: 600 },
  fallback: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' },
  warningBox: { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '1rem' },
  warningHeader: { color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  warningContent: { fontSize: '0.85rem', color: '#ccc', lineHeight: '1.5' },
  
  climbListContainer: { 
    marginTop: '1.5rem', 
    maxHeight: '280px', 
    overflowY: 'auto',
    background: 'rgba(10, 10, 15, 0.6)', 
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    position: 'relative',
    scrollbarWidth: 'thin',
    scrollbarColor: '#333 transparent'
  } as React.CSSProperties,
  
  climbListHeader: { 
    display: 'grid', 
    gridTemplateColumns: '45px 1fr 60px 1fr 1fr 1fr 1.5fr 40px',
    gap: '0.8rem',
    padding: '0.8rem 1rem', 
    fontSize: '0.65rem',
    fontWeight: 800, 
    color: '#666', 
    textTransform: 'uppercase',
    letterSpacing: '1px',
    background: 'rgba(0, 0, 0, 0.4)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  
  climbRow: { 
    display: 'grid', 
    gridTemplateColumns: '45px 1fr 60px 1fr 1fr 1fr 1.5fr 40px', 
    gap: '0.8rem',
    padding: '0.7rem 1rem', 
    fontSize: '0.8rem', 
    alignItems: 'center', 
    cursor: 'pointer', 
    transition: 'all 0.15s ease-out',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    height: '2rem',
  } as React.CSSProperties,
};

const skeletons = {
  map: { width: '100%', height: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' },
  chart: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '0.8rem' }
};