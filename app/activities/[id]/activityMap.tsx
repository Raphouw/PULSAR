// Fichier : app/activities/[id]/activityMap.tsx
'use client'; 

import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as polylineDecode from '@mapbox/polyline'; 
import * as L from 'leaflet';

type LatLngTuple = [number, number];
type ActivityMapProps = {
  encodedPolyline: string;
  // 'isVisible' a été supprimé
};

// Simplifié : se lance une fois la carte prête
function MapAutoFitter({ polyline }: { polyline: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize(); // Recalcule la taille
    const tempPolyline = L.polyline(polyline);
    const bounds = tempPolyline.getBounds();
    
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] }); // Centre et zoome
    }
  }, [map, polyline]);

  return null;
}

const ActivityMap = React.memo(function ActivityMap({ encodedPolyline }: ActivityMapProps) {
  
  const decodedPolyline: LatLngTuple[] = useMemo(() => {
    return polylineDecode.decode(encodedPolyline)
      .map(point => [point[0], point[1]] as LatLngTuple);
  }, [encodedPolyline]); 

  if (!decodedPolyline || decodedPolyline.length === 0) {
    return <div style={mapStyle}>Erreur : Tracé GPS invalide.</div>;
  }

  return (
    <MapContainer
      center={decodedPolyline[0]} 
      zoom={13} 
      style={mapStyle}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline pathOptions={{ color: '#d047fd', weight: 3 }} positions={decodedPolyline} />
      <MapAutoFitter polyline={decodedPolyline} />
    </MapContainer>
  );
});

export default ActivityMap;

// Style (ne change pas)
const mapStyle: React.CSSProperties = {
  height: '60vh',
  width: '100%',
  backgroundColor: 'var(--surface)',
  margin: 0, 
  borderRadius: '8px'
};