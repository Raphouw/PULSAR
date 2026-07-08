'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { getTilesFromPolyline, getTileBounds, lon2tile, lat2tile, getTilesInBounds, getTileCenter } from '../../lib/mapUtils';
import { calculateMaxSquare, getSquareTiles, calculateTotalArea, findTopClusters, getFutureTargets, getSquareAt, getValidDiagonalTargets } from '../../lib/gridAlgo';
import { Layers, Maximize, Eye, Grid, Activity, Target, Map as MapIcon, CheckSquare, Calendar, Focus, Crosshair, ArrowRightLeft, MoveVertical, Scan, ArrowUpRight, ShieldAlert, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });

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

function formatLastVisitDate(dateString?: string) {
    if (!dateString) return '';
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

function getTimeSince(dateString?: string) {
    if (!dateString) return '';
    const now = new Date();
    const past = new Date(dateString);

    let years = now.getFullYear() - past.getFullYear();
    let months = now.getMonth() - past.getMonth();
    let days = now.getDate() - past.getDate();

    if (days < 0) {
        months--;
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    const parts: string[] = [];
    if (years > 0) parts.push(`${years} an${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} mois`);
    if (days > 0) parts.push(`${days} jour${days > 1 ? 's' : ''}`);

    if (parts.length === 0) return "Aujourd'hui";
    return `Il y a ${parts.join(', ')}`;
}


// --- COMPOSANT : PINCEAU SYNCHRONE + MACHINE A ETATS MANUELLE + SHIFT CLIC ---
const MapInteractionHandler = ({ 
    blacklistMode, manualSquareStep, manualStartTile, setManualSquareStep, setManualStartTile, 
    setCustomTargetSquare, setTargetMode, setShowTargets, visitedTilesSet, blacklistedTilesSet, 
    setBlacklistedTilesSet, handleBatchBlacklist, setManualError, shiftStartTile, setShiftStartTile, 
    setActiveTilePopup, setDraftBlacklist
}: any) => {
    const map = useMap();
    const isDraggingRef = React.useRef(false);
    const dragActionRef = React.useRef<'add'|'delete'>('add');
    const dragBufferRef = React.useRef<{add: Set<string>, remove: Set<string>}>({ add: new Set(), remove: new Set() });
    const lastUiUpdateRef = React.useRef<number>(0);

    React.useEffect(() => {
        if (blacklistMode) { 
            map.dragging.disable(); map.touchZoom.disable(); 
            if (map.boxZoom) map.boxZoom.disable(); 
        } else { 
            map.dragging.enable(); map.touchZoom.enable(); 
            if (map.boxZoom) map.boxZoom.enable(); 
            setShiftStartTile(null); 
        }
        
        const stopDrag = () => {
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                const added = Array.from(dragBufferRef.current.add);
                const removed = Array.from(dragBufferRef.current.remove);
                
                if (added.length > 0 || removed.length > 0) {
                    // 1. Déclenche les calculs mathématiques lourds UNIQUEMENT à la fin du pinceau !
                    setBlacklistedTilesSet((prev: Set<string>) => {
                        const next = new Set(prev);
                        added.forEach(t => next.add(t)); removed.forEach(t => next.delete(t));
                        return next;
                    });
                    // 2. Envoie en BDD
                    if (added.length > 0) handleBatchBlacklist(added, 'add', true);
                    if (removed.length > 0) handleBatchBlacklist(removed, 'delete', true);
                }
                // 3. Reset du brouillon visuel
                dragBufferRef.current = { add: new Set(), remove: new Set() };
                setDraftBlacklist({ add: new Set(), remove: new Set() });
            }
        };

        window.addEventListener('mouseup', stopDrag); window.addEventListener('touchend', stopDrag);
        return () => { window.removeEventListener('mouseup', stopDrag); window.removeEventListener('touchend', stopDrag); };
    }, [blacklistMode, map, handleBatchBlacklist, setShiftStartTile, setBlacklistedTilesSet, setDraftBlacklist]);

    useMapEvents({
        click(e) {
            if (blacklistMode) return; // Si Pinceau activé, le clic normal est désactivé
            
            const x = lon2tile(e.latlng.lng, 14); const y = lat2tile(e.latlng.lat, 14);
            const tileKey = `${x},${y}`;

            if (manualSquareStep === 'select-start') {
                const sqSize = getSquareAt(visitedTilesSet, blacklistedTilesSet, x, y);
                if (sqSize >= 2) { setManualStartTile({ x, y }); setManualSquareStep('select-end'); } 
                else if (setManualError) { setManualError("Départ invalide."); setTimeout(() => setManualError(null), 3000); }
                return;
            }

            if (manualSquareStep === 'select-end' && manualStartTile) {
                const dx = Math.abs(x - manualStartTile.x); const dy = Math.abs(y - manualStartTile.y);
                if (dx === dy && dx > 0) {
                    const topLeftX = Math.min(x, manualStartTile.x); const topLeftY = Math.min(y, manualStartTile.y); const size = dx + 1;
                    let isValid = true; const sqTiles: string[] = [];
                    for (let i = 0; i < size; i++) {
                        for (let j = 0; j < size; j++) {
                            const checkKey = `${topLeftX + i},${topLeftY + j}`;
                            if (!visitedTilesSet.has(checkKey) || blacklistedTilesSet.has(checkKey)) isValid = false;
                            sqTiles.push(checkKey);
                        }
                    }
                    if (isValid) {
                        setCustomTargetSquare({ maxSquare: size, topLeft: { x: topLeftX, y: topLeftY, key: `${topLeftX},${topLeftY}` }, tilesSet: new Set(sqTiles) });
                        setTargetMode('square'); setShowTargets(true); setManualSquareStep('off'); setManualStartTile(null);
                        if (setManualError) setManualError(null); return;
                    }
                }
                if (setManualError) { setManualError("Diagonale invalide."); setTimeout(() => setManualError(null), 3000); }
                return; 
            }
        },
        mousedown(e) {
            if (!blacklistMode || manualSquareStep !== 'off') return;
            const original = e.originalEvent as MouseEvent;
            const x = lon2tile(e.latlng.lng, 14); const y = lat2tile(e.latlng.lat, 14); const tileKey = `${x},${y}`;

            // SHIFT CLIC
            if (original.shiftKey || shiftStartTile) {
                if (!shiftStartTile) {
                    const action = blacklistedTilesSet.has(tileKey) ? 'delete' : 'add';
                    setShiftStartTile({ x, y, action });
                } else {
                    const minX = Math.min(shiftStartTile.x, x); const maxX = Math.max(shiftStartTile.x, x);
                    const minY = Math.min(shiftStartTile.y, y); const maxY = Math.max(shiftStartTile.y, y);
                    const tilesToAdd: string[] = [];
                    for (let i = minX; i <= maxX; i++) {
                        for (let j = minY; j <= maxY; j++) {
                            const tk = `${i},${j}`;
                            if (!visitedTilesSet.has(tk)) tilesToAdd.push(tk);
                        }
                    }
                    if (tilesToAdd.length > 0) {
                        setBlacklistedTilesSet((prev: Set<string>) => {
                            const next = new Set(prev);
                            tilesToAdd.forEach(t => shiftStartTile.action === 'add' ? next.add(t) : next.delete(t));
                            return next;
                        });
                        handleBatchBlacklist(tilesToAdd, shiftStartTile.action, true);
                    }
                    setShiftStartTile(null); 
                }
                return;
            }

            // DÉBUT PINCEAU NORMAL
            if (!visitedTilesSet.has(tileKey)) {
                isDraggingRef.current = true;
                dragActionRef.current = blacklistedTilesSet.has(tileKey) ? 'delete' : 'add';
                
                if (dragActionRef.current === 'add') dragBufferRef.current.add.add(tileKey);
                else dragBufferRef.current.remove.add(tileKey);

                setDraftBlacklist({ add: new Set(dragBufferRef.current.add), remove: new Set(dragBufferRef.current.remove) });
                lastUiUpdateRef.current = Date.now();
            }
        },
        mousemove(e) {
            if (!blacklistMode || !isDraggingRef.current) return; 
            const x = lon2tile(e.latlng.lng, 14); const y = lat2tile(e.latlng.lat, 14); const tileKey = `${x},${y}`;
            
            if (!visitedTilesSet.has(tileKey) && !dragBufferRef.current.add.has(tileKey) && !dragBufferRef.current.remove.has(tileKey)) {
                if (dragActionRef.current === 'add') dragBufferRef.current.add.add(tileKey);
                else dragBufferRef.current.remove.add(tileKey);
                
                const now = Date.now();
                // BATCH VISUEL UNIQUEMENT (Ne déclenche pas le God-useMemo)
                if (now - lastUiUpdateRef.current > 50) { 
                    setDraftBlacklist({ add: new Set(dragBufferRef.current.add), remove: new Set(dragBufferRef.current.remove) });
                    lastUiUpdateRef.current = now;
                }
            }
        }
    });
    return null;
};


// --- COMPOSANT : TRACKER DE VUE (Score & Grille Globale) ---
const ViewportTracker = ({ onBoundsChange }: { onBoundsChange: (bounds: any) => void }) => {
    const map = useMapEvents({
        moveend: () => onBoundsChange(map.getBounds()),
        zoomend: () => onBoundsChange(map.getBounds()),
    });
    
    React.useEffect(() => {
        onBoundsChange(map.getBounds());
    }, [map, onBoundsChange]);
    
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

// --- COMPOSANT : GEOLOCALISATION EN DIRECT ---
const LocationMarker = () => {
    const [position, setPosition] = useState<LatLngTuple | null>(null);
    const map = useMapEvents({
        locationfound(e) { setPosition([e.latlng.lat, e.latlng.lng]); }
    });
    useEffect(() => { map.locate({ watch: true }); }, [map]);

    return position === null ? null : (
        <CircleMarker center={position} radius={6} pathOptions={{ fillColor: '#00f3ff', fillOpacity: 0.8, weight: 0 }} />
    );
};
// --- COMPOSANT : TUILE MEMOÏSÉE (Performance 60fps) ---
const MemoizedRectangle = React.memo(({ bounds, color, weight, opacity, fillOpacity, className, tileKey, isVisited, onInteract }: any) => {
    return (
        <Rectangle 
            bounds={bounds} 
            pathOptions={{ color, weight, opacity, fillColor: color, fillOpacity, className }}
            interactive={true}
            eventHandlers={{
                click: () => onInteract(tileKey, isVisited, bounds)
            }}
        />
    );
}, (prevProps, nextProps) => {
    return prevProps.color === nextProps.color && 
           prevProps.className === nextProps.className &&
           prevProps.weight === nextProps.weight &&
           prevProps.fillOpacity === nextProps.fillOpacity &&
           prevProps.opacity === nextProps.opacity;
});


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
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  
  const [hudOpen, setHudOpen] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [dimMap, setDimMap] = useState(true); 
  const [targetMode, setTargetMode] = useState<'square' | 'cluster'>('cluster'); 
  const [activeSquareRank, setActiveSquareRank] = useState<number>(0); 
  const [activeClusterRank, setActiveClusterRank] = useState<number>(0);
  const [manualSquareStep, setManualSquareStep] = useState<'off' | 'select-start' | 'select-end'>('off');
  const [manualStartTile, setManualStartTile] = useState<{x: number, y: number} | null>(null);
  const [customTargetSquare, setCustomTargetSquare] = useState<{topLeft: any, maxSquare: number, tilesSet: Set<string>} | null>(null);
  const [customSquareMode, setCustomSquareMode] = useState(false);
  const [shiftStartTile, setShiftStartTile] = useState<{x: number, y: number, action: 'add' | 'delete'} | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [draftBlacklist, setDraftBlacklist] = useState<{add: Set<string>, remove: Set<string>}>({ add: new Set(), remove: new Set() });
  const [showTimeHeatmap, setShowTimeHeatmap] = useState(false);

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

    // -- ETAT GRILLE GLOBALE & SCORE --
  const [showGlobalGrid, setShowGlobalGrid] = useState(false);
  const [viewportTiles, setViewportTiles] = useState<string[]>([]);
  const [viewportScore, setViewportScore] = useState<number>(0);

  // -- CALCUL DYNAMIQUE DU SCORE (À placer juste avant le useMemo des "gridRectangles") --


  // -- ETAT ZOOM & POPUP --
  const [zoomTarget, setZoomTarget] = useState<{ bounds: LatLngBoundsExpression, id: number } | null>(null);
  const [activeTilePopup, setActiveTilePopup] = useState<{ key: string, bounds: LatLngBoundsExpression, position: LatLngTuple } | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  // --- ACTIONS ZOOM ---
  const triggerZoom = (bounds: LatLngBoundsExpression | null) => {
      if (bounds) setZoomTarget({ bounds, id: Date.now() });
  };

  // --- ACTIONS BLACKLIST API ---
  const handleBatchBlacklist = async (tileKeys: string[], action: 'add' | 'delete', skipUi = false) => {
    if (!tileKeys || tileKeys.length === 0) return;

    if (!skipUi) {
        setBlacklistedTilesSet(prev => {
            const next = new Set(prev);
            tileKeys.forEach(key => {
                if (action === 'add') next.add(key);
                else next.delete(key);
            });
            return next;
        });
    }

    try {
        if (action === 'add') {
            const inserts = tileKeys.map(key => ({ user_id: userId, tile_key: key }));
            // L'UPSERT EMPÊCHE L'ERREUR 409 SI LA TUILE EXISTE DÉJÀ :
            await supabase.from('blacklisted_tiles').upsert(inserts, { onConflict: 'user_id, tile_key' });
        } else {
            await supabase.from('blacklisted_tiles').delete().eq('user_id', userId).in('tile_key', tileKeys);
        }
    } catch (err) {
        console.error("Erreur Supabase:", err);
    }
  };

  // --- VERSION UNITAIRE MISE À JOUR (POUR LE CLIC SOLO) ---
  const toggleBlacklistTile = async (tileKey: string, e?: any, forceAdd: boolean = false) => {
    if (e && e.stopPropagation) e.stopPropagation();
    
    const isBlacklisted = blacklistedTilesSet.has(tileKey);
    if (isBlacklisted && !forceAdd) {
        await handleBatchBlacklist([tileKey], 'delete');
    } else if (!isBlacklisted) {
        await handleBatchBlacklist([tileKey], 'add');
    }
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
      currentMaxSquareBounds, clusterBounds, tileVisitCounts,
      topClusters, effectiveSquare, tileLastVisit // <-- AJOUTE tileLastVisit ICI
  } = useMemo(() => {
    const tiles = new Set<string>();
    const tileCounts = new Map<string, number>();
    const lastVisitMap = new Map<string, string>(); // <-- NOUVELLE MAP
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    filteredActivities.forEach(act => {
      if (act.polyline) {
        try {
           const actTiles = getTilesFromPolyline(act.polyline);
           const actTimestamp = new Date(act.start_time).getTime(); // <-- LECTURE DU TEMPS

           actTiles.forEach(t => {
             if (blacklistedTilesSet.has(t)) toggleBlacklistTile(t); 

             tiles.add(t);
             tileCounts.set(t, (tileCounts.get(t) || 0) + 1);

             // <-- AJOUT : STOCKER LA DATE LA PLUS RÉCENTE
             const existingDate = lastVisitMap.get(t);
             if (!existingDate || actTimestamp > new Date(existingDate).getTime()) {
                 lastVisitMap.set(t, act.start_time);
             }

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
    const effectiveSquare = customTargetSquare || activeSq; // LE CARRÉ CIBLE (Manuel ou Auto)
    const area = calculateTotalArea(tiles);
    
    // --- TOP CLUSTERS ---
    const topClusters = findTopClusters(tiles, blacklistedTilesSet, 5);
    const clusterSet = topClusters[activeClusterRank] || new Set<string>();
    
    // Bounds du carré ACTIF
    let msBounds: LatLngBoundsExpression | null = null;
    if (effectiveSquare && effectiveSquare.maxSquare > 0 && effectiveSquare.topLeft) {
        const rawTL = effectiveSquare.topLeft as any;
        const msX = typeof rawTL === 'string' ? Number(rawTL.split(',')[0]) : rawTL.x;
        const msY = typeof rawTL === 'string' ? Number(rawTL.split(',')[1]) : rawTL.y;
        msBounds = [getTileBounds(msX, msY, 14)[0], getTileBounds(msX + effectiveSquare.maxSquare - 1, msY + effectiveSquare.maxSquare - 1, 14)[1]];
    }

    // Bounds Cluster
    let clBounds: LatLngBoundsExpression | null = null;
    let cMinX = Infinity, cMinY = Infinity, cMaxX = -Infinity, cMaxY = -Infinity;
    if (clusterSet.size > 0) {
        clusterSet.forEach(k => {
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

    // 3. FILLING (Basé sur le cluster actif)
    const fillingSet = new Set<string>();
    if (clusterSet.size > 0) {
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
                if (!clusterSet.has(nKey) && !outsideSet.has(nKey)) {
                    outsideSet.add(nKey);
                    queue.push(nKey);
                }
            }
        }
        for (let x = cMinX; x <= cMaxX; x++) {
            for (let y = cMinY; y <= cMaxY; y++) {
                const key = `${x},${y}`;
                if (!clusterSet.has(key) && !outsideSet.has(key)) {
                    fillingSet.add(key);
                }
            }
        }
    }

    // 4. CIBLES 
    const sqTargets = effectiveSquare && effectiveSquare.topLeft 
        ? getFutureTargets(tiles, blacklistedTilesSet, effectiveSquare.topLeft, effectiveSquare.maxSquare, 10, !!customTargetSquare) 
        : new Map();

    const clTargets = new Map<string, number>();
    let currentLevelTiles = new Set<string>(clusterSet);
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
        visitedTilesSet: tiles, boundsArea: globalBounds, topSquares: calculatedTopSquares, topClusters,
        totalArea: area, clusterSet: clusterSet, squareTargetsMap: sqTargets, 
        clusterTargetsMap: clTargets, fillingTilesSet: fillingSet, coreTilesSet: coreSet,
        currentMaxSquareBounds: msBounds, clusterBounds: clBounds,
        tileVisitCounts: tileCounts, effectiveSquare,
        tileLastVisit: lastVisitMap //
    };
  }, [filteredActivities, activeSquareRank, activeClusterRank, customTargetSquare, blacklistedTilesSet]);

    const handleViewportChange = React.useCallback((bounds: any) => {
      const currentTiles = getTilesInBounds(bounds, 14);
      setViewportTiles(currentTiles);
      
      if (currentTiles.length > 0) {
          let exploredCount = 0;
          currentTiles.forEach(t => {
              if (visitedTilesSet.has(t)) exploredCount++;
          });
          setViewportScore((exploredCount / currentTiles.length) * 100);
      } else {
          setViewportScore(0);
      }
  }, [visitedTilesSet]);


  const currentMaxSquare = topSquares[activeSquareRank] || topSquares[0];

  // --- HELPERS DE SECURITE ---
  const cancelManualMode = () => {
      setManualSquareStep('off');
      setManualStartTile(null);
      setCustomTargetSquare(null);
  };

  // --- HANDLERS ---
  const handleModeSwitch = (mode: 'square' | 'cluster') => {
      cancelManualMode();
      setTargetMode(mode);
      if (mode === 'square') {
          setShowTargets(true); setShowFilling(false); setActiveTargetLevels(new Set([1])); 
          if (currentMaxSquareBounds) triggerZoom(currentMaxSquareBounds);
      } else {
          if (clusterBounds) triggerZoom(clusterBounds);
      }
  };


  
  const toggleMaxSquare = () => {
      cancelManualMode();
      const newState = !showMaxSquare; setShowMaxSquare(newState);
      if (newState && currentMaxSquareBounds) triggerZoom(currentMaxSquareBounds);
  };

  const toggleCluster = () => {
      cancelManualMode();
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

  const cycleSquareRank = (e: React.MouseEvent, action: 'prev' | 'next' | number) => {
      e.stopPropagation(); 
      cancelManualMode();
      let nextRank = activeSquareRank;
      const maxLen = Math.min(topSquares.length, 5);
      if (action === 'prev') nextRank = (activeSquareRank - 1 + maxLen) % maxLen;
      else if (action === 'next') nextRank = (activeSquareRank + 1) % maxLen;
      else nextRank = action as number;
      setActiveSquareRank(nextRank);
      if (targetMode !== 'square') { setTargetMode('square'); setShowTargets(true); setShowFilling(false); }
  };

  const cycleClusterRank = (e: React.MouseEvent, action: 'prev' | 'next' | number) => {
      e.stopPropagation(); 
      cancelManualMode();
      let nextRank = activeClusterRank;
      const maxLen = topClusters.length;
      if (action === 'prev') nextRank = (activeClusterRank - 1 + maxLen) % maxLen;
      else if (action === 'next') nextRank = (activeClusterRank + 1) % maxLen;
      else nextRank = action as number;
      setActiveClusterRank(nextRank);
      if (targetMode !== 'cluster') { setTargetMode('cluster'); setShowTargets(false); setShowFilling(true); }
  };

  useEffect(() => {
      if (targetMode === 'square' && showMaxSquare && currentMaxSquareBounds) triggerZoom(currentMaxSquareBounds);
  }, [activeSquareRank]);

  // FIX ZOOM CLUSTER : Ne se déclenche QUE quand le rang change explicitement
  useEffect(() => {
      if (targetMode === 'cluster' && showCluster && clusterBounds) {
          triggerZoom(clusterBounds);
      }
  }, [activeClusterRank]);

  const handleTargetRange = (level: number) => {
      const newSet = new Set<number>();
      for (let i = 1; i <= level; i++) newSet.add(i);
      setActiveTargetLevels(newSet);

      const tilesToZoom = new Set<string>();
      if (targetMode === 'square') {
          // UTILISE effectiveSquare AU LIEU DE currentMaxSquare :
          if (effectiveSquare) effectiveSquare.tilesSet.forEach((t: string) => tilesToZoom.add(t));
          squareTargetsMap.forEach((lvl, key) => { if (lvl <= level) tilesToZoom.add(key); });
      } else {
          clusterSet.forEach(t => tilesToZoom.add(t));
          clusterTargetsMap.forEach((lvl, key) => { if (lvl <= level) tilesToZoom.add(key); });
      }
      const bounds = getBoundsFromTiles(tilesToZoom);
      if (bounds) triggerZoom(bounds);
  };

  const handleTileInteraction = React.useCallback((tileKey: string, isVisited: boolean, bounds: LatLngBoundsExpression) => {
      if (manualSquareStep !== 'off') return; 
      if (blacklistMode && !isVisited) {
          // Rien ici, c'est mousedown qui gère maintenant
      } else {
          const [x, y] = tileKey.split(',').map(Number);
          const center = getTileCenter(x, y, 14);
          setActiveTilePopup({ key: tileKey, bounds, position: center as LatLngTuple });
      }
  }, [manualSquareStep, blacklistMode, setActiveTilePopup]);

  const handleManualSquareSelection = (x: number, y: number) => {
      const tileKey = `${x},${y}`;
      if (visitedTilesSet.has(tileKey)) {
          const sqSize = getSquareAt(visitedTilesSet, blacklistedTilesSet, x, y);
          if (sqSize >= 2) {
              const sqTiles = getSquareTiles({ x, y, key: tileKey }, sqSize);
              setCustomTargetSquare({
                  maxSquare: sqSize,
                  topLeft: { x, y, key: tileKey },
                  tilesSet: new Set(sqTiles)
              });
              setTargetMode('square');
              setShowTargets(true);
          }
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

  const validDiagonalTargetsSet = useMemo(() => {
      if (manualSquareStep === 'select-end' && manualStartTile) {
          const targets = getValidDiagonalTargets(visitedTilesSet, blacklistedTilesSet, manualStartTile.x, manualStartTile.y);
          return new Set(targets.map(t => `${t.x},${t.y}`));
      }
      return new Set<string>();
  }, [manualSquareStep, manualStartTile, visitedTilesSet, blacklistedTilesSet]);

  const validStartTilesSet = useMemo(() => {
      if (manualSquareStep !== 'select-start') return new Set<string>();
      const valid = new Set<string>();
      visitedTilesSet.forEach(t => {
          const [x, y] = t.split(',').map(Number);
          const sqSize = getSquareAt(visitedTilesSet, blacklistedTilesSet, x, y);
          if (sqSize >= 2) valid.add(t); // Ne s'allume en vert que si un carré 2x2 minimum est possible
      });
      return valid;
  }, [manualSquareStep, visitedTilesSet, blacklistedTilesSet]);


const timeBounds = useMemo(() => {
      if (!showTimeHeatmap || viewportTiles.length === 0) return { min: 0, max: 0, diff: 1 };
      
      let min = Infinity;
      let max = -Infinity;
      
      viewportTiles.forEach(t => {
          if (visitedTilesSet.has(t) && tileLastVisit.has(t)) {
              const time = new Date(tileLastVisit.get(t)!).getTime();
              if (time < min) min = time;
              if (time > max) max = time;
          }
      });
      
      if (min === Infinity) return { min: 0, max: 0, diff: 1 };
      
      // Si toutes les tuiles ont la même date, diff = 1 pour éviter la division par zéro
      return { min, max, diff: min === max ? 1 : max - min };
  }, [showTimeHeatmap, viewportTiles, visitedTilesSet, tileLastVisit]);



  // --- RENDU RECTANGLES ---
  const gridRectangles = useMemo(() => {
    const ZOOM = 14;
    const currentTargetsMap = targetMode === 'square' ? squareTargetsMap : clusterTargetsMap;

    // --- CALCUL DE L'ÉCHELLE TEMPORELLE DYNAMIQUE ---
    let minTime = Infinity;
    let maxTime = -Infinity;

    if (showTimeHeatmap) {
        // On cherche les dates extrêmes uniquement dans ce qu'on voit à l'écran
        viewportTiles.forEach(t => {
            if (visitedTilesSet.has(t) && tileLastVisit.has(t)) {
                const time = new Date(tileLastVisit.get(t)!).getTime();
                if (time < minTime) minTime = time;
                if (time > maxTime) maxTime = time;
            }
        });
        // Sécurité si tout est vide ou si toutes les tuiles ont la même date
        if (minTime === Infinity) { minTime = 0; maxTime = 1; }
        if (minTime === maxTime) { minTime -= 1000; maxTime += 1000; }
    }

    const allKeysToRender = new Set([
        ...Array.from(visitedTilesSet), 
        ...Array.from(currentTargetsMap.keys()),
        ...(showFilling && targetMode === 'cluster' ? Array.from(fillingTilesSet) : []),
        ...Array.from(blacklistedTilesSet),
        ...(showGlobalGrid ? viewportTiles : []),
        ...(shiftStartTile ? [`${shiftStartTile.x},${shiftStartTile.y}`] : []),
        ...Array.from(validStartTilesSet),
        ...Array.from(validDiagonalTargetsSet) 
    ]);

    return Array.from(allKeysToRender).map(tileKey => {
      const isVisited = visitedTilesSet.has(tileKey);
      const isCore = showCore && coreTilesSet.has(tileKey);
      const targetLevel = currentTargetsMap.get(tileKey);
      const isTargetVisible = showTargets && targetLevel !== undefined && activeTargetLevels.has(targetLevel!);
      const isFilling = showFilling && fillingTilesSet.has(tileKey) && targetMode === 'cluster';

      let isBlacklisted = blacklistedTilesSet.has(tileKey);
      if (draftBlacklist.add.has(tileKey)) isBlacklisted = true;
      if (draftBlacklist.remove.has(tileKey)) isBlacklisted = false;

      const isGlobalGridOnly = showGlobalGrid && !isVisited && !isTargetVisible && !isFilling && !isBlacklisted;
      
      const [x, y] = tileKey.split(',').map(Number);
      const bounds = getTileBounds(x, y, ZOOM);
      const isShiftStart = blacklistMode && shiftStartTile && shiftStartTile.x === x && shiftStartTile.y === y; 
      
      const isCustomSquare = customTargetSquare?.tilesSet.has(tileKey);
      const isMaxSquare = !isCustomSquare && isVisited && showMaxSquare && effectiveSquare?.tilesSet.has(tileKey);
      const isManualStart = manualSquareStep === 'select-end' && manualStartTile?.x === x && manualStartTile?.y === y;
      const isPossibleTarget = manualSquareStep === 'select-end' && validDiagonalTargetsSet.has(tileKey); 
      const isManualStartOption = manualSquareStep === 'select-start' && validStartTilesSet.has(tileKey);
      const isCluster = isVisited && showCluster && !isMaxSquare && clusterSet.has(tileKey);

      if ((!isVisited || !showGrid) && !isTargetVisible && !isFilling && !isBlacklisted && !isGlobalGridOnly && !isManualStartOption && !isPossibleTarget && !isManualStart) return null;

      let color = '#00f3ff', weight = 1, className = 'tile-base', fillOpacity = 0.12, opacity = 0.4;

      // --- OVERRIDE TEMPOREL ---
      if (showTimeHeatmap && isVisited) {
          const time = new Date(tileLastVisit.get(tileKey)!).getTime();
          let ratio = (time - timeBounds.min) / timeBounds.diff;
          ratio = Math.max(0, Math.min(1, ratio)); 

          const hue = 280 - (ratio * 120); 
          const lightness = 25 + (ratio * 45);
          
          color = `hsl(${hue}, 100%, ${lightness}%)`;
          weight = 1;
          className = 'tile-time';
          fillOpacity = 0.75; 
          opacity = 0.8;

          // Surlignage des extrêmes (si on a plus d'une seule date à l'écran)
          if (timeBounds.diff > 1) {
              if (time === timeBounds.max) className = 'tile-time-newest';
              else if (time === timeBounds.min) className = 'tile-time-oldest';
          }
      }
      // --- STYLES NORMAUX ---
      else if (isBlacklisted) { color = '#000000'; weight = 1; className = 'tile-blacklisted'; fillOpacity = 0.6; opacity = 0.8; }
      else if (isShiftStart) { color = shiftStartTile.action === 'delete' ? '#ffffff' : '#ff0055'; weight = 3; className = 'tile-shift-start'; fillOpacity = 0.5; opacity = 1; }
      else if (isCustomSquare) { color = '#39ff14'; weight = 3; className = 'tile-custom-square'; fillOpacity = 0.4; opacity = 1; }
      else if (isManualStartOption || isPossibleTarget) { color = '#39ff14'; weight = 3; className = 'tile-possible-target'; fillOpacity = 0.5; opacity = 1; }
      else if (isManualStart) { color = '#39ff14'; weight = 2; className = 'tile-manual-start'; fillOpacity = 0.8; opacity = 1; }
      else if (isGlobalGridOnly) { color = '#ffffff'; weight = 1; className = 'tile-global-grid'; fillOpacity = 0.02; opacity = 0.15; }
      else if (isFilling) { color = '#f97316'; weight = 2; className = 'tile-glitch'; fillOpacity = 0.4; opacity = 1; }
      else if (isTargetVisible && targetLevel) { color = TARGET_COLORS[Math.min(Math.max(targetLevel - 1, 0), 9)]; weight = targetLevel === 1 ? 2 : 1; className = targetLevel === 1 ? 'tile-target-urgent' : 'tile-neon'; fillOpacity = 0.4; opacity = 0.9; }
      else if (isMaxSquare) { color = '#ffd700'; weight = 3; className = 'tile-max-square'; fillOpacity = 0.5; opacity = 1; } 
      else if (isVisited) {
          if (isCore) { color = '#ffffff'; fillOpacity = 0.8; opacity = 1; weight = 2; className = 'tile-core'; } 
          else if (isCluster) { color = '#d04fd7'; weight = 1; className = 'tile-cluster'; fillOpacity = 0.25; opacity = 0.6; } 
      }

      return (
        <MemoizedRectangle 
          key={tileKey} tileKey={tileKey} bounds={bounds} color={color} weight={weight}
          opacity={opacity} fillOpacity={fillOpacity} className={className} isVisited={isVisited}
          onInteract={handleTileInteraction}
        />
      );
    });
  }, [
      visitedTilesSet, blacklistedTilesSet, draftBlacklist, squareTargetsMap, clusterTargetsMap, 
      fillingTilesSet, coreTilesSet, showGrid, showMaxSquare, showCluster, showFilling, showCore, 
      showTargets, activeTargetLevels, targetMode, currentMaxSquare, blacklistMode, showGlobalGrid, 
      viewportTiles, shiftStartTile, manualSquareStep, manualStartTile, validDiagonalTargetsSet, 
      validStartTilesSet, effectiveSquare, handleTileInteraction, 
      showTimeHeatmap, tileLastVisit // <-- N'OUBLIE PAS CES DEUX NOUVELLES DEPENDANCES
  ]);
  if (!isMounted) return <div className="h-screen bg-[#050505] flex items-center justify-center text-[#d04fd7] animate-pulse font-sans tracking-widest text-xl">Chargement de la map ..</div>;

  const isFillingDisabled = !showCluster || targetMode === 'square';

  return (
    <div className={`relative w-full h-[calc(100vh-0px)] overflow-hidden bg-[#050505] ${dimMap ? 'dimmed-mode' : ''} ${blacklistMode ? 'cursor-crosshair' : ''}`}>
      
      <style jsx global>{`
        .dimmed-mode .leaflet-tile-pane { filter: brightness(0.6) contrast(1.2) grayscale(0.8) invert(1) hue-rotate(180deg); }
        .tile-base { transition: all 0.2s; }
        .tile-base:hover { fill-opacity: 0.5 !important; stroke: #fff !important; stroke-width: 2px !important; }
        /* Remplacement du rouge par un noir translucide propre */
        .tile-blacklisted { stroke: rgba(255, 60, 60, 0.4) !important; stroke-width: 1px !important; fill: #000 !important; stroke-dasharray: none; }
        .tile-global-grid { stroke: rgba(255, 255, 255, 0.15) !important; stroke-width: 1px !important; fill: #fff !important; pointer-events: none; }
        
        /* Glassmorphism Popup */
        .custom-dark-popup .leaflet-popup-content-wrapper {
            background: rgba(18, 18, 23, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 1rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
            padding: 0;
        }
        .custom-dark-popup .leaflet-popup-content { margin: 0; padding: 1.25rem; font-family: ui-sans-serif, system-ui, sans-serif; }
        .custom-dark-popup .leaflet-popup-tip { background: rgba(18, 18, 23, 0.85); border-bottom: 1px solid rgba(255, 255, 255, 0.08); border-right: 1px solid rgba(255, 255, 255, 0.08); backdrop-filter: blur(16px); }
        .tile-max-square { animation: pulse-gold 3s infinite alternate; z-index: 50; }
        .tile-cluster { animation: breathe-purple 5s ease-in-out infinite; }
        .tile-target-urgent { animation: flash-red 1s infinite alternate; }
        .tile-glitch { animation: glitch-flash 0.5s infinite; }
        .tile-interactive-grid { stroke-dasharray: 2 4; transition: all 0.2s; }
        .tile-interactive-grid:hover { fill-opacity: 0.1 !important; stroke: #ff0055 !important; stroke-opacity: 0.8 !important; }
        .tile-core { stroke: #fff !important; stroke-width: 2px !important; fill: #fff !important; fill-opacity: 0.8 !important; z-index: 200 !important; }
        .tile-shift-start { stroke: #ff0055 !important; stroke-dasharray: 4 4; animation: flash-red 1s infinite alternate; z-index: 400 !important; }
        .tile-time-newest { stroke: #ffffff !important; stroke-width: 3px !important; animation: pulse-white 1.5s infinite alternate; z-index: 500 !important; }
        .tile-time-oldest { stroke: #ff003c !important; stroke-width: 3px !important; stroke-dasharray: 4 4; z-index: 400 !important; }
        @keyframes pulse-white { from { stroke-opacity: 0.4; } to { stroke-opacity: 1; filter: drop-shadow(0 0 4px #fff); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .tile-custom-square { stroke: #39ff14 !important; animation: pulse-green 3s infinite alternate; z-index: 50; }
        .tile-manual-start { stroke-dasharray: 4 4; animation: flash-green 1s infinite alternate; z-index: 100; }
        @keyframes flash-green { from { fill-opacity: 0.3; stroke-opacity: 0.8; } to { fill-opacity: 0.6; stroke-opacity: 1; } }
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

        .tile-manual-start { stroke: #39ff14 !important; stroke-dasharray: 4 4; animation: flash-green 1s infinite alternate; z-index: 400 !important; }
        .tile-possible-target { stroke: #39ff14 !important; fill: #39ff14 !important; stroke-dasharray: 4 4; fill-opacity: 0.5 !important; animation: pulse-green 1.5s infinite alternate; cursor: crosshair; z-index: 300 !important; }
        @keyframes pulse-green { from { fill-opacity: 0.2; } to { fill-opacity: 0.5; } }
        @keyframes flash-green { from { fill-opacity: 0.3; stroke-opacity: 0.8; } to { fill-opacity: 0.6; stroke-opacity: 1; } }
        @keyframes pulse-yellow { from { fill-opacity: 0.1; } to { fill-opacity: 0.4; } }

        @keyframes pulse-gold { from { fill-opacity: 0.4; stroke-opacity: 0.8; } to { fill-opacity: 0.7; stroke-opacity: 1; } }
        @keyframes breathe-purple { 0%, 100% { fill-opacity: 0.2; } 50% { fill-opacity: 0.4; } }
        @keyframes flash-red { from { fill-opacity: 0.2; stroke: #ff003c; } to { fill-opacity: 0.6; stroke: #fff; } }
        @keyframes glitch-flash { 0% { fill-opacity: 0.4; stroke: #f97316; } 50% { fill-opacity: 0.8; stroke: #fff; } 100% { fill-opacity: 0.4; stroke: #f97316; } }
        @keyframes hatch-red { 0% { fill-opacity: 0.3; stroke-opacity: 0.6; } 50% { fill-opacity: 0.5; stroke-opacity: 1; } 100% { fill-opacity: 0.3; stroke-opacity: 0.6; } }
      `}</style>

      {/* --- HUD RESPONSIVE : FLOATING ISLANDS & BOTTOM DRAWER --- */}
      <div className={`absolute z-[1000] flex flex-col gap-4 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          md:top-6 md:left-6 md:w-[320px] md:bottom-auto md:translate-y-0
          left-0 right-0 bottom-0 w-full ${hudOpen ? 'translate-y-0' : 'translate-y-[calc(100%-40px)] md:translate-y-0'}
          max-h-[calc(100vh-2rem)] md:pointer-events-none`}>
        
        {/* Mobile Swipe Handle */}
        <div 
            onClick={() => setHudOpen(!hudOpen)} 
            className="md:hidden w-full flex justify-center pb-3 pt-5 bg-gradient-to-t from-[#121217]/90 to-transparent pointer-events-auto cursor-pointer"
        >
            <div className="w-12 h-1.5 bg-white/30 rounded-full shadow-lg"></div>
        </div>

        <div className="overflow-y-auto no-scrollbar pointer-events-none space-y-4 px-4 md:px-0 pb-6 md:pb-0">
            
            {/* PANEL 1 : STATS & SCORE */}
            <div className="bg-[#121217]/70 backdrop-blur-2xl border border-white/10 p-4 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-auto transition-all">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-[#d04fd7]/10 border border-[#d04fd7]/20 text-[#d04fd7]">
                            <Grid size={18} />
                        </div>
                        <h2 className="text-sm font-semibold text-white tracking-wide">PULSAR STATS</h2>
                    </div>
                    {/* LE SCORE DE LA ZONE ICI */}
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Score Zone</span>
                        <span className="text-sm font-black text-[#00f3ff]">{viewportScore.toFixed(1)}%</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <StatBox label="Exploration" value={visitedTilesSet.size} potentialLabel={selectionStats.count > 0 ? `(+${selectionStats.count})` : null} color="cyan" icon={<CheckSquare size={12}/>} />
                    
                    {/* Max Square avec Override Custom */}
                    <div onClick={() => currentMaxSquareBounds && triggerZoom(currentMaxSquareBounds)} className={`p-2.5 rounded-2xl border flex flex-col justify-between h-[55px] cursor-pointer transition-colors group relative ${customTargetSquare ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20' : 'bg-white/5 border-yellow-500/10 hover:bg-white/10'}`}>
                        <div className="text-[15px] font-black tabular-nums leading-none tracking-tight text-white flex justify-between items-center">
                            <span className="flex items-center gap-1">
                                {effectiveSquare?.maxSquare || 0}x{effectiveSquare?.maxSquare || 0}
                                {targetMode === 'square' && selectionStats.count > 0 && (
                                    <span className="text-[10px] text-gray-400 font-normal ml-1">
                                        ({(effectiveSquare?.maxSquare || 0) + Math.max(0, ...Array.from(activeTargetLevels))}x{(effectiveSquare?.maxSquare || 0) + Math.max(0, ...Array.from(activeTargetLevels))})
                                    </span>
                                )}
                            </span>
                            
                            {manualSquareStep !== 'off' || customTargetSquare ? (
                                <button onClick={(e) => { e.stopPropagation(); cancelManualMode(); }} className="p-1 -m-1 text-emerald-400 hover:text-white transition-colors z-10" title="Annuler ciblage manuel"><X size={16} /></button>
                            ) : (
                                <div className="flex gap-1.5 p-1 -m-1 items-center z-10">
                                    <button onClick={(e) => cycleSquareRank(e, 'prev')} className="hover:text-white text-gray-500 transition-colors"><ChevronLeft size={14}/></button>
                                    <div className="flex gap-0.5 cursor-alias hover:scale-110 transition-transform">
                                        {[0,1,2,3,4].map(i => <div key={i} onClick={(e) => cycleSquareRank(e, i)} className={`w-1.5 h-1.5 rounded-full ${activeSquareRank === i ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' : 'bg-gray-600'}`} />)}
                                    </div>
                                    <button onClick={(e) => cycleSquareRank(e, 'next')} className="hover:text-white text-gray-500 transition-colors"><ChevronRight size={14}/></button>
                                </div>
                            )}
                        </div>
                        <div className={`flex items-center justify-between text-[9px] font-bold uppercase tracking-widest ${customTargetSquare ? 'text-emerald-400' : 'text-yellow-500/80'}`}>
                            <div className="flex items-center gap-1.5"><Maximize size={10} /> {customTargetSquare ? 'CARRÉ CIBLÉ' : (manualSquareStep !== 'off' ? 'CIBLAGE...' : 'MAX SQ')}</div>
                            {!customTargetSquare && manualSquareStep === 'off' && <span className="text-gray-500">#{activeSquareRank + 1}</span>}
                        </div>
                    </div>
                    
                    {/* Cluster avec Pagination */}
                    <div onClick={() => clusterBounds && triggerZoom(clusterBounds)} className="bg-white/5 p-2.5 rounded-2xl border border-[#d04fd7]/10 flex flex-col justify-between h-[55px] cursor-pointer hover:bg-white/10 transition-colors group relative">
                        <div className="text-[15px] font-black tabular-nums leading-none tracking-tight text-white flex justify-between items-center">
                            <span className="flex items-center gap-1">
                                {clusterSet.size}
                                {targetMode === 'cluster' && selectionStats.count > 0 && <span className="text-[10px] text-gray-400 font-normal ml-1">(+{selectionStats.count})</span>}
                            </span>
                            <div className="flex gap-1.5 p-1 -m-1 items-center z-10">
                                <button onClick={(e) => cycleClusterRank(e, 'prev')} className="hover:text-white text-gray-500 transition-colors"><ChevronLeft size={14}/></button>
                                <div className="flex gap-0.5 cursor-alias hover:scale-110 transition-transform">
                                    {topClusters.map((_, i) => <div key={i} onClick={(e) => cycleClusterRank(e, i)} className={`w-1.5 h-1.5 rounded-full ${activeClusterRank === i ? 'bg-[#d04fd7] shadow-[0_0_8px_rgba(208,79,215,0.6)]' : 'bg-gray-600'}`} />)}
                                </div>
                                <button onClick={(e) => cycleClusterRank(e, 'next')} className="hover:text-white text-gray-500 transition-colors"><ChevronRight size={14}/></button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-[#d04fd7]/80">
                            <div className="flex items-center gap-1.5"><Activity size={10} /> CLUSTER</div>
                            <span className="text-gray-500">#{activeClusterRank + 1}</span>
                        </div>
                    </div>

                    {/* LA STATBOX MANQUANTE ET LES DIV DE FERMETURE ONT ÉTÉ REMISES ICI */}
                    <StatBox label="Zone (km²)" value={Number(totalArea).toFixed(0)} potentialLabel={selectionStats.count > 0 ? `(+${selectionStats.areaKm2.toFixed(1)})` : null} color="emerald" icon={<MapIcon size={12}/>} />
                </div>
            </div>

            {/* PANEL 2 : CONTRÔLES TACTIQUES */}
            <div className="bg-[#121217]/70 backdrop-blur-2xl border border-white/10 p-4 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-auto space-y-3">
                <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none"><Calendar size={14} className="text-[#00f3ff]" /></div>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-2 pl-10 pr-4 text-xs font-medium text-white outline-none focus:border-[#00f3ff]/50 transition-all appearance-none cursor-pointer hover:bg-white/10">
                      <option value="all">HISTORIQUE COMPLET</option>
                      {years.map(y => <option key={y} value={y}>ANNÉE {y}</option>)}
                    </select>
                </div>

               <div className="grid grid-cols-2 gap-2">
                    <ToggleButton isActive={showGrid} onClick={() => setShowGrid(!showGrid)} label="Grille" color="cyan" icon={Grid} />
                    <ToggleButton isActive={showGlobalGrid} onClick={() => setShowGlobalGrid(!showGlobalGrid)} label="Monde" color="white" icon={MapIcon} />
                    <ToggleButton isActive={showMaxSquare} onClick={toggleMaxSquare} label="Max Sq." color="yellow" icon={Maximize} />
                    <ToggleButton isActive={showCluster} onClick={toggleCluster} label="Cluster" color="purple" icon={Activity} />
                </div>

                {/* LES 4 BOUTONS RESTAURÉS ICI */}
                <div className="grid grid-cols-2 gap-2">
                    <ToggleButton isActive={showHeatmap} onClick={() => setShowHeatmap(!showHeatmap)} label="Tracés" color="fuchsia" icon={Layers} />
                    <ToggleButton isActive={showTimeHeatmap} onClick={() => { setShowTimeHeatmap(!showTimeHeatmap); if(!showTimeHeatmap) setDimMap(true); }} label="Usure (Temps)" color="emerald" icon={Calendar} />
                    <ToggleButton isActive={showFilling} onClick={toggleFilling} label="Remplissage" color="orange" icon={Crosshair} disabled={isFillingDisabled} />
                    <ToggleButton isActive={showCore} onClick={() => setShowCore(!showCore)} label="Noyau" color="white" icon={Focus} />
                    <ToggleButton isActive={dimMap} onClick={() => setDimMap(!dimMap)} label="Immersion" color="cyan" icon={Eye} />
                </div>

                <div className="bg-black/20 rounded-2xl p-2 border border-white/5 space-y-2">
                    {/* TOGGLE SÉLECTION MANUELLE */}
                    {manualSquareStep !== 'off' && (
                        <div className={`text-[9px] uppercase font-bold p-1.5 rounded-lg mb-2 text-center animate-pulse tracking-wide border ${manualError ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                            {manualError ? manualError : (manualSquareStep === 'select-start' ? "Sélectionnez un départ (vert)" : "Sélectionnez la diagonale (verte)")}
                        </div>
                    )}
                    <button 
                        onClick={() => { 
                            if (manualSquareStep === 'off') {
                                setManualSquareStep('select-start'); 
                                setBlacklistMode(false);
                                setShowTargets(false); // Désactive les cibles pour y voir clair
                            } else {
                                cancelManualMode();
                            }
                        }}
                        className={`w-full py-2 mb-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border 
                            ${manualSquareStep !== 'off' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}
                        `}>
                        <CheckSquare size={14} /> {manualSquareStep !== 'off' ? 'Annuler Ciblage' : 'Sélec. carré perso.'}
                    </button>

                    <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                        <button onClick={() => handleModeSwitch('square')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${targetMode === 'square' ? 'bg-yellow-500 text-black shadow-md' : 'text-gray-500 hover:text-white'}`}><Maximize size={12} /> Carré</button>
                        <button onClick={() => handleModeSwitch('cluster')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${targetMode === 'cluster' ? 'bg-[#d04fd7] text-white shadow-md' : 'text-gray-500 hover:text-white'}`}><Activity size={12} /> Cluster</button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowTargets(!showTargets)} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${showTargets ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-transparent border-white/10 text-gray-500 hover:bg-white/5 hover:text-white'}`}>
                            <Target size={14} /> {showTargets ? 'Extension ACTIVÉE' : 'Extension DESACTIVÉE'}
                        </button>
                    </div>
                    
                    {showTargets && (
                        <div className="grid grid-cols-5 gap-1.5 animate-in fade-in duration-300">
                            {Array.from({length: 10}).map((_, i) => {
                                const level = i + 1; const isActive = activeTargetLevels.has(level); const color = TARGET_COLORS[i];
                                return (
                                    <button key={level} onClick={() => handleTargetRange(level)} className={`h-7 rounded-lg text-[10px] font-bold transition-all duration-200 border flex items-center justify-center ${isActive ? 'text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'bg-transparent text-gray-500 border-white/5 hover:bg-white/5 hover:text-white'}`} style={{ backgroundColor: isActive ? color : 'transparent', borderColor: isActive ? color : undefined }}>
                                        N+{level}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                <button 
                    onClick={() => setBlacklistMode(!blacklistMode)}
                    className={`w-full py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border 
                        ${blacklistMode ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(255,0,85,0.2)]' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}
                    `}>
                    <ShieldAlert size={14} /> {blacklistMode ? 'Blacklist dactivé' : 'Blacklist désactivé'}
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

      {showTimeHeatmap && timeBounds.min > 0 && (
          <div className="absolute bottom-6 right-6 z-[1000] bg-[#121217]/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-500 w-[280px] hidden md:block">
              <div className="flex items-center gap-2 mb-2.5">
                  <Calendar size={14} className="text-emerald-400" />
                  <span className="text-xs font-bold text-white tracking-wide uppercase">Usure Temporelle</span>
              </div>
              
              {/* Barre de dégradé */}
              <div className="h-2 w-full rounded-full mb-2" style={{ background: 'linear-gradient(to right, hsl(280, 100%, 25%), hsl(160, 100%, 70%))' }} />
              
              {/* Dates extrêmes */}
              <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                      <span className="text-[9px] text-[#ff003c] uppercase font-black tracking-wider flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#ff003c] animate-pulse" /> Plus ancien
                      </span>
                      <span className="text-[10px] text-white font-medium">{formatLastVisitDate(new Date(timeBounds.min).toISOString())}</span>
                  </div>
                  <div className="flex flex-col text-right">
                      <span className="text-[9px] text-white uppercase font-black tracking-wider flex items-center justify-end gap-1">
                          Plus récent <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_5px_#fff]" />
                      </span>
                      <span className="text-[10px] text-white font-medium">{formatLastVisitDate(new Date(timeBounds.max).toISOString())}</span>
                  </div>
              </div>
          </div>
      )}


      {/* --- CARTE LEAFLET --- */}
      <MapContainer center={[46.603354, 1.888334]} zoom={6} className="w-full h-full z-0 bg-[#050505]" zoomControl={false} preferCanvas={true} attributionControl={false}>
        <TileLayer url="https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png" />
        <ViewportTracker onBoundsChange={handleViewportChange} />
        <MapAutoZoom targetBounds={zoomTarget} />
        <LocationMarker />
        
        <MapInteractionHandler 
            blacklistMode={blacklistMode} 
            manualSquareStep={manualSquareStep}
            manualStartTile={manualStartTile}
            setManualSquareStep={setManualSquareStep}
            setManualStartTile={setManualStartTile}
            setCustomTargetSquare={setCustomTargetSquare}
            setTargetMode={setTargetMode}
            setShowTargets={setShowTargets}
            visitedTilesSet={visitedTilesSet} 
            blacklistedTilesSet={blacklistedTilesSet}
            setBlacklistedTilesSet={setBlacklistedTilesSet}
            handleBatchBlacklist={handleBatchBlacklist}
            setManualError={setManualError}
            shiftStartTile={shiftStartTile}
            setShiftStartTile={setShiftStartTile}
            setActiveTilePopup={setActiveTilePopup} 
            setDraftBlacklist={setDraftBlacklist}
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
                position={activeTilePopup.position}
                eventHandlers={{ remove: () => setActiveTilePopup(null) }}
                className="custom-dark-popup"
                autoPan={false}
            >
                <div className="flex flex-col gap-3 min-w-[170px]">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="font-semibold text-xs tracking-wide text-white/70 uppercase">Tuile</span>
                        <span className="font-medium text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-full">{activeTilePopup.key}</span>
                    </div>

                    {visitedTilesSet.has(activeTilePopup.key) ? (
                        <div className="space-y-2 mt-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">Statut</span>
                                <span className="text-xs font-semibold text-[#00f3ff]">Explorée</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">Passages cumulés</span>
                                <span className="text-sm font-black text-white">{tileVisitCounts.get(activeTilePopup.key) || 1}</span>
                            </div>
                            
                            {/* --- NOUVEAU BLOC : DERNIER PASSAGE --- */}
                            <div className="flex items-start justify-between border-t border-white/5 pt-2">
                                <span className="text-xs text-gray-400">Dernier passage</span>
                                <div className="flex flex-col items-end leading-none gap-1">
                                    <span className="text-xs font-semibold text-white capitalize">
                                        {formatLastVisitDate(tileLastVisit.get(activeTilePopup.key))}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-medium">
                                        {getTimeSince(tileLastVisit.get(activeTilePopup.key))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 mt-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">Statut</span>
                                {blacklistedTilesSet.has(activeTilePopup.key) ? (
                                    <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full">Bloquée</span>
                                ) : (
                                    <span className="text-xs font-semibold text-gray-500">Non explorée</span>
                                )}
                            </div>
                            <button 
                                onClick={(e) => { 
                                    toggleBlacklistTile(activeTilePopup.key, e); 
                                    setActiveTilePopup(null); 
                                }} 
                                className={`w-full py-2 rounded-xl transition-all text-xs font-semibold tracking-wide ${
                                    blacklistedTilesSet.has(activeTilePopup.key) 
                                    ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10' 
                                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                                }`}
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