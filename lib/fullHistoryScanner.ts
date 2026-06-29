import { supabaseAdmin } from '@/lib/supabaseAdminClient';

// --- MOTEURS DE CALCUL TEMPORELS ---
function getElapsedMaxAverage(valData: number[], timeData: number[], targetDuration: number): number {
  if (!valData || !timeData || valData.length === 0) return 0;
  if (targetDuration === 1) return Math.max(...valData.filter(v => typeof v === 'number'));

  let maxAvg = 0, i = 0, currentSum = 0;
  for (let j = 0; j < timeData.length; j++) {
    currentSum += (typeof valData[j] === 'number' ? valData[j] : 0);
    while (timeData[j] - timeData[i] >= targetDuration && i < j) {
      currentSum -= (typeof valData[i] === 'number' ? valData[i] : 0);
      i++;
    }
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

  let maxAvg = 0, i = 0, currentSum = 0;
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
  let maxNP = 0, i = 0, currentSumPow4 = 0;
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

// 1. PUISSANCE
const powerDurations = [
  { d: 1, id: 'P1s' }, { d: 15, id: 'P15s' }, { d: 30, id: 'P30s' },
  { d: 60, id: 'P1m' }, { d: 300, id: 'P5m' }, { d: 1200, id: 'P20m' }, { d: 3600, id: 'P1h' }
];

powerDurations.forEach(({ d, id }) => {
  // Le mode Elapsed retourne en catégorie 'power' pour valider le scan et stopper la boucle infinie
  METRICS_CONFIG.push({ id, category: 'power', source: 'watts', type: 'power_elapsed', duration: d, limit: 2500 });
  METRICS_CONFIG.push({ id, category: 'power_moving', source: 'watts', type: 'power_moving', duration: d, limit: 2500 });
  if (d >= 30) METRICS_CONFIG.push({ id, category: 'power_np', source: 'watts', type: 'power_np', duration: d, limit: 2500 });
});

METRICS_CONFIG.push(
  // 2. CARDIO 
  { id: 'FCmax', category: 'heartrate', source: 'heartrate', type: 'avg_elapsed', duration: 1, limit: 250 },
  { id: 'FCmax 1min', category: 'heartrate', source: 'heartrate', type: 'avg_elapsed', duration: 60, limit: 240 },
  { id: 'FCmax 5min', category: 'heartrate', source: 'heartrate', type: 'avg_elapsed', duration: 300, limit: 230 },
  { id: 'FCmax 20min', category: 'heartrate', source: 'heartrate', type: 'avg_elapsed', duration: 1200, limit: 220 },
  { id: 'FCmax 1h', category: 'heartrate', source: 'heartrate', type: 'avg_elapsed', duration: 3600, limit: 210 },

  // 3. VAM 
  { id: 'VAMmax', category: 'vam', source: 'altitude', type: 'vam', duration: 10, multiplier: 360, limit: 3000 },
  { id: 'VAM1mMax', category: 'vam', source: 'altitude', type: 'vam', duration: 60, multiplier: 60, limit: 2500 },
  { id: 'VAM5minMax', category: 'vam', source: 'altitude', type: 'vam', duration: 300, multiplier: 12, limit: 2000 },
  { id: 'VAM10minMax', category: 'vam', source: 'altitude', type: 'vam', duration: 600, multiplier: 6, limit: 1800 },
  { id: 'VAM20minMax', category: 'vam', source: 'altitude', type: 'vam', duration: 1200, multiplier: 3, limit: 1600 },
  { id: 'VAM30minMax', category: 'vam', source: 'altitude', type: 'vam', duration: 1800, multiplier: 2, limit: 1400 },
  { id: 'VAM1hMax', category: 'vam', source: 'altitude', type: 'vam', duration: 3600, multiplier: 1, limit: 1200 },

  // 4. TEMPS/KM (Inclus 150km, 100 miles, 200km)
  ...[
    { k: 1, id: 'time_1km' }, { k: 3, id: 'time_3km' }, { k: 5, id: 'time_5km' },
    { k: 10, id: 'time_10km' }, { k: 20, id: 'time_20km' }, { k: 30, id: 'time_30km' },
    { k: 40, id: 'time_40km' }, { k: 50, id: 'time_50km' }, { k: 75, id: 'time_75km' },
    { k: 100, id: 'time_100km' }, { k: 150, id: 'time_150km' }, 
    { k: 160.934, id: 'time_100 miles' }, { k: 200, id: 'time_200km' }
  ].map(({k, id}) => ({
    id, category: 'time_dist', source: 'distance', type: 'min_time', target: k * 1000, limit: 800000 
  })),

  // 5. KM/TEMPS (Inclus 1 min, 10h)
  ...[
    { s: 60, id: 'dist_1m' }, { s: 300, id: 'dist_5m' }, { s: 900, id: 'dist_15m' },
    { s: 1800, id: 'dist_30m' }, { s: 3600, id: 'dist_1h' }, { s: 7200, id: 'dist_2h' },
    { s: 10800, id: 'dist_3h' }, { s: 14400, id: 'dist_4h' }, { s: 18000, id: 'dist_5h' },
    { s: 36000, id: 'dist_10h' }
  ].map(({s, id}) => ({
    id, category: 'dist_time', source: 'distance', type: 'distance', duration: s, multiplier: 0.001, limit: 1000
  }))
);

export function analyzeActivityForHallOfFame(activity: any) {
  const records: any[] = [];
  
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

    // --- ENREGISTREMENT SÉCURISÉ DES MÉTRIQUES GLOBALES "PHYSIQUE" ---
    const distKm = activity.distance_km || (activity.distance ? activity.distance / 1000 : 0);
    const elevGain = activity.elevation_gain_m || activity.total_elevation_gain || 0;
    const maxSpeedKmh = activity.max_speed_kmh || (activity.max_speed ? activity.max_speed * 3.6 : 0);
    const avgSpeedKmh = activity.avg_speed_kmh || (activity.average_speed ? activity.average_speed * 3.6 : 0);
    const durationS = activity.duration_s || activity.elapsed_time || activity.moving_time || 0;
    const kcal = activity.calories_kcal || activity.calories || activity.kilojoules || 0;
    const hrAvg = activity.avg_heartrate || activity.average_heartrate || 0;
    const powerAvg = activity.avg_power_w || activity.average_watts || activity.weighted_average_power || 0;
    const tss = activity.tss || activity.suffer_score || 0;
    const intensity = activity.intensity_factor || 0;

    if (distKm > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'Dist Max', 0, distKm));
    if (elevGain > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'D+ max', 0, elevGain));
    if (maxSpeedKmh > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'Vit max', 0, maxSpeedKmh));
    if (avgSpeedKmh > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'Vit moy max', 0, avgSpeedKmh));
    if (durationS > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'Durée max', 0, durationS));
    if (kcal > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'kcal max', 0, kcal));
    if (tss > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'TSS max', 0, tss));
    if (intensity > 0) records.push(createRow(userId, activityId, dateRecorded, 'physique', 'IF max', 0, intensity));
    
    if (elevGain > 0 && distKm > 0) {
      records.push(createRow(userId, activityId, dateRecorded, 'physique', 'ratio d+/km max', 0, elevGain / distKm));
    }
    
    // BPM/w (On crée les deux IDs pour que ta carte de config les trouve)
    if (hrAvg > 0 && powerAvg > 0) {
      const bpmW = hrAvg / powerAvg;
      records.push(createRow(userId, activityId, dateRecorded, 'physique', 'BPM/w min', 0, bpmW));
      records.push(createRow(userId, activityId, dateRecorded, 'physique', 'BPM/w max', 0, bpmW));
    }
    
    // Rappel: volume sur un mois max et streak journalière nécessitent des agrégations SQL globales,
    // elles ne peuvent techniquement pas être calculées lors du scan unitaire d'une seule activité.

    if (hrAvg > 0) records.push(createRow(userId, activityId, dateRecorded, 'heartrate', 'FCmoymax', 0, hrAvg));
    if (powerAvg > 0) {
      records.push(createRow(userId, activityId, dateRecorded, 'power', 'Pmoymax', 0, powerAvg));
      records.push(createRow(userId, activityId, dateRecorded, 'power_moving', 'Pmoymax', 0, powerAvg));
      records.push(createRow(userId, activityId, dateRecorded, 'power_np', 'Pmoymax', 0, powerAvg)); 
    }

    // --- ANALYSE DES STREAMS ---
    if (streams && streams.time && Array.isArray(streams.time) && streams.time.length > 1) {
      const timeStream = streams.time;
      const wattsStream = streams.watts || [];

      const movingTimeStream = [0];
      let currentMovingTime = 0;
      const pow4Stream = new Array(timeStream.length).fill(0);
      let r_i = 0, r_sum = 0;

      for (let i = 1; i < timeStream.length; i++) {
        let dt = timeStream[i] - timeStream[i - 1];
        if (dt > 5) dt = 1; 
        currentMovingTime += dt;
        movingTimeStream.push(currentMovingTime);

        if (wattsStream.length > 0) {
            const val = wattsStream[i] || 0;
            r_sum += val;
            while (timeStream[i] - timeStream[r_i] > 30 && r_i <= i) {
              r_sum -= wattsStream[r_i] || 0;
              r_i++;
            }
            const windowDt = timeStream[i] - timeStream[r_i] || 1;
            pow4Stream[i] = Math.pow(r_sum / windowDt, 4);
        }
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