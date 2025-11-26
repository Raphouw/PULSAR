// Fichier : app/events/admin/MapClickPicker.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';

// Correction des icônes Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapClickPickerProps {
  lat: number | null;
  lon: number | null;
  onMapClick: ({ lat, lon }: { lat: number, lon: number }) => void;
}

export default function MapClickPicker({ lat, lon, onMapClick }: MapClickPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const initialLat = 46.2; // Genève/France
  const initialLon = 6.1;

  // 1. Initialisation de la carte
  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map-container', {
        center: [lat || initialLat, lon || initialLon],
        zoom: lat ? 12 : 8, // Zoom de départ un peu plus large
        zoomControl: true,
        attributionControl: false,
      });

      // 🔥 CONFIGURATION SPÉCIFIQUE CYCLOSM (Anti-Bug)
      L.tileLayer(
        'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
        { 
            // ⚠️ CRUCIAL : CyclOSM n'a souvent pas de tuiles au delà de 18. 
            // Si on met 19, on a des carrés gris.
            maxZoom: 18, 
            minZoom: 5,
            attribution: 'CyclOSM'
        }
      ).addTo(mapRef.current);

      mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick({ lat: e.latlng.lat, lon: e.latlng.lng });
      });
      
      mapRef.current.invalidateSize();
    }
    
    return () => {
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
    };
  }, []); 

  // 2. Mise à jour du marqueur
  useEffect(() => {
    if (mapRef.current && lat !== null && lon !== null) {
      const newLatLng: L.LatLngTuple = [lat, lon];
      
      if (!markerRef.current) {
        const customIcon = L.divIcon({
            className: 'pulsar-marker',
            html: '<div style="background:#d04fd7; width:20px; height:20px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 15px #d04fd7;"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
        });
        markerRef.current = L.marker(newLatLng, { icon: customIcon }).addTo(mapRef.current);
      } else {
        markerRef.current.setLatLng(newLatLng);
      }
      
      // Zoom prudent pour rester dans les tuiles existantes
      if (mapRef.current.getZoom() < 11) {
          mapRef.current.setView(newLatLng, 12);
      } else {
          mapRef.current.panTo(newLatLng);
      }
    }
  }, [lat, lon]);
  

  return (
    // 🔥 STYLE : Fond gris clair (#e5e5e5) pour matcher la carte Cyclo pendant le chargement
    // Cela évite l'effet "flash noir" ou "carré cassé"
    <div id="map-container" style={{ height: '100%', width: '100%', cursor: 'crosshair', background: '#e5e5e5', borderRadius: '12px' }} />
  );
}