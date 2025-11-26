// Fichier : app/activities/[id]/activityMap.tsx
'use client';

import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import polyline from '@mapbox/polyline'; // Assure-toi d'avoir ce package : npm install @mapbox/polyline
import 'leaflet/dist/leaflet.css';

// --- ICONES (CSS PUR) ---
// Départ (Vert)
const iconStart = L.divIcon({
  className: '',
  html: `<div style="
    width: 14px; height: 14px;
    background: #10b981;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 0 10px #10b981;
  "></div>`,
  iconAnchor: [7, 7]
});

// Arrivée (Rouge)
const iconEnd = L.divIcon({
  className: '',
  html: `<div style="
    width: 14px; height: 14px;
    background: #ef4444;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 0 10px #ef4444;
  "></div>`,
  iconAnchor: [7, 7]
});

// --- CONTROLEUR DE CAMÉRA ---
// C'est lui qui gère le Zoom automatique
const MapController = ({ bounds }: { bounds: L.LatLngBoundsExpression | null }) => {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;

    try {
      // 🔥 CALIBRAGE DU ZOOM
      map.fitBounds(bounds, {
        padding: [1000, 1000], // Ajoute 50px de marge autour du tracé (Haut/Bas, Gauche/Droite)
        maxZoom: 16,       // Empêche de zoomer trop fort sur un tout petit segment
        animate: true,     // Animation fluide
        duration: 1.5      // Durée de l'animation (en secondes)
      });
    } catch (e) {
      console.warn("Erreur fitBounds:", e);
    }
  }, [map, bounds]);

  return null;
};

// --- COMPOSANT PRINCIPAL ---
export default function ActivityMap({ encodedPolyline }: { encodedPolyline: string }) {
  
  // 1. Décodage de la Polyline (Mémoïsé pour la perf)
  const positions = useMemo(() => {
    if (!encodedPolyline) return [];
    try {
      return polyline.decode(encodedPolyline);
    } catch (err) {
      console.error("Erreur décodage polyline:", err);
      return [];
    }
  }, [encodedPolyline]);

  // 2. Calcul des bornes (Bounding Box) pour le centrage
  const bounds = useMemo(() => {
    if (positions.length === 0) return null;
    return L.latLngBounds(positions);
  }, [positions]);

  if (positions.length === 0) return null;

  return (
    <MapContainer 
      style={{ height: '100%', width: '100%', background: '#050505' }} 
      center={positions[0]} 
      zoom={13} 
      zoomControl={false} // On retire les boutons +/- par défaut pour le look clean
      scrollWheelZoom={true}
    >
      {/* TUILES DARK MODE (CartoDB Dark Matter) */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        opacity={0.9}
      />

      <MapController bounds={bounds} />

      {/* TRACÉ DU PARCOURS */}
      
      {/* 1. Lueur (Glow) sous le tracé */}
      <Polyline 
        positions={positions} 
        pathOptions={{ 
          color: '#d04fd7', // Rose Pulsar
          weight: 8,        // Largeur
          opacity: 0.3,     // Transparence
          lineCap: 'round',
          lineJoin: 'round'
        }} 
      />

      {/* 2. Ligne Principale (Cœur) */}
      <Polyline 
        positions={positions} 
        pathOptions={{ 
          color: '#fff',    // Blanc
          weight: 3,        // Plus fin
          opacity: 0.9 
        }} 
      />

      {/* MARQUEURS DÉPART / ARRIVÉE */}
      <Marker position={positions[0]} icon={iconStart} />
      <Marker position={positions[positions.length - 1]} icon={iconEnd} />

    </MapContainer>
  );
}