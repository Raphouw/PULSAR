// Fichier : app/activities/[id]/ReplayMap.tsx
'use client';

import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

function RecenterMap({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.panTo(center, { animate: true, duration: 0.5 });
        }
    }, [center, map]);
    return null;
}

export default function ReplayMap({ polyline, currentPosition }: { polyline: [number, number][], currentPosition: [number, number] | null }) {
    if (!polyline || polyline.length === 0) return null;

    const startPos = polyline[0];

    return (
        <MapContainer 
            center={startPos} 
            zoom={13} 
            style={{ height: '100%', width: '100%', background: '#09090b' }} // Fond très noir pour éviter le flash blanc
            zoomControl={false}
            attributionControl={false}
        >
            {/* OPTION 1 : Dark Mode plus contrasté (Stadia) 
               C'est souvent plus joli que CartoDB 
            */}
            <TileLayer
                url='https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'
            />
            
            {/* Le Tracé : Plus épais et plus coloré (Violet foncé) */}
            <Polyline 
                positions={polyline} 
                color="#5b21b6" // Violet foncé pour le chemin non parcouru
                weight={5} 
                opacity={0.6}
            />

            {/* Le Tracé Parcouru (Effet de traînée) - Optionnel mais stylé */}
            {/* Pour l'instant on garde juste le curseur pour la perf */}

            {currentPosition && (
                <>
                    {/* Halo extérieur pulsant */}
                    <CircleMarker 
                        center={currentPosition} 
                        radius={15} 
                        color="transparent" 
                        fillColor="#d04fd7" 
                        fillOpacity={0.2} 
                        weight={0} 
                    />
                    {/* Point central blanc */}
                    <CircleMarker 
                        center={currentPosition} 
                        radius={6} 
                        color="#fff" 
                        fillColor="#d04fd7" 
                        fillOpacity={1} 
                        weight={2} 
                    />
                    <RecenterMap center={currentPosition} />
                </>
            )}
        </MapContainer>
    );
}