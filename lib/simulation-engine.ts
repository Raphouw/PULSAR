// Fichier : lib/simulation-engine.ts

import { getIntensityFactorForSegment, PacingStrategyType } from './simulation-strategies';

// --- TYPES ---

export type UserProfile = {
  weight: number;
  ftp: number;
  wPrime: number; // J
  cp3?: number;
  cp12?: number;
  heightCm?: number;
};

export type SimSegment = {
  id: number;
  startKm: number;
  endKm: number;
  lengthM: number;
  avgGradient: number;
  type: 'CLIMB' | 'FLAT' | 'DESCENT';
  // Résultats calculés
  avgPower: number;
  avgSpeed: number;
  duration: number;
  wPrimeEnd: number;
  energyKcal: number;
  points?: [number, number, number][];
};

export type SimulationConfig = {
  user: UserProfile;
  bikeWeight: number; 
  cda: number;       
  crr: number; // Coeff roulement
  rho: number; // Densité air
  windSpeedKmh: number; 
  windDirectionDeg: number;
  targetMode: 'SPEED' | 'POWER';
  targetValue: number; 
  strategy: PacingStrategyType;
  ftp?: number; // Compatibilité ancienne version
  wPrime?: number; // Compatibilité ancienne version
};

export type SimulationResultPoint = {
  distance_m: number;
  time_s: number;
  elevation_m: number;
  gradient_pct: number;
  speed_kmh: number;
  power_w: number;
  w_prime_balance: number;
  wind_component_kmh: number;
};

export type SimulationSummary = {
  totalTime: number;       
  avgSpeed: number;        
  avgPower: number;        
  normalizedPower: number; 
  totalWork: number;       
  wPrimeDepleted: boolean; 
  failurePointKm?: number; 
  points: SimulationResultPoint[];
};

// --- CONSTANTES PHYSIQUES ---
const GRAVITY = 9.81;
const RHO_DEFAULT = 1.225; 

// --- HELPERS GÉOMÉTRIQUES (CRITIQUE : ILS DOIVENT ÊTRE ICI) ---

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

// Distance entre deux points GPS (Haversine)
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Rayon Terre mètres
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Calcul du Cap (Bearing) entre deux points (0-360°)
function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360; 
}

// --- MOTEUR PHYSIQUE ---

/**
 * Résout la vitesse (v) pour une puissance donnée (P) sur un segment
 */
function solveSpeed(
    power: number, 
    gradient: number, 
    mass: number, 
    cda: number, 
    crr: number, 
    windMs: number
): number {
    const gradeRad = Math.atan(gradient / 100);
    const forceGravity = mass * GRAVITY * Math.sin(gradeRad);
    const forceRolling = mass * GRAVITY * crr * Math.cos(gradeRad);
    
    // Iteration simple (Newton-Raphson simplifié)
    let v = 5; // m/s start guess
    for(let i=0; i<10; i++) {
        const vAir = v + windMs; // Vent de face positif
        const forceAero = 0.5 * RHO_DEFAULT * cda * vAir * vAir * (vAir > 0 ? 1 : -1);
        const totalResist = forceGravity + forceRolling + forceAero;
        
        // Si on descend (forceGravity négatif fort) et power 0, on accélère jusqu'à équilibre terminal
        if (power <= 0 && totalResist < 0) {
             v += 0.5; // On accélère (très simplifié pour descente roue libre)
        } else {
             // P = F * v  =>  v = P / F
             const denom = Math.max(1, (forceGravity + forceRolling + 0.5 * RHO_DEFAULT * cda * ((v+windMs)**2)));
             const newV = power / denom;
             v = (v + newV) / 2; // Lissage
        }
    }
    return Math.max(0.5, v); // Min 1.8km/h
}

// --- LOGIQUE DE SEGMENTATION ---

