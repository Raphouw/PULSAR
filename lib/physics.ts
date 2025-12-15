// Fichier : lib/physics.ts
import { ActivityStreams } from '../types/next-auth.d';

// --- UTILITAIRE DE SÉCURITÉ (CRITIQUE) ---
// Cela garantit qu'on manipule TOUJOURS un tableau
const safeArray = <T,>(input: any): T[] => {
  if (Array.isArray(input)) return input;
  if (!input) return [];
  if (typeof input === 'object') return Object.values(input);
  return [];
};

// --- TYPES ---
export type PowerRecordDetail = {
  seconds: number;
  label: string;
  watts: number;
  wkg: number;
  powerKm: number;
  npVal?: number;
  hrAvgRecord: number;
  hrKm: number;
};

export type TerrainStats = {
  climb: { dist: number; speed: number; time: number; avgPower: number; avgCadence: number; avgHeartRate: number; pedalingRatio: number };
  flat: { dist: number; speed: number; time: number; avgPower: number; avgCadence: number; avgHeartRate: number; pedalingRatio: number };
  descent: { dist: number; speed: number; time: number; avgPower: number; avgCadence: number; avgHeartRate: number; pedalingRatio: number };
};

export type DetectedClimb = {
  startIndex: number;
  endIndex: number;
  distanceMetres: number;
  elevationGain: number;
  averageGradient: number;
  avgPower: number | null;
  timeSeconds: number;
  startKm: number;
  endKm: number;
};

// --- FONCTIONS DE BASE ---
export const calculatePulsarScore = (
  distanceM: number,
  elevationGainM: number,
  avgGrade: number,
  polyline?: number[][]
): { index: number; sigma: number; density: number } => {
  const H = Math.max(1, elevationGainM);
  const L = Math.max(100, distanceM);
  const AvgP = Math.max(0, avgGrade);
  const density = H / (L / 1000); // m/km

  let sigma = 0;
  let maxAlt = 0;

  if (polyline && polyline.length > 5) {
    const sigmaGrades: number[] = [];
    let distAcc = 0;
    let lastEle = polyline[0][2] || 0;

    for (let i = 1; i < polyline.length; i++) {
      const p1 = polyline[i - 1];
      const p2 = polyline[i];
      // Haversine simplifiée pour le sigma (déjà centralisée ailleurs si besoin)
      const R = 6371e3;
      const φ1 = (p1[0] * Math.PI) / 180;
      const φ2 = (p2[0] * Math.PI) / 180;
      const Δφ = ((p2[0] - p1[0]) * Math.PI) / 180;
      const Δλ = ((p2[1] - p1[1]) * Math.PI) / 180;
      const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      distAcc += d;
      if (p2[2] > maxAlt) maxAlt = p2[2];

      if (distAcc >= 25) { // Fenêtre de 25m pour la variance de pente
        const eleDiff = (p2[2] || 0) - lastEle;
        sigmaGrades.push((eleDiff / distAcc) * 100);
        distAcc = 0;
        lastEle = p2[2] || 0;
      }
    }

    if (sigmaGrades.length > 1) {
      const mean = sigmaGrades.reduce((a, b) => a + b, 0) / sigmaGrades.length;
      const variance = sigmaGrades.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sigmaGrades.length;
      sigma = Math.sqrt(variance);
    }
  }

  // Facteurs environnementaux
  const AltFactor = 1 + (maxAlt / 8000); // Pénalité hypoxique
  const Pivot = 1 + ((sigma * (AvgP - 8)) / 50); // Pénalité irrégularité (Sigma) sur pentes fortes
  
  // Formule PULSAR : H²/L (travail contre gravité) + 3H (charge de base)
  const Base = (20 * (Math.pow(H, 2) / L)) + (3 * H);
  const rawScore = Base * AltFactor * Pivot;

  return { 
    index: Math.round(rawScore), 
    sigma: parseFloat(sigma.toFixed(2)), 
    density: parseFloat(density.toFixed(1)) 
  };
};

/**
 * Détermine la catégorie Pulsar d'un segment selon son index.
 */
