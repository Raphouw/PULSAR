// Fichier : app/events/components/WeatherWidget.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react'; 
import { Sun, Wind, Cloud, AlertTriangle, Loader2, Clock, Calendar } from 'lucide-react';

// --- DÉFINITIONS DE STYLE ET DE MAPPING ---
// Utilisation de 'as const' pour forcer le typage strict des strings CSS
const glassCard = {
  background: 'rgba(20, 20, 30, 0.6)',
  backdropFilter: 'blur(12px)' as 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '20px',
  padding: '1.5rem'
} as React.CSSProperties;

const glassCardContainerStyle = {
  background: 'rgba(20, 20, 30, 0.6)',
  backdropFilter: 'blur(12px)' as 'blur(12px)',
  borderRadius: '20px',
  position: 'relative' as const,
  overflow: 'hidden' as const
} as React.CSSProperties;

// MAPPING WMO Code (Open-Meteo)
const WMO_MAPPING: { [key: number]: { icon: React.JSX.Element; description: string; color: string } } = {
  0: { icon: <Sun size={20} color="#f59e0b" />, description: "Soleil radieux", color: '#f59e0b' },
  1: { icon: <Sun size={20} color="#f59e0b" />, description: "Principalement clair", color: '#f59e0b' },
  2: { icon: <Cloud size={20} color="#00f3ff" />, description: "Partiellement nuageux", color: '#00f3ff' },
  3: { icon: <Cloud size={20} color="#999" />, description: "Couvert", color: '#999' },
  51: { icon: <Cloud size={20} color="#3b82f6" />, description: "Légère bruine", color: '#3b82f6' },
  61: { icon: <Cloud size={20} color="#3b82f6" />, description: "Pluie modérée", color: '#3b82f6' },
  66: { icon: <Cloud size={20} color="#3b82f6" />, description: "Pluie verglaçante", color: '#d04fd7' },
  71: { icon: <Cloud size={20} color="#fff" />, description: "Neige légère", color: '#fff' },
  95: { icon: <AlertTriangle size={20} color="#ef4444" />, description: "Orage", color: '#ef4444' },
};

// --- TYPES DE DONNÉES ET D'ÉTAT ---
interface WeatherData {
  tempMax: number;
  tempMin: number;
  windSpeed: number;
  rain: number;
  code: number;
}
interface WeatherWidgetProps {
    eventDate: string; // date_start
    eventEndDate?: string | null; // date_end (pour les événements multi-jours)
    eventEndTime?: string | null; // Heure de fin (HH:MM)
    location: string;
    coordinates: { lat: number, lon: number } | null;
    eventId: number;
    finalWeatherJson?: WeatherData | null; 
}
type StatusValue = 'loading' | 'available' | 'unavailable' | 'too_far' | 'past' | 'coming_soon' | 'fetch_ready'; 

// --- HELPER DE PROXIMITÉ (LOGIQUE TEMPORELLE PRÉCISE) ---
const checkEventProximity = (dateStr: string, endDateStr?: string | null, endTimeStr?: string | null): { status: StatusValue; days: number } => {
    const eventDate = new Date(dateStr);
    const now = new Date();
    
    // 1. DÉTERMINER L'HEURE DE FIN PRÉCISE (pour basculer en archive)
    const rawEndDate = endDateStr ? new Date(endDateStr) : eventDate;
    const eventEndDateTime = new Date(rawEndDate);
    
    // Fusionner date et heure de fin
    if (endTimeStr) {
        const [h, m] = endTimeStr.split(':').map(Number);
        eventEndDateTime.setHours(h, m, 0, 0); 
    } else {
        // Si l'heure de fin n'est pas fournie, assume la fin de la journée (23:59:59)
        eventEndDateTime.setHours(23, 59, 59, 999);
    }
    
    // 2. Déterminer si l'événement est TERMINÉ (Archive)
    const isEventFinished = eventEndDateTime.getTime() < now.getTime(); 

    if (isEventFinished) { 
        // Calculer les jours passés depuis l'heure de fin précise
        const diffTimeEnd = now.getTime() - eventEndDateTime.getTime();
        const daysPast = Math.floor(diffTimeEnd / (1000 * 60 * 60 * 24));
        return { status: 'past', days: Math.max(0, daysPast) }; 
    } 
    
    // 3. LOGIQUE EN COURS / FUTUR (FETCH_READY)
    // Calculer la proximité par rapport à la DATE DE DEBUT
    const diffTimeStart = eventDate.getTime() - now.getTime();
    const diffDaysStart = Math.ceil(diffTimeStart / (1000 * 60 * 60 * 24));
    
    // Si l'événement est en cours (date de début passée mais pas de fin), jours = 0
    if (eventDate.getTime() < now.getTime()) {
        return { status: 'fetch_ready', days: 0 }; 
    }

    // Logique prévisionnelle (Basée sur date_start)
    if (diffDaysStart > 16) return { status: 'too_far', days: diffDaysStart }; 
    if (diffDaysStart > 7) return { status: 'coming_soon', days: diffDaysStart };
    
    // Si l'événement est dans les 7 jours (ou commence aujourd'hui)
    if (diffDaysStart >= 0) return { status: 'fetch_ready', days: diffDaysStart }; 
    
    return { status: 'unavailable', days: 0 };
};