export function segmentRoute(points: [number, number, number][]): SimSegment[] {
    const segments: SimSegment[] = [];
    if (points.length < 2) return [];

    let currentStartIdx = 0;
    let distAcc = 0;
    
    // On force un découpage plus fin pour la visualisation
    const SEGMENT_TARGET_DIST = 1000; // 1km max par segment

    for (let i = 1; i < points.length; i++) {
        const prev = points[i-1];
        const curr = points[i];
        distAcc += getDistance(prev[0], prev[1], curr[0], curr[1]);

        // Coupe si > 1km OU changement de pente brutal (simplifié ici à la distance)
        // OU fin du parcours
        if (distAcc >= SEGMENT_TARGET_DIST || i === points.length - 1) {
            
            const segmentPoints = points.slice(currentStartIdx, i + 1);
            const startPt = points[currentStartIdx];
            const endPt = points[i];
            const eleDiff = endPt[2] - startPt[2];
            const avgGradient = distAcc > 0 ? (eleDiff / distAcc) * 100 : 0;
            
            let type: 'CLIMB' | 'FLAT' | 'DESCENT' = 'FLAT';
            if (avgGradient > 2.5) type = 'CLIMB';
            if (avgGradient < -2) type = 'DESCENT';

            segments.push({
                id: segments.length + 1,
                startKm: 0, 
                endKm: 0,
                lengthM: distAcc,
                avgGradient: parseFloat(avgGradient.toFixed(1)),
                type,
                avgPower: 0, avgSpeed: 0, duration: 0, wPrimeEnd: 0, energyKcal: 0,
                points: segmentPoints // IMPORTANT : On garde les points pour la map
            });

            currentStartIdx = i;
            distAcc = 0;
        }
    }

    // Recalcul KM
    let runningKm = 0;
    return segments.map(s => {
        const start = runningKm;
        runningKm += s.lengthM / 1000;
        return { ...s, startKm: start, endKm: runningKm };
    });
}

// --- MOTEUR PRINCIPAL V2 (ITÉRATIF) ---

export function runAdvancedSimulation(
    segments: SimSegment[], // Route pré-découpée
    config: SimulationConfig
): SimSegment[] {
    
    const totalMass = config.user.weight + config.bikeWeight;
    const crr = config.crr || 0.004; 
    
    // 1. CALCUL DU "BASE POWER"
    // C'est la valeur pivot. Si Target = 250W, Base = 250.
    let basePower = config.targetMode === 'POWER' ? config.targetValue : config.user.ftp; 

    // Si mode Vitesse, on itère 3 fois pour ajuster la puissance globale
    for (let iter = 0; iter < (config.targetMode === 'SPEED' ? 3 : 1); iter++) {
        
        let currentWPrime = config.user.wPrime;
        let totalTime = 0;
        let totalDist = 0;

        // Simulation segment par segment
        for (let seg of segments) {
            // A. Déterminer la puissance cible du segment selon Stratégie
            const intensityFactor = getIntensityFactorForSegment(seg.avgGradient, config.strategy);
            let targetSegPower = basePower * intensityFactor;

            // B. Contrainte W' (Physiologie)
            // Si W' est critique (< 10%), on force la récupération
            if (currentWPrime < config.user.wPrime * 0.1) {
                targetSegPower = Math.min(targetSegPower, config.user.ftp * 0.6);
            }
            // Sécurité : Max Pmax
            targetSegPower = Math.min(targetSegPower, 800);

            // C. Calcul Vitesse (Physique)
            // Simplification vent : On considère qu'il vient de la direction globale vs le segment moyen
            // Pour l'instant, on applique le vent global comme composante face/dos simplifiée
            // Dans une V3 on calculerait le bearing de chaque segment.
            // Ici, on considère le vent comme global (souvent suffisant pour une estimation grossière)
            // Ou on considère le pire cas : 50% de l'impact
            const windComponentMs = (config.windSpeedKmh / 3.6) * 0.5; // Facteur arbitraire d'exposition

            const speedMs = solveSpeed(targetSegPower, seg.avgGradient, totalMass, config.cda, crr, windComponentMs);

            // D. Mise à jour Physiologique
            const duration = seg.lengthM / speedMs;
            
            // W' Balance
            const cp = config.user.ftp;
            if (targetSegPower > cp) {
                currentWPrime -= (targetSegPower - cp) * duration;
            } else {
                // Recharge
                currentWPrime += (cp - targetSegPower) * duration * 0.5; 
                if (currentWPrime > config.user.wPrime) currentWPrime = config.user.wPrime;
            }

            // E. Sauvegarde résultats dans le segment
            seg.avgPower = targetSegPower;
            seg.avgSpeed = speedMs * 3.6;
            seg.duration = duration;
            seg.wPrimeEnd = currentWPrime;
            seg.energyKcal = (targetSegPower * duration) / 4184 * 4; 

            totalTime += duration;
            totalDist += seg.lengthM;
        }

        // F. Ajustement itératif pour Mode Vitesse
        if (config.targetMode === 'SPEED') {
            const avgSpeedGlobal = (totalDist / 1000) / (totalTime / 3600);
            if (avgSpeedGlobal <= 0) break; // Sécurité div/0

            const diff = config.targetValue - avgSpeedGlobal;
            
            // Si on est trop lent, on monte la puissance de base
            if (Math.abs(diff) > 0.5) {
                // Ajustement proportionnel amorti
                basePower = basePower * (1 + (diff / config.targetValue) * 0.8);
            } else {
                break; // Assez précis
            }
        }
    }

    return segments;
}