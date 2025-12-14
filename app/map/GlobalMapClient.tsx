'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { getTilesFromPolyline, getTileBounds } from '../../lib/mapUtils'; 
import { calculateMaxSquare, getSquareTiles, calculateTotalArea, findLargestCluster, getFutureTargets } from '../../lib/gridAlgo';
import { Layers, Maximize, Eye, Grid, Activity, Target } from 'lucide-react';
import { useMap } from 'react-leaflet';
import { LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- IMPORTS DYNAMIQUES ---
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });
const Rectangle = dynamic(() => import('react-leaflet').then(mod => mod.Rectangle), { ssr: false });

type MapActivity = {
  id: number;
  name: string;
  type: string | null;
  start_time: string;
  polyline: string | null;
};

// --- PALETTE DE COULEURS N+1 à N+10 (ROUGE -> VERT) ---
const TARGET_COLORS = [
    '#ff0000', // N+1 : Rouge Pur (Urgent)
    '#ff3300', 
    '#ff6600', 
    '#ff9900', // N+4 : Orange Néon
    '#ffcc00', 
    '#ffff00', // N+6 : Jaune Pur
    '#ccff00', 
    '#99ff00', 
    '#66ff00', 
    '#00ff00'  // N+10 : Vert Matrix
];

// --- CONTROLLER ---
const MapController = () => {
  const map = useMap();
  useEffect(() => {
    const resizeMap = () => map.invalidateSize();
    resizeMap();
    setTimeout(resizeMap, 400); 
  }, [map]);
  return null;
};

