// Fichier : app/events/admin/MapClickPicker.tsx
'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
// import 'leaflet.markercluster'; // Pour le clustering si besoin (bien que non utilisé ici)
// 🔥 CORRECTION: L'importation de 'leaflet.markercluster' est supprimée car elle causait
// l'erreur "Module not found". Si la fonctionnalité de clustering est nécessaire à l'avenir,
// la dépendance devra être installée (npm install leaflet.markercluster).

// Correction des icônes Leaflet cassées
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

  // 1. Initialisation de la carte (une seule fois)
  useEffect(() => {
    if (!mapRef.current) {
      // 1.1 Création de la carte
      mapRef.current = L.map('map-container', {
        center: [lat || initialLat, lon || initialLon],
        zoom: lat ? 12 : 7,
        zoomControl: true,
        attributionControl: false,
      });

      // 1.2 Ajout de la couche de tuiles (Dark Matter - Thème Pulsar)
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, subdomains: 'abcd' }
      ).addTo(mapRef.current);

      // 1.3 Gestion du clic sur la carte
      mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick({ lat: e.latlng.lat, lon: e.latlng.lng });
      });
      
      // 1.4 Gestion de la taille (pour éviter le bug de tuiles)
      mapRef.current.invalidateSize();
    }
    
    // Nettoyage au démontage
    return () => {
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
    };
  }, []);

  // 2. Mise à jour du marqueur lorsque (lat, lon) change
  useEffect(() => {
    if (mapRef.current && lat !== null && lon !== null) {
      const newLatLng: L.LatLngTuple = [lat, lon];
      
      if (!markerRef.current) {
        // Créer un marqueur Pulsar personnalisé (facultatif mais stylé)
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
      
      // Centrer la vue sur le marqueur lors du premier placement ou après une mise à jour manuelle
      if (mapRef.current.getZoom() < 10) {
          mapRef.current.setView(newLatLng, 12);
      }
    }
  }, [lat, lon]);
  

  return (
    <div id="map-container" style={{ height: '100%', width: '100%', cursor: 'crosshair' }} />
  );
}