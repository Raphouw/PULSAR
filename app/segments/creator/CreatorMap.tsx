// Fichier : app/segments/creator/CreatorMap.tsx
'use client';

import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';

// --- TYPES ---
type ColoredSegment = { positions: [number, number][]; color: string; };

// --- ICONES ---
const iconStart = L.divIcon({ className: '', html: '<div style="width:14px;height:14px;background:#10b981;border:2px solid white;border-radius:50%;box-shadow:0 0 15px #10b981"></div>', iconAnchor: [7, 7] });
const iconEnd = L.divIcon({ className: '', html: '<div style="width:14px;height:14px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 0 15px #ef4444"></div>', iconAnchor: [7, 7] });

// 🔥 NOUVEAU : Icône Curseur HTML (Infaillible pour le survol)
const iconCursor = L.divIcon({ 
    className: '', 
    html: `
        <div style="position: relative;">
            <div style="position: absolute; top: -10px; left: -10px; width: 20px; height: 20px; background: #00f3ff; border-radius: 50%; opacity: 0.4; animation: pulse 1s infinite;"></div>
            <div style="position: absolute; top: -5px; left: -5px; width: 10px; height: 10px; background: #00f3ff; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px #00f3ff;"></div>
        </div>
    `,
    iconAnchor: [0, 0] // Le centrage est géré par le top/left du CSS
});

// --- HELPERS ---
function getSlopeColor(grade: number) {
    if (grade >= 15) return '#7f1d1d'; if (grade >= 12) return '#b91c1c'; if (grade >= 10) return '#ef4444'; if (grade >= 9) return '#f97316'; if (grade >= 8) return '#eab308'; return '#d04fd7';
}

function getDistance(p1: any, p2: any) {
    const R = 6371e3; const φ1 = p1.lat * Math.PI / 180; const φ2 = p2.lat * Math.PI / 180;
    const a = Math.sin(((p2.lat-p1.lat)*Math.PI/180)/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(((p2.lon-p1.lon)*Math.PI/180)/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function MapController({ activeBounds, fullTraceBounds, focusPoint }: any) {
    const map = useMap();
    useEffect(() => {
        if (focusPoint) map.setView([focusPoint.lat, focusPoint.lon], 15, { animate: true, duration: 0.5 });
        else if (activeBounds) map.fitBounds(activeBounds, { padding: [50, 50], animate: true, duration: 1 });
        else if (fullTraceBounds) map.fitBounds(fullTraceBounds, { padding: [50, 50], animate: false });
    }, [map, activeBounds, fullTraceBounds, focusPoint]);
    return null;
}

export default function CreatorMap({ fullTrace, startIdx, endIdx, focusMode, hoveredPoint }: any) {
    const coloredSegments = useMemo(() => {
        if (!fullTrace || fullTrace.length === 0 || endIdx <= startIdx) return [];
        const segments: ColoredSegment[] = [];
        const activePoints = fullTrace.slice(startIdx, endIdx + 1);
        if (activePoints.length < 2) return [];
        let currentPath = [activePoints[0]]; let currentColor = '#d04fd7';
        for (let i = 1; i < activePoints.length; i++) {
            const p1 = activePoints[i-1]; const p2 = activePoints[i]; const dist = getDistance(p1, p2);
            let grade = 0; if (dist > 0) grade = ((p2.ele - p1.ele) / dist) * 100;
            const newColor = getSlopeColor(grade);
            if (newColor !== currentColor) { currentPath.push(p2); segments.push({ positions: currentPath.map(p => [p.lat, p.lon] as [number, number]), color: currentColor }); currentPath = [p1, p2]; currentColor = newColor; } else { currentPath.push(p2); }
        }
        segments.push({ positions: currentPath.map(p => [p.lat, p.lon] as [number, number]), color: currentColor });
        return segments;
    }, [fullTrace, startIdx, endIdx]);

    const ghostPositions = useMemo(() => fullTrace.map((p: any) => [p.lat, p.lon] as [number, number]), [fullTrace]);
    
    const activeBounds = useMemo(() => {
        if (coloredSegments.length === 0) return null;
        const start = fullTrace[startIdx]; const end = fullTrace[endIdx];
        return L.latLngBounds([start.lat, start.lon], [end.lat, end.lon]);
    }, [fullTrace, startIdx, endIdx, coloredSegments]);

    const fullTraceBounds = useMemo(() => {
        if (fullTrace.length === 0) return null;
        return L.latLngBounds(fullTrace.map((p:any) => [p.lat, p.lon]));
    }, [fullTrace]);

    const currentFocusPoint = useMemo(() => {
        if (focusMode === 'start') return { ...fullTrace[startIdx] };
        if (focusMode === 'end') return { ...fullTrace[endIdx] };
        return null;
    }, [focusMode, fullTrace, startIdx, endIdx]);

    return (
        <MapContainer style={{ height: '100%', width: '100%', background: '#050505' }} center={[46, 2]} zoom={6} zoomControl={false}>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" opacity={0.9} />
            
            <MapController activeBounds={activeBounds} fullTraceBounds={fullTraceBounds} focusPoint={currentFocusPoint} />

            {ghostPositions.length > 0 && <Polyline positions={ghostPositions} pathOptions={{ color: '#333', weight: 3, opacity: 0.4, dashArray: '5, 10' }} />}
            
            {coloredSegments.map((seg, i) => (
                <Polyline key={i} positions={seg.positions} pathOptions={{ color: seg.color, weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round' }} />
            ))}

            {activeBounds && fullTrace[startIdx] && <Marker position={[fullTrace[startIdx].lat, fullTrace[startIdx].lon]} icon={iconStart} />}
            {activeBounds && fullTrace[endIdx] && <Marker position={[fullTrace[endIdx].lat, fullTrace[endIdx].lon]} icon={iconEnd} />}

            {/* 🔥 MARQUEUR HTML POUR LE SURVOL (Z-INDEX ULTIME) */}
            {hoveredPoint && (
                <Marker 
                    position={[hoveredPoint.lat, hoveredPoint.lon]} 
                    icon={iconCursor} 
                    zIndexOffset={10000} // Force au dessus de tout
                />
            )}
        </MapContainer>
    );
}