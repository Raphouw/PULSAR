import { supabaseAdmin } from '@/lib/supabaseAdminClient';

// --- FONCTIONS MATHÉMATIQUES AVANCÉES (TIME-BASED & GLITCH-PROOF) ---

// Calcule la moyenne max sur le temps réel (Puissance et Cardio)
function getTrueTimeMaxAverage(valData: number[], timeData: number[], targetDuration: number): number {
  if (!valData || !timeData || valData.length !== timeData.length || valData.length < 2) return 0;
  
  let maxAvg = 0;
  let i = 0;
  let currentSum = 0;
  let currentCount = 0;

  for (let j = 0; j < timeData.length; j++) {
    currentSum += (typeof valData[j] === 'number' ? valData[j] : 0);
    currentCount++;

    while (timeData[j] - timeData[i] > targetDuration && i <= j) {
      currentSum -= (typeof valData[i] === 'number' ? valData[i] : 0);
      currentCount--;
      i++;
    }

    const realTimeDiff = timeData[j] - timeData[i];
    // Validation stricte : la fenêtre temporelle réelle doit correspondre à l'intervalle visé
    if (realTimeDiff >= targetDuration - 2 && realTimeDiff <= targetDuration + 5 && currentCount > 0) {
      const avg = currentSum / currentCount;
      if (avg > maxAvg) maxAvg = avg;
    }
  }
  return maxAvg;
}

// Cherche la plus grande différence sur une durée (ex: Altitude VAM ou Distance)
function getMaxDeltaForDuration(valData: number[], timeData: number[], targetDuration: number, isDistance: boolean = false, isAltitude: boolean = false): number {
  if (!valData || !timeData || valData.length !== timeData.length || valData.length < 2) return 0;
  let maxDelta = 0;
  let i = 0;

  for (let j = 0; j < timeData.length; j++) {
    while (timeData[j] - timeData[i] > targetDuration && i < j) {
      i++;
    }

    const realTimeDiff = timeData[j] - timeData[i];
    
    // Fenêtre temporelle valide
    if (realTimeDiff >= targetDuration - 2 && realTimeDiff <= targetDuration + 5) {
      const delta = valData[j] - valData[i];

      // ⚡ REQUIS : VAM uniquement positive
      if (isAltitude && delta <= 0) continue;

      // ⚡ REQUIS & SECURITÉ ANTI-PAUSE/GLITCH : Vitesse max humaine fixée à 80 km/h (22.2 m/s)
      if (isDistance) {
        const speedMs = delta / realTimeDiff;
        if (speedMs > 22.2 || speedMs < 0) continue; 
      }

      if (delta > maxDelta) maxDelta = delta;
    }
  }
  return maxDelta;
}

// Cherche le temps MINIMUM réel pour franchir une distance (ex: 10km)
function getMinTimeForDistance(distData: number[], timeData: number[], targetDist: number): number {
  if (!distData || !timeData || distData.length !== timeData.length || distData.length < 2) return 0;
  let minTime = Infinity;
  let j = 0;

  for (let i = 0; i < distData.length; i++) {
    while (j < distData.length && (distData[j] - distData[i]) < targetDist) {
      j++;
    }
    
    if (j < distData.length && (distData[j] - distData[i]) >= targetDist) {
      const realTimeDiff = timeData[j] - timeData[i];
      const realDistDiff = distData[j] - distData[i];
      
      if (realTimeDiff <= 0) continue;

      // ⚡ SECURITÉ ANTI-TÉLÉPORTATION : Vitesse max calculée sur la portion = 80 km/h
      const portionSpeedMs = realDistDiff / realTimeDiff;
      if (portionSpeedMs > 22.2) continue; 

      if (realTimeDiff < minTime) {
        minTime = realTimeDiff;
      }
    }
  }
  return minTime === Infinity ? 0 : minTime;
}