export default function GlobalMapClient({ activities }: { activities: MapActivity[] }) {
  const [isMounted, setIsMounted] = useState(false);
  
  // -- ETATS --
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showMaxSquare, setShowMaxSquare] = useState(true);
  const [showCluster, setShowCluster] = useState(true);
  const [showTargets, setShowTargets] = useState(true);
  const [dimMap, setDimMap] = useState(true); 
  
  useEffect(() => { setIsMounted(true); }, []);

  // --- PROCESSING ---
  const years = useMemo(() => {
    const y = new Set(activities.map(a => new Date(a.start_time).getFullYear().toString()));
    return Array.from(y).sort((a, b) => b.localeCompare(a));
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (selectedYear === 'all') return activities;
    return activities.filter(a => new Date(a.start_time).getFullYear().toString() === selectedYear);
  }, [activities, selectedYear]);

  // --- CALCUL GEO SPATIAL (LOURD) ---
  const { visitedTilesSet, boundsArea, maxSquareData, totalArea, clusterSet, targetTilesMap, targetsCounts } = useMemo(() => {
    const tiles = new Set<string>();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    filteredActivities.forEach(act => {
      if (act.polyline) {
        try {
           const actTiles = getTilesFromPolyline(act.polyline);
           actTiles.forEach(t => {
             tiles.add(t);
             const [x, y] = t.split(',').map(Number);
             if (x < minX) minX = x;
             if (x > maxX) maxX = x;
             if (y < minY) minY = y;
             if (y > maxY) maxY = y;
           });
        } catch (e) {}
      }
    });

    let globalBounds: LatLngBoundsExpression | null = null;
    if (tiles.size > 0) {
      const ZOOM = 14;
      const minBounds = getTileBounds(minX, minY, ZOOM);
      const maxBounds = getTileBounds(maxX, maxY, ZOOM);
      globalBounds = [minBounds[0], maxBounds[1]]; 
    }

    const maxSq = calculateMaxSquare(tiles);
    const maxSqTilesSet = new Set(getSquareTiles(maxSq.topLeft, maxSq.maxSquare));
    const area = calculateTotalArea(tiles);
    const biggestCluster = findLargestCluster(tiles);
    
    // Calcul des cibles N+1 à N+10 avec Smart Expansion
    const targets = getFutureTargets(tiles, maxSq.topLeft, maxSq.maxSquare, 10);
    
    // Stats détaillées
    const counts = new Array(10).fill(0);
    targets.forEach((level) => {
        if (level >= 1 && level <= 10) {
            counts[level - 1]++;
        }
    });

    return { 
        visitedTilesSet: tiles, 
        boundsArea: globalBounds,
        maxSquareData: { ...maxSq, tilesSet: maxSqTilesSet },
        totalArea: area,
        clusterSet: biggestCluster,
        targetTilesMap: targets,
        targetsCounts: counts
    };
  }, [filteredActivities]);

  // --- RENDU RECTANGLES ---
  const gridRectangles = useMemo(() => {
    if (!showGrid) return [];
    const ZOOM = 14;
    const allKeysToRender = new Set([...Array.from(visitedTilesSet), ...Array.from(targetTilesMap.keys())]);

    return Array.from(allKeysToRender).map(tileKey => {
      const [x, y] = tileKey.split(',').map(Number);
      const bounds = getTileBounds(x, y, ZOOM);
      
      const isVisited = visitedTilesSet.has(tileKey);
      const isMaxSquare = isVisited && showMaxSquare && maxSquareData.tilesSet.has(tileKey);
      const isCluster = isVisited && showCluster && !isMaxSquare && clusterSet.has(tileKey);
      
      const targetLevel = !isVisited && showTargets ? targetTilesMap.get(tileKey) : undefined;
      const isTarget = targetLevel !== undefined;

      if (!isVisited && !isTarget) return null;

      // --- STYLE LOGIC ---
      let color = '#00f3ff';
      let weight = 1;
      let className = 'tile-neon';
      let fillOpacity = 0.1;
      let opacity = 0.3;

      if (isMaxSquare) {
          color = '#facc15';
          weight = 2;
          className = 'tile-max-square';
          fillOpacity = 0.4;
          opacity = 1;
      } else if (isTarget && targetLevel) {
          const colorIndex = Math.min(Math.max(targetLevel - 1, 0), 9);
          color = TARGET_COLORS[colorIndex];
          
          weight = targetLevel === 1 ? 2 : 1;
          className = targetLevel === 1 ? 'tile-target-urgent' : 'tile-neon';
          fillOpacity = 0.25;
          opacity = Math.max(0.4, 1 - (targetLevel * 0.08)); 
      } else if (isCluster) {
          color = '#d04fd7';
          weight = 1;
          className = 'tile-cluster';
          fillOpacity = 0.25;
          opacity = 0.5;
      }

      return (
        <Rectangle 
          key={tileKey} 
          bounds={bounds} 
          pathOptions={{ color, weight, opacity, fillColor: color, fillOpacity, className }} 
        />
      );
    });
  }, [visitedTilesSet, targetTilesMap, showGrid, showMaxSquare, showCluster, showTargets, maxSquareData, clusterSet]);

  // --- VARIABLES HELPER POUR L'AFFICHAGE CUMULÉ ---
  let cumulativeCount = 0;

  if (!isMounted) return <div className="h-screen bg-black flex items-center justify-center text-[#d04fd7] animate-pulse font-mono tracking-widest">INITIALISATION TACTIQUE...</div>;

  return (
    <div className={`relative w-full h-[calc(100vh-20px)] overflow-hidden rounded-2xl border border-white/10 bg-[#050505] shadow-2xl ${dimMap ? 'dimmed-mode' : ''}`}>
      
      {/* --- UI FLOTTANTE GAUCHE --- */}
      <div className="absolute top-5 left-5 z-[1000] flex flex-col gap-3 w-72 pointer-events-none max-h-[90vh] overflow-visible">
        
        {/* STATS PRINCIPALES */}
        <div className="bg-[#0f0f14]/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.6)] pointer-events-auto transition-all hover:border-white/20">
            <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-4">
                <div className="p-2 rounded bg-gradient-to-br from-[#d04fd7]/20 to-purple-600/20 border border-[#d04fd7]/30 text-[#d04fd7]">
                    <Grid size={20} />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-white tracking-widest font-mono">GRID OS <span className="text-[10px] text-[#00f3ff]">v2.4</span></h2>
                    <p className="text-[10px] text-gray-400 uppercase">Analyse Territoriale</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/40 p-3 rounded-lg border border-cyan-500/20 relative overflow-hidden">
                    <div className="text-xl font-black text-cyan-400 tabular-nums">{visitedTilesSet.size}</div>
                    <div className="text-[9px] font-bold text-gray-500 uppercase mt-1">Squadrats</div>
                </div>
                
                <div className="bg-black/40 p-3 rounded-lg border border-yellow-500/20 relative overflow-hidden">
                    <div className="text-xl font-black text-yellow-400 tabular-nums">
                        {maxSquareData.maxSquare}<span className="text-xs text-gray-500 ml-0.5">x</span>{maxSquareData.maxSquare}
                    </div>
                    <div className="text-[9px] font-bold text-gray-500 uppercase mt-1">Max Square</div>
                </div>

                <div className="bg-black/40 p-3 rounded-lg border border-[#d04fd7]/20 relative overflow-hidden group">
                     <div className="absolute top-1 right-2 opacity-40"><Activity size={10} className="text-[#d04fd7]"/></div>
                     <div className="text-xl font-black text-[#d04fd7] tabular-nums">{clusterSet.size}</div>
                     <div className="text-[9px] font-bold text-gray-500 uppercase mt-1">Max Cluster</div>
                </div>

                 <div className="bg-black/40 p-3 rounded-lg border border-emerald-500/20 relative overflow-hidden">
                    <div className="text-xl font-black text-emerald-400 tabular-nums">{totalArea}</div>
                    <div className="text-[9px] font-bold text-gray-500 uppercase mt-1">Km² Explorés</div>
                </div>
            </div>
            
            {/* 🔥 LISTE FIXE : STATS DÉTAILLÉES N+1 à N+10 */}
            {targetTilesMap.size > 0 && showTargets && (
                 <div className="mt-4 bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                    <div className="w-full p-2 bg-black/50 border-b border-white/5 text-[10px] font-bold text-gray-300 uppercase flex items-center gap-2">
                        <Target size={12} className="text-red-500"/> 
                        <span>Planification Tactique</span>
                    </div>
                    
                    {/* Liste FIXE avec CUMUL */}
                    <div className="p-2 space-y-1 bg-black/20 overflow-y-auto custom-scrollbar max-h-[250px]">
                        {targetsCounts.map((count, idx) => {
                            if (count === 0) return null;
                            const level = idx + 1;
                            const color = TARGET_COLORS[idx];
                            const squareSize = maxSquareData.maxSquare + level;
                            
                            // Calcul du cumul
                            cumulativeCount += count;

                            return (
                                <div key={level} className="flex items-center justify-between text-[11px] py-0.5 border-b border-white/5 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full shadow-[0_0_5px]" style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}` }}></div>
                                        <span className="text-gray-300 font-mono">
                                            <span style={{color: color, fontWeight: 'bold'}}>N+{level}</span> (Carré {squareSize}x{squareSize})
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 font-mono">
                                        <span className="font-bold tabular-nums text-white">{count}</span>
                                        <span className="text-[9px] text-gray-500 tabular-nums">/ Tot {cumulativeCount}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                 </div>
            )}
        </div>

        {/* CONTROLS */}
        <div className="bg-[#0f0f14]/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl pointer-events-auto space-y-3">
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs font-bold text-white outline-none focus:border-cyan-500 transition-colors cursor-pointer hover:bg-black/60"
            >
              <option value="all">Historique Complet</option>
              {years.map(y => <option key={y} value={y}>Année {y}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowGrid(!showGrid)} className={`cursor-pointer hover:brightness-125 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all border ${showGrid ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-transparent border-white/5 text-gray-500'}`}>
                    <Grid size={14}/> Grille
                </button>
                <button onClick={() => setShowMaxSquare(!showMaxSquare)} className={`cursor-pointer hover:brightness-125 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all border ${showMaxSquare ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400' : 'bg-transparent border-white/5 text-gray-500'}`}>
                    <Maximize size={14}/> Max Sq.
                </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowCluster(!showCluster)} className={`cursor-pointer hover:brightness-125 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all border ${showCluster ? 'bg-[#d04fd7]/10 border-[#d04fd7]/50 text-[#d04fd7]' : 'bg-transparent border-white/5 text-gray-500'}`}>
                    <Activity size={14}/> Cluster
                </button>
                <button onClick={() => setShowTargets(!showTargets)} className={`cursor-pointer hover:brightness-125 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all border ${showTargets ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-transparent border-white/5 text-gray-500'}`}>
                    <Target size={14}/> Cibles
                </button>
            </div>
            
             <button onClick={() => setShowHeatmap(!showHeatmap)} className={`cursor-pointer hover:brightness-125 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all border ${showHeatmap ? 'bg-fuchsia-500/10 border-fuchsia-500/50 text-fuchsia-400' : 'bg-transparent border-white/5 text-gray-500'}`}>
                    <Layers size={14}/> Tracés GPS
            </button>
            
            <button onClick={() => setDimMap(!dimMap)} className="cursor-pointer hover:brightness-125 w-full py-2 rounded-lg border border-white/5 text-[10px] text-gray-500 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                 <Eye size={12} /> {dimMap ? 'Mode Immersion' : 'Mode Standard'}
            </button>
        </div>
      </div>

      <MapContainer 
        center={[45.8992, 6.1294]} 
        zoom={11} 
        className="w-full h-full z-0 bg-[#050505]" 
        zoomControl={false}
        preferCanvas={true}
      >
        <MapController />
        
        <TileLayer
          attribution='&copy; CyclOSM'
          url="https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
        />

        {boundsArea && (
            <Rectangle
                bounds={boundsArea}
                pathOptions={{ color: '#fff', weight: 1, dashArray: '4, 8', fill: false, opacity: 0.1 }}
            />
        )}

        {gridRectangles}

        {showHeatmap && filteredActivities.map((act) => {
           if (!act.polyline) return null;
           try {
             const positions = require('@mapbox/polyline').decode(act.polyline);
             return <Polyline key={act.id} positions={positions} pathOptions={{ color: '#d04fd7', weight: 2, opacity: 0.6 }} />;
           } catch(e) { return null; }
        })}

      </MapContainer>

      <style jsx global>{`
        .dimmed-mode .leaflet-tile-pane {
          filter: brightness(0.6) contrast(1.2) grayscale(0.8) invert(1) hue-rotate(180deg);
        }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
        
        .tile-neon { transition: fill-opacity 0.2s, stroke-opacity 0.2s; }
        .tile-neon:hover {
            fill-opacity: 0.5 !important;
            stroke-opacity: 1 !important;
            stroke: #fff !important;
            stroke-width: 2px !important;
        }

        .tile-max-square { animation: pulse-gold 3s infinite alternate; }
        @keyframes pulse-gold {
            from { fill-opacity: 0.3; stroke-opacity: 0.8; }
            to { fill-opacity: 0.5; stroke-opacity: 1; }
        }

        .tile-cluster { animation: breathe-purple 5s ease-in-out infinite; }
        @keyframes breathe-purple {
            0% { fill-opacity: 0.2; }
            50% { fill-opacity: 0.4; }
            100% { fill-opacity: 0.2; }
        }

        .tile-target-urgent { animation: flash-red 0.8s infinite alternate; }
        @keyframes flash-red {
            from { fill-opacity: 0.2; stroke: #ff0000; }
            to { fill-opacity: 0.5; stroke: #fff; }
        }
      `}</style>
    </div>
  );
}