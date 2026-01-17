//fichier : app\components\admin\AdminMap.tsx

"use client";

import { MapContainer, TileLayer, Polyline, useMap, LayersControl, Tooltip, Popup, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState, useMemo } from "react";

// --- TYPES ---
type SegmentLight = {
  id: number;
  name: string;
  is_official: boolean;
  polyline: [number, number][]; 
  tags?: any; // Pour vérifier le statut 'rejected'
};

// --- MARQUEURS ---
const createNeonIcon = (color: string) => {
  const html = `
    <div class="relative flex items-center justify-center w-6 h-6">
      <div class="absolute w-full h-full rounded-full opacity-50 animate-ping" style="background-color: ${color}"></div>
      <div class="relative w-3 h-3 rounded-full border-2 border-white shadow-[0_0_10px_${color}]" style="background-color: ${color}"></div>
    </div>
  `;
  return L.divIcon({ html, className: "bg-transparent", iconSize: [24, 24], iconAnchor: [12, 12] });
};

const StartIcon = createNeonIcon("#d04fd7"); // Rose pour le départ

// --- HOOKS ---
function AutoFitBound({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      map.fitBounds(coords, { padding: [80, 80] });
    }
  }, [coords, map]);
  return null;
}

// --- COMPOSANT MAP ---
export default function AdminMap({ polyline }: { polyline: any[] }) {
  const [nearbySegments, setNearbySegments] = useState<SegmentLight[]>([]);

  // 1. Préparation Candidat
  const candidateLine = useMemo(() => {
    if (!polyline || polyline.length === 0) return [];
    return polyline.map(p => [p[0], p[1]]) as [number, number][];
  }, [polyline]);

  const startPoint = candidateLine.length > 0 ? candidateLine[0] : null;
  // Centre par défaut (France) si pas de ligne
  const center = candidateLine.length > 0 ? candidateLine[Math.floor(candidateLine.length / 2)] : [46.603354, 1.888334];

  // 2. Récupération des Voisins
  useEffect(() => {
    if (!startPoint) return;

    const fetchNearby = async () => {
      // Zone de recherche : Carré de ~10km (0.1°) autour du départ
      const MARGIN = 0.1;
      const payload = {
        minLat: startPoint[0] - MARGIN, maxLat: startPoint[0] + MARGIN,
        minLon: startPoint[1] - MARGIN, maxLon: startPoint[1] + MARGIN
      };

      try {
        const res = await fetch('/api/admin/map-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const rawData = await res.json();
            const cleanData = rawData.map((d: any) => ({
                id: d.id,
                name: d.name,
                is_official: d.is_official,
                tags: d.tags, // Important pour le statut rejected
                polyline: typeof d.polyline === 'string' 
                    ? JSON.parse(d.polyline).map((p:any) => [p[0], p[1]]) 
                    : d.polyline.map((p:any) => [p[0], p[1]])
            }));
            setNearbySegments(cleanData);
        }
      } catch (e) { console.error("Erreur chargement voisins:", e); }
    };

    fetchNearby();
  }, [startPoint]);

  if (!candidateLine || candidateLine.length === 0) return null;

  return (
    <div className="relative w-full h-full">
        <MapContainer 
            center={center as [number, number]} 
            zoom={13} 
            style={{ height: "100%", width: "100%", background: "#111" }}
            zoomControl={false}
        >
            <LayersControl position="bottomright">
                {/* 1. OpenStreetMap (PAR DÉFAUT) */}
                <LayersControl.BaseLayer checked name="OpenStreetMap">
                    <TileLayer
                        attribution='&copy; OSM'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                </LayersControl.BaseLayer>

                {/* 2. Satellite */}
                <LayersControl.BaseLayer name="Satellite HD">
                    <TileLayer
                        attribution='&copy; Esri'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                </LayersControl.BaseLayer>

                {/* 3. Dark Mode */}
                <LayersControl.BaseLayer name="Cyber Dark">
                    <TileLayer
                        attribution='&copy; CARTO'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                </LayersControl.BaseLayer>
            </LayersControl>

            {/* --- VOISINS (CONTEXTE) --- */}
            {nearbySegments.map((seg) => {
                const isOfficial = seg.is_official;
                const isRejected = seg.tags?.status === 'rejected';

                // LOGIQUE COULEUR & STYLE
                let color = "#6b7280"; // Gris (Brouillon par défaut)
                let zIndex = 5;
                let dashArray = "6, 8"; // Pointillés

                if (isOfficial) {
                    color = "#10b981"; // Vert (Officiel)
                    zIndex = 10;
                    dashArray = ""; // Ligne pleine
                } else if (isRejected) {
                    color = "#ef4444"; // Rouge (Rejeté)
                    zIndex = 2;
                }

                return (
                    <Polyline
                        key={seg.id}
                        positions={seg.polyline}
                        pathOptions={{ 
                            color, 
                            weight: isOfficial ? 5 : 3, 
                            opacity: isOfficial ? 0.8 : 0.5, 
                            dashArray, 
                            
                        }}
                    >
                        <Popup>
                            <div className="text-xs font-bold text-gray-800">
                                {isOfficial ? "✅ OFFICIEL" : isRejected ? "❌ REJETÉ" : "⚠️ BROUILLON"}<br/>
                                {seg.name} (#{seg.id})
                            </div>
                        </Popup>
                        <Tooltip sticky direction="top" className="text-[10px] font-bold border-0 bg-white/90 text-black">
                            {seg.name}
                        </Tooltip>
                    </Polyline>
                );
            })}

            {/* --- CANDIDAT (HÉROS) --- */}
            {/* Ligne épaisse colorée */}
            <Polyline 
                positions={candidateLine} 
                pathOptions={{ color: "#d04fd7", weight: 6, opacity: 1  }} 
            />
            {/* Ligne blanche fine au centre */}
            <Polyline 
                positions={candidateLine} 
                pathOptions={{ color: "#fff", weight: 2, opacity: 0.8, dashArray: "10, 10" }} 
            />
            
            {/* Marqueur Départ */}
            {startPoint && (
                <Marker position={startPoint as [number, number]} icon={StartIcon}>
                     <Tooltip permanent direction="bottom" offset={[0, 10]} className="bg-black/80 text-[#d04fd7] border-[#d04fd7] font-bold text-[10px]">CANDIDAT</Tooltip>
                </Marker>
            )}

            <AutoFitBound coords={candidateLine} />
        </MapContainer>

        {/* --- LÉGENDE FIXE --- */}
        <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-black/80 backdrop-blur border border-gray-300 dark:border-white/10 p-3 rounded-lg z-[1000] text-[10px] shadow-xl space-y-2 pointer-events-none">
            <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-[#d04fd7] border-b border-white border-dashed"></div>
                <span className="text-[#d04fd7] font-bold uppercase">Candidat</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-[#10b981]"></div>
                <span className="text-[#10b981] font-bold uppercase">Officiel (Validé)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-[#6b7280] border-t-2 border-dashed border-white/50"></div>
                <span className="text-gray-500 font-bold uppercase">Brouillon</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-[#ef4444] border-t-2 border-dashed border-white/50"></div>
                <span className="text-[#ef4444] font-bold uppercase">Rejeté</span>
            </div>
        </div>
    </div>
  );
}