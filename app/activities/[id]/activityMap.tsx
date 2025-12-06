// Fichier : app/activities/[id]/activityMap.tsx
'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- UTILITAIRE DE DÉCODAGE (Google Polyline Algorithm) ---
// Permet de transformer la string "encodedPolyline" en tableau de coordonnées [lat, lng]
// Fichier : app/activities/[id]/activityMap.tsx

function decodePolyline(str: string, precision?: number): [number, number][] {
    let index = 0,
        lat = 0,
        lng = 0,
        coordinates: [number, number][] = [],
        shift = 0,
        result = 0,
        byte = 0, // 🔥 CORRECTION : 0 au lieu de null
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision || 5);

    while (index < str.length) {
        byte = 0; // 🔥 CORRECTION : On reset à 0, pas à null
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
}

// --- COMPOSANT POUR RECENTRER LA CARTE AUTOMATIQUEMENT ---
function FitBounds({ positions }: { positions: [number, number][] }) {
    const map = useMap();
    
    useEffect(() => {
        if (positions && positions.length > 0) {
            const bounds = L.latLngBounds(positions);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, positions]);

    return null;
}

// --- COMPOSANT PRINCIPAL ---
export default function ActivityMap({ encodedPolyline }: { encodedPolyline: string }) {
    // 1. Décodage de la polyline
    const positions = React.useMemo(() => {
        if (!encodedPolyline) return [];
        return decodePolyline(encodedPolyline);
    }, [encodedPolyline]);

    if (!positions || positions.length === 0) {
        return <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666'}}>Données GPS invalides</div>;
    }

    return (
        <MapContainer 
            center={positions[0]} 
            zoom={13} 
            style={{ height: '100%', width: '100%', background: '#09090b' }} 
            zoomControl={false}
            attributionControl={false}
        >
            {/* Fond de carte sombre (Stadia Dark ou CartoDB Dark) */}
            <TileLayer
                url='https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'
            />
            
            {/* Tracé GPS en couleur Néon */}
            <Polyline 
                positions={positions} 
                color="#00f3ff" // Cyan électrique
                weight={4} 
                opacity={0.8}
            />

            {/* Ajustement automatique du zoom */}
            <FitBounds positions={positions} />
        </MapContainer>
    );
}