// --- CONFIGURATION EXHAUSTIVE ET UNIFIÉE DES MÉTRIQUES ---
const METRICS_CONFIG = [
  // PUISSANCE (Maintenant poussée jusqu'à 8 Heures !)
  { id: 'P1s', category: 'power', source: 'watts', type: 'avg', duration: 1, limit: 2500 },
  { id: 'P5s', category: 'power', source: 'watts', type: 'avg', duration: 5, limit: 2000 },
  { id: 'P15s', category: 'power', source: 'watts', type: 'avg', duration: 15, limit: 1800 },
  { id: 'P30s', category: 'power', source: 'watts', type: 'avg', duration: 30, limit: 1500 },
  { id: 'P1m', category: 'power', source: 'watts', type: 'avg', duration: 60, limit: 1200 },
  { id: 'P5m', category: 'power', source: 'watts', type: 'avg', duration: 300, limit: 800 },
  { id: 'P20m', category: 'power', source: 'watts', type: 'avg', duration: 1200, limit: 600 },
  { id: 'P60m', category: 'power', source: 'watts', type: 'avg', duration: 3600, limit: 500 },
  { id: 'P2h', category: 'power', source: 'watts', type: 'avg', duration: 7200, limit: 450 },
  { id: 'P3h', category: 'power', source: 'watts', type: 'avg', duration: 10800, limit: 400 },
  { id: 'P4h', category: 'power', source: 'watts', type: 'avg', duration: 14400, limit: 350 },
  { id: 'P5h', category: 'power', source: 'watts', type: 'avg', duration: 18000, limit: 300 },
  { id: 'P8h', category: 'power', source: 'watts', type: 'avg', duration: 28800, limit: 250 },

  // CARDIO
// CARDIO
  { id: 'HR_Max', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 1, limit: 250 },
  { id: 'HR_1m', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 60, limit: 240 },
  { id: 'HR_5m', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 300, limit: 230 },
  { id: 'HR_20m', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 1200, limit: 220 },
  { id: 'HR_60m', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 3600, limit: 210 },
  { id: 'HR_2h', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 7200, limit: 200 },
  { id: 'HR_3h', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 10800, limit: 190 },
  { id: 'HR_5h', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 18000, limit: 180 },
  { id: 'HR_8h', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 28800, limit: 170 },

  // VAM (Dénivelé positif à l'heure)
  { id: 'VAM_Max', category: 'vam', source: 'altitude', type: 'vam', duration: 60, multiplier: 60, limit: 3500 },
  { id: 'VAM_1m', category: 'vam', source: 'altitude', type: 'vam', duration: 60, multiplier: 60, limit: 3500 },
  { id: 'VAM_5m', category: 'vam', source: 'altitude', type: 'vam', duration: 300, multiplier: 12, limit: 2800 },
  { id: 'VAM_10m', category: 'vam', source: 'altitude', type: 'vam', duration: 600, multiplier: 6, limit: 2500 },
  { id: 'VAM_20m', category: 'vam', source: 'altitude', type: 'vam', duration: 1200, multiplier: 3, limit: 2200 },
  { id: 'VAM_30m', category: 'vam', source: 'altitude', type: 'vam', duration: 1800, multiplier: 2, limit: 2000 },
  { id: 'VAM_1h', category: 'vam', source: 'altitude', type: 'vam', duration: 3600, multiplier: 1, limit: 1800 },

  // KM / TEMPS (Distance ramenée en km)
  { id: 'dist_5m', category: 'dist_time', source: 'distance', type: 'distance', duration: 300, multiplier: 0.001, limit: 8 },
  { id: 'dist_15m', category: 'dist_time', source: 'distance', type: 'distance', duration: 900, multiplier: 0.001, limit: 22 },
  { id: 'dist_30m', category: 'dist_time', source: 'distance', type: 'distance', duration: 1800, multiplier: 0.001, limit: 40 },
  { id: 'dist_1h', category: 'dist_time', source: 'distance', type: 'distance', duration: 3600, multiplier: 0.001, limit: 65 },
  { id: 'dist_2h', category: 'dist_time', source: 'distance', type: 'distance', duration: 7200, multiplier: 0.001, limit: 120 },
  { id: 'dist_3h', category: 'dist_time', source: 'distance', type: 'distance', duration: 10800, multiplier: 0.001, limit: 175 },
  { id: 'dist_4h', category: 'dist_time', source: 'distance', type: 'distance', duration: 14400, multiplier: 0.001, limit: 220 },
  { id: 'dist_5h', category: 'dist_time', source: 'distance', type: 'distance', duration: 18000, multiplier: 0.001, limit: 260 },

  // TEMPS / KM (Temps en secondes pour une distance en mètres)
  { id: 'time_1k', category: 'time_dist', source: 'distance', type: 'min_time', target: 1000, limit: 1200 },
  { id: 'time_3k', category: 'time_dist', source: 'distance', type: 'min_time', target: 3000, limit: 3600 },
  { id: 'time_5k', category: 'time_dist', source: 'distance', type: 'min_time', target: 5000, limit: 5400 },
  { id: 'time_10k', category: 'time_dist', source: 'distance', type: 'min_time', target: 10000, limit: 10800 },
  { id: 'time_20k', category: 'time_dist', source: 'distance', type: 'min_time', target: 20000, limit: 21600 },
  { id: 'time_30k', category: 'time_dist', source: 'distance', type: 'min_time', target: 30000, limit: 32400 },
  { id: 'time_40k', category: 'time_dist', source: 'distance', type: 'min_time', target: 40000, limit: 43200 },
  { id: 'time_50k', category: 'time_dist', source: 'distance', type: 'min_time', target: 50000, limit: 54000 },
  { id: 'time_100k', category: 'time_dist', source: 'distance', type: 'min_time', target: 100000, limit: 108000 },
];

