import { supabaseAdmin } from '@/lib/supabaseAdminClient';

// --- FONCTIONS UTILITAIRES ROBUSTES ---

function getSimpleMaxAverage(data: number[], duration: number): number {
  if (!data || !Array.isArray(data) || data.length < duration) return 0;
  let maxAvg = 0;
  let currentSum = 0;
  for (let i = 0; i < duration; i++) {
    currentSum += (typeof data[i] === 'number' ? data[i] : 0);
  }
  maxAvg = currentSum / duration;
  for (let i = duration; i < data.length; i++) {
    currentSum += (typeof data[i] === 'number' ? data[i] : 0) - (typeof data[i - duration] === 'number' ? data[i - duration] : 0);
    const avg = currentSum / duration;
    if (avg > maxAvg) maxAvg = avg;
  }
  return maxAvg;
}

// ⚡ NOUVEAU : Calcule la plus forte évolution sur une durée (ex: gain d'altitude en 5min)
function getMaxDeltaRate(data: number[], duration: number, multiplier: number): number {
  if (!data || !Array.isArray(data) || data.length < duration) return 0;
  let maxDelta = 0;
  for (let i = duration; i < data.length; i++) {
    const valIn = typeof data[i] === 'number' ? data[i] : 0;
    const valOut = typeof data[i - duration] === 'number' ? data[i - duration] : 0;
    const delta = valIn - valOut;
    if (delta > maxDelta) maxDelta = delta;
  }
  return maxDelta * multiplier;
}

// ⚡ NOUVEAU : Cherche le chrono le plus court pour une distance exacte (ex: 10 000m)
function getMinTimeForDistance(data: number[], targetDist: number): number {
  if (!data || !Array.isArray(data) || data.length === 0) return 0;
  let minTime = Infinity;
  let j = 0;
  for (let i = 0; i < data.length; i++) {
    while (j < data.length && (data[j] - data[i]) < targetDist) {
      j++;
    }
    if (j < data.length && (data[j] - data[i]) >= targetDist) {
      const time = j - i;
      if (time < minTime) minTime = time;
    }
  }
  return minTime === Infinity ? 0 : minTime;
}

