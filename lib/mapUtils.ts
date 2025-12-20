// lib/mapUtils.ts

// Constantes pour les calculs de tuiles (Zoom 14 = Squadrats / Explorer Score)
const ZOOM = 14;

// --------------------------------------------------------------------------
// 1. CONVERSION COORDONNÉES <-> TUILES (Slippy Map System)
// --------------------------------------------------------------------------

export const lon2tile = (lon: number, zoom: number): number => {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
};

export const lat2tile = (lat: number, zoom: number): number => {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
};

export const tile2lon = (x: number, z: number): number => {
  return (x / Math.pow(2, z)) * 360 - 180;
};

export const tile2lat = (y: number, z: number): number => {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

export const getTileBounds = (x: number, y: number, z: number): [[number, number], [number, number]] => {
  const n = Math.pow(2, z);
  const lon1 = (x / n) * 360 - 180;
  const lat1_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat1 = (lat1_rad * 180) / Math.PI;

  const lon2 = ((x + 1) / n) * 360 - 180;
  const lat2_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
  const lat2 = (lat2_rad * 180) / Math.PI;

  // Leaflet attend [Lat, Lon]
  return [
    [lat1, lon1], // Nord-Ouest
    [lat2, lon2]  // Sud-Est
  ];
};

export const getTileCenter = (x: number, y: number, z: number): [number, number] => {
  const bounds = getTileBounds(x, y, z); // [[lat1, lon1], [lat2, lon2]]
  
  // Lat1 est Nord-Ouest, Lat2 est Sud-Est
  const latCenter = (bounds[0][0] + bounds[1][0]) / 2;
  const lonCenter = (bounds[0][1] + bounds[1][1]) / 2;
  
  return [latCenter, lonCenter];
};

// --------------------------------------------------------------------------
// 2. UTILITAIRES DE DISTANCE & GÉOMÉTRIE
// --------------------------------------------------------------------------

/**
 * Calcul de distance simple (Haversine allégé pour la perf)
 * ⚡ EXPORTED : Utilisé désormais par le scanner de cols
 */
export function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Rayon de la terre en mètres
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 🔥 FIX : Interpolation pour ne rater aucune tuile sur l'Arbre-Monde
 * Décode une polyline et remplit les trous si la vitesse était trop élevée (points espacés)
 */
export const getTilesFromPolyline = (polylineStr: string): string[] => {
  if (!polylineStr) return [];
  
  // On utilise require pour éviter les problèmes de typage si @types/mapbox__polyline manque
  const polyline = require('@mapbox/polyline');
  const points = polyline.decode(polylineStr); // [[lat, lon], [lat, lon]...]
  const tiles = new Set<string>();

  if (points.length === 0) return [];

  // Ajouter le premier point
  tiles.add(`${lon2tile(points[0][1], ZOOM)},${lat2tile(points[0][0], ZOOM)}`);

  for (let i = 0; i < points.length - 1; i++) {
    const [lat1, lon1] = points[i];
    const [lat2, lon2] = points[i + 1];

    // Calcul de la distance entre les deux points GPS
    const dist = getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2);

    // Si la distance est grande (> 50m), on interpole
    // Cela évite de sauter par dessus une tuile lors d'une activité rapide ou perte de signal
    if (dist > 50) {
      const steps = Math.ceil(dist / 30); // Un point tous les 30 mètres virtuellement
      for (let j = 1; j < steps; j++) {
        const fraction = j / steps;
        const lat = lat1 + (lat2 - lat1) * fraction;
        const lon = lon1 + (lon2 - lon1) * fraction;
        tiles.add(`${lon2tile(lon, ZOOM)},${lat2tile(lat, ZOOM)}`);
      }
    }

    // Ajouter le point réel final
    tiles.add(`${lon2tile(lon2, ZOOM)},${lat2tile(lat2, ZOOM)}`);
  }

  return Array.from(tiles);
};