//fichier : lib\climbDetection.ts

import { getDistanceFromLatLonInMeters } from "./mapUtils";

export interface DetectedClimb {
  startIndex: number;
  endIndex: number;
  dist_m: number;
  elev_m: number;
  avg_grade: number;
  max_grade: number;
  polyline: number[][]; // [lat, lon, alt]
  pulsar_index: number;
  pulsar_density: number;
  pulsar_sigma: number;
  pulsar_category: string;
}

// --- A. MATHÉMATIQUES PULSAR (Portage exact de tes formules) ---

const calculateSigma = (polyline: number[][]): number => {
    if (!polyline || polyline.length < 5) return 0;
    
    const sigmaGrades: number[] = [];
    let distAcc = 0;
    let lastEle = polyline[0][2] || 0;

    for (let i = 1; i < polyline.length; i++) {
        const p1 = polyline[i - 1];
        const p2 = polyline[i];
        const d = getDistanceFromLatLonInMeters(p1[0], p1[1], p2[0], p2[1]);
        
        distAcc += d;

        // Fenêtre de 25m pour la variance (comme dans ton physics.ts)
        if (distAcc >= 25) { 
            const eleDiff = (p2[2] || 0) - lastEle;
            if (distAcc > 0) {
                sigmaGrades.push((eleDiff / distAcc) * 100);
            }
            distAcc = 0;
            lastEle = p2[2] || 0;
        }
    }

    if (sigmaGrades.length > 1) {
        const mean = sigmaGrades.reduce((a, b) => a + b, 0) / sigmaGrades.length;
        const variance = sigmaGrades.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sigmaGrades.length;
        return parseFloat(Math.sqrt(variance).toFixed(2));
    }
    return 0;
};

const getPulsarCategoryLabel = (index: number, distanceM: number, density: number): string => {
    if (distanceM >= 50000 && density < 30) return 'BOUCLE MYTHIQUE';
    if (index > 7500) return 'ICONIC';
    if (index > 6500) return 'HC';
    if (index > 5000) return 'CAT 1';
    if (index > 3000) return 'CAT 2';
    if (index > 1500) return 'CAT 3';
    if (index > 1000) return 'CAT 4';
    if (index > 500) return 'COTE REGION';
    return 'NC'; 
};

export const calculatePulsarMetrics = (
    dist_m: number, 
    elev_m: number, 
    grade: number, 
    polyline: number[][]
) => {
    const H = Math.max(1, elev_m);
    const L = Math.max(100, dist_m);
    const AvgP = Math.max(0, grade);
    const density = H / (L / 1000); 

    // 1. Calcul Sigma
    let sigma = calculateSigma(polyline);
    if (sigma === 0) {
        if (AvgP > 3) sigma = 1.2; else sigma = 0.5;
    }

    // 2. Max Altitude pour facteur oxygène
    let maxAlt = 0;
    for(const p of polyline) if(p[2] > maxAlt) maxAlt = p[2];

    // 3. Facteurs
    const AltFactor = 1 + (maxAlt / 8000);
    const Pivot = 1 + ((sigma * (AvgP - 8)) / 50);

    // 4. Formule Base Pulsar
    const Base = (20 * (Math.pow(H, 2) / L)) + (3 * H);
    const rawScore = Base * AltFactor * Pivot;

    const index = Math.round(rawScore);
    const category = getPulsarCategoryLabel(index, dist_m, density);

    return { 
        index, 
        density: parseFloat(density.toFixed(1)), 
        sigma,
        category 
    };
};

// --- B. HELPERS ---
const calculateMaxGrade = (dists: number[], alts: number[], start: number, end: number): number => {
    let maxG = 0;
    for (let i = start; i < end; i++) {
        let j = i;
        // Lissage sur ~100m pour éviter les pics GPS absurdes
        while (j < end && (dists[j] - dists[i]) < 100) j++;
        
        if (j > i) {
            const d = dists[j] - dists[i];
            const e = alts[j] - alts[i];
            if (d > 10) { 
                const g = (e / d) * 100;
                if (g > maxG) maxG = g;
            }
        }
    }
    return parseFloat(maxG.toFixed(1)); 
};

const mergeStreams = (latlng: number[][], alt: number[]): number[][] => {
    return latlng.map((point, i) => [point[0], point[1], alt[i] || 0]);
};

const smoothAltitude = (alts: number[], windowSize = 5): number[] => {
  return alts.map((val, i, arr) => {
    let sum = 0, count = 0;
    for (let j = i - windowSize; j <= i + windowSize; j++) {
      if (arr[j] !== undefined) { sum += arr[j]; count++; }
    }
    return sum / count;
  });
};

export function generateAutoName(dist_m: number, grade: number) {
    const d = isNaN(dist_m) ? 0 : dist_m;
    const g = isNaN(grade) ? 0 : grade;
    return `[AUTO] Detected Climb (${(d/1000).toFixed(1)}km ${g.toFixed(1)}%)`;
}

