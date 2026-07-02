'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { getTilesFromPolyline, getTileBounds, lon2tile, lat2tile } from '../../lib/mapUtils';
import { calculateMaxSquare, getSquareTiles, calculateTotalArea, findLargestCluster, getFutureTargets } from '../../lib/gridAlgo';
import { Layers, Maximize, Eye, Grid, Activity, Target, Map as MapIcon, CheckSquare, Calendar, Focus, Crosshair, ArrowRightLeft, MoveVertical, Scan, ArrowUpRight, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { useMap, useMapEvents } from 'react-leaflet';
import { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createBrowserSupabaseClient } from '../../lib/supabaseBrowserClient';

// --- IMPORTS DYNAMIQUES ---
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });
const Rectangle = dynamic(() => import('react-leaflet').then(mod => mod.Rectangle), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

// --- TYPES ---
type MapActivity = {
  id: number;
  name: string;
  type: string | null;
  start_time: string;
  polyline: string | null;
};

type TargetStats = {
    count: number;
    areaKm2: number;
    widthKm: number;
    heightKm: number;
    potentialMaxSqSize: number;
};

type MaxSquareWithRank = {
    rank: number;
    maxSquare: number;
    topLeft: any; 
    tilesSet: Set<string>;
};

// --- PALETTE TACTIQUE ---
const TARGET_COLORS = [
    '#ff003c', '#ff3c00', '#ff7b00', '#ffaa00', '#ffea00', '#ccff00', '#88ff00', '#39ff14', '#00ff9d', '#00f3ff'  
];

// --- HELPERS ---
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}


