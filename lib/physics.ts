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
  const empty = { dist:0, speed:0, time: 0 };
  
  const distArr = safeArray<number>(streams?.distance);
  const altArr = safeArray<number>(streams?.altitude);
  const timeArr = safeArray<number>(streams?.time);

  if (distArr.length === 0 || altArr.length === 0 || timeArr.length === 0) {
    return { climb: empty, flat: empty, descent: empty };
  }

  const stats = {
    climb: { dist: 0, time: 0 },
    flat: { dist: 0, time: 0 },
    descent: { dist: 0, time: 0 }
  };

  for (let i = 5; i < distArr.length; i++) {
    const distSegment = Number(distArr[i] ?? 0) - Number(distArr[i-1] ?? 0);
    const timeSegment = Number(timeArr[i] ?? 0) - Number(timeArr[i-1] ?? 0);
    
    const speedInst = timeSegment > 0 ? (distSegment / timeSegment) * 3.6 : 0;
    const isMoving = speedInst > 3.8;

    const distSmooth = Number(distArr[i] ?? 0) - Number(distArr[i-5] ?? 0);
    const eleSmooth = Number(altArr[i] ?? 0) - Number(altArr[i-5] ?? 0);
    
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