'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Plus, Calendar, MapPin, Zap, Flame, Radio, Timer, Flag, ChevronRight, History, Ticket, Users, Clock } from 'lucide-react';
import EventCard from './components/EventCard';
import { useCountdown } from '../../lib/hooks/useCountdown'; 

// Définition de l'interface pour la compilation standalone
interface CycloEvent {
    id: string;
    name: string;
    location: string;
    country: string;
    date_start: string;
    date_end?: string;
    image_url?: string;
    rating_global: number;
    routes: { distance_km: number; elevation_gain_m: number; start_time?: string; price_eur?: number }[];
    history?: { participants_count: number }[];
    start_time?: string; 
    end_time?: string;   
}

interface EventsGridProps {
    events: CycloEvent[];
    isAdmin: boolean;
}

// --- STYLES ---
const styles = {
    pageContainer: {
        minHeight: '100vh',
        background: 'radial-gradient(circle at top center, #13131f 0%, #050505 80%)',
        paddingBottom: '4rem',
        color: '#fff',
        fontFamily: '"Inter", sans-serif',
        overflowX: 'hidden' as const,
    },
    liveCardStyle: {
        border: '1px solid #ef4444', 
        boxShadow: 'inset 0 0 15px rgba(239, 68, 68, 0.3)',
        transform: 'scale(1.02)',
        transition: 'all 0.3s ease',
        position: 'relative' as const,
        zIndex: 10,
        filter: 'grayscale(0) brightness(1.2) drop-shadow(0 0 12px #ef4444)',
        overflow: 'hidden',
        borderRadius: '16px', 
    },
    todayCardStyle: {
        border: '1px solid #f59e0b',
        filter: 'grayscale(0.2)', 
        borderRadius: '16px', 
    },
    finishedCardStyle: {
        border: '1px solid rgba(255, 255, 255, 0.08)', 
        filter: 'grayscale(0.1)',
        opacity: 0.9,
        borderRadius: '16px', 
    },
    tickerContainer: {
        background: 'rgba(10, 10, 15, 0.95)', 
        borderBottom: '1px solid #d04fd7',
        color: '#fff',
        height: '50px',
        overflow: 'hidden',
        whiteSpace: 'nowrap' as const,
        position: 'fixed' as const,
        top: 0, left: 0, right: 0,
        zIndex: 40,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
    },
    tickerWrapper: {
        display: 'inline-block',
        paddingLeft: '100%',
        animation: 'ticker 60s linear infinite', 
    },
    tickerItemLink: {
        textDecoration: 'none',
        color: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        marginRight: '80px',
        transition: 'opacity 0.2s',
    },
    tickerContent: {
        display: 'flex', alignItems: 'center', gap: '12px',
        fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' as const,
    },
    // 🔥 CORRECTION DE TYPAGE CSS
    ongoingGrid: { 
        display: 'flex', 
        flexDirection: 'row' as const,
        gap: '2rem',
        justifyContent: 'flex-start',
        overflowX: 'auto' as const, 
        paddingBottom: '20px', 
        WebkitOverflowScrolling: 'touch' as const, // Type corrigé
    },
    
    // BADGES
    badgeLive: { 
        background: '#ef4444', 
        color: '#fff', 
        padding: '2px 8px', 
        borderRadius: '4px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        fontSize: '0.7rem', 
        fontWeight: 900, 
        boxShadow: '0 0 15px rgba(239, 68, 68, 0.6)' 
    },
    badgeImminent: { 
        background: '#f59e0b', 
        color: '#000', 
        padding: '2px 8px', 
        borderRadius: '4px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        fontSize: '0.7rem', 
        fontWeight: 900, 
        boxShadow: '0 0 15px rgba(245, 158, 11, 0.6)', 
        animation: 'pulse 1.5s infinite' 
    },
    badgeFinished: { 
        background: '#10b981', 
        color: '#000', 
        padding: '2px 8px', 
        borderRadius: '4px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        fontSize: '0.7rem', 
        fontWeight: 900 
    },
    badgeFuture: { 
        background: '#333', 
        color: '#aaa', 
        padding: '2px 8px', 
        borderRadius: '4px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        fontSize: '0.7rem', 
        fontWeight: 700, 
        border: '1px solid #555' 
    },
    badgeComingSoon: { 
        background: 'rgba(0, 243, 255, 0.1)', 
        color: '#00f3ff', 
        border: '1px solid #00f3ff', 
        padding: '2px 8px', 
        borderRadius: '4px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        fontSize: '0.7rem', 
        fontWeight: 900 
    },
    badgeCountdown: { 
        background: 'rgba(255, 193, 7, 0.1)', 
        color: '#ffc107', 
        border: '1px solid #ffc107',
        padding: '2px 8px', 
        borderRadius: '4px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        fontSize: '0.7rem', 
        fontWeight: 900,
        animation: 'pulse 1.5s infinite'
    },
    // 🔥 AJOUT DU STYLE MANQUANT
    badgeArchive: { 
        background: 'rgba(107, 114, 128, 0.2)',
        border: '1px solid rgba(107, 114, 128, 0.6)',
        color: '#9ca3af',
        padding: '2px 8px', 
        borderRadius: '4px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        fontSize: '0.7rem', 
        fontWeight: 700,
    },
    // RESTE DES STYLES (inchangés)
    contentWrapper: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 1.5rem',
        paddingTop: '80px',
    },
    header: { 
        textAlign: 'center' as const, 
        marginBottom: '3rem' 
    },
    mainTitle: { 
        fontSize: '3.5rem', 
        fontWeight: 900, 
        margin: '0 0 1rem 0', 
        background: 'linear-gradient(90deg, #fff 0%, #00f3ff 100%)', 
        WebkitBackgroundClip: 'text', 
        WebkitTextFillColor: 'transparent', 
        letterSpacing: '-1px' 
    },
    searchBarContainer: { 
        background: 'rgba(20, 20, 30, 0.6)', 
        backdropFilter: 'blur(10px)', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: '16px', 
        padding: '1rem', 
        marginBottom: '3rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)' 
    },
    searchInput: { 
        background: 'transparent', 
        border: 'none', 
        color: '#fff', 
        fontSize: '1rem', 
        flex: 1, 
        outline: 'none', 
        fontWeight: 500 
    },
    sectionTitle: { 
        fontSize: '1.8rem', 
        fontWeight: 800, 
        color: '#fff', 
        marginBottom: '1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginTop: '4rem', 
        borderBottom: '1px solid rgba(255,255,255,0.1)', 
        paddingBottom: '10px' 
    },
    grid: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '2rem' 
    },
    emptyState: { 
        color: '#666', 
        textAlign: 'center' as const, 
        padding: '3rem', 
        border: '1px dashed rgba(255,255,255,0.1)', 
        borderRadius: '16px', 
        fontStyle: 'italic' 
    },
    adminButton: { 
        padding: '12px 24px', 
        background: '#00f3ff', 
        color: '#000', 
        border: 'none', 
        borderRadius: '30px', 
        cursor: 'pointer', 
        fontWeight: 800, 
        boxShadow: '0 0 20px rgba(0, 243, 255, 0.4)', 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px', 
        fontSize: '0.9rem', 
        marginTop: '1.5rem', 
        transition: 'transform 0.2s' 
    },
};

