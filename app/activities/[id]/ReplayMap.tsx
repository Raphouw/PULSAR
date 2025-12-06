// Fichier : app/activities/[id]/ReplayMap.tsx
'use client';

import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Composant invisible qui gère le recentrage fluide
function MapController({ center, zoom = 13 }: { center: [number, number], zoom?: number }) {
    const map = useMap();
    const prevCenter = useRef<[number, number] | null>(null);

    useEffect(() => {
        if (!center) return;
        
        // Premier chargement : saut direct
        if (!prevCenter.current) {
            map.setView(center, zoom, { animate: false });
            prevCenter.current = center;
            return;
        }

        // Mises à jour suivantes : animation fluide (pan)
        // On ne pan que si la distance est significative pour éviter les micro-sauts
        const dist = map.distance(prevCenter.current, center);
        if (dist > 10) { // Si déplacement > 10 mètres
            map.panTo(center, { animate: true, duration: 0.8, easeLinearity: 0.5 });
            prevCenter.current = center;
        }
    }, [center, map, zoom]);

    return null;
}

export default function ReplayMap({ 
    polyline, 
    currentPosition 
}: { 
    polyline: [number, number][], 
    currentPosition: [number, number] | null 
}) {
    // Sécurité anti-crash
    if (!polyline || polyline.length === 0) {
        return (
            <div style={{height: '100%', width: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666'}}>
                Pas de tracé GPS
            </div>
        );
    }

    // Position de départ par défaut = premier point du tracé
    const safePosition = currentPosition && currentPosition[0] !== 0 ? currentPosition : polyline[0];

    return (
        <MapContainer 
            center={safePosition} 
            zoom={13} 
            style={{ height: '100%', width: '100%', background: '#09090b', zIndex: 0 }} 
            zoomControl={false}
            attributionControl={false}
        >
            {/* Fond de carte sombre HD */}
            <TileLayer
                url='https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'
                maxZoom={20}
            />
            
            {/* Le Tracé du parcours */}
            <Polyline 
                positions={polyline} 
                color="#4c1d95" // Violet très sombre pour le fond du tracé
                weight={6} 
                opacity={0.4}
            />
            <Polyline 
                positions={polyline} 
                color="#8b5cf6" // Violet clair pour le dessus
                weight={3} 
                opacity={0.8}
            />

            {/* LE POINT QUI AVANCE */}
            {safePosition && (
                <>
                    {/* Halo pulsant */}
                    <CircleMarker 
                        center={safePosition} 
                        radius={20} 
                        pathOptions={{ 
                            color: 'transparent', 
                            fillColor: '#d04fd7', 
                            fillOpacity: 0.3 
                        }} 
                    />
                    {/* Point central solide */}
                    <CircleMarker 
                        center={safePosition} 
                        radius={6} 
                        pathOptions={{ 
                            color: '#fff', 
                            weight: 2, 
                            fillColor: '#d04fd7', 
                            fillOpacity: 1 
                        }} 
                    />
                    {/* Contrôleur de caméra */}
                    <MapController center={safePosition} />
                </>
            )}
        </MapContainer>
    );
}