'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    Calendar, MapPin, ExternalLink, TrendingUp, Mountain, 
    Utensils, Euro, Award, BarChart3, Timer, ShieldCheck, Zap, ArrowLeft, Trophy, Heart, Activity, Clock as ClockIcon, Radio, Flag, History
} from 'lucide-react';
// import { CycloEvent } from '../../../types/events'; // Assurez-vous que le chemin est correct
import JerseyPreview from '../components/JerseyPreview';
import WeatherWidget from '../components/WeatherWidget'; 

// --- DÉFINITIONS GLOBALES ET TYPES ---

interface RouteDetail { 
    id: number; 
    name: string; // <-- 🔥 AJOUT: name sur RouteDetail
    distance_km: number; 
    elevation_gain_m: number; 
    start_time?: string; 
    price_eur: number; 
    aid_stations_count?: number; 
    type: string;
}

interface CycloEvent {
    id: number; // <-- 🔥 CORRECTION: eventData.id doit être number pour les comparaisons
    name: string;
    location: string;
    country: string;
    date_start: string;
    date_end?: string;
    image_url?: string;
    rating_global: number;
    rating_quality_price: number;
    routes: RouteDetail[];
    history?: { participants_count: number }[];
    start_time?: string; 
    end_time?: string;
    registration_url?: string;
    website_url?: string;
    coordinates?: { lat: number, lon: number } | null;
    final_weather_json?: any;
    jersey_url?: string; // <-- 🔥 AJOUT: jersey_url
}
export interface RelatedEdition {
    id: number;
    name: string;
    date_start: string;
    winner_name_m?: string | null;
    winner_time_m?: string | null;
    winner_name_f?: string | null;
    winner_time_f?: string | null;
}

// MAPPER LES TYPES DE COURSES AUX COULEURS NÉON PULSAR
const ROUTE_TYPE_COLORS: { [key: string]: string } = {
    'Grand Fondo': '#d04fd7', 'Gran Fondo': '#d04fd7',
    'Medio Fondo': '#00f3ff', 'Course': '#00f3ff',
    'Petit Fondo': '#f59e0b', 'Randonnée': '#f59e0b',
    'default': '#ffffff',
};

// --- STYLES GLOBALES ---

const glassCard = {
    background: 'rgba(20, 20, 30, 0.6)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '20px',
    padding: '1.5rem'
};

const badgeStyle = (color: string) => ({
    background: `${color}15`, color: color, border: `1px solid ${color}40`,
    padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800,
    display: 'flex', alignItems: 'center', gap: '6px',
});

const LIVE_BADGE_STYLE = {
    background: '#ef4444', 
    color: '#fff', 
    padding: '4px 10px', 
    borderRadius: '6px', 
    fontSize: '0.75rem', 
    fontWeight: 900, 
    display: 'flex', 
    alignItems: 'center', 
    gap: '6px',
    boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)'
};

const COUNTDOWN_BADGE_STYLE = {
    background: 'rgba(255, 193, 7, 0.1)', 
    color: '#ffc107', 
    border: '1px solid #ffc107',
    padding: '4px 10px', 
    borderRadius: '6px', 
    fontSize: '0.75rem', 
    fontWeight: 900,
    display: 'flex', 
    alignItems: 'center', 
    gap: '6px',
    animation: 'pulse 1.5s infinite'
};

const PASSED_BADGE_STYLE = {
    background: 'rgba(107, 114, 128, 0.2)', 
    color: '#9ca3af', 
    border: '1px solid #6b7280',
    padding: '4px 10px', 
    borderRadius: '6px', 
    fontSize: '0.75rem', 
    fontWeight: 800, 
    display: 'flex', 
    alignItems: 'center', 
    gap: '6px',
};


// --- HOOK DE COMPTE À REBOURS (Déplacé au top level) ---

const useCountdown = (targetTimestamp: number, isActive: boolean) => {
    // L'appel à useState DOIT être au top level du Hook
    const [timeLeft, setTimeLeft] = useState(isActive && targetTimestamp > Date.now() ? targetTimestamp - Date.now() : 0);

    useEffect(() => {
        if (!isActive || targetTimestamp <= Date.now()) {
            setTimeLeft(0);
            return;
        }
        const interval = setInterval(() => {
            const remaining = targetTimestamp - Date.now();
            setTimeLeft(remaining > 0 ? remaining : 0);
        }, 1000);
        return () => clearInterval(interval);
    }, [targetTimestamp, isActive]);

    const formatTime = useCallback((ms: number) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const days = Math.floor(totalSeconds / (3600 * 24));
        const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let formatted = '';
        if (days > 0) formatted += `${days}j `;
        formatted += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        return formatted.trim();
    }, []);

    return {
        formatted: formatTime(timeLeft),
        isFinished: timeLeft <= 0
    };
};
// -----------------------------------------------------------


