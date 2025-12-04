"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Sun, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog } from "lucide-react"
import { getStartCoordFromPolyline } from "./utils"

// --- QUEUE SYSTEM (Global au module, pas au composant) ---
const MAX_CONCURRENT_REQUESTS = 2; // Conservateur pour éviter le rate-limit
const requestQueue: (() => Promise<void>)[] = [];
let activeRequests = 0;

const processQueue = () => {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) return;
    
    const nextTask = requestQueue.shift();
    if (nextTask) {
        activeRequests++;
        nextTask().finally(() => {
            activeRequests--;
            processQueue(); // On enchaîne
        });
    }
};

const enqueueTask = (task: () => Promise<void>) => {
    requestQueue.push(task);
    processQueue();
};
// ---------------------------------------------------------

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

  // 1. BACKFILL STREAMS (Queue System)
  useEffect(() => {
    if (active && !localStreams && activity.strava_id && !activity.streams_data) {
        const task = async () => {
            try {
                const res = await fetch('/api/sync-stream', {
                    method: 'POST',
                    body: JSON.stringify({ activityId: activity.id, stravaId: activity.strava_id })
                });
                const data = await res.json();
                if (data.success && data.streams) setLocalStreams(data.streams);
            } catch (e) { console.error("Stream sync error", e); }
        };

        // On ajoute un délai aléatoire pour ne pas saturer la queue instantanément au chargement
        const delay = (indexDelay * 100) + Math.random() * 1000;
        const timer = setTimeout(() => enqueueTask(task), delay);
        return () => clearTimeout(timer);
    }
  }, [active, localStreams, activity.id, activity.strava_id, indexDelay]);

  // 2. CALCUL TEMPÉRATURE (Stream > BDD) - Pure CPU, pas de fetch
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

  // 3. ORCHESTRATION & API HISTORIQUE (Queue System)
  useEffect(() => {
    if (!active) return;

    const dbIsComplete = activity.weather_code !== null && activity.temp_avg !== null;
    const streamIsBetter = streamStats !== null && activity.temp_min === null; 

    if (dbIsComplete && !streamIsBetter) return;

    const processWeather = async () => {
        let finalCode = weather.code;
        let finalMin = weather.min;
        let finalMax = weather.max;
        let finalAvg = weather.avg;

        if (streamStats) {
            finalMin = streamStats.min;
            finalMax = streamStats.max;
            finalAvg = streamStats.avg;
        }

        // Call External API only if code is missing
        if (finalCode === null) {
            let lat = activity.start_lat;
            let lon = activity.start_lng;
            
            if (!lat || !lon) {
                let raw: any = activity.polyline;
                // ... (Logique de décodage existante conservée) ...
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
                    // Fetch Open-Meteo
                    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dF}&end_date=${dF}&hourly=weather_code,temperature_2m`;
                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        const hIdx = new Date(dateStr).getHours();
                        finalCode = data.hourly?.weather_code?.[hIdx] ?? null;
                        if (finalAvg === null) finalAvg = data.hourly?.temperature_2m?.[hIdx] ?? null;
                    }
                } catch (e) { console.error("Weather API error", e); }
            }
        }

        // Save if changes
        const hasChanges = finalCode !== activity.weather_code || finalAvg !== activity.temp_avg || finalMin !== activity.temp_min;

        if (hasChanges && (finalCode !== null || finalAvg !== null)) {
            setWeather({ code: finalCode, min: finalMin, max: finalMax, avg: finalAvg });
            
            // On sauvegarde en BDD (pas besoin de queue ici, c'est notre API interne, Next gère bien)
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
            if (isBigMode) console.log(`💾 [SAVED] Act #${activity.id}`);
        }
    };

    // On met cette tâche lourde dans la queue
    const delay = (indexDelay * 150) + Math.random() * 500;
    const timer = setTimeout(() => enqueueTask(processWeather), delay);
    
    return () => clearTimeout(timer);

  }, [active, streamStats, activity.id, weather.code, indexDelay]);

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