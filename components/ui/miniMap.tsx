// Fichier : app/components/ui/miniMap.tsx
'use client'; 

import React, { useMemo, useState, useEffect, useRef } from 'react'; 
import polyline from '@mapbox/polyline'; // Assure-toi d'avoir fait: npm install @mapbox/polyline

type LatLngTuple = [number, number];
type MiniMapProps = {
  encodedPolyline: string;
  color?: string; // 🔥 AJOUT DE LA PROP COLOR
  mapHeight?: string; // 🔥 AJOUT DE LA PROP HEIGHT
};

const DEFAULT_MAP_HEIGHT = '200px';

const MiniMap = React.memo(function MiniMap({ encodedPolyline, color = '#d04fd7', mapHeight = DEFAULT_MAP_HEIGHT }: MiniMapProps) {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null); // Utilisation de any pour éviter les erreurs de typage strict sans @types/leaflet
  // L.Polyline Layer pour les mises à jour dynamiques
  const polylineLayerRef = useRef<any>(null); 

  useEffect(() => {
    setMounted(true);
  }, []);

  const decodedPolyline: LatLngTuple[] = useMemo(() => {
    if (!encodedPolyline) return [];
    
    try {
      const decoded = polyline.decode(encodedPolyline);
      if (!decoded || decoded.length === 0) {
        return [];
      }
      return decoded.map((p) => [p[0], p[1]] as LatLngTuple);
    } catch (err) {
      console.warn('Error decoding polyline:', err);
      return [];
    }
  }, [encodedPolyline]);

  // 🔥 Logique d'initialisation et de mise à jour du tracé/couleur
  useEffect(() => {
    if (!mounted || !mapContainerRef.current || !decodedPolyline.length) return;

    let isCancelled = false;
    let L: any;

    const initializeMap = async () => {
        try {
            // 1. Gestion sécurisée du CSS
            const cssId = 'leaflet-css-cdn';
            if (!document.getElementById(cssId)) {
                const link = document.createElement('link');
                link.id = cssId;
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
                link.crossOrigin = '';
                document.head.appendChild(link);
            }

            // 2. Import dynamique de Leaflet (si non déjà importé par un autre composant)
            L = await import('leaflet');
            
            if (isCancelled) return;

            // 3. Initialisation ou Utilisation Carte Existante
            if (!mapRef.current) {
                mapRef.current = L.map(mapContainerRef.current!, {
                    zoomControl: false, dragging: false, scrollWheelZoom: false,
                    doubleClickZoom: false, touchZoom: false, trackResize: false,
                    attributionControl: false, 
                });

                // Tile Layer (Dark Matter)
                L.tileLayer(
                    'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
                    { maxZoom: 19, subdomains: 'abcd' }
                ).addTo(mapRef.current);

                // Initialisation Polyline
                polylineLayerRef.current = L.polyline(decodedPolyline, {
                    color: color, // 🔥 Utilisation de la prop color
                    weight: 3, opacity: 0.9, lineJoin: 'round',
                }).addTo(mapRef.current);

                // Cadrage Initial
                mapRef.current.fitBounds(polylineLayerRef.current.getBounds(), { 
                    padding: [20, 20], animate: false 
                });
            
            } else {
                // Si la carte existe, on met à jour la polyline si le tracé change
                const polylineLayer = polylineLayerRef.current;
                
                // Mise à jour de la couleur
                polylineLayer.setStyle({ color: color });
                
                // Mise à jour des coordonnées et du cadrage
                polylineLayer.setLatLngs(decodedPolyline);
                mapRef.current.fitBounds(polylineLayer.getBounds(), { 
                    padding: [20, 20], animate: false 
                });
            }

        } catch (err) {
            console.error('Error initializing/updating map:', err);
            if (!isCancelled) setError('Erreur carte');
        }
    };

    initializeMap();

    return () => {
      isCancelled = true;
      // On ne retire pas la carte pour ne pas la recharger à chaque changement de tracé
      // On la retire uniquement au démontage final du composant (géré par un autre useEffect ou plus tard)
    };
  }, [mounted, encodedPolyline, color, decodedPolyline]); // 🔥 Dépendances mises à jour

  // Logique de nettoyage au démontage
  useEffect(() => {
    return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          polylineLayerRef.current = null;
        }
    };
  }, []);

  // Styles locaux basés sur les props
  const localMapContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: mapHeight, // 🔥 Utilisation de la prop mapHeight
    background: '#1a1a24',
  };


  if (!mounted) {
    return (
      <div style={localMapContainerStyle}>
        <div style={loadingStyle}></div>
      </div>
    );
  }

  if (error || (mounted && decodedPolyline.length === 0)) {
    return (
      <div style={localMapContainerStyle}>
        <div style={loadingStyle}>Pas de tracé</div>
      </div>
    );
  }

  return (
    <div style={localMapContainerStyle}>
      <div ref={mapContainerRef} style={mapStyle} />
      {/* Overlay gradient pour l'intégration stylée en bas de carte */}
      <div style={gradientOverlayStyle} />
    </div>
  );
});

export default MiniMap;

// --- STYLES GLOBALES (MODIFIÉES POUR UTILISER UNE VARIABLE DE HAUTEUR) ---

const mapStyle: React.CSSProperties = {
  height: '100%',
  width: '100%',
  backgroundColor: 'transparent', 
};

const gradientOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40px',
    background: 'linear-gradient(to top, rgba(43, 43, 58, 0) 0%, rgba(43, 43, 58, 0) 100%)',
    pointerEvents: 'none',
    zIndex: 400
};

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#555',
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '1px'
};