// --- IMPORTS DYNAMIQUES ---
const MiniMap = dynamic(() => import('../../../components/ui/miniMap'), {
    ssr: false,
    loading: () => <div style={{height: '400px', background: '#111', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666'}}>Chargement tracé...</div>,
});


// --- SOUS-COMPOSANTS ---

const MetricBox = ({ label, value, unit, icon: Icon, color }: any) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: color }}>
            <Icon size={16} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>{label}</span>
        </div>
        <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>
            {value} <small style={{fontSize: '0.6em', color: '#666', fontWeight: 500}}>{unit}</small>
        </span>
    </div>
);

const DeepAnalysisButton = ({ routeId, routeColor }: { routeId: number | undefined, routeColor: string }) => {
    if (!routeId) return null;
    return (
        <Link href={`/routes/${routeId}/analysis`} style={{ textDecoration: 'none' }}>
            <button style={{
                background: routeColor, color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '1rem',
                boxShadow: `0 0 15px ${routeColor}60`, transition: 'all 0.2s',
            }}><Zap size={16} /> ANALYSE POUSSÉE</button>
        </Link>
    );
};

const formatChrono = (totalSeconds: number): string => {
    let seconds = Math.floor(totalSeconds);
    if (seconds <= 0) return '0s';
    const d = Math.floor(seconds / (3600 * 24)); seconds -= d * 3600 * 24;
    const h = Math.floor(seconds / 3600); seconds -= h * 3600;
    const m = Math.floor(seconds / 60);
    const s = seconds - m * 60;
    let parts: string[] = [];
    if (d > 0) parts.push(`${d}j`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0 || d > 0) parts.push(`${m}min`);
    if (s > 0 || parts.length === 0) { parts.push(`${Math.round(s)}s`); }
    return parts.join('');
};

