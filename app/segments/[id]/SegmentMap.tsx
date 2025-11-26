// Fichier : app/segments/[id]/segmentMap.tsx
'use client';

import { MapContainer, TileLayer, Polyline, Marker, useMap, CircleMarker, Pane } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { Plus, Minus, Maximize2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// --- CONFIG ---
const COLOR_DEFAULT = '#3b82f6';

// --- HELPERS ---
const getGradeColor = (grade: number) => {
    if (grade >= 12) return '#000000'; // Mur
    if (grade >= 10) return '#b91c1c'; // Rouge Foncé
    if (grade >= 8)  return '#ef4444'; // Rouge
    if (grade >= 5)  return '#f97316'; // Orange
    if (grade >= 3)  return '#eab308'; // Jaune
    if (grade >= -2) return '#10b981'; // Vert
    return '#3b82f6';                  // Bleu
};

const getSegmentColor = (segmentName: string, category: string | null, grade: number) => {
    const name = segmentName.toLowerCase();
    const catStr = category?.toLowerCase() || '';
    
    // Priorité Surfaces
    if (name.includes('pavé') || catStr.includes('pavé')) return '#fbbf24';
    if (name.includes('gravel') || catStr.includes('gravel')) return '#a8a29e';

    // Sinon Pente
    return getGradeColor(grade);
};

const iconStart = L.divIcon({ className: '', html: '<div style="width:12px;height:12px;background:#10b981;border:2px solid white;border-radius:50%;box-shadow:0 0 15px #10b981"></div>', iconAnchor: [6, 6] });
const iconEnd = L.divIcon({ className: '', html: '<div style="width:12px;height:12px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 0 15px #ef4444"></div>', iconAnchor: [6, 6] });

const iconCursor = L.divIcon({ 
    className: '', 
    html: `
        <div style="position: relative;">
            <div style="position: absolute; top: -15px; left: -15px; width: 30px; height: 30px; background: #00f3ff; border-radius: 50%; opacity: 0.3; animation: pulse 1.5s infinite;"></div>
            <div style="position: absolute; top: -6px; left: -6px; width: 12px; height: 12px; background: #00f3ff; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 15px #00f3ff;"></div>
        </div>
    `,
    iconAnchor: [0, 0] 
});

// --- TYPES ---
type ColoredSegment = {
    pos: [number, number][]; // 🔥 Le type strict que Leaflet veut
    color: string;
};

// --- UTILS ---
function getDistance(p1: number[], p2: number[]) {
    const R = 6371e3; 
    const φ1 = p1[0] * Math.PI/180; const φ2 = p2[0] * Math.PI/180;
    const dLat = (p2[0]-p1[0]) * Math.PI/180; const dLon = (p2[1]-p1[1]) * Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// --- CONTROLLERS ---
function MapController({ bounds, hoverPoint }: any) {
    const map = useMap();
    useEffect(() => {
        if (bounds && !hoverPoint) {
            map.fitBounds(bounds, { padding: [40, 40], animate: false });
        }
    }, [map, bounds, hoverPoint]);
    return null;
}


export default function SegmentMap({ 
    polyline, hoveredPoint, segmentName, category, grade 
}: { 
    polyline: number[][] | null, hoveredPoint: { lat: number, lon: number } | null,
    segmentName: string, category: string | null, grade: number
}) {
    
    // 1. Calcul des segments colorés (Chunking)
    const coloredSegments = useMemo(() => {
        if (!polyline || polyline.length < 2) return [];

        const segments: ColoredSegment[] = [];
        
        // Détection globale Surface
        const name = segmentName.toLowerCase();
        const catStr = category?.toLowerCase() || '';
        const isSpecialSurface = name.includes('pavé') || catStr.includes('pavé') || name.includes('gravel') || catStr.includes('gravel');
        
        if (isSpecialSurface) {
            const color = getSegmentColor(segmentName, category, 0);
            // 🔥 CAST EXPLICITE ICI
            return [{ 
                pos: polyline.map(p => [p[0], p[1]] as [number, number]), 
                color 
            }];
        }

        // Sinon Gradient de pente
        let currentChunk = [polyline[0]];
        // On initialise avec la couleur du premier segment
        let firstDist = getDistance(polyline[0], polyline[1]);
        let firstGrade = firstDist > 0 ? ((polyline[1][2] - polyline[0][2]) / firstDist) * 100 : 0;
        let currentColor = getGradeColor(firstGrade);

        for (let i = 0; i < polyline.length - 1; i++) {
            const p1 = polyline[i];
            const p2 = polyline[i + 1];

            const dist = getDistance(p1, p2);
            const elevDiff = (p2[2] || 0) - (p1[2] || 0);
            const localGrade = dist > 0 ? (elevDiff / dist) * 100 : 0;
            
            const color = getGradeColor(localGrade);

            // Si la couleur change, on coupe
            if (color !== currentColor) {
                currentChunk.push(p2); // On ferme le chunk
                segments.push({ 
                    pos: currentChunk.map(p => [p[0], p[1]] as [number, number]), // 🔥 CAST ICI
                    color: currentColor 
                });
                
                currentChunk = [p1, p2]; // On ouvre le nouveau (avec chevauchement pour continuité)
                currentColor = color;
            } else {
                currentChunk.push(p2);
            }
        }
        // Pousser le dernier morceau
        segments.push({ 
            pos: currentChunk.map(p => [p[0], p[1]] as [number, number]), // 🔥 CAST ICI
            color: currentColor 
        });

        return segments;
    }, [polyline, segmentName, category, grade]);

    const bounds = useMemo(() => {
        if (!polyline || polyline.length === 0) return null;
        return L.latLngBounds(polyline.map(p => [p[0], p[1]]));
    }, [polyline]);

    return (
        <MapContainer style={{ height: '100%', width: '100%', background: '#050505' }} center={[46, 2]} zoom={6} zoomControl={false} scrollWheelZoom={true}>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" opacity={0.8} />
            
            <MapController bounds={bounds} hoverPoint={hoveredPoint} />

            {/* Affichage des segments colorés avec Pane pour l'ordre */}
            <Pane name="polylinePane" style={{ zIndex: 400 }}>
                {coloredSegments.map((seg, i) => (
                    <Polyline 
                        key={i} 
                        positions={seg.pos} 
                        pathOptions={{ color: seg.color, weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }} 
                        pane="polylinePane"
                    />
                ))}
            </Pane>

            {polyline && polyline.length > 0 && (
                <>
                    <Marker position={[polyline[0][0], polyline[0][1]]} icon={iconStart} />
                    <Marker position={[polyline[polyline.length-1][0], polyline[polyline.length-1][1]]} icon={iconEnd} />
                </>
            )}

            {/* Point de survol */}
            <Pane name="hoverPane" style={{ zIndex: 1000 }}>
                {hoveredPoint && (
                    <Marker position={[hoveredPoint.lat, hoveredPoint.lon]} icon={iconCursor} />
                )}
            </Pane>
        </MapContainer>
    );
}