'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { MapPin, Calendar, Trophy, ArrowUpRight, Radio, Timer, Flag, Clock, History } from 'lucide-react';

// Le type CycloEvent doit être défini
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

// Définir les types d'état possibles pour eventTiming
type EventStatus = 'archive' | 'upcoming' | 'countdown_start' | 'live' | 'finished';
interface EventTimingState {
    status: EventStatus;
    badge: string; 
    targetTime: number | null; 
}

// INTÉGRATION DU HOOK useCountdown (CODE TEMPORAIRE INTERNE)
const useCountdownInternal = (targetTimestamp: number, isEnabled: boolean) => {
    const [timeLeft, setTimeLeft] = useState(isEnabled && targetTimestamp > Date.now() ? targetTimestamp - Date.now() : 0);

    useEffect(() => {
        if (!isEnabled || targetTimestamp <= Date.now()) {
            setTimeLeft(0);
            return;
        }

        const interval = setInterval(() => {
            const remaining = targetTimestamp - Date.now();
            setTimeLeft(remaining > 0 ? remaining : 0);
        }, 1000);

        return () => clearInterval(interval);
    }, [targetTimestamp, isEnabled]);

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
        totalSeconds: Math.floor(timeLeft / 1000)
    };
};


// 🔥 STYLES AMÉLIORÉS
const styles = {
    badgeLive: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: '#fff',
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.8)',
        border: '1px solid #ff6b6b'
    },
    badgeCountdownStart: {
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: '#000',
        boxShadow: '0 0 15px rgba(245, 158, 11, 0.6)',
        border: '1px solid #fbbf24'
    },
    badgeUpcoming: {
        background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)', 
        color: '#fff',
        boxShadow: '0 0 15px rgba(236, 72, 153, 0.6)',
        border: '1px solid #f472b6'
    },
    badgeFinished: {
        background: 'rgba(16, 185, 129, 0.2)',
        color: '#10b981',
        border: '1px solid #10b981',
        boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
    },
    badgeArchive: {
        background: 'rgba(107, 114, 128, 0.2)',
        border: '1px solid rgba(107, 114, 128, 0.6)',
        color: '#9ca3af',
    }
};

interface EventCardProps {
    event: CycloEvent;
    countdownBadge?: React.ReactNode;
    forceArchive?: boolean; 
}

