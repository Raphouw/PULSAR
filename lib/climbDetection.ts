import { lat2tile, lon2tile } from "./mapUtils";

// Types stricts
export interface ClimbCandidate {
  start_index: number;
  end_index: number;
  distance_m: number;
  elevation_gain_m: number;
  avg_grade: number;
  polyline: [number, number][]; // [lat, lon]
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  confidence_score: number; // 0-100
}

interface StreamData {
  latlng: [number, number][];
  distance: number[];
  altitude: number[];
}

// Constantes de détection (Mode Brutal mais Juste)
const MIN_CLIMB_GRADE = 3.0; // % moyen minimum
const MIN_ELEVATION_GAIN = 70; // mètres D+ minimum (pour éviter les faux positifs urbains)
const MIN_DISTANCE = 800; // mètres
const YO_YO_TOLERANCE_M = 15; // On tolère 15m de D- sur une montée (replats/légère descente)

/**
 * Nettoie une trace "sale" (avec des demi-tours) pour en extraire le segment pur.
 * "Trafique" les coordonnées pour avoir une ligne du bas vers le haut.
 */
function sanitizeClimbGeometry(
  points: [number, number][], 
  alts: number[], 
  dists: number[]
): [number, number][] {
  if (points.length < 2) return points;

  const cleanPoints: [number, number][] = [];
  cleanPoints.push(points[0]);
  
  let maxAltSoFar = alts[0];
  
  // On ne garde que les points qui contribuent à l'ascension ou aux replats logiques
  // Si on redescend trop violemment (demi-tour), on ignore ces points jusqu'à ce qu'on remonte
  for (let i = 1; i < points.length; i++) {
    const alt = alts[i];
    
    // Si on est au dessus du max précédent, on garde c'est sûr
    if (alt >= maxAltSoFar) {
      cleanPoints.push(points[i]);
      maxAltSoFar = alt;
    } 
    // Si on descend un peu (replat), on garde, mais si c'est une grosse descente (demi-tour), on ignore
    else if (maxAltSoFar - alt < YO_YO_TOLERANCE_M) {
        cleanPoints.push(points[i]);
    }
    // Sinon (grosse descente), on "coupe" ce passage -> c'est ici qu'on "trafique" pour éviter les boucles
  }

  // S'assurer que le dernier point est bien le sommet absolu de la séquence sélectionnée
  return cleanPoints;
}

export function detectClimbsInStream(streams: StreamData): ClimbCandidate[] {
  const candidates: ClimbCandidate[] = [];
  
  if (!streams.altitude || !streams.distance || !streams.latlng) return [];

  let climbStartIdx = -1;
  let accumulatedGain = 0;
  let lastAltitude = streams.altitude[0];

  // Scan linéaire
  for (let i = 1; i < streams.distance.length; i++) {
    const dAlt = streams.altitude[i] - streams.altitude[i-1];
    
    // Si on monte
    if (dAlt > 0) {
      if (climbStartIdx === -1) climbStartIdx = i - 1;
      accumulatedGain += dAlt;
    } 
    // Si on descend significativement ou si c'est la fin
    else if (dAlt < -YO_YO_TOLERANCE_M || i === streams.distance.length - 1) {
      // Fin potentielle de montée
      if (climbStartIdx !== -1) {
        const segmentDist = streams.distance[i-1] - streams.distance[climbStartIdx];
        const totalGain = streams.altitude[i-1] - streams.altitude[climbStartIdx];
        const grade = (segmentDist > 0) ? (totalGain / segmentDist) * 100 : 0;

        // Vérification des seuils
        if (totalGain >= MIN_ELEVATION_GAIN && segmentDist >= MIN_DISTANCE && grade >= MIN_CLIMB_GRADE) {
            
            // Extraction et Nettoyage de la géométrie
            const rawPoints = streams.latlng.slice(climbStartIdx, i);
            const rawAlts = streams.altitude.slice(climbStartIdx, i);
            const rawDists = streams.distance.slice(climbStartIdx, i);

            const cleanPolyline = sanitizeClimbGeometry(rawPoints, rawAlts, rawDists);
            
            // Double check après nettoyage
            if (cleanPolyline.length > 5) {
                candidates.push({
                    start_index: climbStartIdx,
                    end_index: i - 1,
                    distance_m: parseFloat(segmentDist.toFixed(1)),
                    elevation_gain_m: parseFloat(totalGain.toFixed(1)),
                    avg_grade: parseFloat(grade.toFixed(1)),
                    polyline: cleanPolyline,
                    start_lat: streams.latlng[climbStartIdx][0],
                    start_lon: streams.latlng[climbStartIdx][1],
                    end_lat: streams.latlng[i-1][0],
                    end_lon: streams.latlng[i-1][1],
                    confidence_score: 80 // Base score, could be improved with map matching
                });
            }
        }
      }
      // Reset si on descend trop longtemps
      if (dAlt < -YO_YO_TOLERANCE_M * 2) {
          climbStartIdx = -1;
          accumulatedGain = 0;
      }
    }
    lastAltitude = streams.altitude[i];
  }

  return candidates;
}

// Helper pour nommage auto (Placeholder pour future API externe)
export function generateAutoName(startLat: number, startLon: number, grade: number, dist: number): string {
  // TODO: Appeler API Reverse Geocoding (Mapbox/Google) ici
  // Pour l'instant, convention technique
  const type = grade > 8 ? "Mur" : grade > 5 ? "Col" : "Montée";
  return `${type} Inconnu (${dist.toFixed(1)}km à ${grade.toFixed(1)}%)`;
}