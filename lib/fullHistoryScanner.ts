import { supabaseAdmin } from '@/lib/supabaseAdminClient';

// --- FONCTIONS MATHÉMATIQUES AVANCÉES ---

// 1. Puissance ELAPSED (0 compris)
function getElapsedMaxAverage(valData: number[], timeData: number[], targetDuration: number): number {
  if (!valData || !timeData || valData.length === 0) return 0;
  if (targetDuration === 1) return Math.max(...valData.filter(v => typeof v === 'number'));

  let maxAvg = 0;
  let i = 0;
  let currentSum = 0;

  for (let j = 0; j < timeData.length; j++) {
    currentSum += (typeof valData[j] === 'number' ? valData[j] : 0);

    while (timeData[j] - timeData[i] >= targetDuration && i < j) {
      currentSum -= (typeof valData[i] === 'number' ? valData[i] : 0);
      i++;
    }

    if (timeData[j] - timeData[i] >= targetDuration - 3) {
      // Le diviseur est la durée cible, ce qui inclut mathématiquement les zéros des pauses
      const avg = currentSum / targetDuration;
      if (avg > maxAvg) maxAvg = avg;
    }
  }
  return maxAvg;
}

// 2. Puissance MOVING (0 exclus)
function getMovingMaxAverage(valData: number[], movingTimeData: number[], targetDuration: number): number {
  if (!valData || !movingTimeData || valData.length === 0) return 0;
  if (targetDuration === 1) return Math.max(...valData.filter(v => typeof v === 'number'));

  let maxAvg = 0;
  let i = 0;
  let currentSum = 0;

  for (let j = 0; j < movingTimeData.length; j++) {
    currentSum += (typeof valData[j] === 'number' ? valData[j] : 0);

    while (movingTimeData[j] - movingTimeData[i] >= targetDuration && i < j) {
      currentSum -= (typeof valData[i] === 'number' ? valData[i] : 0);
      i++;
    }

    if (movingTimeData[j] - movingTimeData[i] >= targetDuration - 3) {
      const avg = currentSum / targetDuration;
      if (avg > maxAvg) maxAvg = avg;
    }
  }
  return maxAvg;
}

// 3. Puissance NORMALISÉE (NP)
function getNPMax(pow4Data: number[], timeData: number[], targetDuration: number): number {
  if (!pow4Data || !timeData || pow4Data.length === 0) return 0;

  let maxNP = 0;
  let i = 0;
  let currentSumPow4 = 0;

  for (let j = 0; j < timeData.length; j++) {
    currentSumPow4 += pow4Data[j];

    while (timeData[j] - timeData[i] >= targetDuration && i < j) {
      currentSumPow4 -= pow4Data[i];
      i++;
    }

    if (timeData[j] - timeData[i] >= targetDuration - 3) {
      const avgPow4 = currentSumPow4 / targetDuration;
      const np = Math.pow(avgPow4, 0.25);
      if (np > maxNP) maxNP = np;
    }
  }
  return maxNP;
}

// Utilitaires existants (VAM, Distance)
function getMaxDeltaForDuration(valData: number[], timeData: number[], targetDuration: number, isDistance: boolean = false, isAltitude: boolean = false): number {
  if (!valData || !timeData || valData.length < 2) return 0;
  let maxDelta = 0;
  let i = 0;
  for (let j = 0; j < timeData.length; j++) {
    while (timeData[j] - timeData[i] > targetDuration && i < j) i++;
    const realTimeDiff = timeData[j] - timeData[i];
    if (realTimeDiff >= targetDuration - 2 && realTimeDiff <= targetDuration + 5) {
      const delta = valData[j] - valData[i];
      if (isAltitude && delta <= 0) continue;
      if (isDistance) {
        const speedMs = delta / realTimeDiff;
        if (speedMs > 30 || speedMs < 0) continue; 
      }
      if (delta > maxDelta) maxDelta = delta;
    }
  }
  return maxDelta;
}

