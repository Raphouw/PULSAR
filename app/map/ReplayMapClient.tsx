'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getTilesFromPolyline, getTileBounds } from '../../lib/mapUtils';
import { Play, Pause, FastForward, Rewind, Activity, Target } from 'lucide-react';
import { useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLngBoundsExpression } from 'leaflet';

// IMPORTS DYNAMIQUES
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Rectangle = dynamic(() => import('react-leaflet').then(mod => mod.Rectangle), { ssr: false });

// --- AUTO-ZOOM CONTROLLER ---
const CameraController = ({ bounds }: { bounds: any }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            // Un flyTo très doux pour le mode cinéma
            map.flyToBounds(bounds, { padding: [100, 100], duration: 2, easeLinearity: 0.1 });
        }
    }, [bounds, map]);
    return null;
};

// --- COMPOSANT PRINCIPAL ---
export default function ReplayMapClient({ activities }: { activities: any[] }) {
    // 1. PRÉPARATION DES DONNÉES (Tri Chronologique)
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
    const [playbackSpeed, setPlaybackSpeed] = useState(15); // Jours par seconde (réelle)
    const animationRef = useRef<number | null>(null);
    const lastTickRef = useRef<number>(0);

    // 3. MOTEUR DE LECTURE (60 fps)
    useEffect(() => {
        if (!isPlaying) {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        const playLoop = (timestamp: number) => {
            if (!lastTickRef.current) lastTickRef.current = timestamp;
            const deltaMs = timestamp - lastTickRef.current; // Temps réel écoulé
            lastTickRef.current = timestamp;

            // Conversion : 1 seconde réelle = X jours virtuels (1 jour = 86400000 ms)
            const virtualDelta = (deltaMs / 1000) * playbackSpeed * 86400000;

            setCurrentTime(prev => {
                const nextTime = prev + virtualDelta;
                if (nextTime >= globalEndTime) {
                    setIsPlaying(false);
                    return globalEndTime; // Stop à la fin
                }
                return nextTime;
            });

            animationRef.current = requestAnimationFrame(playLoop);
        };

        lastTickRef.current = performance.now();
        animationRef.current = requestAnimationFrame(playLoop);

        return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }, [isPlaying, playbackSpeed, globalEndTime]);


    // 4. CALCUL DE L'ÉTAT DE LA CARTE À L'INSTANT T
    const { activeTilesMap, currentBounds, stats } = useMemo(() => {
        const tileData = new Map<string, { firstVisit: number, count: number }>();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        // On ne regarde que les activités passées par rapport au curseur de lecture
        for (const act of sortedActivities) {
            if (act.time > currentTime) break; // Fin de l'histoire pour ce frame

            act.tiles.forEach((t: string) => {
                const existing = tileData.get(t);
                if (!existing) {
                    tileData.set(t, { firstVisit: act.time, count: 1 });
                    const [x, y] = t.split(',').map(Number);
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                } else {
                    existing.count += 1;
                }
            });
        }

        let bounds: LatLngBoundsExpression | null = null;
        if (tileData.size > 0) {
            bounds = [getTileBounds(minX, minY, 14)[0], getTileBounds(maxX, maxY, 14)[1]];
        }

        return { 
            activeTilesMap: tileData, 
            currentBounds: bounds,
            stats: { count: tileData.size, area: (tileData.size * 0.36).toFixed(1) }
        };
    }, [currentTime, sortedActivities]);

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
                // TUILE FRAÎCHE (< 30 jours) : Vert Fluo qui "brûle"
                color = '#39ff14';
                weight = 2;
                fillOpacity = 0.6;
                opacity = 1;
                className = 'animate-pulse';
            } else {
                // TUILE ANCIENNE (Heatmap cumulative)
                // Échelle : 1 passage = Bleu nuit, 2 = Violet, 5 = Rouge, 10+ = Or
                const count = data.count;
                if (count >= 10) { color = '#ffd700'; fillOpacity = 0.8; } // Or
                else if (count >= 5) { color = '#ff003c'; fillOpacity = 0.6; } // Rouge
                else if (count >= 3) { color = '#d04fd7'; fillOpacity = 0.4; } // Fuchsia
                else if (count >= 2) { color = '#6b21a8'; fillOpacity = 0.3; } // Violet
                else { color = '#1e3a8a'; fillOpacity = 0.2; } // Bleu sombre (1 seul passage)
                
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
        <div className="w-full h-full relative dimmed-mode">
            <style jsx global>{`
                .dimmed-mode .leaflet-tile-pane { filter: brightness(0.4) contrast(1.2) grayscale(0.8) invert(1) hue-rotate(180deg); }
            `}</style>

            {/* --- HUD DES STATISTIQUES EN DIRECT --- */}
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

            {/* --- BARRE DE CONTRÔLE (TIMELINE) --- */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl z-[1000] bg-[#121217]/90 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                {/* Date Actuelle */}
                <div className="text-center mb-3">
                    <span className="text-lg font-black text-white tracking-widest uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(currentTime))}
                    </span>
                </div>

                {/* Slider */}
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

                {/* Contrôles */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setCurrentTime(globalStartTime)} className="text-gray-400 hover:text-white transition-colors"><Rewind size={20} /></button>
                        <button 
                            onClick={() => {
                                if (currentTime >= globalEndTime) setCurrentTime(globalStartTime);
                                setIsPlaying(!isPlaying);
                            }} 
                            className="bg-[#00f3ff] text-black p-3 rounded-full hover:scale-105 transition-transform shadow-[0_0_15px_rgba(0,243,255,0.5)]"
                        >
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>
                        <button onClick={() => setCurrentTime(globalEndTime)} className="text-gray-400 hover:text-white transition-colors"><FastForward size={20} /></button>
                    </div>

                    <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                        {[1, 5, 15, 30].map(speed => (
                            <button 
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