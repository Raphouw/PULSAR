import { supabaseAdmin } from '@/lib/supabaseAdminClient';

// --- MOTEURS DE CALCUL TEMPORELS ---

function getElapsedMaxAverage(valData: number[], timeData: number[], targetDuration: number): number {
  if (!valData || !timeData || valData.length === 0) return 0;
  if (targetDuration === 1) return Math.max(...valData.filter(v => typeof v === 'number'));

  let maxAvg = 0;
  let i = 0;
  let currentSum = 0;

  for (let j = 0; j < timeData.length; j++) {
    currentSum += (typeof valData[j] === 'number' ? valData[j] : 0);
    // On avance le pointeur de début si la fenêtre dépasse le temps cible
    while (timeData[j] - timeData[i] >= targetDuration && i < j) {
      currentSum -= (typeof valData[i] === 'number' ? valData[i] : 0);
      i++;
    }
    // Si la fenêtre fait la bonne taille (tolérance de 3s), on valide. Le diviseur EST le temps cible (inclut les pauses de 0W)
    if (timeData[j] - timeData[i] >= targetDuration - 3) {
      const avg = currentSum / targetDuration;
      if (avg > maxAvg) maxAvg = avg;
    }
  }
  return maxAvg;
}

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

function getMaxDeltaForDuration(valData: number[], timeData: number[], targetDuration: number, isDistance: boolean = false, isAltitude: boolean = false): number {
  if (!valData || !timeData || valData.length < 2) return 0;
  let maxDelta = 0, i = 0;
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
  let minTime = Infinity, j = 0;
  for (let i = 0; i < distData.length; i++) {
    while (j < distData.length && (distData[j] - distData[i]) < targetDist) j++;
    if (j < distData.length && (distData[j] - distData[i]) >= targetDist) {
      const realTimeDiff = timeData[j] - timeData[i];
      const portionSpeedMs = (distData[j] - distData[i]) / realTimeDiff;
      if (realTimeDiff > 0 && portionSpeedMs <= 22.2 && realTimeDiff < minTime) {
        minTime = realTimeDiff;
      }
    }
  }
  return minTime === Infinity ? 0 : minTime;
}


// --- CONFIGURATION EXHAUSTIVE DES METRIQUES ---
const METRICS_CONFIG: any[] = [];

// 1. PUISSANCE : Pmax (1s), P15s, P30s, P1m, P5m, P20m, P1h
const powerDurations = [
  { d: 1, id: 'P1s' }, { d: 15, id: 'P15s' }, { d: 30, id: 'P30s' },
  { d: 60, id: 'P1m' }, { d: 300, id: 'P5m' }, { d: 1200, id: 'P20m' }, { d: 3600, id: 'P1h' }
];
powerDurations.forEach(({ d, id }) => {
  METRICS_CONFIG.push({ id, category: 'power_elapsed', source: 'watts', type: 'power_elapsed', duration: d, limit: 2500 });
  METRICS_CONFIG.push({ id, category: 'power_moving', source: 'watts', type: 'power_moving', duration: d, limit: 2500 });
  if (d >= 30) METRICS_CONFIG.push({ id, category: 'power_np', source: 'watts', type: 'power_np', duration: d, limit: 2500 });
});