function getMinTimeForDistance(distData: number[], timeData: number[], targetDist: number): number {
  if (!distData || !timeData || distData.length < 2) return 0;
  let minTime = Infinity;
  let j = 0;
  for (let i = 0; i < distData.length; i++) {
    while (j < distData.length && (distData[j] - distData[i]) < targetDist) j++;
    if (j < distData.length && (distData[j] - distData[i]) >= targetDist) {
      const realTimeDiff = timeData[j] - timeData[i];
      const realDistDiff = distData[j] - distData[i];
      if (realTimeDiff <= 0) continue;
      const portionSpeedMs = realDistDiff / realTimeDiff;
      if (portionSpeedMs > 22.2) continue; 
      if (realTimeDiff < minTime) minTime = realTimeDiff;
    }
  }
  return minTime === Infinity ? 0 : minTime;
}


// --- CONFIGURATION UNIFIÉE DES MÉTRIQUES ---
const powerDurations = [
  { d: 1, id: '1s' }, { d: 5, id: '5s' }, { d: 15, id: '15s' }, { d: 30, id: '30s' },
  { d: 60, id: '1m' }, { d: 300, id: '5m' }, { d: 1200, id: '20m' }, { d: 3600, id: '60m' },
  { d: 7200, id: '2h' }, { d: 10800, id: '3h' }, { d: 14400, id: '4h' }, { d: 18000, id: '5h' },
  { d: 28800, id: '8h' }
];

const METRICS_CONFIG: any[] = [];

// Génération des 3 courbes de puissance
powerDurations.forEach(({ d, id }) => {
  METRICS_CONFIG.push({ id: `PE_${id}`, category: 'power_elapsed', source: 'watts', type: 'power_elapsed', duration: d, limit: 2500 });
  METRICS_CONFIG.push({ id: `PM_${id}`, category: 'power_moving', source: 'watts', type: 'power_moving', duration: d, limit: 2500 });
  if (d >= 30) {
    METRICS_CONFIG.push({ id: `NP_${id}`, category: 'power_np', source: 'watts', type: 'power_np', duration: d, limit: 2500 });
  }
});

// Ajout des métriques statiques (Cardio, VAM, Distances...)
METRICS_CONFIG.push(
  // CARDIO
  { id: 'HR_Max', category: 'heartrate', source: 'heartrate', type: 'avg_elapsed', duration: 1, limit: 250 },
  { id: 'HR_1m', category: 'heartrate', source: 'heartrate', type: 'avg_elapsed', duration: 60, limit: 240 },
  { id: 'HR_5m', category: 'heartrate', source: 'heartrate', type: 'avg_elapsed', duration: 300, limit: 230 },
  { id: 'HR_20m', category: 'heartrate', source: 'heartrate', type: 'avg_elapsed', duration: 1200, limit: 220 },
  { id: 'HR_60m', category: 'heartrate', source: 'heartrate', type: 'avg_elapsed', duration: 3600, limit: 210 },

  // VAM
  { id: 'VAM_Max', category: 'vam', source: 'altitude', type: 'vam', duration: 10, multiplier: 360, limit: 2500 },
  { id: 'VAM_5m', category: 'vam', source: 'altitude', type: 'vam', duration: 300, multiplier: 12, limit: 1800 },
  { id: 'VAM_20m', category: 'vam', source: 'altitude', type: 'vam', duration: 1200, multiplier: 3, limit: 1400 },
  { id: 'VAM_1h', category: 'vam', source: 'altitude', type: 'vam', duration: 3600, multiplier: 1, limit: 1200 },

  // DISTANCES & TEMPS
  { id: 'dist_1h', category: 'dist_time', source: 'distance', type: 'distance', duration: 3600, multiplier: 0.001, limit: 65 },
  { id: 'time_10k', category: 'time_dist', source: 'distance', type: 'min_time', target: 10000, limit: 10800 },
  { id: 'time_100k', category: 'time_dist', source: 'distance', type: 'min_time', target: 100000, limit: 108000 }
);

