// Fichier : app/simulations/SimulationMap.tsx
'use client';

import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';
import polyline from '@mapbox/polyline';

export default function SimulationMap({ route }: { route: any }) {
  
  // Décodage du polyline si nécessaire
  const positions = useMemo(() => {
    if (!route.polyline) return [];
    try {
      return polyline.decode(route.polyline);
    } catch (e) {
      console.error("Erreur décodage polyline", e);
      return [];
    }
  }, [route]);

  // Centrage automatique
  const bounds = useMemo(() => {
    if (positions.length === 0) return null;
    return L.latLngBounds(positions);
  }, [positions]);

  return (
    <MapContainer 
      style={{ height: '100%', width: '100%', background: '#050505' }} 
      zoom={13} 
      center={positions.length > 0 ? positions[0] : [46, 2]}
      zoomControl={false}
      // @ts-ignore
      bounds={bounds}
    >
      <TileLayer 
        attribution='&copy; OpenStreetMap' 
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
        opacity={0.8} 
      />
      
      {positions.length > 0 && (
        <>
            {/* Effet "Glow" sous la ligne */}
            <Polyline 
                positions={positions} 
                pathOptions={{ color: '#d04fd7', weight: 8, opacity: 0.3, lineCap: 'round' }} 
            />
            {/* Ligne principale */}
            <Polyline 
                positions={positions} 
                pathOptions={{ color: '#fff', weight: 3, opacity: 0.9 }} 
            />
        </>
      )}

    </MapContainer>
  );
}