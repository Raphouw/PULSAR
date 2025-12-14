// Fichier : lib/segmentMatcher.ts

// --- TYPES ---
export type ActivityStreamForMatching = {
  latlng: [number, number][]; // Tableau de [lat, lon]
  distance: number[];
  time: number[];
  watts?: number[]; 
  cadence?:  number[];
  heartrate?: number[];
  altitude?: number[];
};

export type SegmentIdentity = {
  id: number;
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  distance_m: number;
};

export type SegmentMatchResult = {
  segment_id: number;
  duration_s: number;
  avg_power_w: number;
  avg_speed_kmh: number;
  start_index: number; // 🔥 AJOUTER
  end_index: number;   // 🔥 AJOUTER
  distance_matched: number;
};

// --- CONFIG ---
const MATCH_TOLERANCE_METERS = 50; 
const MIN_MATCH_DISTANCE_RATIO = 0.90; 
const MAX_MATCH_DISTANCE_RATIO = 1.20; 

// --- HELPER MATHÉMATIQUE ---
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; 
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

/**
 * CAS 1 : Matching sur une ACTIVITÉ (Avec Temps/Watts)
 */
export function matchSegmentInStream(
  segment: SegmentIdentity,
  activityStream: ActivityStreamForMatching
): SegmentMatchResult | null {
  
  if (!activityStream.latlng || activityStream.latlng.length === 0) return null;

  const startCandidates: number[] = [];

  // 1. Trouver les départs
  for (let i = 0; i < activityStream.latlng.length - 1; i++) {
    const point = activityStream.latlng[i];
    if (!point) continue; 
    const [lat, lon] = point;
    if (getDistance(lat, lon, segment.start_lat, segment.start_lon) <= MATCH_TOLERANCE_METERS) {
      startCandidates.push(i);
    }
  }

  if (startCandidates.length === 0) return null;

  // 2. Trouver les arrivées
  for (const startIndex of startCandidates) {
    const minIndex = startIndex + 5; 
    for (let j = minIndex; j < activityStream.latlng.length; j++) {
      const point = activityStream.latlng[j];
      if (!point) continue;
      const [lat, lon] = point;

      if (getDistance(lat, lon, segment.end_lat, segment.end_lon) <= MATCH_TOLERANCE_METERS) {
        // Vérification Distance
        const startDist = activityStream.distance[startIndex];
        const endDist = activityStream.distance[j];
        const activityDist = endDist - startDist;
        const ratio = activityDist / segment.distance_m;

        if (ratio >= MIN_MATCH_DISTANCE_RATIO && ratio <= MAX_MATCH_DISTANCE_RATIO) {
          // Stats
          const startTime = activityStream.time[startIndex];
          const endTime = activityStream.time[j];
          const duration = endTime - startTime;
          
          let avgPower = 0;
          if (activityStream.watts && activityStream.watts.length > j) {
            const segmentWatts = activityStream.watts.slice(startIndex, j + 1);
            const validWatts = segmentWatts.filter((w): w is number => typeof w === 'number');
            if (validWatts.length > 0) {
                avgPower = Math.round(validWatts.reduce((a, b) => a + b, 0) / validWatts.length);
            }
          }

          const speedKmh = duration > 0 ? (activityDist / 1000) / (duration / 3600) : 0;
          
          return {
            segment_id: segment.id,
            duration_s: duration,
            avg_power_w: avgPower,
            avg_speed_kmh: parseFloat(speedKmh.toFixed(1)),
            start_index: startIndex, // 🔥 AJOUTER
            end_index: j,            // 🔥 AJOUTER (qui correspond à l'index de fin)
            distance_matched: parseFloat(activityDist.toFixed(1))
            };
        }
      }
    }
  }
  return null;
}

/**
 * CAS 2 : Matching GÉOMÉTRIQUE sur une ROUTE (Sans Temps/Watts)
 * Retourne TRUE si le segment est présent sur la trace.
 */
export function matchSegmentGeometry(
    segment: SegmentIdentity,
    routeCoordinates: [number, number][] // [lat, lon]
): boolean {
    if (!routeCoordinates || routeCoordinates.length < 2) return false;

    // 1. Trouver un point de départ
    const startCandidates: number[] = [];
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
        const [lat, lon] = routeCoordinates[i];
        if (getDistance(lat, lon, segment.start_lat, segment.start_lon) <= MATCH_TOLERANCE_METERS) {
            startCandidates.push(i);
        }
    }
    if (startCandidates.length === 0) return false;

    // 2. Trouver un point d'arrivée cohérent
    for (const startIndex of startCandidates) {
        // On accumule la distance réelle le long de la polyligne pour être précis
        let accumulatedDistance = 0;

        for (let j = startIndex + 1; j < routeCoordinates.length; j++) {
            const prev = routeCoordinates[j-1];
            const curr = routeCoordinates[j];
            accumulatedDistance += getDistance(prev[0], prev[1], curr[0], curr[1]);

            // Optimisation : Si on a déjà dépassé la distance max possible, on arrête cette boucle
            if (accumulatedDistance > segment.distance_m * MAX_MATCH_DISTANCE_RATIO) break;

            const distToEnd = getDistance(curr[0], curr[1], segment.end_lat, segment.end_lon);

            if (distToEnd <= MATCH_TOLERANCE_METERS) {
                // On a trouvé la fin géographiquement
                // On vérifie si la distance parcourue entre Start et End est cohérente
                const ratio = accumulatedDistance / segment.distance_m;
                if (ratio >= MIN_MATCH_DISTANCE_RATIO && ratio <= MAX_MATCH_DISTANCE_RATIO) {
                    return true; // MATCH TROUVÉ !
                }
            }
        }
    }

    return false;
}