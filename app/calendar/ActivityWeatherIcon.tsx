"use client"

import React, { useEffect, useState, useMemo, useRef } from "react"
import { Sun, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog } from "lucide-react"
import { getStartCoordFromPolyline } from "./utils"

// -------------------- QUEUE --------------------
const MAX_CONCURRENT_REQUESTS = 5;
const requestQueue: (() => Promise<void>)[] = [];
let activeRequests = 0;

const processQueue = () => {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) return;
    const nextTask = requestQueue.shift();
    if (nextTask) {
        activeRequests++;
        nextTask().finally(() => {
            activeRequests--;
            processQueue();
        });
    }
};

const enqueueTask = (task: () => Promise<void>) => {
    requestQueue.push(task);
    processQueue();
};
// ------------------------------------------------

const IGNORE_START_SECONDS = 600;

export default function ActivityWeatherIcon({
    activity,
    active,
    indexDelay,
    isBigMode = false,
    lastOutdoorActivity = null
}: {
    activity: any,
    active: boolean,
    indexDelay: number,
    isBigMode?: boolean,
    lastOutdoorActivity?: any
}) {
    const isVirtual = activity.type === "VirtualRide" || activity.type === "IndoorCycling";
    const actName = activity.name?.substring(0, 15) + "...";

    // Pour éviter recalculations infinies
    const processedActivityId = useRef<number | null>(null);

    // ----- STATE LOCAL -----
    const [weather, setWeather] = useState({
        code: activity.weather_code ?? null,
        min: activity.temp_min ?? null,
        max: activity.temp_max ?? null,
        avg: activity.temp_avg ?? null
    });

    const [localStreams, setLocalStreams] = useState(activity.streams_data);

    // ----- SYNC PROPS → STATE -----
    useEffect(() => {
        if (activity.id !== processedActivityId.current && processedActivityId.current !== null) {
            setWeather({
                code: activity.weather_code ?? null,
                min: activity.temp_min ?? null,
                max: activity.temp_max ?? null,
                avg: activity.temp_avg ?? null
            });
            setLocalStreams(activity.streams_data);
            processedActivityId.current = null;
            return;
        }

        setWeather(prev => ({
            code: activity.weather_code ?? prev.code,
            min: activity.temp_min ?? prev.min,
            max: activity.temp_max ?? prev.max,
            avg: activity.temp_avg ?? prev.avg
        }));

        if (activity.streams_data && !localStreams) {
            setLocalStreams(activity.streams_data);
        }
    }, [
        activity.weather_code,
        activity.temp_min,
        activity.temp_max,
        activity.temp_avg,
        activity.id,
        activity.streams_data
    ]);

    // ----- STREAM FETCH -----
    useEffect(() => {
        if (active && !isVirtual && !localStreams && activity.strava_id) {
            const task = async () => {
                try {
                    const res = await fetch("/api/sync-stream", {
                        method: "POST",
                        body: JSON.stringify({
                            activityId: activity.id,
                            stravaId: activity.strava_id
                        })
                    });

                    const data = await res.json();
                    if (data.success && data.streams) {
                        setLocalStreams(data.streams);
                        processedActivityId.current = null;
                    }
                } catch (e) {
                    console.error(`[☁️ ${actName}] Stream sync error`, e);
                }
            };

            const delay = indexDelay * 50 + Math.random() * 300;
            const timer = setTimeout(() => enqueueTask(task), delay);
            return () => clearTimeout(timer);
        }
    }, [active, activity.id, activity.strava_id, isVirtual, indexDelay, localStreams]);

    // ----- STREAM PARSING -----
    const streamStats = useMemo(() => {
        if (!localStreams) return null;

        const getArray = (key: string): number[] | null => {
            if (Array.isArray(localStreams)) {
                const found = localStreams.find((s: any) => s.type === key);
                return found?.data || null;
            }
            if (localStreams[key]) {
                return Array.isArray(localStreams[key])
                    ? localStreams[key]
                    : localStreams[key].data;
            }
            return null;
        };

        const rawTemps = getArray("temp");
        const rawTime = getArray("time");

        if (!rawTemps || rawTemps.length === 0) return null;

        let startIndex = 0;
        if (rawTime) {
            for (let i = 0; i < rawTime.length; i++) {
                if (rawTime[i] > IGNORE_START_SECONDS) {
                    startIndex = i;
                    break;
                }
            }
            if (rawTime[rawTime.length - 1] < IGNORE_START_SECONDS) startIndex = 0;
        }

        const validTemps = rawTemps.slice(startIndex);
        if (validTemps.length === 0) return null;

        const sum = validTemps.reduce((a, b) => a + b, 0);

        return {
            min: Math.min(...validTemps),
            max: Math.max(...validTemps),
            avg: Math.round(sum / validTemps.length)
        };
    }, [localStreams]);

    // ----- MAIN LOGIC -----
    useEffect(() => {
        if (!active) return;

        // 🔥 FIX pour VirtualRide
        const alreadyProcessed = processedActivityId.current === activity.id;

        if (
            (isVirtual && weather.code !== null && alreadyProcessed) ||
            (!isVirtual && alreadyProcessed)
        ) {
            return;
        }

        processedActivityId.current = activity.id;

        const processWeather = async () => {
            try {
                let finalCode = weather.code;
                let finalMin = weather.min;
                let finalMax = weather.max;
                let finalAvg = weather.avg;
                let needSave = false;

                const hasStreams = !isVirtual && !!streamStats;
                const localMissing = finalCode === null || finalAvg === null;

                // STREAMS FIRST
                if (hasStreams && streamStats) {
                    const avgDiff =
                        finalAvg !== null ? Math.abs(finalAvg - streamStats.avg) : 9999;

                    if (
                        finalMin !== streamStats.min ||
                        finalMax !== streamStats.max ||
                        avgDiff > 1
                    ) {
                        finalMin = streamStats.min;
                        finalMax = streamStats.max;
                        finalAvg = streamStats.avg;
                        needSave = true;
                    }
                }

                // API LOGIC
                if (localMissing) {
                    let coordsFound = false;
                    let coords = { lat: 0, lon: 0 };

                    if (isVirtual) {
                        // Try geolocation
                        try {
                            const pos: any = await new Promise((resolve, reject) => {
                                navigator.geolocation.getCurrentPosition(
                                    resolve,
                                    reject,
                                    { timeout: 1500 }
                                );
                            });
                            coords = {
                                lat: pos.coords.latitude,
                                lon: pos.coords.longitude
                            };
                            coordsFound = true;
                        } catch {}

                        // Try last outdoor activity
                        if (!coordsFound && lastOutdoorActivity?.polyline) {
                            let pStr = lastOutdoorActivity.polyline;

                            if (
                                typeof pStr === "string" &&
                                (pStr.startsWith("{") || pStr.startsWith("["))
                            ) {
                                try {
                                    pStr = JSON.parse(pStr);
                                } catch {}
                            }
                            if (typeof pStr === "object") {
                                pStr = pStr.polyline || pStr.summary_polyline || null;
                            }
                            const d =
                                typeof pStr === "string"
                                    ? getStartCoordFromPolyline(pStr)
                                    : null;

                            if (d) {
                                coords = d;
                                coordsFound = true;
                            }
                        }

                        // If still nothing: stop here gracefully
                        if (!coordsFound) {
                            setWeather(w => ({ ...w, code: null }));
                            return;
                        }
                    }

                    // Outdoor: normal polyline
                    if (!isVirtual) {
                        let pStr = activity.polyline;
                        if (
                            typeof pStr === "string" &&
                            (pStr.startsWith("{") || pStr.startsWith("["))
                        ) {
                            try {
                                pStr = JSON.parse(pStr);
                            } catch {}
                        }
                        if (typeof pStr === "object" && pStr !== null) {
                            pStr = pStr.polyline || pStr.summary_polyline || null;
                        }
                        if (typeof pStr === "string") {
                            const d = getStartCoordFromPolyline(pStr);
                            if (d) {
                                coords = d;
                                coordsFound = true;
                            }
                        }
                        if (!coordsFound) return;
                    }

                    // Fetch archive weather
                    const dateStr = activity.start_time;
                    const dF = new Date(dateStr).toISOString().split("T")[0];
                    const startHour = new Date(dateStr).getHours();
                    const duration = (activity.duration_s || 3600) / 3600;
                    const midHour = Math.min(23, Math.floor(startHour + duration / 2));

                    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${coords.lat}&longitude=${coords.lon}&start_date=${dF}&end_date=${dF}&hourly=weather_code,temperature_2m`;

                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();

                        if (finalCode === null)
                            finalCode = data.hourly?.weather_code?.[midHour] ?? null;

                        if (finalAvg === null) {
                            finalAvg = data.hourly?.temperature_2m?.[midHour] ?? null;

                            // Compute min/max for outdoor
                            if (!isVirtual && !streamStats) {
                                const endHour = Math.min(
                                    23,
                                    Math.floor(startHour + duration)
                                );
                                const temps =
                                    data.hourly?.temperature_2m?.slice(
                                        startHour,
                                        endHour + 1
                                    ) || [];

                                if (temps.length > 0) {
                                    finalMin = Math.min(...temps);
                                    finalMax = Math.max(...temps);
                                } else {
                                    finalMin = finalAvg;
                                    finalMax = finalAvg;
                                }
                            }
                            needSave = true;
                        }
                    }
                }

                if (needSave) {
                    setWeather({
                        code: finalCode,
                        min: finalMin,
                        max: finalMax,
                        avg: finalAvg
                    });

                    await fetch("/api/save-weather", {
                        method: "POST",
                        body: JSON.stringify({
                            activityId: activity.id,
                            weatherCode: finalCode,
                            tempMin: finalMin,
                            tempMax: finalMax,
                            tempAvg: finalAvg
                        })
                    });
                }
            } catch (e) {
                console.error(`[☁️ ${actName}] WEATHER ERROR`, e);
                processedActivityId.current = null;
            }
        };

        const delay = indexDelay * 50 + Math.random() * 200;
        const timer = setTimeout(() => enqueueTask(processWeather), delay);
        return () => clearTimeout(timer);
    }, [
        active,
        weather,
        streamStats,
        activity.id,
        activity.start_time,
        activity.duration_s,
        activity.polyline,
        isVirtual,
        indexDelay
    ]);

    // ----- RENDER -----
    if (!active || weather.code === null) return null;

    const iconSize = isBigMode ? 36 : 14;
    const baseStyle: React.CSSProperties = {
        opacity: 0.9,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
        transition: "all 0.3s ease"
    };
    const containerStyle: React.CSSProperties = isBigMode
        ? {
              position: "absolute",
              bottom: "8px",
              left: "8px",
              zIndex: 0,
              display: "flex",
              alignItems: "flex-end",
              gap: "8px"
          }
        : { marginLeft: 6, display: "inline-flex", alignItems: "center" };

    let WeatherIcon = Sun;
    let iconColor = "#ffd700";
    const c = weather.code;

    if (c >= 1 && c <= 3) {
        WeatherIcon = Cloud;
        iconColor = "#ccc";
    } else if (c >= 45 && c <= 48) {
        WeatherIcon = CloudFog;
        iconColor = "#aaa";
    } else if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) {
        WeatherIcon = CloudRain;
        iconColor = "#00f3ff";
    } else if (c >= 71 && c <= 77) {
        WeatherIcon = Snowflake;
        iconColor = "#fff";
    } else if (c >= 95) {
        WeatherIcon = CloudLightning;
        iconColor = "#ef4444";
    }

    const hasFullData =
        !isVirtual && weather.min !== null && weather.max !== null;

    return (
        <div style={containerStyle}>
            <WeatherIcon size={iconSize} color={iconColor} style={baseStyle} />
            {isBigMode && weather.avg !== null && (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        lineHeight: 1,
                        paddingBottom: "2px"
                    }}
                >
                    <span
                        style={{
                            fontSize: "1.1rem",
                            fontWeight: 800,
                            color: "#fff",
                            textShadow: "0 2px 4px rgba(0,0,0,0.8)"
                        }}
                    >
                        {Math.round(weather.avg)}°
                    </span>

                    {hasFullData ? (
                        <div
                            style={{
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                marginTop: "2px",
                                textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                                display: "flex",
                                gap: "4px"
                            }}
                        >
                            <span style={{ color: "#60a5fa" }}>
                                ↓{Math.round(weather.min!)}
                            </span>
                            <span
                                style={{
                                    color: "#ffffff",
                                    opacity: 0.4
                                }}
                            >
                                |
                            </span>
                            <span style={{ color: "#f87171" }}>
                                ↑{Math.round(weather.max!)}
                            </span>
                        </div>
                    ) : (
                        <div style={{ fontSize: "0.6rem", color: "#aaa", marginTop: "2px" }}>
                            Est.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