export const getPulsarCategory = (index: number, distanceM: number, density: number) => {
  if (distanceM >= 50000 && density < 30) return { label: 'BOUCLE MYTHIQUE', color: '#00f3ff', textColor: '#000' };
  if (index > 7500) return { label: 'ICONIC', color: '#000', textColor: '#d04fd7', border: true };
  if (index > 6500) return { label: 'HC', color: '#ef4444', textColor: '#fff' };
  if (index > 5000) return { label: 'CAT 1', color: '#f97316', textColor: '#fff' };
  if (index > 3000) return { label: 'CAT 2', color: '#eab308', textColor: '#000' };
  if (index > 1500) return { label: 'CAT 3', color: '#84cc16', textColor: '#000' };
  if (index > 1000) return { label: 'CAT 4', color: '#10b981', textColor: '#fff' };
  return { label: 'COTE REGION', color: '#0077B6', textColor: '#fff' };
};



export const findMaxValue = (data: (number | null)[] | undefined): number | null => {
  const safeData = safeArray<number | null>(data);
  if (safeData.length === 0) return null;
  
  const valid = safeData.filter((n): n is number => typeof n === 'number' && !isNaN(n));
  if (valid.length === 0) return null;
  return Math.max(...valid);
};

export const calculateMedian = (values: number[]): number => {
  const safeValues = safeArray<number>(values).filter(v => typeof v === 'number' && !isNaN(v));
  if (safeValues.length === 0) return 0;
  
  const sorted = [...safeValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const calculateWork = (
  avgPower: number | null,
  durationSeconds: number | null
): number | null => {
  if (avgPower === null || durationSeconds === null) return null;
  return Math.round((avgPower * durationSeconds) / 1000); // kJ
};

export const calculateElevationGainLoss = (
  altitudeStream: (number | null)[] | undefined
): { gain: number, loss: number } => {
  const safeAlt = safeArray<number | null>(altitudeStream);
  if (safeAlt.length === 0) return { gain: 0, loss: 0 };
  
  let gain = 0;
  let loss = 0;
  const altitude = safeAlt.map(a => Number(a ?? 0));
  const THRESHOLD = 0.1; 
  
  for (let i = 1; i < altitude.length; i++) {
    const diff = altitude[i] - altitude[i-1];
    if (diff > THRESHOLD) gain += diff;
    else if (diff < -THRESHOLD) loss += Math.abs(diff);
  }
  return { gain: Math.round(gain), loss: Math.round(loss) };
};

export const calculateCP_WPrime = (p3m: number, p12m: number) => {
  const t1 = 180; 
  const t2 = 720; 

  const w1 = p3m * t1;
  const w2 = p12m * t2;

  const CP = (w2 - w1) / (t2 - t1);
  const WPrime = w1 - (CP * t1);

  return { CP: Math.round(CP), WPrime: Math.round(WPrime) };
};

export function calculateStreamAverages(streams: any) {
  if (!streams) return { avgPowerNonZero: 0, avgCadenceNonZero: 0, percentMoving: 0 };
  
  const watts = safeArray<number>(streams.watts);
  const cadence = safeArray<number>(streams.cadence);

  const nonZeroWatts = watts.filter(w => typeof w === 'number' && w > 0) as number[];
  
  const avgPowerNonZero = nonZeroWatts.length > 0
    ? Math.round(nonZeroWatts.reduce((a, b) => a + b, 0) / nonZeroWatts.length)
    : 0;

  const nonZeroCadence = cadence.filter(c => typeof c === 'number' && c > 0) as number[];
  
  const avgCadenceNonZero = nonZeroCadence.length > 0
    ? Math.round(nonZeroCadence.reduce((a, b) => a + b, 0) / nonZeroCadence.length)
    : 0;

  const totalSamples = cadence.length;
  const percentMoving = totalSamples > 0 ? (nonZeroCadence.length / totalSamples) * 100 : 0;

  return { avgPowerNonZero, avgCadenceNonZero, percentMoving };
}

export const calculateCardiacDrift = (wattsIn: number[], hrIn: number[]) => {
  const watts = safeArray<number>(wattsIn);
  const hr = safeArray<number>(hrIn);

  if (watts.length !== hr.length || watts.length < 600) return null;
  
  const half = Math.floor(watts.length / 2);
  const startOffset = Math.min(600, Math.floor(half/2)); 
  
  const avgP1 = watts.slice(startOffset, half).reduce((a,b)=>a+Number(b||0),0) / (half - startOffset);
  const avgHR1 = hr.slice(startOffset, half).reduce((a,b)=>a+Number(b||0),0) / (half - startOffset);
  
  const avgP2 = watts.slice(half).reduce((a,b)=>a+Number(b||0),0) / (watts.length - half);
  const avgHR2 = hr.slice(half).reduce((a,b)=>a+Number(b||0),0) / (hr.length - half);
  
  const ef1 = avgP1 / avgHR1;
  const ef2 = avgP2 / avgHR2;
  
  if (ef1 === 0) return 0;
  return ((ef1 - ef2) / ef1) * 100;
};

export const calculateTerrainStats = (streams: any): TerrainStats => {
  // Définition du résultat vide
  const empty = { dist: 0, speed: 0, time: 0, avgPower: 0, avgCadence: 0, avgHeartRate: 0, pedalingRatio: 0 }; 
  
  const distArr = safeArray<number>(streams?.distance);
  const altArr = safeArray<number>(streams?.altitude);
  const timeArr = safeArray<number>(streams?.time);
  const wattsArr = safeArray<number>(streams?.watts);
  const cadenceArr = safeArray<number>(streams?.cadence);
  const hrArr = safeArray<number>(streams?.heartrate); // 🔥 AJOUTÉ

  if (distArr.length === 0 || altArr.length === 0 || timeArr.length === 0) {
    return { climb: empty, flat: empty, descent: empty };
  }

  // Structure pour accumuler (Ajout de totalHeartRate et countHeartRate)
  const accumulator = {
    climb: { dist: 0, time: 0, totalWatts: 0, countWatts: 0, totalCadence: 0, countCadence: 0, totalHeartRate: 0, countHeartRate: 0, totalSamples: 0 },
    flat: { dist: 0, time: 0, totalWatts: 0, countWatts: 0, totalCadence: 0, countCadence: 0, totalHeartRate: 0, countHeartRate: 0, totalSamples: 0 },
    descent: { dist: 0, time: 0, totalWatts: 0, countWatts: 0, totalCadence: 0, countCadence: 0, totalHeartRate: 0, countHeartRate: 0, totalSamples: 0 }
  };

  for (let i = 5; i < distArr.length; i++) {
    const distSegment = Number(distArr[i] ?? 0) - Number(distArr[i-1] ?? 0);
    const timeSegment = Number(timeArr[i] ?? 0) - Number(timeArr[i-1] ?? 0);
    
    const speedInst = timeSegment > 0 ? (distSegment / timeSegment) * 3.6 : 0;
    const isMoving = speedInst > 3.8; // Seuil de mouvement

    const distSmooth = Number(distArr[i] ?? 0) - Number(distArr[i-5] ?? 0);
    const eleSmooth = Number(altArr[i] ?? 0) - Number(altArr[i-5] ?? 0);
    
    const wattsInst = Number(wattsArr[i] ?? 0);
    const cadenceInst = Number(cadenceArr[i] ?? 0);
    const hrInst = Number(hrArr[i] ?? 0); // 🔥 AJOUTÉ

    let target: keyof typeof accumulator | null = null;
    
    // Seuils à 2% comme demandé
    if (distSmooth > 0) {
      const grade = (eleSmooth / distSmooth) * 100;
      if (grade > 2.0) target = 'climb';
      else if (grade < -2.0) target = 'descent';
      else target = 'flat';
    }
    
    if (target) {
      accumulator[target].dist += distSegment;
      accumulator[target].totalSamples += 1;

      if(isMoving) {
          accumulator[target].time += timeSegment;
          accumulator[target].totalWatts += wattsInst;
          accumulator[target].countWatts += 1; 
      }
      
      if (cadenceInst > 0) {
        accumulator[target].totalCadence += cadenceInst;
        accumulator[target].countCadence += 1;
      }

      // 🔥 AJOUT LOGIQUE CARDIO
      if (hrInst > 0) {
        accumulator[target].totalHeartRate += hrInst;
        accumulator[target].countHeartRate += 1;
      }
    }
  }

  const calcSpeed = (d: number, t: number) => t > 0 ? (d / t) * 3.6 : 0;
  const calcAvg = (total: number, count: number) => count > 0 ? Math.round(total / count) : 0;
  const calcRatio = (pedaled: number, total: number) => total > 0 ? (pedaled / total) * 100 : 0;

  // Fonction helper pour construire l'objet final
  const buildStats = (acc: any) => ({
      dist: acc.dist / 1000, 
      speed: calcSpeed(acc.dist, acc.time), 
      time: acc.time,
      avgPower: calcAvg(acc.totalWatts, acc.countWatts),
      avgCadence: calcAvg(acc.totalCadence, acc.countCadence),
      avgHeartRate: calcAvg(acc.totalHeartRate, acc.countHeartRate), // 🔥 AJOUTÉ
      pedalingRatio: calcRatio(acc.countCadence, acc.totalSamples)
  });

  return {
    climb: buildStats(accumulator.climb),
    flat: buildStats(accumulator.flat),
    descent: buildStats(accumulator.descent)
  };
};
export const NPformulaCoggan = (wattsIn: number[]) => {
    const watts = safeArray<number>(wattsIn);
    if(watts.length < 30) return 0; 
    const rolling30: number[] = [];
    
    let sum = 0;
    for(let j=0; j<30; j++) sum += Number(watts[j] || 0);
    rolling30.push(Math.pow(sum/30, 4));

    for(let i=30; i<watts.length; i++) {
        sum = sum - Number(watts[i-30]||0) + Number(watts[i]||0);
        rolling30.push(Math.pow(sum/30, 4));
    }
    
    if(rolling30.length === 0) return 0;
    const avgPow4 = rolling30.reduce((a,b)=>a+b,0) / rolling30.length;
    return Math.round(Math.pow(avgPow4, 0.25));
};

export const findBestHeartRateInterval = (
    hrIn: number[], timeIn: number[], distanceIn: number[], durationSec: number
  ): { hrAvg: number, startKm: number } | null => {
    
    const hr = safeArray<number>(hrIn);
    const distance = safeArray<number>(distanceIn);

    if (hr.length < durationSec) return null;
  
    let maxAvgHr = 0;
    let bestStartIndex = -1;
    const windowSize = durationSec; 
  
    let currentSum = 0;
    for (let i = 0; i < windowSize; i++) currentSum += Number(hr[i] || 0);
    maxAvgHr = currentSum / windowSize;
    bestStartIndex = 0;
  
    for (let i = windowSize; i < hr.length; i++) {
      currentSum += Number(hr[i] || 0) - Number(hr[i - windowSize] || 0);
      const avg = currentSum / windowSize;
      if (avg > maxAvgHr) {
        maxAvgHr = avg;
        bestStartIndex = i - windowSize + 1;
      }
    }
  
    if (bestStartIndex === -1) return null;
  
    const kmAtStart = distance.length > bestStartIndex ? Number(distance[bestStartIndex]) / 1000 : 0;
    
    return {
        hrAvg: Math.round(maxAvgHr),
        startKm: parseFloat(kmAtStart.toFixed(1))
    };
};

export const findBestInterval = (
  wattsIn: number[], timeIn: number[], distanceIn: number[], hrIn: number[] | null, durationSec: number, userWeight: number
): PowerRecordDetail | null => {
  
  const watts = safeArray<number>(wattsIn);
  const distance = safeArray<number>(distanceIn);
  const hr = hrIn ? safeArray<number>(hrIn) : [];

  if (watts.length < durationSec) return null;

  let maxAvgPower = 0;
  let bestStartIndex = -1;
  const windowSize = durationSec; 

  let currentSum = 0;
  for (let i = 0; i < windowSize; i++) currentSum += Number(watts[i] || 0);
  maxAvgPower = currentSum / windowSize;
  bestStartIndex = 0;

  for (let i = windowSize; i < watts.length; i++) {
    currentSum += Number(watts[i] || 0) - Number(watts[i - windowSize] || 0);
    const avg = currentSum / windowSize;
    if (avg > maxAvgPower) {
      maxAvgPower = avg;
      bestStartIndex = i - windowSize + 1;
    }
  }

  if (bestStartIndex === -1) return null;

  const powerKmAtStart = distance.length > bestStartIndex ? Number(distance[bestStartIndex]) / 1000 : 0;
  
  let segmentNP = 0;
  if (durationSec >= 30) {
      const wattSlice = watts.slice(bestStartIndex, bestStartIndex + windowSize);
      segmentNP = NPformulaCoggan(wattSlice);
  }

  let hrRecordData = { hrAvg: 0, startKm: 0 };
  if (hr.length > 0) {
      const bestHr = findBestHeartRateInterval(hr, safeArray(timeIn), distance, durationSec);
      if (bestHr) {
          hrRecordData = bestHr;
      }
  }

  let label = `${durationSec}s`;
  if (durationSec >= 3600) label = `${Math.floor(durationSec/3600)}h`;
  else if (durationSec >= 60) label = `${Math.floor(durationSec/60)}m`;

  return {
    seconds: durationSec,
    label: label,
    watts: Math.round(maxAvgPower),
    wkg: parseFloat((maxAvgPower / (userWeight || 75)).toFixed(2)),
    powerKm: parseFloat(powerKmAtStart.toFixed(1)),
    npVal: segmentNP > 0 ? segmentNP : undefined,
    hrAvgRecord: hrRecordData.hrAvg,
    hrKm: hrRecordData.startKm
  };
};

export const calculateStressBalance = (dailyTSS: { date: string; tss: number }[]) => {
  const safeDaily = safeArray(dailyTSS);
  if (!safeDaily.length) return [];

  let ctl = 0; 
  let atl = 0; 
  
  const result = safeDaily.map((day: any) => {
    const val = Number(day.tss || 0);
    ctl = ctl + (val - ctl) / 42;
    atl = atl + (val - atl) / 7;
    const tsb = ctl - atl; 

    return {
      date: day.date,
      ctl: Math.round(ctl),
      atl: Math.round(atl),
      tsb: Math.round(tsb),
    };
  });

  return result;
};

// 🔥 FONCTION RÉINTRODUITE POUR L'API D'IMPORT
export const calculateMaxAveragePower  = (watts: number[], time: number[], duration: number) => {
    const res = findBestInterval(watts, time, [], null, duration, 75);
    return res ? res.watts : null;
};

export const detectClimbs = (streams: ActivityStreams, minDistanceMetres = 500, minGradientPercent = 2.5): DetectedClimb[] => {
  const distance = safeArray<number>(streams?.distance).map(d => Number(d ?? 0));
  const altitude = safeArray<number>(streams?.altitude).map(a => Number(a ?? 0));
  const watts = safeArray<number>(streams?.watts).map(w => Number(w ?? 0));
  const time = safeArray<number>(streams?.time).map(t => Number(t ?? 0));
  
  const n = distance.length;
  if (n < 100) return [];

  const smoothGrad: number[] = [];
  for (let i = 10; i < n; i++) {
     const d = distance[i] - distance[i-10];
     const h = altitude[i] - altitude[i-10];
     smoothGrad[i] = d > 0 ? (h/d)*100 : 0;
  }

  const climbs: DetectedClimb[] = [];
  let inClimb = false;
  let startIdx = 0;

  for (let i = 10; i < n; i++) {
    const g = smoothGrad[i] || 0;
    if (!inClimb && g >= minGradientPercent) {
      inClimb = true;
      startIdx = i;
    } 
    else if (inClimb && g < 0.5) { 
       let futureTrend = 0;
       for(let k=1; k<=20 && i+k<n; k++) futureTrend += (smoothGrad[i+k]||0);
       if (futureTrend / 20 < 1.0) { 
          inClimb = false;
          const dist = distance[i] - distance[startIdx];
          const elev = altitude[i] - altitude[startIdx];
          if (dist >= minDistanceMetres && elev > 10) {
             const avgP = watts.slice(startIdx, i).reduce((a,b)=>a+b,0) / (i-startIdx);
             const dur = time[i] - time[startIdx];
             climbs.push({
                startIndex: startIdx,
                endIndex: i,
                distanceMetres: Math.round(dist),
                elevationGain: Math.round(elev),
                averageGradient: parseFloat((elev/dist*100).toFixed(1)),
                avgPower: Math.round(avgP),
                timeSeconds: dur,
                startKm: parseFloat((distance[startIdx]/1000).toFixed(1)),
                endKm: parseFloat((distance[i]/1000).toFixed(1))
             });
          }
       }
    }
  }
  return climbs;
};