// NOUVEAU COMPOSANT : Affiche le décompte de FIN pour les événements LIVE dans le Ticker
function TickerLiveCountdownItem({ event }: { event: CycloEvent }) {
    let eventEnd = event.date_end ? new Date(event.date_end) : new Date(event.date_start);
    const end_time_str = event.end_time;
        
    if (end_time_str) {
        const [endH, endM] = end_time_str.split(':').map(Number);
        eventEnd.setHours(endH, endM, 0, 0);
    } else {
        eventEnd.setHours(18, 0, 0, 0); // Défaut 18h
    }

    const targetTimestamp = eventEnd.getTime();
    const isActive = targetTimestamp > Date.now();
    
    const { formatted: countdown } = useCountdown(targetTimestamp, isActive);
    
    return (
        <span style={styles.badgeLive}>
            <Radio size={12} className="animate-pulse-custom" />
            FIN DANS {countdown}
        </span>
    );
}

// COMPOSANT : Affiche le décompte de DÉPART pour les événements IMMINENTS dans le Ticker
function TickerCountdownItem({ event }: { event: CycloEvent }) {
    const eventDate = new Date(event.date_start);
    const eventDateTime = new Date(eventDate);
    
    const start_time_str = event.start_time || event.routes[0]?.start_time;
    if (start_time_str) {
        const [hours, minutes] = start_time_str.split(':').map(Number);
        eventDateTime.setHours(hours, minutes, 0, 0);
    } else {
        eventDateTime.setHours(8, 0, 0, 0);
    }
    
    const targetTimestamp = eventDateTime.getTime();
    const isActive = targetTimestamp > Date.now();
    
    const { formatted: countdown, isFinished } = useCountdown(targetTimestamp, isActive);
    
    if (isFinished) {
        return (
            <span style={styles.badgeLive}>
                <Radio size={12} className="animate-pulse-custom" />
                LIVE
            </span>
        );
    }
    
    return (
        <span style={styles.badgeCountdown}>
            <Clock size={12} />
            {countdown}
        </span>
    );
}

