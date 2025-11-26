// Fichier : lib/physics.ts
import { ActivityStreams } from '../types/next-auth.d';

// --- TYPES ---
export type PowerRecordDetail = {
  seconds: number;
  label: string;
  watts: number;
  wkg: number;
  powerKm: number; // Renommé pour être clair
  npVal?: number;
  
  // Données indépendantes FC
  hrAvgRecord: number;
  hrKm: number;
};

export type TerrainStats = {
  climb: { dist: number; speed: number; time: number }; 
  flat: { dist: number; speed: number; time: number };
  descent: { dist: number; speed: number; time: number };
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
export const findMaxValue = (data: (number | null)[] | undefined): number | null => {
  if (!data) return null;
  const valid = data.filter((n) => typeof n === 'number') as number[];
  if (valid.length === 0) return null;
  return Math.max(...valid);
};

export const calculateMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
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
  if (!altitudeStream) return { gain: 0, loss: 0 };
  let gain = 0;
  let loss = 0;
  const altitude = altitudeStream.map(a => a ?? 0);
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
  const watts = streams.watts || [];
  const cadence = streams.cadence || [];

  const nonZeroWatts = watts.filter((w: any) => typeof w === 'number' && w > 0);
  const avgPowerNonZero = nonZeroWatts.length > 0
    ? Math.round(nonZeroWatts.reduce((a: number, b: number) => a + b, 0) / nonZeroWatts.length)
    : 0;

  const nonZeroCadence = cadence.filter((c: any) => typeof c === 'number' && c > 0);
  const avgCadenceNonZero = nonZeroCadence.length > 0
    ? Math.round(nonZeroCadence.reduce((a: number, b: number) => a + b, 0) / nonZeroCadence.length)
    : 0;

  const totalSamples = cadence.length;
  const percentMoving = totalSamples > 0 ? (nonZeroCadence.length / totalSamples) * 100 : 0;

  return { avgPowerNonZero, avgCadenceNonZero, percentMoving };
}

export const calculateCardiacDrift = (watts: number[], hr: number[]) => {
  if (!watts || !hr || watts.length !== hr.length || watts.length < 600) return null;
  const half = Math.floor(watts.length / 2);
  const startOffset = Math.min(600, Math.floor(half/2)); 
  const avgP1 = watts.slice(startOffset, half).reduce((a,b)=>a+b,0) / (half - startOffset);
  const avgHR1 = hr.slice(startOffset, half).reduce((a,b)=>a+b,0) / (half - startOffset);
  const avgP2 = watts.slice(half).reduce((a,b)=>a+b,0) / (watts.length - half);
  const avgHR2 = hr.slice(half).reduce((a,b)=>a+b,0) / (hr.length - half);
  const ef1 = avgP1 / avgHR1;
  const ef2 = avgP2 / avgHR2;
  if (ef1 === 0) return 0;
  return ((ef1 - ef2) / ef1) * 100;
};

export const calculateTerrainStats = (streams: any): TerrainStats => {
  const empty = { dist:0, speed:0, time: 0 };
  if (!streams?.distance || !streams?.altitude || !streams?.time) {
    return { climb: empty, flat: empty, descent: empty };
  }

  const stats = {
    climb: { dist: 0, time: 0 },
    flat: { dist: 0, time: 0 },
    descent: { dist: 0, time: 0 }
  };

  for (let i = 5; i < streams.distance.length; i++) {
    const distSegment = (streams.distance[i] || 0) - (streams.distance[i-1] || 0);
    const timeSegment = (streams.time[i] || 0) - (streams.time[i-1] || 0);
    
    const speedInst = timeSegment > 0 ? (distSegment / timeSegment) * 3.6 : 0;
    const isMoving = speedInst > 3.8;

    const distSmooth = (streams.distance[i] || 0) - (streams.distance[i-5] || 0);
    const eleSmooth = (streams.altitude[i] || 0) - (streams.altitude[i-5] || 0);
    
    if (distSmooth > 0) {
      const grade = (eleSmooth / distSmooth) * 100;
      
      if (grade > 2.5) { 
        stats.climb.dist += distSegment;
        if(isMoving) stats.climb.time += timeSegment;
      } else if (grade < -2.5) { 
        stats.descent.dist += distSegment;
        if(isMoving) stats.descent.time += timeSegment;
      } else { 
        stats.flat.dist += distSegment;
        if(isMoving) stats.flat.time += timeSegment;
      }
    }
  }

  const calcSpeed = (d: number, t: number) => t > 0 ? (d / t) * 3.6 : 0;

  return {
    climb: { dist: stats.climb.dist / 1000, speed: calcSpeed(stats.climb.dist, stats.climb.time), time: stats.climb.time },
    flat: { dist: stats.flat.dist / 1000, speed: calcSpeed(stats.flat.dist, stats.flat.time), time: stats.flat.time },
    descent: { dist: stats.descent.dist / 1000, speed: calcSpeed(stats.descent.dist, stats.descent.time), time: stats.descent.time }
  };
};