METRICS_CONFIG.push(
  // 2. CARDIO : FCmax, Fcmax 1m, 5m, 20m, 1h
  { id: 'FCmax', category: 'heartrate', source: 'heartrate', type: 'avg_elapsed', duration: 1, limit: 250 },
  { id: 'FCmax_1m', category: 'heartrate', source: 'heartrate', type: 'avg_elapsed', duration: 60, limit: 240 },
  { id: 'FCmax_5m', category: 'heartrate', source: 'heartrate', type: 'avg_elapsed', duration: 300, limit: 230 },
  { id: 'FCmax_20m', category: 'heartrate', source: 'heartrate', type: 'avg_elapsed', duration: 1200, limit: 220 },
  { id: 'FCmax_1h', category: 'heartrate', source: 'heartrate', type: 'avg_elapsed', duration: 3600, limit: 210 },

  // 3. VAM : VAMmax(10s), 1m, 5m, 10m, 20m, 30m, 1h
  { id: 'VAMmax', category: 'vam', source: 'altitude', type: 'vam', duration: 10, multiplier: 360, limit: 2500 },
  { id: 'VAM1mMax', category: 'vam', source: 'altitude', type: 'vam', duration: 60, multiplier: 60, limit: 2200 },
  { id: 'VAM5minMax', category: 'vam', source: 'altitude', type: 'vam', duration: 300, multiplier: 12, limit: 1800 },
  { id: 'VAM10minMax', category: 'vam', source: 'altitude', type: 'vam', duration: 600, multiplier: 6, limit: 1600 },
  { id: 'VAM20minMax', category: 'vam', source: 'altitude', type: 'vam', duration: 1200, multiplier: 3, limit: 1400 },
  { id: 'VAM30minMax', category: 'vam', source: 'altitude', type: 'vam', duration: 1800, multiplier: 2, limit: 1300 },
  { id: 'VAM1hMax', category: 'vam', source: 'altitude', type: 'vam', duration: 3600, multiplier: 1, limit: 1200 },

  // 4. TEMPS/KM : 1km, 3km, 5km, 10km, 20km, 30km, 40km, 50km, 75km, 100km, 150km, 100 miles, 200km
  ...[1, 3, 5, 10, 20, 30, 40, 50, 75, 100, 150, 160.934, 200].map(k => ({
    id: `time_${k === 160.934 ? '100mi' : k + 'km'}`, category: 'time_dist', source: 'distance', type: 'min_time', target: k * 1000, limit: k * 3600
  })),

  // 5. KM/TEMPS : 5min, 15min, 30min, 1h, 2h, 3h, 4h, 5h, 10h
  ...[300, 900, 1800, 3600, 7200, 10800, 14400, 18000, 36000].map(s => ({
    id: `dist_${s >= 3600 ? (s/3600)+'h' : (s/60)+'m'}`, category: 'dist_time', source: 'distance', type: 'distance', duration: s, multiplier: 0.001, limit: 500
  }))
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

    // --- ENREGISTREMENT DES MÉTRIQUES GLOBALES "PHYSIQUE" ---
    if (activity.distance_km > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'Dist Max', 0, activity.distance_km));
    if (activity.elevation_gain_m > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'D+ max', 0, activity.elevation_gain_m));
    if (activity.max_speed_kmh > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'Vit max', 0, activity.max_speed_kmh));
    if (activity.avg_speed_kmh > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'Vit moy max', 0, activity.avg_speed_kmh));
    if (activity.duration_s > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'Durée max', 0, activity.duration_s));
    if (activity.calories_kcal > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'kcal max', 0, activity.calories_kcal));
    if (activity.tss > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'TSS max', 0, activity.tss));
    if (activity.intensity_factor > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'IF max', 0, activity.intensity_factor));
    if (activity.elevation_gain_m > 0 && activity.distance_km > 0) {
      records.push(createRow(userId, activityId, dateRecorded, 'physique', 'ratio d+/km max', 0, activity.elevation_gain_m / activity.distance_km));
    }
    if (activity.avg_heartrate > 0 && activity.avg_power_w > 0) {
      records.push(createRow(userId, activityId, dateRecorded, 'physique', 'BPM/w', 0, activity.avg_heartrate / activity.avg_power_w));
    }

    // Statistiques moyennes (Cardio & Power)
    if (activity.avg_heartrate > 0) records.push(createRow(userId, activityId, dateRecorded, 'heartrate', 'FCmoymax', 0, activity.avg_heartrate));
    if (activity.avg_power_w > 0) {
      records.push(createRow(userId, activityId, dateRecorded, 'power_elapsed', 'Pmoymax', 0, activity.avg_power_w));
      records.push(createRow(userId, activityId, dateRecorded, 'power_moving', 'Pmoymax', 0, activity.avg_power_w)); // Simplification pour la moyenne DB
    }

    // --- ANALYSE DES STREAMS ---
    if (streams && streams.time && Array.isArray(streams.time) && streams.time.length > 1) {
      const timeStream = streams.time;
      const wattsStream = streams.watts || [];

      // Pré-calcul: Moving Time & NP Pow4
      const movingTimeStream = [0];
      let currentMovingTime = 0;
      const pow4Stream = new Array(timeStream.length).fill(0);
      let r_i = 0, r_sum = 0;

      for (let i = 1; i < timeStream.length; i++) {
        let dt = timeStream[i] - timeStream[i - 1];
        if (dt > 5) dt = 1; // Gel du chrono moving pendant les pauses > 5s
        currentMovingTime += dt;
        movingTimeStream.push(currentMovingTime);

        const val = wattsStream[i] || 0;
        r_sum += val;
        while (timeStream[i] - timeStream[r_i] > 30 && r_i <= i) {
          r_sum -= wattsStream[r_i] || 0;
          r_i++;
        }
        const windowDt = timeStream[i] - timeStream[r_i] || 1;
        pow4Stream[i] = Math.pow(r_sum / windowDt, 4);
      }

      METRICS_CONFIG.forEach(config => {
        if (isZwift && (config.category === 'vam' || config.category === 'time_dist' || config.category === 'dist_time')) return;

        try {
          const valStream = streams[config.source];
          if (valStream && Array.isArray(valStream) && valStream.length > 1) {
            let value = 0;

            if (config.type === 'power_elapsed' || config.type === 'avg_elapsed') value = getElapsedMaxAverage(valStream, timeStream, config.duration);
            else if (config.type === 'power_moving') value = getMovingMaxAverage(valStream, movingTimeStream, config.duration);
            else if (config.type === 'power_np') value = getNPMax(pow4Stream, timeStream, config.duration);
            else if (config.type === 'vam') value = getMaxDeltaForDuration(valStream, timeStream, config.duration, false, true) * (config.multiplier || 1);
            else if (config.type === 'distance') value = getMaxDeltaForDuration(valStream, timeStream, config.duration, true, false) * (config.multiplier || 1);
            else if (config.type === 'min_time') value = getMinTimeForDistance(valStream, timeStream, config.target);

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