// COMPOSANT : Affiche le décompte de DÉPART pour les événements IMMINENTS dans les Cards
function CardStartCountdownBadge({ event }: { event: CycloEvent }) {
    const eventDate = new Date(event.date_start);
    const eventDateTime = new Date(eventDate);
    
    const start_time_str = event.start_time || event.routes[0]?.start_time;
    if (start_time_str) {
        const [hours, minutes] = start_time_str.split(':').map(Number);
        eventDateTime.setHours(hours, minutes, 0, 0);
    } else {
        eventDateTime.setHours(8, 0, 0, 0);
    }
    
    const targetTimestamp = eventDateTime.getTime();
    const isActive = targetTimestamp > Date.now();
    
    const { formatted: countdown, isFinished } = useCountdown(targetTimestamp, isActive);
    
    if (isFinished) {
        return (
            <span style={styles.badgeLive}>
                <Radio size={12} className="animate-pulse-custom" />
                DÉPART IMMINENT
            </span>
        );
    }
    
    return (
        <span style={styles.badgeCountdown}>
            <Clock size={12} />
            {countdown}
        </span>
    );
}

export default function EventsGridClient({ events, isAdmin }: EventsGridProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date()); 

    React.useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        
        return () => clearInterval(interval);
    }, []);

    // --- FILTRAGE ---
    const filteredEvents = useMemo(() => {
        let list = events;
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            list = events.filter(evt => 
                evt.name.toLowerCase().includes(lowerTerm) || 
                evt.location.toLowerCase().includes(lowerTerm) ||
                evt.country.toLowerCase().includes(lowerTerm)
            );
        }
        return list.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
    }, [events, searchTerm]);

    // --- LOGIQUE TEMPORELLE ---
    const now = currentTime; 
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeValue = currentHour * 60 + currentMinute; 
    
    const today = new Date(now);
    today.setHours(0,0,0,0);

    // 1. Trier les événements
    const { ongoing, upcomingGrouped, past, tickerList } = useMemo(() => {
        const ongoingRaw: (CycloEvent & { endTime: number, startTime: number })[] = [];
        const upcoming: CycloEvent[] = [];
        const past: CycloEvent[] = [];
        
        const hypeList: CycloEvent[] = []; 
        const comingSoonList: CycloEvent[] = []; 

        filteredEvents.forEach(evt => {
            
            // Calcul des heures réelles de début/fin
            const start_time_str = evt.start_time || evt.routes[0]?.start_time;
            const end_time_str = evt.end_time;
            
            let eventStart = new Date(evt.date_start);
            let eventEnd = evt.date_end ? new Date(evt.date_end) : new Date(evt.date_start);

            if (start_time_str) {
                const [startH, startM] = start_time_str.split(':').map(Number);
                eventStart.setHours(startH, startM, 0, 0);
            } else {
                eventStart.setHours(8, 0, 0, 0); 
            }
            
            if (end_time_str) {
                const [endH, endM] = end_time_str.split(':').map(Number);
                eventEnd.setHours(endH, endM, 0, 0);
            } else {
                eventEnd.setHours(18, 0, 0, 0); 
            }
            
            const startTime = eventStart.getTime();
            const endTime = eventEnd.getTime();
            
            const timeUntilStart = startTime - now.getTime();
            const hoursUntilStart = timeUntilStart / (1000 * 3600);
            const timeSinceEnd = now.getTime() - endTime;
            const hoursSinceEnd = timeSinceEnd / (1000 * 3600);

            // ------------------------------------------------------------------
            // LOGIQUE DE TRI VERS LES SECTIONS : ONGOING (LIVE, FINI < 24h, J-24h)
            // ------------------------------------------------------------------

            // 1. En cours (LIVE) ou Vient de finir (< 24h) ou Décompte J-24h
            if ((now.getTime() >= startTime && now.getTime() < endTime) || 
                (now.getTime() >= endTime && hoursSinceEnd <= 24) ||
                (now.getTime() < startTime && hoursUntilStart <= 24 && hoursUntilStart > 0)) {
                
                ongoingRaw.push({...evt, endTime, startTime});

            // 2. À venir (> 24h)
            } else if (now.getTime() < startTime) {
                upcoming.push(evt);

            // 3. Terminé depuis > 24h (Archive)
            } else {
                past.push(evt);
            }

            // ------------------------------------------------------------------
            // LOGIQUE DE TRI VERS LE TICKER
            // ------------------------------------------------------------------

            if (hoursUntilStart <= 24 && hoursUntilStart > 0) {
                hypeList.push(evt);
            } else if (hoursSinceEnd <= 24 && hoursSinceEnd > 0) {
                hypeList.push(evt);
            } else if (now.getTime() < startTime) {
                const diffDays = Math.ceil((startTime - today.getTime()) / (1000 * 3600 * 24));
                if (diffDays <= 7) {
                    hypeList.push(evt); 
                } else if (diffDays <= 30) {
                    comingSoonList.push(evt); 
                }
            } else if (now.getTime() >= startTime && now.getTime() < endTime) {
                hypeList.push(evt);
            }
        });

        // 🔥 TRI DES ÉVÉNEMENTS ONGOING : LIVE (fin la plus proche) > IMMINENT (début le plus proche) > TERMINÉ (fin la plus récente)
        const ongoing = ongoingRaw.sort((a, b) => {
            const statusA = getEventStatus(a, today, currentTimeValue, now);
            const statusB = getEventStatus(b, today, currentTimeValue, now);

            // Ordre de priorité: LIVE > IMMINENT > TERMINÉ

            // 1. LIVE (le plus proche de la fin en premier)
            if (statusA.type === 'LIVE' && statusB.type !== 'LIVE') return -1;
            if (statusA.type !== 'LIVE' && statusB.type === 'LIVE') return 1;
            if (statusA.type === 'LIVE' && statusB.type === 'LIVE') {
                return a.endTime - b.endTime; // Tri par heure de fin (le plus rapide à gauche)
            }
            
            // 2. IMMINENT/TODAY_SOON (le plus proche du début en premier)
            const isAImminent = statusA.type === 'IMMINENT' || statusA.type === 'TODAY_SOON';
            const isBImminent = statusB.type === 'IMMINENT' || statusB.type === 'TODAY_SOON';

            if (isAImminent && !isBImminent) return -1;
            if (!isAImminent && isBImminent) return 1;
            if (isAImminent && isBImminent) {
                return a.startTime - b.startTime; // Tri par heure de début
            }
            
            // 3. FINISHED (le plus récent en premier)
            if (statusA.type === 'FINISHED' && statusB.type !== 'FINISHED') return -1;
            if (statusA.type !== 'FINISHED' && statusB.type === 'FINISHED') return 1;
            if (statusA.type === 'FINISHED' && statusB.type === 'FINISHED') {
                return b.endTime - a.endTime; // Tri par heure de fin (le plus récent à gauche)
            }

            return 0;
        });

        past.reverse();

        const upcomingGrouped = upcoming.reduce((acc, evt) => {
            const date = new Date(evt.date_start);
            const year = date.getFullYear();
            const month = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
            
            if (!acc[year]) acc[year] = {};
            if (!acc[year][month]) acc[year][month] = [];
            
            acc[year][month].push(evt);
            return acc;
        }, {} as Record<number, Record<string, CycloEvent[]>>);

        const tickerList = [...hypeList, ...comingSoonList];

        return { ongoing, upcomingGrouped, past, tickerList };
    }, [filteredEvents, today, now]); 

    // 2. Construire les items du Ticker avec Status
    const tickerItems = useMemo(() => {
        return tickerList.map(evt => {
            const status = getEventStatus(evt, today, currentTimeValue, now); 
            
            const minPrice = evt.routes.length > 0 ? Math.min(...evt.routes.map(r => r.price_eur || Infinity)) : 0;
            const participants = evt.history?.[0]?.participants_count || '1000+';

            return { ...evt, status, minPrice, participants };
        });
    }, [tickerList, today, currentTimeValue, now]); 

    const shouldShowTicker = tickerItems.length > 0;

    return (
        <div style={styles.pageContainer}>
            <style jsx>{`
                @keyframes ticker { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-100%, 0, 0); } }
                @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
                .animate-pulse-custom { animation: pulse 2s infinite ease-in-out; }
                .ticker-link:hover { opacity: 0.7; }
                
                .ongoing-grid-custom {
                    scrollbar-width: thin;
                    scrollbar-color: #444 #111;
                }
                .ongoing-grid-custom::-webkit-scrollbar {
                    height: 8px;
                }
                .ongoing-grid-custom::-webkit-scrollbar-thumb {
                    background-color: #444;
                    border-radius: 10px;
                }
                .ongoing-grid-custom::-webkit-scrollbar-track {
                    background-color: #111;
                }
                /* Correction visuelle pour éviter le contour carré sur la carte enfant */
                .ongoing-grid-custom > div {
                    border-radius: 16px;
                }
            `}</style>

            {/* --- BANDEAU DÉFILANT (TICKER) --- */}
            {shouldShowTicker && (
                <div style={styles.tickerContainer}>
                    <div style={styles.tickerWrapper}>
                        {[...tickerItems, ...tickerItems].map((item, i) => {
                            const { status } = item;
                            const StatusIcon = status.icon;
                            
                            // Détermination du timer
                            const start_time_str = item.start_time || item.routes[0]?.start_time;
                            let eventDateTime = new Date(item.date_start);
                            if (start_time_str) {
                                const [hours, minutes] = start_time_str.split(':').map(Number);
                                eventDateTime.setHours(hours, minutes, 0, 0);
                            } else {
                                eventDateTime.setHours(8, 0, 0, 0);
                            }
                            
                            const timeUntilEvent = eventDateTime.getTime() - now.getTime();
                            const hoursUntilEvent = timeUntilEvent / (1000 * 3600);
                            
                            const isLive = status.type === 'LIVE';
                            const isFinished = status.type === 'FINISHED';
                            
                            // Afficher le countdown de départ si l'événement est dans les 24h et n'a pas encore commencé
                            const shouldShowCountdownStart = hoursUntilEvent <= 24 && hoursUntilEvent > 0 && !isLive;

                            const isComingSoon = status.type === 'FUTURE' && parseInt(status.label.replace('J-', '')) > 7;

                            return (
                                <Link key={`tick-${item.id}-${i}`} href={`/events/${item.id}`} style={styles.tickerItemLink} className="ticker-link">
                                    <div style={styles.tickerContent}>
                                        
                                        {/* AFFICHAGE CONDITIONNEL : Compteur LIVE > Compteur DÉPART > Badge normal */}
                                        {isLive ? (
                                            <TickerLiveCountdownItem event={item} />
                                        ) : shouldShowCountdownStart ? (
                                            <TickerCountdownItem event={item} />
                                        ) : (
                                            <span style={isComingSoon ? styles.badgeComingSoon : status.style}>
                                                <StatusIcon size={12} className={status.animate ? "animate-pulse-custom" : ""} />
                                                {status.label}
                                            </span>
                                        )}
                                        
                                        {/* Nom & Lieu */}
                                        <span style={{ fontWeight: 800, letterSpacing: '0.5px', color: isComingSoon || isFinished ? '#ccc' : '#fff' }}>
                                            {item.name}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 500 }}>
                                            ({item.location})
                                        </span>

                                        {/* Infos supplémentaires pour les J-30 */}
                                        {isComingSoon && (
                                            <span style={{display:'flex', alignItems:'center', gap:'8px', marginLeft:'10px', borderLeft:'1px solid #444', paddingLeft:'10px', fontSize:'0.75rem', color:'#888'}}>
                                                <span><Ticket size={12} style={{display:'inline', marginRight:'4px'}}/>{item.minPrice}€</span>
                                                <span><Users size={12} style={{display:'inline', marginRight:'4px'}}/>{item.participants} participants</span>
                                            </span>
                                        )}

                                        <ChevronRight size={14} color={isComingSoon ? "#00f3ff" : "#d04fd7"} style={{marginLeft: '5px'}} />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            <div style={styles.contentWrapper}>
                {/* HEADER */}
                <div style={styles.header}>
                    <h1 style={styles.mainTitle}>CALENDRIER PULSAR</h1>
                    <p style={{ color: '#aaa', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                        Explorez l'historique et le futur des compétitions.
                    </p>
                    {isAdmin && (
                        <Link href="/events/admin/new" style={{ textDecoration: 'none' }}>
                            <button style={styles.adminButton}>
                                <Plus size={18} /> CRÉER UN ÉVÉNEMENT
                            </button>
                        </Link>
                    )}
                </div>

                {/* SEARCH BAR */}
                <div style={styles.searchBarContainer}>
                    <Search size={20} color="#666" />
                    <input 
                        type="text" 
                        placeholder="Rechercher un événement..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                    {searchTerm && <span style={{color: '#00f3ff', fontSize: '0.8rem'}}>{filteredEvents.length} trouvés</span>}
                </div>

                {/* --- SECTIONS (LIVE / VENIR / PASSÉS) --- */}
                
                {/* LIVE / AUJOURD'HUI */}
                {ongoing.length > 0 && (
                    <div style={{marginBottom: '2rem'}}>
                        <h2 style={{...styles.sectionTitle, color: '#f59e0b', borderColor: '#f59e0b'}}>
                            <Radio size={28} className="animate-pulse-custom" /> EN DIRECT / AUJOURD'HUI
                        </h2>
                        {/* 🔥 AJOUT DE LA CLASSE CUSTOM POUR LE SCROLL */}
                        <div style={styles.ongoingGrid} className="ongoing-grid-custom"> 
                            {ongoing.map(evt => {
                                const itemStatus = getEventStatus(evt, today, currentTimeValue, now);
                                const isReallyLive = itemStatus.type === 'LIVE';
                                const isFinished = itemStatus.type === 'FINISHED';
                                const isImminent = itemStatus.type === 'IMMINENT' || itemStatus.type === 'TODAY_SOON';
                                
                                const cardStyle = isReallyLive ? styles.liveCardStyle : 
                                                  isFinished ? styles.finishedCardStyle : 
                                                  isImminent ? styles.todayCardStyle : {}; 
                                
                                return (
                                    <div key={evt.id} style={{ ...cardStyle, cursor: 'pointer', opacity: 1, minWidth: '320px' }}>
                                        {/* Le badge externe est passé uniquement pour les événements J-24h */}
                                        <EventCard 
                                            event={evt as any} 
                                            countdownBadge={isImminent ? <CardStartCountdownBadge event={evt} /> : null}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* À VENIR */}
                <div>
                    <h2 style={{...styles.sectionTitle, color: '#4fd797ff', borderColor: '#4fd797ff'}}>
                        <Calendar size={28} /> PROCHAINEMENT
                    </h2>
                    
                    {Object.keys(upcomingGrouped).length > 0 ? (
                        <>
                            {Object.keys(upcomingGrouped).sort((a, b) => parseInt(a) - parseInt(b)).map(year => (
                                <div key={year} style={{ marginBottom: '3rem' }}>
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#00f3ff', marginBottom: '1.5rem', borderBottom: '1px solid #00f3ff20', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <ChevronRight size={18} color="#00f3ff" /> ANNÉE {year}
                                    </h3>
                                    {Object.keys(upcomingGrouped[year]).map(month => (
                                        <div key={month} style={{ marginBottom: '2rem', marginLeft: '1rem', borderLeft: '3px solid #00f3ff10', paddingLeft: '1rem' }}>
                                            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4fd797ff', marginBottom: '1rem' }}>
                                                {month.toUpperCase()}
                                            </h4>
                                            <div style={styles.grid}>
                                                {upcomingGrouped[year][month].map(evt => {
                                                    // Les événements J-24h ne sont plus ici, pas besoin de countdownBadge
                                                    return (
                                                        <EventCard 
                                                            key={evt.id} 
                                                            event={evt as any}
                                                            countdownBadge={null}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </>
                    ) : (
                        <div style={styles.emptyState}>Aucun événement prévu pour le moment.</div>
                    )}
                </div>

                {/* ARCHIVES */}
                <div style={{marginTop: '4rem', opacity: 0.8}}>
                    <h2 style={{...styles.sectionTitle, color: '#aaa', borderColor: '#333'}}>
                        <History size={28} /> ARCHIVES / TERMINÉS
                    </h2>
                    {past.length > 0 ? (
                        <div style={styles.grid}>
                            {past.map(evt => (
                                <div key={evt.id} style={{filter: 'grayscale(0.4)', transition: 'all 0.3s', cursor: 'pointer'}} onMouseEnter={e => e.currentTarget.style.filter='grayscale(0)'} onMouseLeave={e => e.currentTarget.style.filter='grayscale(0.4)'}>
                                    <EventCard event={evt as any} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={styles.emptyState}>Aucune archive disponible.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- HELPER STATUS MODIFIÉ ---
function getEventStatus(evt: CycloEvent, today: Date, currentTimeValue: number, now: Date) {
    const parseTime = (t?: string) => {
        if (!t) return 0;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };
    
    const start_time_str = evt.start_time || evt.routes[0]?.start_time;
    const end_time_str = evt.end_time;

    let startMins = start_time_str ? parseTime(start_time_str) : 8 * 60; 
    
    // Calcul précis des timestamps
    let eventStart = new Date(evt.date_start);
    let eventEnd = evt.date_end ? new Date(evt.date_end) : new Date(evt.date_start);

    if (start_time_str) {
        const [startH, startM] = start_time_str.split(':').map(Number);
        eventStart.setHours(startH, startM, 0, 0);
    } else {
        eventStart.setHours(8, 0, 0, 0); 
    }
    
    if (end_time_str) {
        const [endH, endM] = end_time_str.split(':').map(Number);
        eventEnd.setHours(endH, endM, 0, 0);
    } else {
        eventEnd.setHours(18, 0, 0, 0); 
    }

    const timeUntilStart = eventStart.getTime() - now.getTime();
    const hoursUntilStart = timeUntilStart / (1000 * 3600);
    const timeSinceEnd = now.getTime() - eventEnd.getTime();
    const hoursSinceEnd = timeSinceEnd / (1000 * 3600);


    // 1. EN COURS (LIVE)
    if (now.getTime() >= eventStart.getTime() && now.getTime() < eventEnd.getTime()) {
        return { type: 'LIVE', label: 'EN DIRECT', icon: Radio, style: styles.badgeLive, animate: true };
    }
    
    // 2. TERMINÉ (Moins de 24h)
    if (now.getTime() >= eventEnd.getTime() && hoursSinceEnd <= 24) {
        return { type: 'FINISHED', label: 'TERMINÉ', icon: Flag, style: styles.badgeFinished };
    }

    // 3. IMMINENT (Départ J-24h)
    if (hoursUntilStart <= 24 && hoursUntilStart > 0) {
        if (hoursUntilStart <= 1) {
            return { type: 'IMMINENT', label: 'DÉPART IMMINENT (H-1)', icon: Timer, style: styles.badgeImminent, animate: true };
        }
        const startHour = Math.floor(startMins/60);
        const startMinute = startMins%60;
        return { type: 'TODAY_SOON', label: `DÉPART ${startHour}h${startMinute ? startMinute.toString().padStart(2, '0') : '00'}`, icon: Timer, style: styles.badgeFuture };
    }
    
    // 4. FUTUR (J-X)
    if (now.getTime() < eventStart.getTime()) {
        const diff = Math.ceil((eventStart.getTime() - today.getTime())/(1000*3600*24));
        return { type: 'FUTURE', label: `J-${diff}`, icon: Calendar, style: styles.badgeFuture };
    }

    // 5. ARCHIVE (Terminé depuis > 24h)
    return { type: 'PAST', label: 'ARCHIVÉ', icon: History, style: styles.badgeArchive };
}