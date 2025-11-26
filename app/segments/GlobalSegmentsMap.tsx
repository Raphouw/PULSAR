// Fichier : app/segments/GlobalSegmentsMap.tsx
'use client';

import { MapContainer, TileLayer, Polyline, useMap, Pane, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { Globe } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// --- CONFIG ---
const COLOR_DEFAULT = '#3b82f6';
const COLOR_HOVER = '#d04fd7'; 
const COLOR_SELECT = '#00f3ff';

// --- HELPERS ---
const getSegmentColor = (segment: any, isHovered: boolean, isSelected: boolean) => {
    if (isSelected) return COLOR_SELECT;
    if (isHovered) return COLOR_HOVER;
    
    const name = segment.name.toLowerCase();
    const catStr = segment.category?.toLowerCase() || '';
    if (name.includes('pavé') || catStr.includes('pavé')) return '#fbbf24';
    if (name.includes('gravel') || catStr.includes('gravel')) return '#a8a29e';

    const score = (segment.distance_m/1000) * Math.max(0, segment.average_grade) * 2;
    if (score > 150) return '#ef4444'; 
    if (score > 60) return '#f97316'; 
    if (segment.average_grade > 3) return '#10b981'; 
    return COLOR_DEFAULT; 
};

// --- CONTROLEUR CAMÉRA INTELLIGENT ---
function MapController({ zoomTargetId, segments }: { zoomTargetId: number | null, segments: any[] }) {
    const map = useMap();

    useEffect(() => {
        if (zoomTargetId) {
            const targetSegment = segments.find(s => s.id === zoomTargetId);
            
            if (targetSegment) {
                let bounds: L.LatLngBoundsExpression | null = null;
                
                if (targetSegment.polyline && Array.isArray(targetSegment.polyline) && targetSegment.polyline.length > 0) {
                     // @ts-ignore
                    bounds = L.latLngBounds(targetSegment.polyline.map(p => [p[0], p[1]]));
                } else if (targetSegment.start_lat && targetSegment.end_lat) {
                    bounds = L.latLngBounds([[targetSegment.start_lat, targetSegment.start_lon], [targetSegment.end_lat, targetSegment.end_lon]]);
                }

                if (bounds) {
                    map.stop(); // Stop ancienne anim
                    map.fitBounds(bounds, { 
                        paddingTopLeft: [500, 50],
                        paddingBottomRight: [50, 50],
                        maxZoom: 14, 
                        animate: true, 
                        duration: 1.5, // Vol fluide
                        easeLinearity: 0.25 
                    });
                }
            }
        } else {
            // PAS DE CIBLE DE ZOOM -> ON NE FAIT RIEN (on laisse la vue où elle est)
            // Sauf si on veut reset ? Non, l'user a demandé que le reset soit manuel ou sur clic background
        }
    }, [zoomTargetId, map, segments]);

    return null;
}

// Gestion Clic Fond
function BackgroundClickHandler({ onBackgroundClick, selectedId }: { onBackgroundClick: () => void, selectedId: number | null }) {
    const map = useMap();
    useMapEvents({
        click: (e) => {
            onBackgroundClick();
            // 🔥 LOGIQUE DÉZOOM : Seulement si on avait un truc sélectionné
            if (selectedId) {
                map.stop();
                // Dézoom relatif doux
                map.setZoom(Math.max(4, map.getZoom() - 2), { animate: true, duration: 1 });
            }
        }
    });
    return null;
}

function ResetViewControl() {
    const map = useMap();
    const reset = (e: any) => {
        L.DomEvent.stopPropagation(e);
        map.stop();
        map.flyTo([46.603354, 1.888334], 6, { duration: 2.0 });
    };

    return (
        <div className="leaflet-top leaflet-right" style={{ marginTop: '20px', marginRight: '20px' }}>
            <div className="leaflet-control">
                <button onClick={reset} style={{ background: '#d04fd7', color: '#fff', border: 'none', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer', boxShadow: '0 0 20px rgba(208, 79, 215, 0.5)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <Globe size={16} /> Vue Globale
                </button>
            </div>
        </div>
    );
}

export default function GlobalSegmentsMap({ 
    segments, hoveredId, selectedId, zoomTargetId,
    onSegmentClick, onSegmentHover, onBackgroundClick 
}: { 
    segments: any[], hoveredId: number | null, selectedId: number | null, zoomTargetId: number | null,
    onSegmentClick: (seg: any) => void, onSegmentHover: (id: number | null) => void, onBackgroundClick: () => void
}) {
    return (
        <MapContainer center={[46.603354, 1.888334]} zoom={6} style={{ height: '100%', width: '100%', background: '#050505' }} zoomControl={false} scrollWheelZoom={true}>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" opacity={0.85} />
            
            <MapController zoomTargetId={zoomTargetId} segments={segments} />
            <BackgroundClickHandler onBackgroundClick={onBackgroundClick} selectedId={selectedId} />
            <ResetViewControl />
            <Pane name="highlight" style={{ zIndex: 650 }} />

            {segments.map(segment => {
                const isSelected = selectedId === segment.id;
                const isHovered = hoveredId === segment.id;
                const isActive = isSelected || isHovered;
                const color = getSegmentColor(segment, isHovered, isSelected);
                const weight = isActive ? 8 : 3;
                const opacity = (selectedId || hoveredId) ? (isActive ? 1 : 0.15) : 0.6;

                let positions: [number, number][] = [];
                if (segment.polyline && Array.isArray(segment.polyline) && segment.polyline.length > 0) {
                    // @ts-ignore
                    positions = segment.polyline.map(p => [p[0], p[1]]);
                } else if (segment.start_lat && segment.end_lat) {
                    // @ts-ignore
                    positions = [[segment.start_lat, segment.start_lon], [segment.end_lat, segment.end_lon]];
                }
                if (positions.length < 2) return null;

                return (
                    <Polyline 
                        key={segment.id} positions={positions} 
                        pathOptions={{ color, weight, opacity, lineCap: 'round', lineJoin: 'round', className: isActive ? 'segment-glow' : '' }} 
                        eventHandlers={{ 
                            click: (e) => { L.DomEvent.stopPropagation(e); onSegmentClick(segment); },
                            mouseover: (e) => { onSegmentHover(segment.id); e.target.bringToFront(); },
                            mouseout: (e) => { onSegmentHover(null); }
                        }}
                    />
                );
            })}
        </MapContainer>
    );
}