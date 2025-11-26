// components/ui/miniMapDebug.tsx
'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import polyline from '@mapbox/polyline';

interface MiniMapDebugProps {
  encodedPolyline: string;
}

// CORRECTION : Ajout du style manquant
const miniMapPlaceholderStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  background: 'var(--secondary)',
  color: '#888',
};

const MiniMapDebug: React.FC<MiniMapDebugProps> = ({ encodedPolyline }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!mapRef.current || !encodedPolyline) return;

    console.log("🔄 Initialisation de la carte avec polyline:", encodedPolyline.substring(0, 50) + "...");
    
    try {
      // Décoder la polyline
      const decoded = polyline.decode(encodedPolyline);
      console.log(`✅ Polyline décodée: ${decoded.length} points`);
      
      // Créer la carte
      const map = L.map(mapRef.current).setView([decoded[0][0], decoded[0][1]], 13);
      
      // Ajouter le fond de carte
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      
      // Créer la polyline
      const leafletPolyline = L.polyline(decoded, {
        color: '#d04fd7',
        weight: 4,
        opacity: 0.8
      }).addTo(map);
      
      // Ajuster la vue pour voir toute la trace
      map.fitBounds(leafletPolyline.getBounds());
      
      console.log("✅ Carte initialisée avec succès");
      
      return () => {
        map.remove();
      };
    } catch (error) {
      console.error('❌ Erreur création carte:', error);
    }
  }, [encodedPolyline]);

  if (!encodedPolyline) {
    return (
      <div style={miniMapPlaceholderStyle}>
        <span style={{ fontSize: '2rem' }}>🗺️</span>
        <span style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Aperçu non disponible</span>
      </div>
    );
  }

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />;
};

export default MiniMapDebug;