// --- COMPOSANT : PINCEAU BLACKLIST (Zéro RAM) ---
const MapInteractionHandler = ({ blacklistMode, visitedTilesSet, toggleBlacklistTile }: any) => {
    // Un ref local pour éviter de spammer Supabase quand on "peint" en glissant la souris
    const paintedTilesRef = React.useRef<Set<string>>(new Set());

    React.useEffect(() => {
        const handleMouseUp = () => paintedTilesRef.current.clear();
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    useMapEvents({
        click(e) {
            if (!blacklistMode) return;
            const x = lon2tile(e.latlng.lng, 14);
            const y = lat2tile(e.latlng.lat, 14);
            const tileKey = `${x},${y}`;
            if (!visitedTilesSet.has(tileKey)) toggleBlacklistTile(tileKey);
        },
        mousemove(e) {
            if (!blacklistMode) return;
            // originalEvent.buttons === 1 signifie que le clic gauche est maintenu (Effet Pinceau)
            if (e.originalEvent.buttons === 1) {
                const x = lon2tile(e.latlng.lng, 14);
                const y = lat2tile(e.latlng.lat, 14);
                const tileKey = `${x},${y}`;
                
                // On vérifie qu'on ne l'a pas déjà peinte dans ce coup de pinceau pour protéger la BDD
                if (!visitedTilesSet.has(tileKey) && !paintedTilesRef.current.has(tileKey)) {
                    paintedTilesRef.current.add(tileKey); 
                    toggleBlacklistTile(tileKey, null, true); // forceAdd = true
                }
            }
        }
    });
    return null;
};

const getBoundsFromTiles = (tiles: Set<string>): LatLngBoundsExpression | null => {
    if (tiles.size === 0) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    tiles.forEach(key => {
        const [x, y] = key.split(',').map(Number);
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
    });
    
    const cTL = getTileBounds(minX, minY, 14)[0];
    const cBR = getTileBounds(maxX, maxY, 14)[1];
    return [cTL, cBR];
};

// --- COMPOSANT : AUTO ZOOM TRIGGER ---
const MapAutoZoom = ({ targetBounds }: { targetBounds: { bounds: LatLngBoundsExpression, id: number } | null }) => {
    const map = useMap();
    useEffect(() => {
        if (targetBounds) {
            map.flyToBounds(targetBounds.bounds as any, {
                padding: [50, 50], duration: 1.5, easeLinearity: 0.25
            });
        }
    }, [targetBounds, map]);
    return null;
};

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function GlobalMapClient({ 
    activities, 
    initialBlacklist = [], 
    userId 
}: { 
    activities: MapActivity[];
    initialBlacklist?: string[];
    userId: number;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const supabase = createBrowserSupabaseClient();
  
  // -- ETATS UI RESPONSIVE --
  const [hudOpen, setHudOpen] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [dimMap, setDimMap] = useState(true); 
  const [targetMode, setTargetMode] = useState<'square' | 'cluster'>('cluster'); 
  const [activeSquareRank, setActiveSquareRank] = useState<number>(0); 
  
  // -- ETATS LAYERS --
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showMaxSquare, setShowMaxSquare] = useState(true);
  const [showCluster, setShowCluster] = useState(true);
  const [showFilling, setShowFilling] = useState(false);
  const [showCore, setShowCore] = useState(true); 
  
  // -- ETAT BLACKLIST & CIBLES --
  const [showTargets, setShowTargets] = useState(false); 
  const [activeTargetLevels, setActiveTargetLevels] = useState<Set<number>>(new Set([1]));
  const [blacklistMode, setBlacklistMode] = useState(false);
  const [blacklistedTilesSet, setBlacklistedTilesSet] = useState<Set<string>>(new Set(initialBlacklist));

  // -- ETAT ZOOM & POPUP --
  const [zoomTarget, setZoomTarget] = useState<{ bounds: LatLngBoundsExpression, id: number } | null>(null);
  const [activeTilePopup, setActiveTilePopup] = useState<{ key: string, bounds: LatLngBoundsExpression } | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  // --- ACTIONS ZOOM ---
  const triggerZoom = (bounds: LatLngBoundsExpression | null) => {
      if (bounds) setZoomTarget({ bounds, id: Date.now() });
  };

  // --- ACTIONS BLACKLIST API ---
  // --- ACTIONS BLACKLIST API ---
  const toggleBlacklistTile = async (tileKey: string, e?: any, forceAdd: boolean = false) => {
    if (e && e.stopPropagation) e.stopPropagation();
    
    // Si on peint et que la tuile est déjà blacklistée, on ignore (évite les clignotements)
    if (forceAdd && blacklistedTilesSet.has(tileKey)) return;

    const newSet = new Set(blacklistedTilesSet);
    const isBlacklisted = newSet.has(tileKey);

    if (isBlacklisted && !forceAdd) {
        newSet.delete(tileKey);
        await supabase.from('blacklisted_tiles').delete().match({ user_id: userId, tile_key: tileKey });
    } else if (!isBlacklisted) {
        newSet.add(tileKey);
        await supabase.from('blacklisted_tiles').insert([{ user_id: userId, tile_key: tileKey }]);
    }
    setBlacklistedTilesSet(newSet);
  };

  // --- PROCESSING ---
  const years = useMemo(() => {
    const y = new Set(activities.map(a => new Date(a.start_time).getFullYear().toString()));
    return Array.from(y).sort((a, b) => b.localeCompare(a));
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (selectedYear === 'all') return activities;
    return activities.filter(a => new Date(a.start_time).getFullYear().toString() === selectedYear);
  }, [activities, selectedYear]);

  // --- CALCUL GEO SPATIAL ---
  const { 
      visitedTilesSet, boundsArea, topSquares, totalArea, clusterSet, 
      squareTargetsMap, clusterTargetsMap, fillingTilesSet, coreTilesSet,    
      currentMaxSquareBounds, clusterBounds, tileVisitCounts // <-- AJOUT ICI
  } = useMemo(() => {
    const tiles = new Set<string>();
    const tileCounts = new Map<string, number>(); // <-- AJOUT DE LA MAP DE COMPTAGE
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    filteredActivities.forEach(act => {
      if (act.polyline) {
        try {
           const actTiles = getTilesFromPolyline(act.polyline);
           actTiles.forEach(t => {
             // Nettoyage automatique
             if (blacklistedTilesSet.has(t)) toggleBlacklistTile(t); 

             tiles.add(t);
             // On incrémente le compteur de passages pour cette tuile
             tileCounts.set(t, (tileCounts.get(t) || 0) + 1);

             const [x, y] = t.split(',').map(Number);
             if (x < minX) minX = x; if (x > maxX) maxX = x;
             if (y < minY) minY = y; if (y > maxY) maxY = y;
           });
        } catch (e) {}
      }
    });

    let globalBounds: LatLngBoundsExpression | null = null;
    if (tiles.size > 0) {
      const minBounds = getTileBounds(minX, minY, 14);
      const maxBounds = getTileBounds(maxX, maxY, 14);
      globalBounds = [ [minBounds[0][0], minBounds[0][1]], [maxBounds[1][0], maxBounds[1][1]] ]; 
    }

    // 1. CALCUL DES TOP SQUARES
    const tilesForSquares = new Set(tiles);
    const calculatedTopSquares: MaxSquareWithRank[] = [];
    
    for (let i = 0; i < 5; i++) {
        if (tilesForSquares.size === 0) break;
        const sq = calculateMaxSquare(tilesForSquares, blacklistedTilesSet);
        if (sq.maxSquare === 0) break;

        const sqTiles = getSquareTiles(sq.topLeft, sq.maxSquare);
        calculatedTopSquares.push({ ...sq, tilesSet: new Set(sqTiles), rank: i + 1 });
        sqTiles.forEach(t => tilesForSquares.delete(t));
    }

    const activeSq = calculatedTopSquares[activeSquareRank] || calculatedTopSquares[0];
    const area = calculateTotalArea(tiles);
    const biggestCluster = findLargestCluster(tiles, blacklistedTilesSet);
    
    // Bounds du carré ACTIF
    let msBounds: LatLngBoundsExpression | null = null;
    if (activeSq && activeSq.maxSquare > 0 && activeSq.topLeft) {
        const rawTL = activeSq.topLeft as any;
        const msX = typeof rawTL === 'string' ? Number(rawTL.split(',')[0]) : rawTL.x;
        const msY = typeof rawTL === 'string' ? Number(rawTL.split(',')[1]) : rawTL.y;
        msBounds = [getTileBounds(msX, msY, 14)[0], getTileBounds(msX + activeSq.maxSquare - 1, msY + activeSq.maxSquare - 1, 14)[1]];
    }

    // Bounds Cluster
    let clBounds: LatLngBoundsExpression | null = null;
    let cMinX = Infinity, cMinY = Infinity, cMaxX = -Infinity, cMaxY = -Infinity;
    if (biggestCluster.size > 0) {
        biggestCluster.forEach(k => {
            const [x, y] = k.split(',').map(Number);
            if(x < cMinX) cMinX=x; if(x > cMaxX) cMaxX=x;
            if(y < cMinY) cMinY=y; if(y > cMaxY) cMaxY=y;
        });
        clBounds = [getTileBounds(cMinX, cMinY, 14)[0], getTileBounds(cMaxX, cMaxY, 14)[1]];
    }

    // 2. NOYAUX
    const coreSet = new Set<string>();
    tiles.forEach(key => {
        const [x, y] = key.split(',').map(Number);
        if (tiles.has(`${x+1},${y}`) && tiles.has(`${x-1},${y}`) && tiles.has(`${x},${y+1}`) && tiles.has(`${x},${y-1}`)) {
            coreSet.add(key);
        }
    });

    // 3. FILLING (L'intégralité de l'algorithme)
    const fillingSet = new Set<string>();
    if (biggestCluster.size > 0) {
        const startX = cMinX - 1; const endX = cMaxX + 1;
        const startY = cMinY - 1; const endY = cMaxY + 1;
        const outsideSet = new Set<string>();
        const queue = [`${startX},${startY}`];
        outsideSet.add(`${startX},${startY}`);

        while (queue.length > 0) {
            const current = queue.pop()!;
            const [cx, cy] = current.split(',').map(Number);
            const neighbors = [[cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]];
            for (const [nx, ny] of neighbors) {
                if (nx < startX || nx > endX || ny < startY || ny > endY) continue;
                const nKey = `${nx},${ny}`;
                if (!biggestCluster.has(nKey) && !outsideSet.has(nKey)) {
                    outsideSet.add(nKey);
                    queue.push(nKey);
                }
            }
        }
        for (let x = cMinX; x <= cMaxX; x++) {
            for (let y = cMinY; y <= cMaxY; y++) {
                const key = `${x},${y}`;
                if (!biggestCluster.has(key) && !outsideSet.has(key)) {
                    fillingSet.add(key);
                }
            }
        }
    }

    // 4. CIBLES 
    const sqTargets = activeSq && activeSq.topLeft 
        ? getFutureTargets(tiles, blacklistedTilesSet, activeSq.topLeft, activeSq.maxSquare, 10) 
        : new Map();

    const clTargets = new Map<string, number>();
    let currentLevelTiles = new Set<string>(biggestCluster);
    fillingSet.forEach(t => currentLevelTiles.add(t)); 

    let borderTiles = new Set<string>();
    currentLevelTiles.forEach(key => {
        const [x, y] = key.split(',').map(Number);
        const neighbors = [`${x+1},${y}`, `${x-1},${y}`, `${x},${y+1}`, `${x},${y-1}`];
        if (neighbors.some(n => !currentLevelTiles.has(n))) borderTiles.add(key);
    });

    let currentBorder = borderTiles;
    for (let lvl = 1; lvl <= 10; lvl++) {
        const nextBorder = new Set<string>();
        currentBorder.forEach(tileKey => {
            const [x, y] = tileKey.split(',').map(Number);
            const neighbors = [`${x+1},${y}`, `${x-1},${y}`, `${x},${y+1}`, `${x},${y-1}`];
            neighbors.forEach(nKey => {
                if (!tiles.has(nKey) && !fillingSet.has(nKey) && !clTargets.has(nKey) && !blacklistedTilesSet.has(nKey)) {
                    clTargets.set(nKey, lvl);
                    nextBorder.add(nKey);
                }
            });
        });
        currentBorder = nextBorder;
        if (currentBorder.size === 0) break;
    }

    return { 
        visitedTilesSet: tiles, boundsArea: globalBounds, topSquares: calculatedTopSquares, 
        totalArea: area, clusterSet: biggestCluster, squareTargetsMap: sqTargets, 
        clusterTargetsMap: clTargets, fillingTilesSet: fillingSet, coreTilesSet: coreSet,
        currentMaxSquareBounds: msBounds, clusterBounds: clBounds,
        tileVisitCounts: tileCounts // <-- NE PAS OUBLIER DE LE RETOURNER ICI
    };
  }, [filteredActivities, activeSquareRank, blacklistedTilesSet]);

  const currentMaxSquare = topSquares[activeSquareRank] || topSquares[0];

  // --- HANDLERS ---
  const handleModeSwitch = (mode: 'square' | 'cluster') => {
      setTargetMode(mode);
      if (mode === 'square') {
          setShowTargets(true); setShowFilling(false); setActiveTargetLevels(new Set([1])); 
          if (currentMaxSquareBounds) triggerZoom(currentMaxSquareBounds);
      } else {
          if (clusterBounds) triggerZoom(clusterBounds);
      }
  };

  const toggleMaxSquare = () => {
      const newState = !showMaxSquare; setShowMaxSquare(newState);
      if (newState && currentMaxSquareBounds) triggerZoom(currentMaxSquareBounds);
  };

  const toggleCluster = () => {
      const newState = !showCluster; setShowCluster(newState);
      if (newState && clusterBounds) triggerZoom(clusterBounds);
  };

  const toggleFilling = () => {
      if (!showCluster || targetMode === 'square') return; 
      const newState = !showFilling; setShowFilling(newState);
      if (newState) {
          const bounds = getBoundsFromTiles(new Set([...Array.from(clusterSet), ...Array.from(fillingTilesSet)]));
          if (bounds) triggerZoom(bounds);
      }
  };

  const cycleSquareRank = (e: React.MouseEvent) => {
      e.stopPropagation(); 
      setActiveSquareRank((activeSquareRank + 1) % Math.min(topSquares.length, 5));
      if (targetMode !== 'square') { setTargetMode('square'); setShowTargets(true); setShowFilling(false); }
  };

  useEffect(() => {
      if (targetMode === 'square' && showMaxSquare && currentMaxSquareBounds) triggerZoom(currentMaxSquareBounds);
  }, [activeSquareRank]);

  const handleTargetRange = (level: number) => {
      const newSet = new Set<number>();
      for (let i = 1; i <= level; i++) newSet.add(i);
      setActiveTargetLevels(newSet);

      const tilesToZoom = new Set<string>();
      if (targetMode === 'square') {
          currentMaxSquare.tilesSet.forEach(t => tilesToZoom.add(t));
          squareTargetsMap.forEach((lvl, key) => { if (lvl <= level) tilesToZoom.add(key); });
      } else {
          clusterSet.forEach(t => tilesToZoom.add(t));
          clusterTargetsMap.forEach((lvl, key) => { if (lvl <= level) tilesToZoom.add(key); });
      }
      const bounds = getBoundsFromTiles(tilesToZoom);
      if (bounds) triggerZoom(bounds);
  };

  const handleTileInteraction = (tileKey: string, isVisited: boolean, bounds: LatLngBoundsExpression) => {
      if (blacklistMode && !isVisited) {
          toggleBlacklistTile(tileKey);
      } else {
          setActiveTilePopup({ key: tileKey, bounds });
      }
  };

  // --- STATS SÉLECTION ---
  const selectionStats = useMemo<TargetStats>(() => {
      let selectedTiles = new Set<string>();
      if (showFilling && targetMode === 'cluster') fillingTilesSet.forEach(t => selectedTiles.add(t));
      if (showTargets) {
          const currentTargetsMap = targetMode === 'square' ? squareTargetsMap : clusterTargetsMap;
          currentTargetsMap.forEach((lvl, key) => {
              if (activeTargetLevels.has(lvl)) selectedTiles.add(key);
          });
      }
      let maxSelectedLevel = showTargets ? Math.max(0, ...Array.from(activeTargetLevels)) : 0;
      if (selectedTiles.size === 0) return { count: 0, areaKm2: 0, widthKm: 0, heightKm: 0, potentialMaxSqSize: 0 };

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      selectedTiles.forEach(key => {
          const [x, y] = key.split(',').map(Number);
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
      });
      const topLeft = getTileBounds(minX, maxY, 14)[0] as LatLngTuple; 
      const topRight = getTileBounds(maxX, maxY, 14)[0] as LatLngTuple;
      const bottomLeft = getTileBounds(minX, minY, 14)[0] as LatLngTuple;
      const width = getDistanceKm(topLeft[0], topLeft[1], topRight[0], topRight[1]) + 0.6; 
      const height = getDistanceKm(topLeft[0], topLeft[1], bottomLeft[0], bottomLeft[1]) + 0.6;
      const area = selectedTiles.size * 0.36; 

      return {
          count: selectedTiles.size,
          areaKm2: area,
          widthKm: width,
          heightKm: height,
          potentialMaxSqSize: (currentMaxSquare?.maxSquare || 0) + maxSelectedLevel
      };
  }, [showFilling, showTargets, activeTargetLevels, fillingTilesSet, squareTargetsMap, clusterTargetsMap, targetMode, currentMaxSquare]);

  // --- RENDU RECTANGLES ---
  const gridRectangles = useMemo(() => {
    const ZOOM = 14;
    const currentTargetsMap = targetMode === 'square' ? squareTargetsMap : clusterTargetsMap;

    const allKeysToRender = new Set([
        ...Array.from(visitedTilesSet), 
        ...Array.from(currentTargetsMap.keys()),
        ...(showFilling && targetMode === 'cluster' ? Array.from(fillingTilesSet) : []),
        ...Array.from(blacklistedTilesSet)
    ]);

    return Array.from(allKeysToRender).map(tileKey => {
      const isVisited = visitedTilesSet.has(tileKey);
      const isBlacklisted = blacklistedTilesSet.has(tileKey);
      const isCore = showCore && coreTilesSet.has(tileKey);
      
      const targetLevel = currentTargetsMap.get(tileKey);
      const isTargetVisible = showTargets && targetLevel !== undefined && activeTargetLevels.has(targetLevel!);
      const isFilling = showFilling && fillingTilesSet.has(tileKey) && targetMode === 'cluster';

      // On bloque l'affichage si ce n'est rien de tout ça
      if ((!isVisited || !showGrid) && !isTargetVisible && !isFilling && !isBlacklisted) return null;

      const [x, y] = tileKey.split(',').map(Number);
      const bounds = getTileBounds(x, y, ZOOM);
      
      const isMaxSquare = isVisited && showMaxSquare && currentMaxSquare?.tilesSet.has(tileKey);
      const isCluster = isVisited && showCluster && !isMaxSquare && clusterSet.has(tileKey);
      
      let color = '#00f3ff', weight = 1, className = 'tile-base', fillOpacity = 0.12, opacity = 0.4;

      if (isBlacklisted) {
          color = '#ff0055'; weight = 2; className = 'tile-blacklisted'; fillOpacity = 0.3; opacity = 0.8;
      }
      else if (isFilling) {
          color = '#f97316'; weight = 2; className = 'tile-glitch'; fillOpacity = 0.4; opacity = 1;
      }
      else if (isTargetVisible && targetLevel) {
          color = TARGET_COLORS[Math.min(Math.max(targetLevel - 1, 0), 9)];
          weight = targetLevel === 1 ? 2 : 1; className = targetLevel === 1 ? 'tile-target-urgent' : 'tile-neon'; fillOpacity = 0.4; opacity = 0.9;
      }
      else if (isMaxSquare) {
          color = '#ffd700'; weight = 3; className = 'tile-max-square'; fillOpacity = 0.5; opacity = 1;
      } 
      else if (isVisited) {
          if (isCore) { color = '#ffffff'; fillOpacity = 0.8; opacity = 1; weight = 2; className = 'tile-core'; } 
          else if (isCluster) { color = '#d04fd7'; weight = 1; className = 'tile-cluster'; fillOpacity = 0.25; opacity = 0.6; } 
      }

      return (
        <Rectangle 
          key={tileKey} 
          bounds={bounds} 
          pathOptions={{ color, weight, opacity, fillColor: color, fillOpacity, className }}
          eventHandlers={{
            // On garde juste le clic pour le popup
            click: () => handleTileInteraction(tileKey, isVisited, bounds)
          }}
        />
      );
    });
  }, [visitedTilesSet, blacklistedTilesSet, squareTargetsMap, clusterTargetsMap, fillingTilesSet, coreTilesSet, showGrid, showMaxSquare, showCluster, showFilling, showCore, showTargets, activeTargetLevels, targetMode, currentMaxSquare, blacklistMode]);

  if (!isMounted) return <div className="h-screen bg-[#050505] flex items-center justify-center text-[#d04fd7] animate-pulse font-sans tracking-widest text-xl">Chargement de la map ..</div>;

  const isFillingDisabled = !showCluster || targetMode === 'square';

  return (
    <div className={`relative w-full h-[calc(100vh-0px)] overflow-hidden bg-[#050505] ${dimMap ? 'dimmed-mode' : ''} ${blacklistMode ? 'cursor-crosshair' : ''}`}>
      
      <style jsx global>{`
        .dimmed-mode .leaflet-tile-pane { filter: brightness(0.6) contrast(1.2) grayscale(0.8) invert(1) hue-rotate(180deg); }
        .tile-base { transition: all 0.2s; }
        .tile-base:hover { fill-opacity: 0.5 !important; stroke: #fff !important; stroke-width: 2px !important; }
        .tile-blacklisted { animation: hatch-red 2s linear infinite; stroke-dasharray: 4; }
        .tile-max-square { animation: pulse-gold 3s infinite alternate; z-index: 50; }
        .tile-cluster { animation: breathe-purple 5s ease-in-out infinite; }
        .tile-target-urgent { animation: flash-red 1s infinite alternate; }
        .tile-glitch { animation: glitch-flash 0.5s infinite; }
        .tile-interactive-grid { stroke-dasharray: 2 4; transition: all 0.2s; }
        .tile-interactive-grid:hover { fill-opacity: 0.1 !important; stroke: #ff0055 !important; stroke-opacity: 0.8 !important; }
        .tile-core { stroke: #fff !important; stroke-width: 2px !important; fill: #fff !important; fill-opacity: 0.8 !important; z-index: 200 !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* --- CUSTOM LEAFLET POPUP --- */
        .custom-dark-popup .leaflet-popup-content-wrapper {
            background: #121217;
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.75rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            padding: 0;
        }
        .custom-dark-popup .leaflet-popup-content {
            margin: 0;
            padding: 1rem;
        }
        .custom-dark-popup .leaflet-popup-tip {
            background: #121217;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 2px 2px 5px rgba(0,0,0,0.4);
        }
        .custom-dark-popup .leaflet-popup-close-button {
            color: #9ca3af !important;
            padding: 6px 8px 0 0 !important;
            transition: color 0.2s;
        }
        .custom-dark-popup .leaflet-popup-close-button:hover {
            color: #d04fd7 !important;
            background: transparent !important;
        }

        @keyframes pulse-gold { from { fill-opacity: 0.4; stroke-opacity: 0.8; } to { fill-opacity: 0.7; stroke-opacity: 1; } }
        @keyframes breathe-purple { 0%, 100% { fill-opacity: 0.2; } 50% { fill-opacity: 0.4; } }
        @keyframes flash-red { from { fill-opacity: 0.2; stroke: #ff003c; } to { fill-opacity: 0.6; stroke: #fff; } }
        @keyframes glitch-flash { 0% { fill-opacity: 0.4; stroke: #f97316; } 50% { fill-opacity: 0.8; stroke: #fff; } 100% { fill-opacity: 0.4; stroke: #f97316; } }
        @keyframes hatch-red { 0% { fill-opacity: 0.3; stroke-opacity: 0.6; } 50% { fill-opacity: 0.5; stroke-opacity: 1; } 100% { fill-opacity: 0.3; stroke-opacity: 0.6; } }
      `}</style>

      {/* --- HUD RESPONSIVE --- */}
      <div className={`absolute z-[1000] flex flex-col gap-2 transition-all duration-300 ease-in-out 
          md:top-4 md:left-4 md:w-[280px] md:bottom-auto md:translate-y-0
          left-2 right-2 bottom-4 w-auto ${hudOpen ? 'translate-y-0' : 'translate-y-[85%] md:translate-y-0'}
          max-h-[calc(100vh-2rem)] pointer-events-none`}>
        
        {/* Mobile Toggle Button */}
        <button onClick={() => setHudOpen(!hudOpen)} className="md:hidden mx-auto bg-[#121217] text-white p-1 rounded-t-xl border-t border-x border-white/10 shadow-lg pointer-events-auto">
            {hudOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>

        <div className="overflow-y-auto no-scrollbar pointer-events-none space-y-2 pb-4">
            {/* PANEL 1 : STATS */}
            <div className="bg-[#121217]/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl pointer-events-auto transition-all">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-1.5 rounded-lg bg-[#d04fd7]/10 border border-[#d04fd7]/30 text-[#d04fd7]">
                        <Grid size={16} />
                    </div>
                    <div><h2 className="text-sm font-bold text-white tracking-wide leading-none">HEATMAP</h2></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <StatBox label="Carrés" value={visitedTilesSet.size} potentialLabel={selectionStats.count > 0 ? `(+${selectionStats.count})` : null} color="cyan" icon={<CheckSquare size={12}/>} />
                    
                    {/* Max Square */}
                    <div onClick={() => currentMaxSquareBounds && triggerZoom(currentMaxSquareBounds)} className="bg-[#1a1a20] p-2 rounded-xl border border-yellow-500/10 flex flex-col justify-between h-[50px] cursor-pointer hover:bg-[#202028] transition-colors group relative">
                        <div className="text-base font-bold tabular-nums leading-none tracking-tight text-white flex justify-between items-center">
                            <span className="flex items-center gap-1">
                                {currentMaxSquare?.maxSquare || 0}x{currentMaxSquare?.maxSquare || 0}
                                {targetMode === 'square' && selectionStats.count > 0 && <span className="text-[10px] text-gray-400 font-normal">({selectionStats.potentialMaxSqSize}x{selectionStats.potentialMaxSqSize})</span>}
                            </span>
                            <div onClick={cycleSquareRank} className="flex gap-0.5 p-1 -m-1 cursor-alias hover:scale-110 transition-transform" title="Changer de carré (1, 2, 3, 4, 5)">
                                {[0,1,2,3,4].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full ${activeSquareRank === i ? 'bg-yellow-500' : 'bg-gray-700'}`} />)}
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wide text-yellow-400">
                            <div className="flex items-center gap-1.5"><Maximize size={12} /> MAX SQ.</div>
                            <span className="text-gray-500">#{activeSquareRank + 1}</span>
                        </div>
                    </div>
                    
                    <StatBox label="Max Cluster" value={clusterSet.size} potentialLabel={targetMode === 'cluster' && selectionStats.count > 0 ? `(+${selectionStats.count})` : null} color="purple" icon={<Activity size={12}/>} onClick={() => triggerZoom(clusterBounds)} isInteractive />
                    <StatBox label="Zone (km²)" value={Number(totalArea).toFixed(0)} potentialLabel={selectionStats.count > 0 ? `(+${selectionStats.areaKm2.toFixed(1)})` : null} color="emerald" icon={<MapIcon size={12}/>} />
                </div>
            </div>

            {/* PANEL 2 : CONTRÔLES */}
            <div className="bg-[#121217]/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl pointer-events-auto space-y-2">
                <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Calendar size={14} className="text-[#00f3ff]" /></div>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full bg-[#1a1a20] border border-white/10 rounded-xl py-1.5 pl-9 pr-4 text-xs font-semibold text-white outline-none focus:border-[#00f3ff] transition-all appearance-none cursor-pointer hover:bg-[#25252b]">
                      <option value="all">HISTORIQUE COMPLET</option>
                      {years.map(y => <option key={y} value={y}>ANNÉE {y}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <ToggleButton isActive={showGrid} onClick={() => setShowGrid(!showGrid)} label="Grille" color="cyan" icon={Grid} />
                    <ToggleButton isActive={showMaxSquare} onClick={toggleMaxSquare} label="Max Sq." color="yellow" icon={Maximize} />
                    <ToggleButton isActive={showCluster} onClick={toggleCluster} label="Cluster" color="purple" icon={Activity} />
                    <ToggleButton isActive={showHeatmap} onClick={() => setShowHeatmap(!showHeatmap)} label="Tracés" color="fuchsia" icon={Layers} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <ToggleButton isActive={showFilling} onClick={toggleFilling} label="Remplissage" color="orange" icon={Crosshair} disabled={isFillingDisabled} />
                    <ToggleButton isActive={showCore} onClick={() => setShowCore(!showCore)} label="Noyau" color="white" icon={Focus} />
                </div>

                <div className="bg-[#1a1a20] rounded-xl p-2 border border-white/5 space-y-2">
                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                        <button onClick={() => handleModeSwitch('square')} className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-md transition-all flex items-center justify-center gap-1.5 ${targetMode === 'square' ? 'bg-yellow-500 text-black shadow-md' : 'text-gray-500 hover:text-white'}`}><Maximize size={10} /> Carré</button>
                        <button onClick={() => handleModeSwitch('cluster')} className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-md transition-all flex items-center justify-center gap-1.5 ${targetMode === 'cluster' ? 'bg-[#d04fd7] text-white shadow-md' : 'text-gray-500 hover:text-white'}`}><Activity size={10} /> Cluster</button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowTargets(!showTargets)} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase border transition-all flex items-center justify-center gap-2 ${showTargets ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-transparent border-white/10 text-gray-500 hover:border-white/20 hover:text-white'}`}>
                            <Target size={12} /> {showTargets ? 'Extension ACTIVE' : 'Extension OFF'}
                        </button>
                    </div>
                    
                    {showTargets && (
                        <div className="grid grid-cols-5 gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                            {Array.from({length: 10}).map((_, i) => {
                                const level = i + 1; const isActive = activeTargetLevels.has(level); const color = TARGET_COLORS[i];
                                return (
                                    <button key={level} onClick={() => handleTargetRange(level)} className={`h-6 rounded text-[9px] font-bold transition-all duration-200 border flex items-center justify-center relative overflow-hidden ${isActive ? 'text-black scale-100 shadow-md' : 'bg-transparent text-gray-500 border-white/5 hover:border-white/20 hover:text-white'}`} style={{ backgroundColor: isActive ? color : 'transparent', borderColor: isActive ? color : undefined }}>
                                        <span className="relative z-10">N+{level}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* BLACKLIST BUTTON */}
                <button 
                    onClick={() => setBlacklistMode(!blacklistMode)}
                    className={`w-full py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 border 
                        ${blacklistMode ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_10px_rgba(255,0,85,0.3)] animate-pulse' : 'bg-transparent border-white/10 text-gray-500 hover:border-white/20 hover:text-white'}
                    `}>
                    <ShieldAlert size={12} /> {blacklistMode ? 'Pinceau Blacklist Actif' : 'Activer Blacklist'}
                </button>

                <button onClick={() => setDimMap(!dimMap)} className="w-full py-2 rounded-xl border border-white/10 text-[9px] font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
                     <Eye size={12} /> {dimMap ? 'Immersion' : 'Standard'}
                </button>
            </div>

            {/* PANEL 3 : DONNÉES TACTIQUES */}
            {(selectionStats.count > 0) && (
                <div className="bg-[#121217]/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl pointer-events-auto transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-1.5 rounded-lg bg-[#d04fd7]/10 border border-[#d04fd7]/30 text-[#d04fd7]"><Scan size={16} /></div>
                        <div><h2 className="text-sm font-bold text-white tracking-wide leading-none">CIBLES</h2></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <StatBox label="Carré(s)" value={selectionStats.count} color="cyan" icon={<Target size={12}/>} />
                        <StatBox label="Gain (km²)" value={`+${selectionStats.areaKm2.toFixed(1)}`} color="emerald" icon={<ArrowUpRight size={12}/>} />
                        <StatBox label="Largeur" value={`${selectionStats.widthKm.toFixed(1)} km`} color="yellow" icon={<ArrowRightLeft size={12}/>} />
                        <StatBox label="Hauteur" value={`${selectionStats.heightKm.toFixed(1)} km`} color="purple" icon={<MoveVertical size={12}/>} />
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- CARTE LEAFLET --- */}
      <MapContainer center={[46.603354, 1.888334]} zoom={6} className="w-full h-full z-0 bg-[#050505]" zoomControl={false} preferCanvas={true} attributionControl={false}>
        <TileLayer url="https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png" />
        <MapAutoZoom targetBounds={zoomTarget} />
        
        {/* L'ÉCOUTEUR DE CLICS INVISIBLE EST ICI */}
        <MapInteractionHandler 
            blacklistMode={blacklistMode} 
            visitedTilesSet={visitedTilesSet} 
            toggleBlacklistTile={toggleBlacklistTile} 
        />

        {boundsArea && (
            <Rectangle bounds={boundsArea} pathOptions={{ color: '#fff', weight: 1, dashArray: '4, 12', fill: false, opacity: 0.1 }} />
        )}

        {gridRectangles}

        {showHeatmap && filteredActivities.map((act) => {
           if (!act.polyline) return null;
           try {
             const positions = require('@mapbox/polyline').decode(act.polyline);
             return <Polyline key={act.id} positions={positions} pathOptions={{ color: '#d04fd7', weight: 2, opacity: 0.5 }} />;
           } catch(e) { return null; }
        })}

        {activeTilePopup && (
            <Popup 
                position={[(activeTilePopup.bounds as any)[0][0], (activeTilePopup.bounds as any)[0][1]]} 
                eventHandlers={{ remove: () => setActiveTilePopup(null) }}
                className="custom-dark-popup"
            >
                <div className="flex flex-col gap-2 min-w-[140px]">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
                        <span className="font-black text-[10px] tracking-widest text-[#d04fd7] uppercase">Tuile</span>
                        <span className="font-mono text-xs text-white/80 bg-white/5 px-1.5 py-0.5 rounded">{activeTilePopup.key}</span>
                    </div>

                    {visitedTilesSet.has(activeTilePopup.key) ? (
                        <>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-medium">Statut</span>
                                <span className="text-xs font-bold text-emerald-400">Explorée</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-medium">Passages</span>
                                <span className="text-sm font-black text-white">{tileVisitCounts.get(activeTilePopup.key) || 1}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col gap-3 mt-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-medium">Statut</span>
                                <span className="text-xs font-bold text-gray-500">Inconnue</span>
                            </div>
                            <button 
                                onClick={(e) => { 
                                    toggleBlacklistTile(activeTilePopup.key, e); 
                                    setActiveTilePopup(null); 
                                }} 
                                className="w-full bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/50 hover:border-red-500 py-1.5 rounded transition-all text-xs font-bold uppercase tracking-wide"
                            >
                                {blacklistedTilesSet.has(activeTilePopup.key) ? 'Débloquer' : 'Blacklister'}
                            </button>
                        </div>
                    )}
                </div>
            </Popup>
        )}
      </MapContainer>
    </div>
  );
}

// --- SOUS-COMPOSANTS UI ---
const StatBox = ({ label, value, potentialLabel, color, icon, onClick, isInteractive }: any) => {
    const colorClasses: any = { cyan: 'text-cyan-400 border-cyan-500/10', yellow: 'text-yellow-400 border-yellow-500/10', purple: 'text-[#d04fd7] border-[#d04fd7]/10', emerald: 'text-emerald-400 border-emerald-500/10', };
    return (
        <div onClick={onClick} className={`bg-[#1a1a20] p-2 rounded-xl border ${colorClasses[color]} flex flex-col justify-between h-[50px] ${isInteractive ? 'cursor-pointer hover:bg-[#202028] transition-colors group' : ''}`}>
            <div className="text-base font-bold tabular-nums leading-none tracking-tight text-white flex justify-between items-center">
                <span className="flex items-center gap-1">
                    {value}
                    {potentialLabel && <span className="text-[10px] text-gray-400 font-normal">{potentialLabel}</span>}
                </span>
                {isInteractive && <Focus size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />}
            </div>
            <div className={`flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wide ${colorClasses[color].split(' ')[0]}`}>{icon} {label}</div>
        </div>
    );
};

const ToggleButton = ({ isActive, onClick, label, color, icon: Icon, disabled }: any) => {
    const activeClass = { cyan: 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400', yellow: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400', purple: 'bg-[#d04fd7]/10 border-[#d04fd7]/50 text-[#d04fd7]', fuchsia: 'bg-[#d04fd7]/10 border-[#d04fd7]/50 text-[#d04fd7]', orange: 'bg-orange-500/10 border-orange-500/50 text-orange-400', white: 'bg-white/10 border-white/50 text-white', red: 'bg-red-500/10 border-red-500/50 text-red-400', }[color as string];
    return (
        <button onClick={!disabled ? onClick : undefined} className={`cursor-pointer flex items-center justify-center gap-2 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-200 border uppercase ${disabled ? 'opacity-40 cursor-not-allowed bg-transparent border-white/5 text-gray-600' : isActive ? activeClass : 'bg-transparent border-white/5 text-gray-500 hover:border-white/20 hover:text-white'}`}>
            <Icon size={12} /> {label}
        </button>
    );
};