const LeaderboardTable = ({ data, type, routeDistance }: { data: any[], type: 'RACE' | 'RECON', routeDistance: number }) => {
    if (data.length === 0) return <div style={{padding:'2rem', textAlign:'center', color:'#666', fontStyle:'italic'}}>Aucune donnée pour ce parcours.</div>;

    const renderAthleteLink = (row: any) => (
        <Link href={`/profile/${row.user.id}`} style={{textDecoration:'none', display: 'flex', alignItems: 'center', gap: '10px', color:'inherit'}}>
            <div style={{ width:'32px', height:'32px', borderRadius:'50%', background: `url(${row.user.avatar_url}) center/cover`, backgroundColor:'#333' }} />
            <span style={{fontWeight:600, color: '#fff'}}>{row.user.name}</span>
        </Link>
    );
    
    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #333', color: '#888', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px', width: '40px' }}>#</th>
                        <th style={{ padding: '12px' }}>Athlète</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Watts</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>BPM</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Vit. Moy</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>{type === 'RACE' ? 'Chrono' : 'Date'}</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => {
                        const seconds = row.performance_time_s;
                        const timeDisplay = type === 'RACE' ? formatChrono(seconds) : new Date(row.activity.start_time).toLocaleDateString('fr-FR');
                        const speed = routeDistance > 0 && seconds > 0 ? (routeDistance / (seconds / 3600)).toFixed(1) : '-';
                        
                        return (
                            <tr key={i} className="hover:bg-white/5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'transparent', position: 'relative' }}>
                                <td style={{ padding: '12px', fontWeight: 900, color: i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#b45309':'#666' }}>{type === 'RACE' ? i+1 : '-'}</td>
                                <td style={{ padding: '12px' }}>{renderAthleteLink(row)}</td>
                                <td style={{ padding: '12px', textAlign: 'center', color: '#d04fd7', fontWeight: 600 }}>{row.activity.avg_power_w ? <>{Math.round(row.activity.avg_power_w)}<span style={{fontSize:'0.7em', opacity:0.7}}>w</span></> : '-'}</td>
                                <td style={{ padding: '12px', textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>{row.activity.avg_heartrate ? <>{Math.round(row.activity.avg_heartrate)}<span style={{fontSize:'0.7em', opacity:0.7}}>bpm</span></> : '-'}</td>
                                <td style={{ padding: '12px', textAlign: 'center', color: '#00f3ff', fontWeight: 600 }}>{speed}<span style={{fontSize:'0.7em', opacity:0.7}}>km/h</span></td>
                                <td style={{ padding: 0, textAlign: 'right', position: 'relative' }}>
                                    <Link href={`/activities/${row.activity.id}`} style={{ textDecoration: 'none', color: 'inherit', position: 'absolute', inset: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        <span style={{ paddingRight: '10px', fontFamily: 'monospace', color: type === 'RACE' ? '#fff' : '#aaa', fontWeight: 700, fontSize:'1rem' }}>
                                            {timeDisplay}
                                        </span>
                                    </Link>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};


// --- COMPOSANT PRINCIPAL ---
export default function EventDetailClient({ event: eventData, allParticipations, relatedEditions }: { event: CycloEvent, allParticipations: any[], relatedEditions: RelatedEdition[] }) {
    const router = useRouter(); 
    
    // CORRECTION ERREUR DE PORTÉE: Déclarer les états avant les useMemo qui les utilisent
    const defaultTab = new Date(eventData.date_start).getTime() > Date.now() ? 'RECON' : 'RACE';
    const [selectedRouteId, setSelectedRouteId] = useState<number>(eventData.routes[0]?.id || 0);
    const [leaderboardTab, setLeaderboardTab] = useState<'RACE' | 'RECON'>(defaultTab);

    // --- CALCULS DE BASE ---
    const currentRoute = useMemo(() => 
        // 🔥 CORRECTION TYPAGE: currentRoute peut être undefined si routes est vide
        eventData.routes.find(r => r.id === selectedRouteId) || eventData.routes[0], 
    [eventData.routes, selectedRouteId]);


    // 1. DÉTERMINER LES HEURES PRÉCISES (utilisées pour l'affichage et le décompte)
    const { eventStartTimestamp, eventEndTimestamp, eventStartTimeText, eventFullDateText } = useMemo(() => {
        let eventStart = new Date(eventData.date_start);
        let eventEnd = eventData.date_end ? new Date(eventData.date_end) : new Date(eventData.date_start);

        // 🔥 LOGIQUE DE LECTURE HEURE : Utiliser l'heure du parcours sélectionné en priorité, puis l'heure de l'événement
        const start_time_str = currentRoute?.start_time || eventData.start_time;
        const end_time_str = eventData.end_time;
        
        let timePart = 'HEURE À CONFIRMER';
        
        if (start_time_str) {
            const [h, m] = start_time_str.split(':').map(Number);
            eventStart.setHours(h, m, 0, 0);
            timePart = `DÉPART ${h}H${m !== 0 ? String(m).padStart(2, '0') : ''}`;
        } else {
            eventStart.setHours(8, 0, 0, 0); 
            timePart = 'DÉPART 8H00';
        }

        if (end_time_str) {
            const [h, m] = end_time_str.split(':').map(Number);
            eventEnd.setHours(h, m, 0, 0);
        } else {
            eventEnd.setHours(18, 0, 0, 0); 
        }

        const datePart = new Date(eventData.date_start).toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });

        return {
            eventStartTimestamp: eventStart.getTime(),
            eventEndTimestamp: eventEnd.getTime(),
            eventStartTimeText: timePart,
            eventFullDateText: datePart
        };
    }, [eventData.date_start, eventData.date_end, eventData.start_time, eventData.end_time, currentRoute]);

    // 2. LOGIQUE DU STATUT TEMPOREL ET DU DÉCOMPTE
    // Le useMemo calcule le statut et le targetTimestamp.
    const { isEventInFuture, isRaceLeaderboardAvailable, countdownStatus, countdownTarget } = useMemo(() => {
        const nowTime = Date.now();
        const isFuture = eventStartTimestamp > nowTime;
        const isLive = nowTime >= eventStartTimestamp && nowTime < eventEndTimestamp;
        
        const isRaceAvailable = !isFuture;

        let status: 'LIVE' | 'IMMINENT' | 'FUTURE' | 'PASSED' = 'FUTURE';
        let targetTimestamp: number = 0;

        if (isLive) {
            status = 'LIVE';
            targetTimestamp = eventEndTimestamp; 
        } else if (isFuture) {
            const timeUntilStart = eventStartTimestamp - nowTime;
            const hoursUntilStart = timeUntilStart / (1000 * 3600);
            
            if (hoursUntilStart <= 24) {
                 status = 'IMMINENT';
                 targetTimestamp = eventStartTimestamp;
            } else {
                 status = 'FUTURE';
                 targetTimestamp = eventStartTimestamp; 
            }
        } else {
            status = 'PASSED';
        }
        
        return {
            isEventInFuture: isFuture,
            isRaceLeaderboardAvailable: isRaceAvailable,
            countdownStatus: status,
            countdownTarget: targetTimestamp
        };
    }, [eventStartTimestamp, eventEndTimestamp]);

    // DÉPLACEMENT DE L'APPEL AU HOOK HORS DU useMemo
    const { formatted: countdownFormatted } = useCountdown(
        countdownTarget, 
        countdownStatus === 'LIVE' || countdownStatus === 'IMMINENT'
    );
    
    // --- CALCULS MEMOISÉS (suite) ---

    // Gérer le cas où currentRoute est undefined (routes vide)
    const pricePerKm = currentRoute ? (currentRoute.price_eur / currentRoute.distance_km).toFixed(2) : '0.00';
    const difficultyScore = currentRoute ? Math.round((currentRoute.distance_km * currentRoute.elevation_gain_m) / 1000) : 0;
    const routePolyline: string | undefined = (currentRoute as any)?.polyline;
    const routeColor = currentRoute ? ROUTE_TYPE_COLORS[currentRoute.type] || ROUTE_TYPE_COLORS.default : ROUTE_TYPE_COLORS.default;

    const allRouteOverlays = useMemo(() => {
        return eventData.routes
            .filter(r => (r as any).polyline) 
            .map(r => ({
                id: r.id, encodedPolyline: (r as any).polyline, color: ROUTE_TYPE_COLORS[r.type] || ROUTE_TYPE_COLORS.default
            }));
    }, [eventData.routes]);

    const userRacePerformance = useMemo(() => {
        const raceEntry = allParticipations.find((l: any) => 
            l.route_id === selectedRouteId && l.type === 'RACE'
        );
        if (!raceEntry) return null;
        
        const getVal = (val: number | null | undefined) => val ?? 0;

        return {
            time: formatChrono(raceEntry.performance_time_s),
            watts: Math.round(getVal(raceEntry.activity.avg_power_w)) || 'N/A',
            bpm: Math.round(getVal(raceEntry.activity.avg_heartrate)) || 'N/A',
            distance: getVal(raceEntry.activity.distance_km).toFixed(2),
            speed: getVal(raceEntry.activity.avg_speed_kmh).toFixed(1),
            np_w:Math.round(getVal(raceEntry.activity.np_w)) ||'NA',
        };
    }, [allParticipations, selectedRouteId]);
    
    // Filtrage du leaderboard
    const currentData = useMemo(() => {
        const filtered = allParticipations.filter((l: any) => l.route_id === selectedRouteId); 
        
        if (leaderboardTab === 'RACE') {
            return filtered.filter(l => l.type === 'RACE').sort((a,b) => a.performance_time_s - b.performance_time_s);
        } else {
            return filtered.filter(l => l.type === 'RECON').sort((a,b) => new Date(b.activity.start_time).getTime() - new Date(a.activity.start_time).getTime());
        }
    }, [allParticipations, selectedRouteId, leaderboardTab]);


    // --- AUTO-SCAN SILENCIEUX (inchangé) ---
    useEffect(() => {
        const performSilentScan = async () => {
            try {
                // 🔥 CORRECTION TYPAGE: eventData.id est déjà un nombre
                const res = await fetch(`/api/events/${eventData.id}/scan`, { method: 'POST' });
                const data = await res.json();
                
                if (data.success && data.matchFound) {
                    
                    if (data.matchType) setLeaderboardTab(data.matchType);
                    if (data.matchRouteId) setSelectedRouteId(data.matchRouteId);

                    router.refresh(); 
                }
            } catch (e) { 
            }
        };

        performSilentScan();
    }, [eventData.id, router]);

    // Formatage de la date complète pour le badge
    const fullDateBadgeText = useMemo(() => {
        const datePart = new Date(eventData.date_start).toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        })
        .replace(/\./g, '')
        .trim();

        return `${datePart} - ${eventStartTimeText}`.toUpperCase();
    }, [eventData.date_start, eventStartTimeText]);

    // Rendu du badge de statut principal dans le Hero Header
    const renderStatusBadge = () => {
        if (countdownStatus === 'LIVE') {
            return (
                <span style={LIVE_BADGE_STYLE}>
                    <Radio size={14} className="animate-pulse-custom" />
                    FIN DANS {countdownFormatted}
                </span>
            );
        }
        if (countdownStatus === 'IMMINENT') {
            return (
                <span style={COUNTDOWN_BADGE_STYLE}>
                    <Timer size={14} />
                    DÉPART DANS {countdownFormatted}
                </span>
            );
        }
        if (countdownStatus === 'PASSED') {
            return (
                 <span style={PASSED_BADGE_STYLE}>
                    <Flag size={14} />
                    TERMINÉ - {eventFullDateText} {/* 🔥 AFFICHAGE DE LA DATE À CÔTÉ DE TERMINÉ */}
                </span>
            );
        }
        
        const diffDays = Math.ceil((eventStartTimestamp - Date.now()) / (1000 * 3600 * 24));
        return (
            <span style={badgeStyle('#333')}>
                <Calendar size={14} />
                J-{diffDays}
            </span>
        );
    };


    return (
        <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top center, #13131f 0%, #050505 80%)', color: '#fff', fontFamily: '"Inter", sans-serif', paddingBottom: '4rem' }}>
            
            <style jsx>{`
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
            `}</style>
            
            {/* HERO HEADER */}
            <div style={{ position: 'relative', height: '400px', width: '100%', overflow: 'hidden', marginBottom: '7rem' }}>
                
                {/* BOUTON RETOUR */}
                <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 50 }}>
                    <Link href="/events"><button style={{background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600}}><ArrowLeft size={16} /> Retour liste</button></Link>
                </div>

                {/* Sélecteur d'Édition (Année) */}
                {relatedEditions.length > 1 && (
                    <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 60 }}>
                        <select
                            onChange={(e) => { 
                                // 🔥 CORRECTION TYPAGE: Convertir la valeur de l'input (string) en number
                                const selectedId = parseInt(e.target.value);
                                if (selectedId !== eventData.id) {
                                    router.push(`/events/${selectedId}`); 
                                }
                            }}
                            value={eventData.id} 
                            style={{
                                padding: '8px 16px', borderRadius: '8px', background: '#333', color: '#fff', 
                                border: '1px solid #d04fd7', cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
                            }}
                        >
                            {relatedEditions.map(edition => (
                                <option key={edition.id} value={edition.id}>
                                    {edition.name} ({new Date(edition.date_start).getFullYear()})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${eventData.image_url || '/images/default-hero.jpg'})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.6 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, #050505 0%, transparent 100%)' }} />
                
                <div style={{ position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 2rem' }}>
                        
                    {/* BLOC BADGES */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                        <span style={badgeStyle('#d04fd7')}>{eventData.country}</span>
                        {/* BADGE DE STATUT DYNAMIQUE */}
                        {renderStatusBadge()}
                    </div>
                    
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0 0 4rem 0', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '-1px', textShadow: '0 4px 30px rgba(0,0,0,0.8)' }}>{eventData.name}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#ccc', fontSize: '0.9rem', fontWeight: 500, marginBottom: '2rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} color="#d04fd7" /> {new Date(eventData.date_start).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16} color="#00f3ff" /> {eventData.location}</span>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '-120px', position: 'relative', zIndex: 20 }}>
                
                {/* COLONNE GAUCHE (2fr) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '2rem' }}> 

                    {isEventInFuture === false && userRacePerformance && (
                        <div style={{...glassCard, border: '1px solid #10b981', boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', gap: '8px', alignItems: 'center', color: '#10b981' }}>
                                    <Trophy size={18} color="#10b981" /> MON CHRONO OFFICIEL
                                </h3>
                                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#00f3ff', fontFamily: 'monospace' }}>
                                    {userRacePerformance.time}
                                </span>
                            </div>
                            
                            {/* STATS DE PERFORMANCE */}
                            <div style={{ 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                justifyContent: 'space-between', 
                                borderTop: '1px solid rgba(255,255,255,0.1)', 
                                paddingTop: '1rem',
                                gap: '1rem 0.5rem' 
                            }}>
                                <MetricBox label="VITESSE MOY." value={userRacePerformance.speed} unit="km/h" icon={Zap} color="#00f3ff" />
                                <MetricBox label="PUISSANCE MOY." value={userRacePerformance.watts} unit="W" icon={Activity} color="#d04fd7" />
                                <MetricBox label="PUISSANCE NORM." value={userRacePerformance.np_w} unit="W" icon={Activity} color="#d04fd7" />
                                <MetricBox label="FC MOY." value={userRacePerformance.bpm} unit="bpm" icon={Heart} color="#ef4444" />
                                <MetricBox label="DISTANCE PARCOURUE" value={userRacePerformance.distance} unit="km" icon={TrendingUp} color="#fff" />
                            </div>
                        </div>
                    )}
                    
                    {/* 1. SÉLECTEUR DE PARCOURS */}
                    <div style={glassCard}>
                        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
                            {eventData.routes.map(route => (
                                <button key={route.id} onClick={() => setSelectedRouteId(route.id)} style={{background: selectedRouteId === route.id ? ROUTE_TYPE_COLORS[route.type] || ROUTE_TYPE_COLORS.default : 'transparent', border: selectedRouteId === route.id ? 'none' : '1px solid rgba(255,255,255,0.2)', color: selectedRouteId === route.id ? '#000' : '#888', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: selectedRouteId === route.id ? `0 0 10px ${ROUTE_TYPE_COLORS[route.type] || ROUTE_TYPE_COLORS.default}40` : 'none'}}>
                                    {route.name} ({route.distance_km}km)
                                </button>
                            ))}
                        </div>
                        {currentRoute && (
                            <>
                                {/* CORRECTION STYLE : Utilisation d'une grille propre pour les 4 métriques de base */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1.5rem', marginBottom: '1rem' }}>
                                    <MetricBox label="Distance" value={currentRoute.distance_km} unit="km" icon={TrendingUp} color="#fff" />
                                    <MetricBox label="Dénivelé" value={currentRoute.elevation_gain_m} unit="m" icon={Mountain} color="#f59e0b" />
                                    <MetricBox label="Ravitos" value={currentRoute.aid_stations_count} unit="pts" icon={Utensils} color="#10b981" />
                                    <MetricBox label="Départ" value={currentRoute.start_time?.slice(0, 5) || 'N/A'} unit="h" icon={Timer} color="#00f3ff" />
                                </div>
                                <DeepAnalysisButton routeId={currentRoute.id} routeColor={routeColor} />
                                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', marginTop: '1rem' }} /> {/* Séparateur */}

                                {/* ANALYSE ÉCONOMIQUE & DIFFICULTÉ */}
                                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.5rem' }}>
                                    {/* BLOCK 1 */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)', flexGrow: 1 }}>
                                        <div><div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 700 }}>COÛT / KM</div><div style={{ fontSize: '1.2rem', fontWeight: 800, color: Number(pricePerKm) > 1 ? '#ef4444' : '#10b981' }}>{pricePerKm} €<small style={{fontSize:'0.6em', color:'#666'}}>/km</small></div></div>
                                        <Euro size={20} color={Number(pricePerKm) > 1 ? '#ef4444' : '#10b981'} />
                                    </div>
                                    {/* BLOCK 2 */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '1rem', flexGrow: 1 }}>
                                        <div><div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 700 }}>INDEX DIFFICULTÉ</div><div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#d04fd7' }}>{difficultyScore} <small style={{fontSize:'0.6em', color:'#666'}}>pts</small></div></div>
                                        <BarChart3 size={20} color="#d04fd7" />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* 2. CARTE */}
                    <div style={{...glassCard, padding: '1rem'}}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', padding: '0.5rem' }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, display: 'flex', gap: '8px', alignItems: 'center' }}><MapPin size={16} color={routeColor}/> Tracé : {currentRoute?.name}</h3>
                            <div style={{ fontSize: '0.7rem', color: '#666', fontStyle: 'italic' }}>{allRouteOverlays.length > 1 ? "Comparaison active" : "Vue unique"}</div>
                        </div>
                        {routePolyline ? (
                            <div style={{height: '400px', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${routeColor}40`}}>
                                <MiniMap encodedPolyline={routePolyline} color={routeColor} mapHeight={'400px'} />
                            </div>
                        ) : (
                            <div style={{height: '400px', background: 'rgba(0,0,0,0.5)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', border: '1px dashed #333'}}>Tracé GPX non fourni.</div>
                        )}
                    </div>

                    {/* 3. CLASSEMENT & RECOS */}
                    <div style={glassCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', gap: '8px', margin: 0 }}>
                                <Trophy size={18} color="#f59e0b" /> RÉSULTATS PULSAR
                            </h3>
                            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px', display: 'flex' }}>
                                <button 
                                    onClick={() => setLeaderboardTab('RACE')} 
                                    // 🔥 isRaceLeaderboardAvailable utilise la valeur 'isEventInFuture' qui est correcte
                                    disabled={!isRaceLeaderboardAvailable} 
                                    style={{ 
                                        padding: '4px 12px', borderRadius: '6px', border: 'none', background: leaderboardTab === 'RACE' ? '#f59e0b' : 'transparent', 
                                        color: leaderboardTab === 'RACE' ? '#000' : isRaceLeaderboardAvailable ? '#888' : '#444', 
                                        fontSize: '0.7rem', fontWeight: 800, cursor: isRaceLeaderboardAvailable ? 'pointer' : 'not-allowed', 
                                        transition: 'all 0.2s', opacity: isRaceLeaderboardAvailable ? 1 : 0.4
                                    }}
                                >
                                    COURSE
                                </button>
                                <button onClick={() => setLeaderboardTab('RECON')} style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: leaderboardTab === 'RECON' ? '#00f3ff' : 'transparent', color: leaderboardTab === 'RECON' ? '#000' : '#888', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>RECOS ({allParticipations.filter(p => p.type === 'RECON' && p.route_id === selectedRouteId).length})</button>
                            </div>
                        </div>
                        
                        <LeaderboardTable data={currentData} type={leaderboardTab} routeDistance={currentRoute?.distance_km || 0} />
                    </div>

                    {/* 4. HISTORIQUE DES VAINQUEURS */}
                    <div style={glassCard}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Award size={18} color="#eab308" /> CHRONOLOGIE DES VAINQUEURS
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {relatedEditions
                                .sort((a, b) => new Date(b.date_start).getFullYear() - new Date(a.date_start).getFullYear())
                                .map((edition) => {
                                    const editionYear = new Date(edition.date_start).getFullYear();
                                    // 🔥 CORRECTION TYPAGE: eventData.id et edition.id sont maintenant des numbers
                                    const isCurrentYear = edition.id === eventData.id; 
                                    const isPassed = new Date(edition.date_start).getTime() < Date.now();
                                    const fullDate = new Date(edition.date_start).toLocaleDateString('fr-FR', { 
                                        day: 'numeric', 
                                        month: 'long' 
                                    });

                                    const winnerMName = edition.winner_name_m;
                                    const winnerMTime = edition.winner_time_m;
                                    const winnerFName = edition.winner_name_f;
                                    const winnerFTime = edition.winner_time_f;
                                    const hasWinners = winnerMName || winnerFName;

                                    // Couleurs selon le statut
                                    const getStatusColor = () => {
                                        if (isCurrentYear) return '#d04fd7';
                                        if (hasWinners) return '#eab308';
                                        if (isPassed) return '#6b7280';
                                        return '#00f3ff';
                                    };

                                    const statusColor = getStatusColor();

                                    return (
                                        // 🔥 CORRECTION TYPAGE: Convertir edition.id en string pour le href si nécessaire, sinon utiliser la valeur number
                                        <Link key={edition.id} href={`/events/${edition.id}`} style={{ textDecoration: 'none' }}>
                                            <div style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                border: `1px solid ${statusColor}20`,
                                                borderRadius: '12px',
                                                padding: '1rem',
                                                transition: 'all 0.2s ease',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }} 
                                            className="group hover:bg-white/5 hover:border-white/20"
                                            >
                                                {/* Indicateur latéral */}
                                                <div style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: 0,
                                                    bottom: 0,
                                                    width: '4px',
                                                    background: statusColor,
                                                    borderRadius: '2px'
                                                }} />

                                                {/* En-tête année et statut */}
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: '0.75rem'
                                                }}>
                                                    <div>
                                                        <div style={{
                                                            fontSize: '1.1rem',
                                                            fontWeight: 900,
                                                            color: isCurrentYear ? '#d04fd7' : '#fff',
                                                            lineHeight: 1.2
                                                        }}>
                                                            {editionYear}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            color: '#888',
                                                            fontWeight: 600,
                                                            marginTop: '2px'
                                                        }}>
                                                            {fullDate}
                                                        </div>
                                                    </div>
                                                    
                                                    <div style={{
                                                        background: `${statusColor}15`,
                                                        color: statusColor,
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        border: `1px solid ${statusColor}30`
                                                    }}>
                                                        {isCurrentYear ? 'ACTUELLE' : (isPassed ? 'ARCHIVE' : 'À VENIR')}
                                                    </div>
                                                </div>

                                                {/* Contenu vainqueurs */}
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.5rem'
                                                }}>
                                                    {/* Vainqueur Homme */}
                                                    {winnerMName && (
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            padding: '0.5rem',
                                                            background: 'rgba(255,255,255,0.02)',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(255,255,255,0.05)'
                                                        }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.5rem',
                                                                flex: 1
                                                            }}>
                                                                <div style={{
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    borderRadius: '50%',
                                                                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 900
                                                                }}>
                                                                    H
                                                                </div>
                                                                <span style={{
                                                                    fontWeight: 700,
                                                                    color: '#fff',
                                                                    fontSize: '0.9rem'
                                                                }}>
                                                                    {winnerMName}
                                                                </span>
                                                            </div>
                                                            {winnerMTime && (
                                                                <div style={{
                                                                    background: '#d04fd7',
                                                                    color: '#000',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 900,
                                                                    fontFamily: 'monospace',
                                                                    minWidth: '70px',
                                                                    textAlign: 'center'
                                                                }}>
                                                                    {winnerMTime}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Vainqueur Femme */}
                                                    {winnerFName && (
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            padding: '0.5rem',
                                                            background: 'rgba(255,255,255,0.02)',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(255,255,255,0.05)'
                                                        }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.5rem',
                                                                flex: 1
                                                            }}>
                                                                <div style={{
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    borderRadius: '50%',
                                                                    background: 'linear-gradient(135deg, #ec4899, #be185d)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 900
                                                                }}>
                                                                    F
                                                                </div>
                                                                <span style={{
                                                                    fontWeight: 700,
                                                                    color: '#fff',
                                                                    fontSize: '0.9rem'
                                                                }}>
                                                                    {winnerFName}
                                                                </span>
                                                            </div>
                                                            {winnerFTime && (
                                                                <div style={{
                                                                    background: '#d04fd7',
                                                                    color: '#000',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 900,
                                                                    fontFamily: 'monospace',
                                                                    minWidth: '70px',
                                                                    textAlign: 'center'
                                                                }}>
                                                                    {winnerFTime}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Aucun vainqueur */}
                                                    {!hasWinners && (
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            padding: '0.75rem',
                                                            background: 'rgba(255,255,255,0.02)',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(255,255,255,0.05)',
                                                            color: isPassed ? '#ef4444' : '#888',
                                                            fontSize: '0.9rem',
                                                            fontStyle: 'italic'
                                                        }}>
                                                            <span>Statut</span>
                                                            <span style={{ fontWeight: 600 }}>
                                                                {isPassed ? 'Résultats non disponibles' : 'Course à venir'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Indicateur de hover */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '50%',
                                                    right: '1rem',
                                                    transform: 'translateY(-50%)',
                                                    opacity: 0,
                                                    transition: 'opacity 0.2s ease',
                                                    color: statusColor
                                                }} 
                                                className="group-hover:opacity-100"
                                                >
                                                    <ExternalLink size={16} />
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                        </div>
                    </div>

                </div>

                {/* SIDEBAR */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '2rem' }}>
                    
                    {/* INSCRIPTION */}
                    <div style={{ ...glassCard, border: '1px solid #d04fd7', boxShadow: '0 0 20px rgba(208, 79, 215, 0.2)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#d04fd7', textAlign:'center', fontWeight: 800, letterSpacing: '1px', marginBottom: '4px' }}>BUDGET</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, textAlign:'center',marginBottom: '1.5rem' }}>{currentRoute?.price_eur} €</div>
                        
                        {/* CORRECTION : Afficher le bouton UNIQUEMENT si l'événement est dans le futur */}
                        {isEventInFuture ? (
                            <a href={eventData.registration_url || '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                                <button style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: '#d04fd7', color: '#000', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>S'INSCRIRE <ExternalLink size={16} /></button>
                            </a>
                        ) : (
                            // Afficher le statut FERMÉ si l'événement est passé ou en cours
                            <div style={{ background: '#333', color: '#aaa', padding: '14px', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', textAlign: 'center', border: '1px solid #444' }}>
                                INSCRIPTIONS FERMÉES
                            </div>
                        )}
                        
                        {eventData.website_url && <a href={eventData.website_url} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: '1rem', color: '#888', fontSize: '0.8rem', textDecoration: 'underline' }}>Voir le site officiel</a>}
                    </div>

                    {/* RATINGS */}
                    <div style={glassCard}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', gap: '8px' }}><ShieldCheck size={16} color="#00f3ff"/> PULSAR RATINGS</h3>
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}><span style={{ color: '#ccc' }}>Note Globale</span><span style={{ fontWeight: 700, color: '#00f3ff' }}>{eventData.rating_global}/10</span></div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}><div style={{ width: `${eventData.rating_global * 10}%`, height: '100%', background: '#00f3ff', borderRadius: '3px', boxShadow: '0 0 10px #00f3ff' }} /></div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}><span style={{ color: '#ccc' }}>Rapport Qualité/Prix</span><span style={{ fontWeight: 700, color: '#10b981' }}>{eventData.rating_quality_price}/10</span></div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}><div style={{ width: `${eventData.rating_quality_price * 10}%`, height: '100%', background: '#10b981', borderRadius: '3px' }} /></div>
                        </div>
                    </div>

                    {/* WIDGET MÉTÉO */}
                    <WeatherWidget 
                        eventId={eventData.id} 
                        eventDate={eventData.date_start} 
                        eventEndDate={eventData.date_end} 
                        eventEndTime={eventData.end_time} 
                        location={eventData.location} 
                        coordinates={eventData.coordinates ?? null} 
                        finalWeatherJson={eventData.final_weather_json || null} 
                    />
                    {/* MAILLOT */}
                    <JerseyPreview 
                        url={eventData.jersey_url ?? undefined} 
                    />

                </div>
            </div>
        </div>
    );
}