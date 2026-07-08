'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getTilesFromPolyline, getTileBounds } from '../../lib/mapUtils';
import { Play, Pause, FastForward, Rewind, Activity } from 'lucide-react';
import { useMap } from 'react-leaflet';
import { LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Rectangle = dynamic(() => import('react-leaflet').then(mod => mod.Rectangle), { ssr: false });

// --- AUTO-ZOOM CONTROLLER ---
const CameraController = ({ bounds }: { bounds: LatLngBoundsExpression | null }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            // maxZoom empêche d'être trop près du sol (11 ou 12 est idéal pour voir les tuiles)
            map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5, maxZoom: 11, easeLinearity: 0.25 });
        }
    }, [bounds, map]);
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

    // 2. ÉTAT DU LECTEUR
    const [currentTime, setCurrentTime] = useState(globalStartTime);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(15); 
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

            const virtualDelta = (deltaMs / 1000) * playbackSpeed * 86400000;

            setCurrentTime(prev => {
                const nextTime = prev + virtualDelta;
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
    }, [isPlaying, playbackSpeed, globalEndTime]);

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

        return { 
            activeTilesMap: tileData, 
            stats: { count: tileData.size, area: (tileData.size * 0.36).toFixed(1) },
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
            {/* Suppression du filtre "dimmed-mode" qui blanchissait la carte CartoDB */}

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
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => setCurrentTime(globalStartTime)} className="text-gray-400 hover:text-white transition-colors"><Rewind size={20} /></button>
                        <button 
                            type="button"
                            onClick={() => {
                                if (currentTime >= globalEndTime) setCurrentTime(globalStartTime);
                                setIsPlaying(!isPlaying);
                            }} 
                            className="bg-[#00f3ff] text-black p-3 rounded-full hover:scale-105 transition-transform shadow-[0_0_15px_rgba(0,243,255,0.5)]"
                        >
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>
                        <button type="button" onClick={() => setCurrentTime(globalEndTime)} className="text-gray-400 hover:text-white transition-colors"><FastForward size={20} /></button>
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
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" />
                <CameraController bounds={currentBounds} />
                {gridRectangles}
            </MapContainer>
        </div>
    );
}