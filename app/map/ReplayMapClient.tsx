'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getTilesFromPolyline, getTileBounds } from '../../lib/mapUtils';
import { calculateMaxSquare } from '../../lib/gridAlgo';
import { Play, Pause, FastForward, Rewind, Activity, Target, TimerOff } from 'lucide-react'; 
import { useMap, useMapEvents } from 'react-leaflet';
import { LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Rectangle = dynamic(() => import('react-leaflet').then(mod => mod.Rectangle), { ssr: false });

// --- AUTO-ZOOM CONTROLLER ---
const CameraController = ({ bounds, autoZoomActive }: { bounds: any, autoZoomActive: boolean }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && autoZoomActive) {
            const currentBounds = map.getBounds();
            // On extrait les coins Nord-Ouest et Sud-Est de la nouvelle cible
            const nw: [number, number] = [bounds[0][0], bounds[0][1]];
            const se: [number, number] = [bounds[1][0], bounds[1][1]];
            
            // La caméra ne bouge QUE si la nouvelle activité sort du champ visuel actuel
            if (!currentBounds.contains(nw) || !currentBounds.contains(se)) {
                map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5, maxZoom: 11, easeLinearity: 0.25 });
            }
        }
    }, [bounds, map, autoZoomActive]);
    return null;
};

const MapInteractionListener = ({ setAutoZoomActive }: { setAutoZoomActive: (val: boolean) => void }) => {
    useMapEvents({
        dragstart: () => setAutoZoomActive(false), // Désactive l'auto-zoom dès qu'on glisse la carte
        zoomstart: () => setAutoZoomActive(false)  // Idem si on scrolle
    });
    return null;
};

