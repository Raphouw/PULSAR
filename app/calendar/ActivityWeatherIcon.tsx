"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Sun, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog } from "lucide-react"
import { getStartCoordFromPolyline } from "./utils"

const IGNORE_START_SECONDS = 600;

export default function ActivityWeatherIcon({ 
  activity, 
  indexDelay, 
  active,
  isBigMode = false
}: { 
  activity: any, 
  indexDelay: number,
  active: boolean,
  isBigMode?: boolean
}) {
  // 1. ÉTAT LOCAL (Initialisé DIRECTEMENT avec ce qu'il y a en BDD)
  // Si la BDD est remplie, weather contient déjà les valeurs.
  const [weather, setWeather] = useState<{
      code: number | null,
      min: number | null,
      max: number | null,
      avg: number | null
  }>({
      code: activity.weather_code ?? null,
      min: activity.temp_min ?? null,
      max: activity.temp_max ?? null,
      avg: activity.temp_avg ?? null
  });

  const [localStreams, setLocalStreams] = useState(activity.streams_data);

  // 2. BACKFILL STREAMS (Seulement si manquants)
  useEffect(() => {
    if (active && !localStreams && activity.strava_id) {
        const delay = (indexDelay * 300) + Math.random() * 2000;
        const timer = setTimeout(() => {
            fetch('/api/sync-stream', {
                method: 'POST',
                body: JSON.stringify({ activityId: activity.id, stravaId: activity.strava_id })
            })
            .then(res => res.json())
            .then(data => { if (data.success && data.streams) setLocalStreams(data.streams); })
            .catch(console.error);
        }, delay);
        return () => clearTimeout(timer);
    }
  }, [active, localStreams, activity.id, activity.strava_id, indexDelay]);


  // 3. CALCUL TEMPÉRATURE (Stream > BDD)
  const streamStats = useMemo(() => {
    if (localStreams && localStreams.temp && localStreams.temp.data) {
        const rawTemps = localStreams.temp.data as number[];
        if (rawTemps.length > 0) {
            const startIndex = rawTemps.length > (IGNORE_START_SECONDS * 2) ? IGNORE_START_SECONDS : 0;
            const outdoorTemps = rawTemps.slice(startIndex);
            if (outdoorTemps.length > 0) {
                return {
                    min: Math.min(...outdoorTemps),
                    max: Math.max(...outdoorTemps),
                    avg: Math.round(outdoorTemps.reduce((a, b) => a + b, 0) / outdoorTemps.length)
                };
            }
        }
    }
    return null;
  }, [localStreams]);


  // 4. ORCHESTRATION PRINCIPALE (LA LOGIQUE "ONE SHOT")
  useEffect(() => {
    if (!active) return;

    // --- LE MUR DE SÉCURITÉ (STOP) ---
    // Si on a déjà le Code Météo ET la Température Moyenne en BDD (ou dans le state local)
    // ET qu'on n'a pas de nouvelles données Stream à sauvegarder (pas d'upgrade possible)
    const dbIsComplete = activity.weather_code !== null && activity.temp_avg !== null;
    const streamIsBetter = streamStats !== null && activity.temp_min === null; // On a trouvé Min/Max alors qu'ils manquaient

    if (dbIsComplete && !streamIsBetter) {
        // Tout est déjà stocké, on ne fait RIEN.
        return;
    }
    // ---------------------------------

    const processAndSave = async () => {
        let finalCode = weather.code;
        let finalMin = weather.min;
        let finalMax = weather.max;
        let finalAvg = weather.avg;

        // A. Si on a trouvé des streams, on met à jour les temps
        if (streamStats) {
            finalMin = streamStats.min;
            finalMax = streamStats.max;
            finalAvg = streamStats.avg;
        }

        // B. Si le Code Météo manque, on appelle l'API Historique
        if (finalCode === null) {
            let lat = activity.start_lat;
            let lon = activity.start_lng;
            
            // Décodage polyline si nécessaire
            if (!lat || !lon) {
                let raw: any = activity.polyline;
                if (typeof raw === 'string' && raw.trim().startsWith('{')) try { raw = JSON.parse(raw) } catch {};
                const pStr = (raw && typeof raw === 'object') ? (raw.polyline || raw.summary_polyline) : raw;
                if (pStr && typeof pStr === 'string' && pStr.length > 5) {
                    const d = getStartCoordFromPolyline(pStr);
                    if (d) { lat = d.lat; lon = d.lon; }
                }
            }

            if (lat && lon) {
                try {
                    const dateStr = activity.start_time;
                    const dF = new Date(dateStr).toISOString().split('T')[0];
                    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dF}&end_date=${dF}&hourly=weather_code,temperature_2m`;
                    
                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        const hIdx = new Date(dateStr).getHours();
                        finalCode = data.hourly?.weather_code?.[hIdx] ?? null;
                        // Fallback temp si on n'avait rien
                        if (finalAvg === null) finalAvg = data.hourly?.temperature_2m?.[hIdx] ?? null;
                    }
                } catch (e) { console.error(e); }
            }
        }

        // C. SAUVEGARDE (Seulement si on a trouvé quelque chose de nouveau)
        const hasChanges = 
            finalCode !== activity.weather_code ||
            finalMin !== activity.temp_min ||
            finalMax !== activity.temp_max ||
            finalAvg !== activity.temp_avg;

        if (hasChanges && (finalCode !== null || finalAvg !== null)) {
            
            // Mise à jour visuelle immédiate
            setWeather({ code: finalCode, min: finalMin, max: finalMax, avg: finalAvg });

            // Sauvegarde BDD
            await fetch('/api/save-weather', {
                method: 'POST',
                body: JSON.stringify({
                    activityId: activity.id,
                    weatherCode: finalCode,
                    tempMin: finalMin,
                    tempMax: finalMax,
                    tempAvg: finalAvg
                })
            });
            if (isBigMode) console.log(`💾 [SAVED] Act #${activity.id} updated in DB.`);
        }
    };

    // On lance le processus avec un petit délai pour étaler la charge
    const delay = (indexDelay * 200) + Math.random() * 500;
    const timer = setTimeout(processAndSave, delay);
    return () => clearTimeout(timer);

  }, [active, streamStats, activity, weather.code, indexDelay]); // Dépendances nettoyées


  // --- RENDU ---
  if (!active || weather.code === null) return null;

  const iconSize = isBigMode ? 36 : 14;
  const baseStyle: React.CSSProperties = { opacity: 0.9, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))', transition: 'all 0.3s ease' };
  const containerStyle: React.CSSProperties = isBigMode ? { position: 'absolute', bottom: '8px', left: '8px', zIndex: 0, display: 'flex', alignItems: 'flex-end', gap: '8px' } : { marginLeft: 6, display: 'inline-flex', alignItems: 'center' };

  let WeatherIcon = Sun;
  let iconColor = "#ffd700";
  const c = weather.code;
  if (c >= 1 && c <= 3) { WeatherIcon = Cloud; iconColor = "#ccc"; }
  else if (c >= 45 && c <= 48) { WeatherIcon = CloudFog; iconColor = "#aaa"; }
  else if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) { WeatherIcon = CloudRain; iconColor = "#00f3ff"; }
  else if (c >= 71 && c <= 77) { WeatherIcon = Snowflake; iconColor = "#fff"; }
  else if (c >= 95) { WeatherIcon = CloudLightning; iconColor = "#ef4444"; }

  return (
    <div style={containerStyle}>
        <WeatherIcon size={iconSize} color={iconColor} style={baseStyle} />
        
        {isBigMode && weather.avg !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, paddingBottom: '2px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                    {Math.round(weather.avg)}°
                </span>
                {weather.min !== null && weather.max !== null && (
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: '2px', textShadow: '0 1px 2px rgba(0,0,0,0.8)', display: 'flex', gap: '4px' }}>
                        <span style={{ color: '#60a5fa' }}>↓{Math.round(weather.min)}</span>
                        <span style={{ color: '#ffffff', opacity: 0.4 }}>|</span>
                        <span style={{ color: '#f87171' }}>↑{Math.round(weather.max)}</span>
                    </div>
                )}
            </div>
        )}
    </div>
  )
}