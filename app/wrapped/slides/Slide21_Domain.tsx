// app/wrapped/slides/Slide21_Domain.tsx
'use client';

import { MapContainer, TileLayer, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useEffect } from 'react';
import { Layers } from 'lucide-react';
import { WrappedStats } from '../../../types/wrapped';

function MapAutoZoom({ paths }: { paths: [number, number][][] }) {
  const map = useMap();
  React.useEffect(() => {
    if (paths.length > 0) {
      // On aplatit tous les points pour trouver les limites géographiques
      const allPoints = paths.flat();
      const bounds = L.latLngBounds(allPoints as L.LatLngExpression[]);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [paths, map]);
  return null;
}

function MapEvents({ paths, core }: { paths: [number, number][][], core: { lat: number, lng: number } }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      
      const validPaths = paths.filter(p => p && p.length > 0);
      const allPoints = validPaths.flat();

      if (allPoints.length > 0) {
        // ✅ Si on a des traces, on zoome sur elles
        const bounds = L.latLngBounds(allPoints as L.LatLngExpression[]);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }
      } else {
        // 🏠 Sinon, on force le focus sur Annecy (Virtual Core)
        map.setView([core.lat, core.lng], 11);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [map, paths, core]);

  return null;
}

export default function SlideDomain({ stats }: { stats: WrappedStats }) {
  const { domain } = stats;

  // On nettoie les chemins pour éviter les erreurs de rendu
  const safePaths = React.useMemo(() => 
    domain.paths?.filter(p => Array.isArray(p) && p.length > 0) || []
  , [domain.paths]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="text-center mb-6">
        <h2 className="text-4xl font-black text-white italic uppercase flex items-center gap-3">
          <Layers className="text-blue-500" /> DOMAIN <span className="text-blue-500">EXPANSION</span>
        </h2>
        <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
            {safePaths.length > 0 ? "Territoires extérieurs détectés" : "Focus sur le Virtual Core"}
        </p>
      </div>

      <div className="relative w-full max-w-6xl aspect-video rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
        <MapContainer 
        
          center={[domain.virtualCore.lat, domain.virtualCore.lng]} 
          zoom={11} 
          style={{ height: '100%', width: '100%', background: '#050507' }}
          zoomControl={false}
        >
          <MapEvents paths={safePaths} core={domain.virtualCore} />
          <MapAutoZoom paths={domain.paths} />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

          {/* TRACÉS EXTÉRIEURS */}
          {safePaths.map((path, idx) => (
            <Polyline
              key={`domain-path-${idx}`}
              positions={path}
              pathOptions={{
                color: '#3b82f6',
                weight: 25,
                opacity: 0.2,
                lineCap: 'round'
              }}
            />
          ))}

          {/* VIRTUAL CORE (TJRS AFFICHÉ) */}
          <Circle
            center={[domain.virtualCore.lat, domain.virtualCore.lng]}
            radius={domain.virtualCore.radius}
            pathOptions={{
              fillColor: '#a855f7',
              fillOpacity: 0.4,
              color: '#a855f7',
              weight: 2
            }}
          />
        </MapContainer>

        <div className="absolute bottom-8 left-8 bg-black/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 z-[1000]">
          <div className="text-[10px] text-blue-400 font-bold uppercase mb-1 font-mono">Empreinte Globale</div>
          <div className="text-4xl font-black text-white italic tracking-tighter">
            {domain.totalAreaKm2} <span className="text-sm opacity-50 uppercase">km²</span>
          </div>
        </div>
      </div>
    </div>
  );
}