export default function WeatherWidget({ eventDate, eventEndDate, eventEndTime, location, coordinates, eventId, finalWeatherJson }: WeatherWidgetProps) {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [status, setStatus] = useState<StatusValue>('loading'); 
    // Initialisation avec l'heure de fin précise
    const [proximity, setProximity] = useState(checkEventProximity(eventDate, eventEndDate, eventEndTime)); 

    
    // Logique d'initialisation : Vérifie l'archive BDD en premier
    useEffect(() => {
        const currentProximity = checkEventProximity(eventDate, eventEndDate, eventEndTime);
        setProximity(currentProximity);

        if (currentProximity.status === 'past') {
            if (finalWeatherJson && finalWeatherJson.code !== undefined) {
                // Si l'événement est passé ET que nous avons des données finalisées
                setWeather(finalWeatherJson);
                setStatus('available');
                return;
            } else {
                // Événement passé sans données finalisées archivées
                setStatus('past'); 
                return;
            }
        }
        
        // Si l'événement est futur, prépare le statut pour le fetch
        if (currentProximity.status === 'fetch_ready') {
            setStatus('fetch_ready');
        } else {
            setStatus(currentProximity.status);
        }

    }, [eventDate, eventEndDate, eventEndTime, finalWeatherJson]); // Nouvelle dépendance

    const fetchWeather = useCallback(async () => {
        const currentProximity = checkEventProximity(eventDate, eventEndDate, eventEndTime);
        
        // Si l'événement est passé ou trop loin, on arrête l'appel API
        if (currentProximity.status === 'past' || currentProximity.status === 'too_far' || currentProximity.status === 'coming_soon') {
            setStatus(currentProximity.status); 
            return;
        }
        
        if (currentProximity.status !== 'fetch_ready' || !coordinates || !eventId) {
          setStatus('unavailable');
          return;
        }

        setStatus('loading');
        
        try {
            const res = await fetch('/api/events/weather/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId, latitude: coordinates.lat, longitude: coordinates.lon, date: eventDate,
                }),
            });

            if (!res.ok) throw new Error("Erreur de l'API météo interne");
            
            const data = await res.json();
            
            if (data.status === 'success' && data.weatherData) {
                setWeather(data.weatherData);
                setStatus('available');
            } else {
                setStatus('unavailable');
            }

        } catch (error) {
            console.error("Météo fetch error:", error);
            setStatus('unavailable');
        }
    }, [eventId, eventDate, eventEndDate, coordinates]); // Nouvelle dépendance

    // Déclenche le fetch pour les événements futurs proches
    useEffect(() => {
        if (status === 'fetch_ready') {
          fetchWeather();
          // Intervalle de rafraîchissement
          const interval = setInterval(fetchWeather, 60 * 60 * 1000); 
          return () => clearInterval(interval);
        }
    }, [status, fetchWeather]); 

  
  const weatherMap = weather ? WMO_MAPPING[weather.code] || WMO_MAPPING[2] : WMO_MAPPING[2];


    // --- RENDU CONDITIONNEL ---

    if (status === 'loading') {
        return (
            <div style={{...glassCardContainerStyle, border: '1px solid #00f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px'} as React.CSSProperties}>
                <Loader2 size={24} color="#00f3ff" style={{ animation: 'spin 1s linear infinite' }}/>
                <span style={{marginLeft: '10px', color: '#00f3ff'}}>Chargement prévisions...</span>
            </div>
        );
    }

    // Gestion des statuts non disponibles
    if (status !== 'available') {
        let message = 'Prévision indisponible.';
        let icon = <AlertTriangle size={20} color="#ef4444" />;
        
        // On utilise la dernière valeur calculée de proximité
        const daysLabel = proximity.days === 1 ? "1 jour" : `${proximity.days} jours`;

        if (status === 'too_far' || status === 'coming_soon') {
            message = `Prévision disponible dans ${daysLabel}.`;
            icon = <Clock size={20} color="#f59e0b" />;
        } else if (status === 'past') {
            message = `Météo de l'archive N/A (${daysLabel} passés).`;
            icon = <Calendar size={20} color="#888" />;
        } else if (status === 'unavailable') {
            message = `Météo manquante (API non connectée ou hors limites).`;
        }
        
        return (
          <div style={{...glassCardContainerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px', border: '1px dashed #ef4444'} as React.CSSProperties}>
              {icon}
              <span style={{marginLeft: '10px', color: '#ccc', fontSize: '0.85rem'}}>{message}</span>
          </div>
        );
    }

    // RENDU DISPONIBLE (weather est non null ici)
  return (
      <div style={{...glassCardContainerStyle, ...glassCard} as React.CSSProperties}>
        {/* Header */}
       <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gridTemplateRows: 'auto 1fr', 
                gap: '0.5rem 10px', 
                marginBottom: '1rem',
                position: 'relative' as const, 
                zIndex: 2 
            }}>
                
                {/* LIGNE 1 / COL 1 & 2 : TITRE & ICONE */}
                <div style={{ gridColumn: '1 / 2' }}>
                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>
                        {proximity.status === 'past' ? "MÉTÉO FINALE ARCHIVÉE" : "PRÉVISION EN COURS"}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>{location}</div>
                </div>

                <div style={{ gridColumn: '2 / 3', justifySelf: 'end', alignSelf: 'start' }}>
                    <div style={{ background: `${weatherMap.color}20`, padding: '8px', borderRadius: '50%', border: `1px solid ${weatherMap.color}40` }}>
                        {weatherMap.icon}
                    </div>
                </div>

                {/* LIGNE 2 / COL 1 : TEMPÉRATURES */}
                <div style={{ gridColumn: '1 / 2', alignSelf: 'center', marginTop: '10px' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                        {weather!.tempMax.toFixed(1)}°
                    </span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#aaa', lineHeight: 1 }}>
                         / {weather!.tempMin.toFixed(1)}°
                    </span>
                </div>
                
                {/* LIGNE 2 / COL 2 : DESCRIPTION MÉTÉO */}
                <div style={{ gridColumn: '2 / 3', alignSelf: 'end', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: weatherMap.color, textTransform: 'uppercase', fontWeight: 800, textAlign: 'right' }}>{weatherMap.description}</span>
                </div>

            </div>

            {/* Grid Stats (Vent / Pluie) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', position: 'relative' as const, zIndex: 2 }}>
                {/* BLOCK VENT */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '8px' }}>
                    <Wind size={12} color="#d04fd7" />
                    <span style={{ fontSize: '0.8rem', color: '#ccc' }}>Vent : {weather!.windSpeed.toFixed(0)} <small>km/h</small></span>
                </div>
                {/* BLOCK PLUIE */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '8px' }}>
                    <Cloud size={12} color="#00f3ff" />
                    <span style={{ fontSize: '0.8rem', color: '#ccc' }}>Pluie : {weather!.rain.toFixed(1)} <small>mm</small></span>
                </div>
            </div>

      {/* Décoration Background Neon (INCHANGÉ) */}
      <div style={{ position: 'absolute' as const, bottom: '-20px', right: '-20px', width: '80px', height: '80px', background: '#f59e0b', filter: 'blur(60px)', opacity: 0.15, zIndex: 1 }} />
    </div>
  );
}