// --- CONFIGURATION EXHAUSTIVE ---
const METRICS_CONFIG = [
  // PUISSANCE
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
  { id: 'HR_Max', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 1, limit: 250 },
  { id: 'HR_1m', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 60, limit: 240 },
  { id: 'HR_5m', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 300, limit: 230 },
  { id: 'HR_20m', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 1200, limit: 220 },
  { id: 'HR_60m', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 3600, limit: 210 },

  // VAM (Dénivelé sur temps * (3600/duration)) -> Résultat en Vm/h
  { id: 'VAM_Max', category: 'vam', source: 'altitude', type: 'delta_rate', duration: 60, multiplier: 60, limit: 4000 },
  { id: 'VAM_1m', category: 'vam', source: 'altitude', type: 'delta_rate', duration: 60, multiplier: 60, limit: 4000 },
  { id: 'VAM_5m', category: 'vam', source: 'altitude', type: 'delta_rate', duration: 300, multiplier: 12, limit: 3000 },
  { id: 'VAM_10m', category: 'vam', source: 'altitude', type: 'delta_rate', duration: 600, multiplier: 6, limit: 2500 },
  { id: 'VAM_20m', category: 'vam', source: 'altitude', type: 'delta_rate', duration: 1200, multiplier: 3, limit: 2200 },
  { id: 'VAM_30m', category: 'vam', source: 'altitude', type: 'delta_rate', duration: 1800, multiplier: 2, limit: 2000 },
  { id: 'VAM_1h', category: 'vam', source: 'altitude', type: 'delta_rate', duration: 3600, multiplier: 1, limit: 1800 },

  // KM / TEMPS (Distance sur durée fixe / 1000 -> Km)
  { id: 'dist_5m', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 300, multiplier: 0.001, limit: 10 },
  { id: 'dist_15m', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 900, multiplier: 0.001, limit: 25 },
  { id: 'dist_30m', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 1800, multiplier: 0.001, limit: 40 },
  { id: 'dist_1h', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 3600, multiplier: 0.001, limit: 60 },
  { id: 'dist_2h', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 7200, multiplier: 0.001, limit: 120 },
  { id: 'dist_3h', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 10800, multiplier: 0.001, limit: 180 },
  { id: 'dist_4h', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 14400, multiplier: 0.001, limit: 220 },
  { id: 'dist_5h', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 18000, multiplier: 0.001, limit: 260 },
  { id: 'dist_10h', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 36000, multiplier: 0.001, limit: 500 },

  // TEMPS / KM (Temps min pour distance cible en mètres) -> Résultat en secondes
  { id: 'time_1k', category: 'time_dist', source: 'distance', type: 'min_time', target: 1000, limit: 3600 },
  { id: 'time_3k', category: 'time_dist', source: 'distance', type: 'min_time', target: 3000, limit: 3600*2 },
  { id: 'time_5k', category: 'time_dist', source: 'distance', type: 'min_time', target: 5000, limit: 3600*3 },
  { id: 'time_10k', category: 'time_dist', source: 'distance', type: 'min_time', target: 10000, limit: 3600*4 },
  { id: 'time_20k', category: 'time_dist', source: 'distance', type: 'min_time', target: 20000, limit: 3600*5 },
  { id: 'time_30k', category: 'time_dist', source: 'distance', type: 'min_time', target: 30000, limit: 3600*6 },
  { id: 'time_40k', category: 'time_dist', source: 'distance', type: 'min_time', target: 40000, limit: 3600*7 },
  { id: 'time_50k', category: 'time_dist', source: 'distance', type: 'min_time', target: 50000, limit: 3600*8 },
  { id: 'time_75k', category: 'time_dist', source: 'distance', type: 'min_time', target: 75000, limit: 3600*10 },
  { id: 'time_100k', category: 'time_dist', source: 'distance', type: 'min_time', target: 100000, limit: 3600*12 },
  { id: 'time_150k', category: 'time_dist', source: 'distance', type: 'min_time', target: 150000, limit: 3600*16 },
  { id: 'time_160k', category: 'time_dist', source: 'distance', type: 'min_time', target: 160934, limit: 3600*18 }, // 100 miles
  { id: 'time_200k', category: 'time_dist', source: 'distance', type: 'min_time', target: 200000, limit: 3600*24 },
];

export function analyzeActivityForHallOfFame(activity: any) {
  const records: any[] = [];
  const foundGlobalMetrics = new Set<string>();

  try {
      let streams = activity.streams_data;
      if (typeof streams === 'string') {
          try { streams = JSON.parse(streams); } catch (e) { streams = null; }
      }

      const userId = activity.user_id;
      const activityId = activity.id;
      const dateRecorded = activity.start_time || new Date().toISOString(); 

      // On insère P_Avg et HR_Avg prioritairement par la DB
      if (activity.avg_heartrate > 0) { records.push(createRow(userId, activityId, dateRecorded, 'heartrate', 'HR_Avg', 0, activity.avg_heartrate)); foundGlobalMetrics.add('HR_Avg'); }
      if (activity.avg_power_w > 0) { records.push(createRow(userId, activityId, dateRecorded, 'power', 'P_Avg', 0, activity.avg_power_w)); foundGlobalMetrics.add('P_Avg'); }

      // ⚡ ANALYSE INTELLIGENTE DES STREAMS
      if (streams) {
          METRICS_CONFIG.forEach(config => {
              if (foundGlobalMetrics.has(config.id)) return;

              try {
                  const streamData = streams[config.source]; 
                  if (streamData && Array.isArray(streamData) && streamData.length > 0) {
                      let value = 0;

                      if (config.type === 'avg') {
                          value = getSimpleMaxAverage(streamData, config.duration || 1);
                      } else if (config.type === 'delta_rate') {
                          value = getMaxDeltaRate(streamData, config.duration || 1, config.multiplier || 1);
                      } else if (config.type === 'min_time') {
                          value = getMinTimeForDistance(streamData, config.target || 1000);
                      }

                      // On valide le record s'il fait sens
                      if (value > 0 && value < config.limit) {
                          records.push(createRow(userId, activityId, dateRecorded, config.category, config.id, config.duration || 0, value));
                      }
                  }
              } catch (e) { /* ignore */ }
          });
      }

  } catch (error) {
      console.error(`[CRASH] Erreur scan activité ${activity?.id}:`, error);
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