export const NPformulaCoggan = (watts: number[]) => {
    if(!watts || watts.length < 30) return 0; 
    const rolling30: number[] = [];
    
    let sum = 0;
    // Init
    for(let j=0; j<30; j++) sum += (watts[j] || 0);
    rolling30.push(Math.pow(sum/30, 4));

    // Rolling
    for(let i=30; i<watts.length; i++) {
        sum = sum - (watts[i-30]||0) + (watts[i]||0);
        rolling30.push(Math.pow(sum/30, 4));
    }
    
    if(rolling30.length === 0) return 0;
    const avgPow4 = rolling30.reduce((a,b)=>a+b,0) / rolling30.length;
    return Math.round(Math.pow(avgPow4, 0.25));
};

// --- RECHERCHE INDÉPENDANTE DU RECORD CARDIAQUE ---
export const findBestHeartRateInterval = (
    hr: number[], time: number[], distance: number[], durationSec: number
  ): { hrAvg: number, startKm: number } | null => {
    
    if (!hr || hr.length < durationSec) return null;
  
    let maxAvgHr = 0;
    let bestStartIndex = -1;
    const windowSize = durationSec; 
  
    let currentSum = 0;
    // Initial window
    for (let i = 0; i < windowSize; i++) currentSum += (hr[i] || 0);
    maxAvgHr = currentSum / windowSize;
    bestStartIndex = 0;
  
    // Sliding window
    for (let i = windowSize; i < hr.length; i++) {
      currentSum += (hr[i] || 0) - (hr[i - windowSize] || 0);
      const avg = currentSum / windowSize;
      if (avg > maxAvgHr) {
        maxAvgHr = avg;
        bestStartIndex = i - windowSize + 1;
      }
    }
  
    if (bestStartIndex === -1) return null;
  
    const kmAtStart = distance.length > bestStartIndex ? distance[bestStartIndex] / 1000 : 0;
    
    return {
        hrAvg: Math.round(maxAvgHr),
        startKm: parseFloat(kmAtStart.toFixed(1))
    };
};

// --- RECHERCHE RECORD PUISSANCE (MODIFIÉE POUR ÊTRE INDÉPENDANTE) ---
export const findBestInterval = (
  watts: number[], time: number[], distance: number[], hr: number[] | null, durationSec: number, userWeight: number
): PowerRecordDetail | null => {
  if (!watts || watts.length < durationSec) return null;

  // 1. Calcul du Record de Puissance (Front Card)
  let maxAvgPower = 0;
  let bestStartIndex = -1;
  const windowSize = durationSec; 

  let currentSum = 0;
  for (let i = 0; i < windowSize; i++) currentSum += (watts[i] || 0);
  maxAvgPower = currentSum / windowSize;
  bestStartIndex = 0;

  for (let i = windowSize; i < watts.length; i++) {
    currentSum += (watts[i] || 0) - (watts[i - windowSize] || 0);
    const avg = currentSum / windowSize;
    if (avg > maxAvgPower) {
      maxAvgPower = avg;
      bestStartIndex = i - windowSize + 1;
    }
  }

  if (bestStartIndex === -1) return null;

  const powerKmAtStart = distance.length > bestStartIndex ? distance[bestStartIndex] / 1000 : 0;
  
  // Calcul NP sur le segment de puissance (Uniquement pertinent si > 30s)
  let segmentNP = 0;
  if (durationSec >= 30) {
      const wattSlice = watts.slice(bestStartIndex, bestStartIndex + windowSize);
      segmentNP = NPformulaCoggan(wattSlice);
  }

  // 2. Calcul du Record Cardiaque INDÉPENDANT (Back Card)
  let hrRecordData = { hrAvg: 0, startKm: 0 };
  if (hr && hr.length > 0) {
      const bestHr = findBestHeartRateInterval(hr, time, distance, durationSec);
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
    powerKm: parseFloat(powerKmAtStart.toFixed(1)), // KM du record Watt
    npVal: segmentNP > 0 ? segmentNP : undefined,
    
    // Données indépendantes pour le verso
    hrAvgRecord: hrRecordData.hrAvg,
    hrKm: hrRecordData.startKm
  };
};

export const calculateStressBalance = (dailyTSS: { date: string; tss: number }[]) => {
  if (!dailyTSS.length) return [];

  let ctl = 0; 
  let atl = 0; 
  
  const result = dailyTSS.map(day => {
    ctl = ctl + (day.tss - ctl) / 42;
    atl = atl + (day.tss - atl) / 7;
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

export const calculateMaxAveragePower = (watts: number[], time: number[], duration: number) => {
    const res = findBestInterval(watts, time, [], null, duration, 75);
    return res ? res.watts : null;
};

export const detectClimbs = (streams: ActivityStreams, minDistanceMetres = 500, minGradientPercent = 2.5): DetectedClimb[] => {
  if (!streams?.distance || !streams?.altitude) return [];
  const distance = streams.distance.map((d) => (d ?? 0));
  const altitude = streams.altitude.map((a) => (a ?? 0));
  const watts = (streams.watts ?? []).map((w) => (w ?? 0));
  const time = streams.time.map((t) => (t ?? 0));
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