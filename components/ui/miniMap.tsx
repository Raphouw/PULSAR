// Fichier : app/components/ui/miniMap.tsx
'use client'; 

import React, { useMemo, useState, useEffect, useRef } from 'react'; 
import polyline from '@mapbox/polyline'; 

type LatLngTuple = [number, number];

type MiniMapProps = {
  encodedPolyline: string;
  color?: string;       
  mapHeight?: string;   
  interactive?: boolean; 
  fitBoundsPadding?: [number, number]; // [bottomRightX, bottomRightY]
};

const MiniMap = React.memo(function MiniMap({ 
    encodedPolyline, 
    color = '#d04fd7', 
    mapHeight = '100%',
    interactive = false,
    fitBoundsPadding = [20, 20] // Valeur par défaut stable
}: MiniMapProps) {
  
  const [mounted, setMounted] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null); 
  const polylineLayerRef = useRef<any>(null); 

  useEffect(() => {
    setMounted(true);
  }, []);

  const decodedPolyline: LatLngTuple[] = useMemo(() => {
    if (!encodedPolyline) return [];
    try {
      return polyline.decode(encodedPolyline).map((p) => [p[0], p[1]] as LatLngTuple);
    } catch (err) {
      console.warn('Error decoding polyline:', err);
      return [];
    }
  }, [encodedPolyline]);

  // On extrait les valeurs primitives pour le tableau de dépendances du useEffect
  // Cela empêche le crash "changed size" ou les boucles infinies
  const padX = fitBoundsPadding[0];
  const padY = fitBoundsPadding[1];

  useEffect(() => {
    if (!mounted || !mapContainerRef.current || !decodedPolyline.length) return;

    let isCancelled = false;
    let L: any;

    const initializeMap = async () => {
        try {
            // Injection CSS Leaflet
            const cssId = 'leaflet-css-cdn';
            if (!document.getElementById(cssId)) {
                const link = document.createElement('link');
                link.id = cssId;
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                link.crossOrigin = '';
                document.head.appendChild(link);
            }

            L = await import('leaflet');
            if (isCancelled) return;

            // CONFIGURATION DE LA CARTE
            if (!mapRef.current) {
                mapRef.current = L.map(mapContainerRef.current!, {
                    zoomControl: interactive, 
                    dragging: interactive, 
                    scrollWheelZoom: interactive ? 'center' : false,
                    doubleClickZoom: interactive, 
                    touchZoom: interactive, 
                    trackResize: true,
                    attributionControl: false, 
                    zoomSnap: 0.25,
                });

                // 🔥 CHANGEMENT DE TUILE : CyclOSM (Style Cyclo / Vert)
                L.tileLayer(
                    'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
                    { 
                        maxZoom: 20, 
                        attribution: 'CyclOSM | OSM',
                        opacity: 1 
                    }
                ).addTo(mapRef.current);

                polylineLayerRef.current = L.polyline(decodedPolyline, {
                    color: color, 
                    weight: 5, // Un peu plus épais pour bien voir le tracé sur le fond vert
                    opacity: 1, 
                    lineJoin: 'round',
                    lineCap: 'round'
                }).addTo(mapRef.current);

                // FIT BOUNDS
                const bounds = polylineLayerRef.current.getBounds();
                mapRef.current.fitBounds(bounds, { 
                    paddingTopLeft: [20, 20],   
                    paddingBottomRight: [padX, padY], // Utilisation des variables locales
                    animate: false 
                });
            
            } else {
                // MISE A JOUR
                const polylineLayer = polylineLayerRef.current;
                polylineLayer.setStyle({ color: color });
                polylineLayer.setLatLngs(decodedPolyline);
                
                mapRef.current.invalidateSize();
                mapRef.current.fitBounds(polylineLayer.getBounds(), { 
                    paddingTopLeft: [20, 20],
                    paddingBottomRight: [padX, padY],
                    animate: false 
                });
            }

        } catch (err) {
            console.error(err);
        }
    };

    initializeMap();

    return () => { isCancelled = true; };
    
  // 🔥 FIX CRITIQUE : On passe padX et padY (nombres) au lieu du tableau fitBoundsPadding
  }, [mounted, encodedPolyline, color, decodedPolyline, interactive, padX, padY]); 

  // Cleanup
  useEffect(() => {
    return () => {
      if (mapRef.current) {
         mapRef.current.remove();
         mapRef.current = null;
      }
    };
  }, []);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: mapHeight, 
    background: '#e0e0e0', // Fond gris un peu plus soutenu en attendant CyclOSM
    borderRadius: 'inherit',
    overflow: 'hidden'
  };

  if (!mounted) return <div style={containerStyle} />;

  return (
    <div style={containerStyle}>
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
});

export default MiniMap;