export default function EventCard({ event, countdownBadge, forceArchive = false }: EventCardProps) {
    const maxDist = useMemo(() => Math.max(...event.routes.map(r => r.distance_km)), [event.routes]);
    const maxElev = useMemo(() => Math.max(...event.routes.map(r => r.elevation_gain_m)), [event.routes]);

    const getStartTimeText = useMemo(() => {
        let startTime = 'HEURE À CONFIRMER';
        
        const eventStartTime = event.start_time || event.routes[0]?.start_time;
        if (eventStartTime) {
            const [h, m] = eventStartTime.split(':');
            startTime = `DÉPART ${parseInt(h, 10)}H${m !== '00' ? m : ''}`;
        } 
        return startTime.toUpperCase();
    }, [event.routes, event.start_time]);

    const fullDateText = useMemo(() => {
        const eventDate = new Date(event.date_start);
        
        // Format de date complète pour les archives
        const datePart = eventDate.toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        }).replace(/\./g, '').trim();
        
        return `${datePart}`;
    }, [event.date_start]);

    // 🔥 LOGIQUE TEMPORELLE (inchangée)
    const getEventTiming = useCallback((): EventTimingState => {
        const now = new Date();
        
        let eventStart = new Date(event.date_start);
        let eventEnd = event.date_end ? new Date(event.date_end) : new Date(event.date_start);
        
        const start_time_str = event.start_time || event.routes[0]?.start_time;
        const end_time_str = event.end_time;
        
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
        const nowTime = now.getTime();
        
        const timeUntilStart = startTime - nowTime;
        const hoursUntilStart = timeUntilStart / (1000 * 3600);
        const timeSinceEnd = nowTime - endTime;
        const hoursSinceEnd = timeSinceEnd / (1000 * 3600);

        // 1. Événement en cours (LIVE)
        if (nowTime >= startTime && nowTime < endTime) {
            return { 
                status: 'live', 
                badge: 'EN DIRECT',
                targetTime: endTime 
            };
        }

        // 2. Événement TERMINÉ (moins de 24h)
        if (nowTime >= endTime && hoursSinceEnd <= 24) {
            return { 
                status: 'finished', 
                badge: 'TERMINÉ', 
                targetTime: null 
            };
        }
        
        // 3. Décompte IMMINENT (dans les 24h)
        if (nowTime < startTime && hoursUntilStart <= 24) { 
            return { 
                status: 'countdown_start', 
                badge: 'DÉPART IMMINENT',
                targetTime: startTime 
            };
        }
        
        // 4. ÉVÉNEMENT LOINTAIN (UPCOMING)
        if (nowTime < startTime) {
            return { 
                status: 'upcoming', 
                badge: `${fullDateText} - ${getStartTimeText}`, 
                targetTime: null
            };
        }

        // 5. ARCHIVE (Passé depuis plus de 24h)
        return { 
            status: 'archive', 
            badge: fullDateText, 
            targetTime: null 
        };
    }, [event, fullDateText, getStartTimeText, forceArchive]);


    const [eventTiming, setEventTiming] = useState<EventTimingState>(getEventTiming);

    useEffect(() => {
        const interval = setInterval(() => {
            setEventTiming(getEventTiming());
        }, 1000);
        return () => clearInterval(interval);
    }, [getEventTiming]);
    
    // GESTION DES DÉCOMPTES
    const isCounting = eventTiming.status === 'countdown_start' || eventTiming.status === 'live';
    const countdownTarget = eventTiming.targetTime !== null ? eventTiming.targetTime : Date.now() + 1000;

    const countdown = useCountdownInternal(
        isCounting ? countdownTarget : Date.now() + 1000, 
        isCounting
    );

    const isLiveMode = eventTiming.status === 'live';
    const displayedCountdown = countdown;
    const isArchiveMode = eventTiming.status === 'archive';
    const isCountdownStartMode = eventTiming.status === 'countdown_start';
    const isFinishedMode = eventTiming.status === 'finished'; 
    const isUpcomingMode = eventTiming.status === 'upcoming'; 

    const liveEffects = {
        border: '1px solid #ef4444',
        boxShadow: `
            inset 0 0 20px rgba(239, 68, 68, 0.3),
            0 0 30px rgba(239, 68, 68, 0.4),
            0 0 60px rgba(239, 68, 68, 0.2)
        `,
        transform: 'translateY(-2px)',
        background: `
            radial-gradient(circle at 50% 0%, rgba(239, 68, 68, 0.1) 0%, transparent 50%),
            rgba(20, 20, 30, 0.7)
        `
    };

    const countdownStartEffects = {
        border: '1px solid #f59e0b',
        boxShadow: `
            inset 0 0 15px rgba(245, 158, 11, 0.2),
            0 0 20px rgba(245, 158, 11, 0.3)
        `,
        transform: 'translateY(-1px)'
    };
    
    // 🔥 Le badge terminé utilise le style finished, l'archive a son style spécifique
    const finalBadgeStyle = isLiveMode ? styles.badgeLive : 
                            isCountdownStartMode ? styles.badgeCountdownStart : 
                            isFinishedMode ? styles.badgeFinished : 
                            isArchiveMode ? styles.badgeArchive : 
                            styles.badgeUpcoming;


    return (
        <a href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
            <div className="group" style={{
                background: 'rgba(20, 20, 30, 0.6)',
                backdropFilter: 'blur(10px)',
                ...(isLiveMode ? liveEffects : {}),
                ...(isCountdownStartMode ? countdownStartEffects : {}),
                
                border: isLiveMode ? '1px solid #ef4444' : 
                        isCountdownStartMode ? '1px solid #f59e0b' : 
                        '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                position: 'relative',
                cursor: 'pointer',
                opacity: isArchiveMode ? 0.6 : 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}>
                
                {isLiveMode && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent, #ef4444, transparent)',
                        animation: 'pulse 2s infinite',
                        zIndex: 5
                    }} />
                )}

                {/* IMAGE HEADER */}
                <div style={{
                    height: '180px',
                    backgroundImage: `url(${event.image_url || 'https://placehold.co/600x180/1f2937/fff?text=Cyclo+Event'})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '12px',
                }}>
                    {/* BADGE PRINCIPAL (GAUCHE) */}
                    <div style={{ zIndex: 10 }}>
                        {countdownBadge ? (
                            countdownBadge
                        ) : (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                ...finalBadgeStyle,
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                zIndex: 10, 
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                                animation: (isLiveMode || isCountdownStartMode) ? 'pulse 2s infinite' : 'none',
                            }}>
                                {isLiveMode ? (
                                    <>
                                        <Radio size={14} />
                                        <span>FIN DANS {displayedCountdown?.formatted}</span> 
                                    </>
                                ) : isCountdownStartMode ? (
                                    <>
                                        <Timer size={14} /> 
                                        <span>DÉPART DANS {displayedCountdown?.formatted}</span>
                                    </>
                                ) : isFinishedMode ? (
                                    <>
                                        {/* 🔥 TERMINÉ (< 24h) */}
                                        <Flag size={14} />
                                        <span>TERMINÉ</span>
                                    </>
                                ) : isArchiveMode ? (
                                    <>
                                        {/* 🔥 ARCHIVE (> 24h) : Date complète */}
                                        <History size={14} /> 
                                        <span>{eventTiming.badge}</span>
                                    </>
                                ) : isUpcomingMode ? ( 
                                    <>
                                        <Calendar size={14} />
                                        <span>{eventTiming.badge}</span>
                                    </>
                                ) : ( // Fallback
                                    <>
                                        <Clock size={14} /> 
                                        <span>{eventTiming.badge}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* BADGE TOP (DROITE) */}
                    {event.rating_global > 8 && !isArchiveMode && (
                        <div style={{
                            background: 'linear-gradient(135deg, #d04fd7 0%, #a855f7 100%)',
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 900,
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 0 10px rgba(208, 79, 215, 0.5)'
                        }}>
                            <Trophy size={12} />
                            TOP
                        </div>
                    )}

                    {/* OVERLAY GRADIENT */}
                    <div style={{
                        position: 'absolute', 
                        inset: 0,
                        background: `linear-gradient(to top, rgba(7, 7, 7, ${isLiveMode ? 0.9 : 0.8}) 0%, transparent 50%)`,
                    }} />
                </div>

                {/* CONTENT */}
                <div style={{ padding: '1.5rem', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h3 style={{ 
                            margin: 0, 
                            fontSize: '1.1rem', 
                            fontWeight: 800, 
                            color: '#fff', 
                            lineHeight: 1.2,
                            ...(isLiveMode ? {
                                background: 'linear-gradient(90deg, #fff 0%, #fca5a5 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            } : {})
                        }}>
                            {event.name}
                        </h3>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888', fontSize: '0.8rem', marginBottom: '1rem' }}>
                        <MapPin size={14} color="#00f3ff" /> {event.location}, {event.country}
                    </div>
                    
                    <div style={{ marginTop: 'auto', display: 'flex', gap: '10px', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>Distance max</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>{maxDist.toFixed(2)} <small style={{fontSize: '0.6em', color: '#666', fontWeight: 500}}>km</small></span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>D+ max</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f59e0b' }}>{maxElev} <small style={{fontSize: '0.6em', color: '#666', fontWeight: 500}}>m</small></span>
                        </div>
                    </div>

                </div>
                
                {/* FLÈCHE AVEC EFFET AMÉLIORÉ */}
                <div style={{ 
                    position: 'absolute', 
                    bottom: '1rem', 
                    right: '1rem', 
                    background: isLiveMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0,0,0,0.5)', 
                    borderRadius: '50%', 
                    padding: '10px', 
                    backdropFilter: 'blur(5px)',
                    border: isLiveMode ? '1px solid rgba(239, 68, 68, 0.5)' : 'none',
                    transition: 'all 0.3s ease'
                }}>
                  <ArrowUpRight size={20} color={isLiveMode ? "#fff" : "#d04fd7"} />
                </div>
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                
                .group:hover {
                    transform: translateY(-4px);
                }
            `}</style>
        </a>
    );
}