function expandClimbBoundaries(startIndex: number, endIndex: number, distance: number[], altitude: number[]) {
    const len = distance.length;
    const SEARCH_RANGE_M = 2000; 
    const MIN_APPROACH_GRADE = 1.0; 
    let newStart = startIndex;
    let newEnd = endIndex;

    let currentIdx = startIndex;
    while (currentIdx > 0) {
        const dDist = distance[startIndex] - distance[currentIdx];
        if (dDist > SEARCH_RANGE_M) break;
        const prevIdx = currentIdx - 1;
        const diffAlt = altitude[currentIdx] - altitude[prevIdx];
        const segDist = distance[currentIdx] - distance[prevIdx];
        if (segDist <= 0.1) { currentIdx--; continue; }
        const grade = (diffAlt / segDist) * 100;
        if (grade >= MIN_APPROACH_GRADE) newStart = prevIdx; else if (grade < -2.0) break;
        currentIdx--;
    }

    currentIdx = endIndex;
    while (currentIdx < len - 1) {
        const dDist = distance[currentIdx] - distance[endIndex];
        if (dDist > SEARCH_RANGE_M) break;
        const nextIdx = currentIdx + 1;
        const nextAlt = altitude[nextIdx];
        const segDist = distance[nextIdx] - distance[currentIdx];
        if (segDist <= 0.1) { currentIdx++; continue; }
        if (nextAlt >= altitude[newEnd] - 2) { if (nextAlt > altitude[newEnd]) newEnd = nextIdx; } else { break; }
        currentIdx++;
    }
    return { newStart, newEnd };
}

// --- D. FONCTION PRINCIPALE ---

export function detectClimbsInStream(
    stream: { distance: number[], altitude: number[], latlng: number[][] }
): DetectedClimb[] {
    const alts = smoothAltitude(stream.altitude, 5);
    const dists = stream.distance;
    const len = dists.length;
    const fullPolyline = mergeStreams(stream.latlng, alts);

    const candidates: DetectedClimb[] = [];
    const MIN_GRADE_CORE = 3.5; 
    const MIN_DIST_CORE = 500;  

    let inClimb = false;
    let startI = 0;

    for (let i = 1; i < len; i++) {
        const d = dists[i] - dists[i-1];
        const e = alts[i] - alts[i-1];
        if (d <= 0.1) continue; 
        const grade = (e / d) * 100;

        if (!inClimb) {
            if (grade >= MIN_GRADE_CORE) { inClimb = true; startI = i - 1; }
        } else {
            if (grade < -3.0) {
                const coreDist = dists[i] - dists[startI];
                const coreElev = alts[i] - alts[startI];
                
                if (coreDist > MIN_DIST_CORE && coreElev > 30) {
                    const { newStart, newEnd } = expandClimbBoundaries(startI, i, dists, alts);
                    const finalDist = dists[newEnd] - dists[newStart];
                    const finalElev = alts[newEnd] - alts[newStart];
                    const finalGrade = finalDist > 0 ? (finalElev / finalDist) * 100 : 0;

                    if (finalDist > 700 && finalGrade > 2.5 && finalElev > 40) {
                        const segmentPoly = fullPolyline.slice(newStart, newEnd + 1);
                        
                        // Calculs Pulsar Harmonisé
                        const metrics = calculatePulsarMetrics(finalDist, finalElev, finalGrade, segmentPoly);
                        const maxG = calculateMaxGrade(dists, alts, newStart, newEnd);

                        candidates.push({
                            startIndex: newStart, endIndex: newEnd,
                            dist_m: parseFloat(finalDist.toFixed(2)),
                            elev_m: Math.round(finalElev),
                            avg_grade: parseFloat(finalGrade.toFixed(2)),
                            max_grade: maxG,
                            polyline: segmentPoly,
                            pulsar_index: metrics.index,
                            pulsar_density: metrics.density,
                            pulsar_sigma: metrics.sigma,
                            pulsar_category: metrics.category
                        });
                    }
                }
                inClimb = false;
            }
        }
    }
    
    // Filtre des doublons
    const uniqueCandidates: DetectedClimb[] = [];
    candidates.sort((a, b) => b.pulsar_index - a.pulsar_index);
    
    for (const cand of candidates) {
        const overlap = uniqueCandidates.some(u => (cand.startIndex >= u.startIndex && cand.endIndex <= u.endIndex));
        const duplicate = uniqueCandidates.some(u => Math.abs(cand.startIndex - u.startIndex) < 50 && Math.abs(cand.endIndex - u.endIndex) < 50);
        if (!overlap && !duplicate) uniqueCandidates.push(cand);
    }

    return uniqueCandidates;
}