export function analyzeActivityForHallOfFame(activity: any) {
  const records: any[] = [];
  const foundGlobalMetrics = new Set<string>();

  try {
    const allowedTypes = ['Ride', 'VirtualRide', 'EBikeRide', 'GravelRide'];
    if (activity.type && !allowedTypes.includes(activity.type)) return records;

    const isZwift = activity.type === 'VirtualRide' || activity.name?.toLowerCase().includes('zwift');

    let streams = activity.streams_data;
    if (typeof streams === 'string') {
      try { streams = JSON.parse(streams); } catch (e) { streams = null; }
    }

    const userId = activity.user_id;
    const activityId = activity.id;
    const dateRecorded = activity.start_time || new Date().toISOString();

    if (activity.avg_heartrate > 0) { records.push(createRow(userId, activityId, dateRecorded, 'heartrate', 'HR_Avg', 0, activity.avg_heartrate)); foundGlobalMetrics.add('HR_Avg'); }
    if (activity.avg_power_w > 0) { records.push(createRow(userId, activityId, dateRecorded, 'power_elapsed', 'P_Avg', 0, activity.avg_power_w)); foundGlobalMetrics.add('P_Avg'); }

    if (streams && streams.time && Array.isArray(streams.time) && streams.time.length > 1) {
      const timeStream = streams.time;
      const wattsStream = streams.watts || [];

      // Pré-calculs des flux virtuels pour éviter de le refaire à chaque itération
      const movingTimeStream = [0];
      let currentMovingTime = 0;
      
      const pow4Stream = new Array(timeStream.length).fill(0);
      let r_i = 0;
      let r_sum = 0;

      for (let i = 1; i < timeStream.length; i++) {
        // Flux Moving Time
        let dt = timeStream[i] - timeStream[i - 1];
        if (dt > 5) dt = 1; // Si pause > 5s, on l'écrase à 1s pour le calcul moving
        currentMovingTime += dt;
        movingTimeStream.push(currentMovingTime);

        // Flux NP (Moyenne glissante 30s)
        const val = wattsStream[i] || 0;
        r_sum += val;
        while (timeStream[i] - timeStream[r_i] > 30 && r_i <= i) {
          r_sum -= wattsStream[r_i] || 0;
          r_i++;
        }
        const windowDt = timeStream[i] - timeStream[r_i] || 1;
        const avg30 = r_sum / windowDt;
        pow4Stream[i] = Math.pow(avg30, 4);
      }

      METRICS_CONFIG.forEach(config => {
        if (foundGlobalMetrics.has(config.id)) return;
        if (isZwift && (config.category === 'vam' || config.category === 'time_dist' || config.category === 'dist_time')) return;

        try {
          const valStream = streams[config.source];
          if (valStream && Array.isArray(valStream) && valStream.length > 1) {
            let value = 0;

            if (config.type === 'power_elapsed' || config.type === 'avg_elapsed') {
              value = getElapsedMaxAverage(valStream, timeStream, config.duration || 1);
            } 
            else if (config.type === 'power_moving') {
              value = getMovingMaxAverage(valStream, movingTimeStream, config.duration || 1);
            }
            else if (config.type === 'power_np') {
              value = getNPMax(pow4Stream, timeStream, config.duration || 1);
            }
            else if (config.type === 'vam') {
              value = getMaxDeltaForDuration(valStream, timeStream, config.duration || 1, false, true) * (config.multiplier || 1);
            } 
            else if (config.type === 'distance') {
              value = getMaxDeltaForDuration(valStream, timeStream, config.duration || 1, true, false) * (config.multiplier || 1);
            } 
            else if (config.type === 'min_time') {
              value = getMinTimeForDistance(valStream, timeStream, config.target || 1000);
            }

            if (value > 0 && value < config.limit) {
              records.push(createRow(userId, activityId, dateRecorded, config.category, config.id, config.duration || 0, value));
            }
          }
        } catch (e) {}
      });
    }

  } catch (error) {
    console.error(`[CRASH MOTEUR] Activité ${activity?.id}:`, error);
  }

  return records;
}

function createRow(uid: any, aid: any, date: any, cat: string, metric: string, dur: number, val: number) {
  return { user_id: uid, activity_id: aid, date_recorded: date, category: cat, metric_id: metric, duration: dur, value: val };
}