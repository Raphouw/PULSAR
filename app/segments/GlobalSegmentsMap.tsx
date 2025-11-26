// Fichier : app/segments/GlobalSegmentsMap.tsx
'use client';

import { MapContainer, TileLayer, Polyline, useMap, Pane, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { Globe, Layers, Check } from 'lucide-react'; // Ajout de l'icone Layers et Check
import 'leaflet/dist/leaflet.css';

// --- CONFIG ---
const COLOR_DEFAULT = '#ff0648ff';
const COLOR_HOVER = '#d04fd7'; 
const COLOR_SELECT = '#00f3ff';

// --- DEFINITION DES FONDS DE CARTE ---
const MAP_STYLES = [
    { id: 'dark', label: 'Sombre (Pulsar)', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '&copy; CARTO' },
    { id: 'light', label: 'Clair (Voyager)', url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attribution: '&copy; CARTO' },
    { id: 'satellite', label: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri' },
    { id: 'cyclo', label: 'Cyclisme (Relief)', url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', attribution: '&copy; CyclOSM' },
    { id: 'topo', label: 'Topographie', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri' },
];

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

// --- CONTROLEUR CAMÉRA ---
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
                    map.stop();
                    map.fitBounds(bounds, { 
                        paddingTopLeft: [500, 50],
                        paddingBottomRight: [50, 50],
                        maxZoom: 14, 
                        animate: true, 
                        duration: 1.5,
                        easeLinearity: 0.25 
                    });
                }
            }
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
            if (selectedId) {
                map.stop();
                map.setZoom(Math.max(4, map.getZoom() - 2), { animate: true, duration: 1 });
            }
        }
    });
    return null;
}

// Bouton Reset Vue (Haut Droite)
function ResetViewControl() {
    const map = useMap();
    const reset = (e: any) => {
        e.stopPropagation(); // Empêche de cliquer à travers
        map.stop();
        map.flyTo([46.603354, 1.888334], 6, { duration: 2.0 });
    };

    return (
        <div className="leaflet-top leaflet-right" style={{ marginTop: '20px', marginRight: '20px', zIndex: 1000 }}>
            <div className="leaflet-control">
                <button 
                    onClick={reset} 
                    onMouseDown={(e) => e.stopPropagation()} // Bloque les events Leaflet
                    onDoubleClick={(e) => e.stopPropagation()}
                    style={{ background: '#d04fd7', color: '#fff', border: 'none', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer', boxShadow: '0 0 20px rgba(208, 79, 215, 0.5)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', pointerEvents: 'auto' }}
                >
                    <Globe size={16} /> Vue Globale
                </button>
            </div>
        </div>
    );
}

// --- NOUVEAU SÉLECTEUR DE CARTES CUSTOM (BAS DROITE) ---
function LayerSwitcher({ currentLayer, onChange }: { currentLayer: string, onChange: (id: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);

    // Empêcher la propagation des clics vers la carte
    const stopProp = (e: any) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
    };

    return (
        <>
            {/* Overlay invisible pour fermer en cliquant dehors */}
            {isOpen && (
                <div 
                    style={{ position: 'absolute', inset: 0, zIndex: 9998 }} 
                    onClick={(e) => { stopProp(e); setIsOpen(false); }}
                />
            )}

            <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '30px', marginRight: '20px', zIndex: 9999, pointerEvents: 'auto' }}>
                <div className="leaflet-control" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    
                    {/* MENU DÉROULANT */}
                    {isOpen && (
                        <div 
                            onClick={stopProp}
                            onMouseDown={stopProp}
                            onDoubleClick={stopProp}
                            style={{
                                background: 'rgba(20, 20, 30, 0.95)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '8px',
                                minWidth: '200px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                transformOrigin: 'bottom right',
                                animation: 'fadeIn 0.2s ease-out'
                            }}
                        >
                            <div style={{ fontSize: '0.7rem', color: '#888', padding: '4px 8px', fontWeight: 700, textTransform: 'uppercase' }}>Fonds de carte</div>
                            {MAP_STYLES.map(style => (
                                <button
                                    key={style.id}
                                    onClick={(e) => { stopProp(e); onChange(style.id); setIsOpen(false); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '8px 12px',
                                        background: currentLayer === style.id ? 'rgba(208, 79, 215, 0.2)' : 'transparent',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: currentLayer === style.id ? '#d04fd7' : '#ccc',
                                        fontSize: '0.9rem',
                                        fontWeight: currentLayer === style.id ? 700 : 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        textAlign: 'left'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = currentLayer === style.id ? 'rgba(208, 79, 215, 0.2)' : 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = currentLayer === style.id ? 'rgba(208, 79, 215, 0.2)' : 'transparent'}
                                >
                                    {style.label}
                                    {currentLayer === style.id && <Check size={14} />}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* BOUTON PRINCIPAL */}
                    <button 
                        onClick={(e) => { stopProp(e); setIsOpen(!isOpen); }}
                        onMouseDown={stopProp} // Crucial pour Leaflet
                        style={{
                            width: '48px', height: '48px',
                            borderRadius: '50%',
                            background: isOpen ? '#d04fd7' : 'rgba(20, 20, 30, 0.9)',
                            color: isOpen ? '#fff' : '#d04fd7',
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                            transition: 'all 0.2s'
                        }}
                        title="Changer le fond de carte"
                    >
                        <Layers size={24} />
                    </button>
                </div>
            </div>
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </>
    );
}

export default function GlobalSegmentsMap({ 
    segments, hoveredId, selectedId, zoomTargetId,
    onSegmentClick, onSegmentHover, onBackgroundClick 
}: { 
    segments: any[], hoveredId: number | null, selectedId: number | null, zoomTargetId: number | null,
    onSegmentClick: (seg: any) => void, onSegmentHover: (id: number | null) => void, onBackgroundClick: () => void
}) {
    const [currentLayerId, setCurrentLayerId] = useState('cyclo');
    
    const activeLayer = MAP_STYLES.find(s => s.id === currentLayerId) || MAP_STYLES[0];

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <MapContainer 
                center={[46.603354, 1.888334]} 
                zoom={6} 
                style={{ height: '100%', width: '100%', background: currentLayerId === 'dark' ? '#050505' : '#e0e0e0' }} 
                zoomControl={false} 
                scrollWheelZoom={true}
            >
                {/* COUCHE DE TUILES DYNAMIQUE */}
                <TileLayer 
                    key={activeLayer.id} // Le key force le rechargement propre quand on change
                    attribution={activeLayer.attribution} 
                    url={activeLayer.url} 
                    opacity={currentLayerId === 'dark' ? 0.85 : 1} 
                />
                
                <MapController zoomTargetId={zoomTargetId} segments={segments} />
                <BackgroundClickHandler onBackgroundClick={onBackgroundClick} selectedId={selectedId} />
                
                {/* Nos contrôles custom sont DANS le MapContainer pour profiter du contexte si besoin, 
                    mais positionnés en CSS absolu via les classes leaflet */}
                <ResetViewControl />
                
                {/* Sélecteur de carte passé via un Portal interne ou juste en enfant direct */}
                <div className="leaflet-control-container">
                    <LayerSwitcher currentLayer={currentLayerId} onChange={setCurrentLayerId} />
                </div>

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
        </div>
    );
}