// --- COMPOSANT PRINCIPAL ---
export default function ReplayMapClient({ activities }: { activities: any[] }) {
    
    // 1. PRÉPARATION DES DONNÉES
    const sortedActivities = useMemo(() => {
        return [...activities]
            .map(act => ({
                id: act.id,
                time: new Date(act.start_time).getTime(),
                tiles: act.polyline ? getTilesFromPolyline(act.polyline) : []
            }))
            .sort((a, b) => a.time - b.time);
    }, [activities]);

    const globalStartTime = sortedActivities.length > 0 ? sortedActivities[0].time : Date.now();
    const globalEndTime = sortedActivities.length > 0 ? sortedActivities[sortedActivities.length - 1].time : Date.now();

    // 2. ÉTAT DU LECTEUR ET DE LA CAMÉRA
   const [currentTime, setCurrentTime] = useState(globalStartTime);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(15); 
    const [autoZoomActive, setAutoZoomActive] = useState(true);
    const [skipInactivity, setSkipInactivity] = useState(true); 
    const animationRef = useRef<number | null>(null);
    const lastTickRef = useRef<number>(0);

    // 3. MOTEUR DE LECTURE
    useEffect(() => {
        if (!isPlaying) {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        const playLoop = (timestamp: number) => {
            if (!lastTickRef.current) lastTickRef.current = timestamp;
            const deltaMs = timestamp - lastTickRef.current; 
            lastTickRef.current = timestamp;

            // Avancée virtuelle normale (linéaire)
            const virtualDelta = (deltaMs / 1000) * playbackSpeed * 86400000;

            setCurrentTime(prev => {
                let nextTime = prev + virtualDelta;

                // --- ALGORITHME DE SAUT D'INACTIVITÉ ---
                if (skipInactivity) {
                    const nextActivity = sortedActivities.find(act => act.time > prev);
                    
                    if (nextActivity) {
                        const ONE_DAY_MS = 86400000;
                        const ONE_HOUR_MS = 3600000;
                        
                        // Si l'écart entre le temps de la frame actuelle et la prochaine activité dépasse 24h
                        if (nextActivity.time - nextTime > ONE_DAY_MS) {
                            // On "téléporte" le lecteur 1 heure avant la reprise pour un effet smooth
                            nextTime = nextActivity.time - ONE_HOUR_MS;
                        }
                    }
                }

                if (nextTime >= globalEndTime) {
                    setIsPlaying(false);
                    return globalEndTime; 
                }
                return nextTime;
            });

            animationRef.current = requestAnimationFrame(playLoop);
        };

        lastTickRef.current = performance.now();
        animationRef.current = requestAnimationFrame(playLoop);

        return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }, [isPlaying, playbackSpeed, globalEndTime, skipInactivity, sortedActivities]);

    // 4. CALCUL DE L'ÉTAT ET DE LA CAMÉRA
    const { activeTilesMap, stats, lastActivityId, lastActivityTiles } = useMemo(() => {
        const tileData = new Map<string, { firstVisit: number, count: number }>();
        let currentActId = null;
        let currentActTiles: string[] = [];
        
        for (const act of sortedActivities) {
            if (act.time > currentTime) break; 
            
            // On garde en mémoire uniquement la toute dernière activité jouée
            currentActId = act.id;
            currentActTiles = act.tiles;

            act.tiles.forEach((t: string) => {
                const existing = tileData.get(t);
                if (!existing) {
                    tileData.set(t, { firstVisit: act.time, count: 1 });
                } else {
                    existing.count += 1;
                }
            });
        }

        // --- CALCUL ALGORITHMIQUE DU CARRÉ MAX CUMULÉ ---
        const activeTilesSet = new Set(tileData.keys());
        const { maxSquare } = calculateMaxSquare(activeTilesSet, new Set()); // Sans blacklist pour l'historique pur

        return { 
            activeTilesMap: tileData, 
            stats: { 
                count: tileData.size, 
                area: (tileData.size * 0.36).toFixed(1),
                maxSquareSize: maxSquare // Injection dans le payload
            },
            lastActivityId: currentActId,
            lastActivityTiles: currentActTiles
        };
    }, [currentTime, sortedActivities]);

    // Calcul de la Bounding Box centré UNIQUEMENT sur la dernière activité
    const currentBounds = useMemo(() => {
        if (!lastActivityTiles || lastActivityTiles.length === 0) return null;
        
        let fMinX = Infinity, fMinY = Infinity, fMaxX = -Infinity, fMaxY = -Infinity;
        lastActivityTiles.forEach(t => {
            const [x, y] = t.split(',').map(Number);
            if (x < fMinX) fMinX = x; if (x > fMaxX) fMaxX = x;
            if (y < fMinY) fMinY = y; if (y > fMaxY) fMaxY = y;
        });
        
        return [getTileBounds(fMinX, fMinY, 14)[0], getTileBounds(fMaxX, fMaxY, 14)[1]] as LatLngBoundsExpression;
    }, [lastActivityId]); // Recalcule uniquement quand l'ID de la dernière activité change

    // 5. RENDU DES TUILES
    const gridRectangles = useMemo(() => {
        const MS_IN_30_DAYS = 30 * 24 * 60 * 60 * 1000;

        return Array.from(activeTilesMap.entries()).map(([tileKey, data]) => {
            const [x, y] = tileKey.split(',').map(Number);
            const bounds = getTileBounds(x, y, 14);
            const ageMs = currentTime - data.firstVisit;
            const isRecent = ageMs <= MS_IN_30_DAYS;

            let color, weight, fillOpacity, opacity, className = '';

            if (isRecent) {
                color = '#39ff14';
                weight = 2;
                fillOpacity = 0.6;
                opacity = 1;
                className = 'animate-pulse';
            } else {
                const count = data.count;
                if (count >= 10) { color = '#ffd700'; fillOpacity = 0.8; } 
                else if (count >= 5) { color = '#ff003c'; fillOpacity = 0.6; } 
                else if (count >= 3) { color = '#d04fd7'; fillOpacity = 0.4; } 
                else if (count >= 2) { color = '#6b21a8'; fillOpacity = 0.3; } 
                else { color = '#1e3a8a'; fillOpacity = 0.2; } 
                
                weight = 1;
                opacity = 0.5;
            }

            return (
                <Rectangle 
                    key={tileKey} bounds={bounds} 
                    pathOptions={{ color, weight, opacity, fillColor: color, fillOpacity, className }} 
                    interactive={false}
                />
            );
        });
    }, [activeTilesMap, currentTime]);

    return (
        <div className="w-full h-full relative bg-[#050505]">

            <div className="absolute top-24 left-6 z-[1000] bg-[#121217]/90 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] pointer-events-none w-[280px]">
                <div className="flex items-center gap-2 mb-4">
                    <Activity size={18} className="text-[#00f3ff]" />
                    <h2 className="text-sm font-black text-white tracking-widest uppercase">Progression</h2>
                </div>
                
                <div className="space-y-3">
                    <div className="flex justify-between items-end border-b border-white/5 pb-2">
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Tuiles Découvertes</span>
                        <span className="text-2xl font-black text-[#00f3ff] tabular-nums">{stats.count}</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-white/5 pb-2">
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Territoire (km²)</span>
                        <span className="text-xl font-bold text-emerald-400 tabular-nums">{stats.area}</span>
                    </div>
                    <div className="flex justify-between items-end pt-1">
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Carré Max atteint</span>
                        <span className="text-xl font-black text-yellow-500 tabular-nums">{stats.maxSquareSize}x{stats.maxSquareSize}</span>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl z-[1000] bg-[#121217]/90 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                <div className="text-center mb-3">
                    <span className="text-lg font-black text-white tracking-widest uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(currentTime))}
                    </span>
                </div>

                <input 
                    type="range" 
                    min={globalStartTime} 
                    max={globalEndTime} 
                    value={currentTime}
                    onChange={(e) => {
                        setIsPlaying(false);
                        setCurrentTime(Number(e.target.value));
                    }}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00f3ff] mb-4"
                />

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button type="button" onClick={() => setCurrentTime(globalStartTime)} className="text-gray-400 hover:text-white transition-colors"><Rewind size={20} /></button>
                        <button 
                            type="button"
                            onClick={() => {
                                if (currentTime >= globalEndTime) setCurrentTime(globalStartTime);
                                setIsPlaying(!isPlaying);
                            }} 
                            className="bg-[#00f3ff] text-black p-3 rounded-full hover:scale-105 transition-transform shadow-[0_0_15px_rgba(0,243,255,0.5)] mx-2"
                        >
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>
                        <button type="button" onClick={() => setCurrentTime(globalEndTime)} className="text-gray-400 hover:text-white transition-colors"><FastForward size={20} /></button>
                        
                        {/* SECTION TOGGLES TACTIQUES */}
                        <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block"></div>
                        
                        {/* Toggle Auto-Zoom existant */}
                        <button 
                            type="button"
                            onClick={() => setAutoZoomActive(!autoZoomActive)}
                            title={autoZoomActive ? "Auto-Zoom Actif (Suivi)" : "Auto-Zoom Suspendu (Caméra Libre)"}
                            className={`p-2 rounded-xl transition-all border ${
                                autoZoomActive 
                                ? 'bg-[#00f3ff]/20 border-[#00f3ff]/50 text-[#00f3ff] shadow-[0_0_10px_rgba(0,243,255,0.2)]' 
                                : 'bg-transparent border-white/10 text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Target size={18} className={autoZoomActive ? 'animate-pulse' : ''} />
                        </button>

                        {/* NOUVEAU : Toggle Saut d'Inactivité */}
                        <button 
                            type="button"
                            onClick={() => setSkipInactivity(!skipInactivity)}
                            title={skipInactivity ? "Saut d'inactivité activé" : "Temps linéaire (Saut désactivé)"}
                            className={`flex items-center gap-1.5 p-2 md:px-3 md:py-2 rounded-xl transition-all border ${
                                skipInactivity 
                                ? 'bg-[#d04fd7]/20 border-[#d04fd7]/50 text-[#d04fd7] shadow-[0_0_10px_rgba(208,79,215,0.2)]' 
                                : 'bg-transparent border-white/10 text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <TimerOff size={16} className={skipInactivity ? 'animate-pulse' : ''} />
                            <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider">Sauter l'attente</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                        {[1, 5, 15, 30].map(speed => (
                            <button 
                                type="button"
                                key={speed}
                                onClick={() => setPlaybackSpeed(speed)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    playbackSpeed === speed ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-white'
                                }`}
                            >
                                x{speed}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

           <MapContainer center={[46.603354, 1.888334]} zoom={6} className="w-full h-full z-0 bg-[#050505]" zoomControl={false} preferCanvas={true} attributionControl={false}>
                {/* FIX CARTE : Utilisation de CyclOSM avec mise en cache optimisée */}
                <TileLayer 
                    url="https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png" 
                    keepBuffer={8}
                    updateWhenIdle={false}
                />
                {/* Injection du moteur de caméra et de l'écouteur */}
                <CameraController bounds={currentBounds} autoZoomActive={autoZoomActive} />
                <MapInteractionListener setAutoZoomActive={setAutoZoomActive} />
                {gridRectangles}
            </MapContainer>
        </div>
    );
}