export function analyzeActivityForHallOfFame(activity: any) {
  const records: any[] = [];
  const foundGlobalMetrics = new Set<string>();

  try {
    // 1. Filtrage strict du type d'activité (Pas de course à pied ni de rando)
    const allowedTypes = ['Ride', 'VirtualRide', 'EBikeRide', 'GravelRide'];
    if (activity.type && !allowedTypes.includes(activity.type)) return records;

    // ⚡ EXCLUSION REQUISE : Pas de Zwift (VirtualRide) pour la VAM et les métriques de vitesse/distance
    const isZwift = activity.type === 'VirtualRide' || activity.name?.toLowerCase().includes('zwift');

    let streams = activity.streams_data;
    if (typeof streams === 'string') {
      try { streams = JSON.parse(streams); } catch (e) { streams = null; }
    }

    const userId = activity.user_id;
    const activityId = activity.id;
    const dateRecorded = activity.start_time || new Date().toISOString();

    // Insérer les totaux globaux calculés par la DB
    if (activity.avg_heartrate > 0) { records.push(createRow(userId, activityId, dateRecorded, 'heartrate', 'HR_Avg', 0, activity.avg_heartrate)); foundGlobalMetrics.add('HR_Avg'); }
    if (activity.avg_power_w > 0) { records.push(createRow(userId, activityId, dateRecorded, 'power', 'P_Avg', 0, activity.avg_power_w)); foundGlobalMetrics.add('P_Avg'); }

    // Analyse temporelle précise
    if (streams && streams.time && Array.isArray(streams.time) && streams.time.length > 1) {
      const timeStream = streams.time;

      METRICS_CONFIG.forEach(config => {
        if (foundGlobalMetrics.has(config.id)) return;

        // ⚡ Sécurité Zwift : On bloque le calcul de cette métrique si c'est du virtuel
        if (isZwift && (config.category === 'vam' || config.category === 'time_dist' || config.category === 'dist_time')) {
          return;
        }

        try {
          const valStream = streams[config.source];
          if (valStream && Array.isArray(valStream) && valStream.length > 1) {
            let value = 0;

            if (config.type === 'avg') {
              value = getTrueTimeMaxAverage(valStream, timeStream, config.duration || 1);
            } 
            else if (config.type === 'vam') {
              const rawAltitudeDelta = getMaxDeltaForDuration(valStream, timeStream, config.duration || 1, false, true);
              value = rawAltitudeDelta * (config.multiplier || 1);
            } 
            else if (config.type === 'distance') {
              const rawDistanceDelta = getMaxDeltaForDuration(valStream, timeStream, config.duration || 1, true, false);
              value = rawDistanceDelta * (config.multiplier || 1);
            } 
            else if (config.type === 'min_time') {
              value = getMinTimeForDistance(valStream, timeStream, config.target || 1000);
            }

            // Filtrage de cohérence final
            if (value > 0 && value < config.limit) {
              records.push(createRow(userId, activityId, dateRecorded, config.category, config.id, config.duration || 0, value));
            }
          }
        } catch (e) { /* ignore tracking branch error */ }
      });
    }

  } catch (error) {
    console.error(`[CRASH MOTEUR] Activité ${activity?.id}:`, error);
  }

  return records;
}

function createRow(uid: any, aid: any, date: any, cat: string, metric: string, dur: number, val: number) {
  return {
    user_id: uid,
    activity_id: aid,
    date_recorded: date,
    category: cat,
    metric_id: metric,
    duration: dur,
    value: val
  };
}