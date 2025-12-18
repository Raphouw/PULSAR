import { supabaseAdmin } from '@/lib/supabaseAdminClient';

// --- FONCTION UTILITAIRE ROBUSTE ---
function getSimpleMaxAverage(data: number[], duration: number): number {
  if (!data || !Array.isArray(data) || data.length < duration) return 0;

  let maxAvg = 0;
  let currentSum = 0;

  // Initialisation safe
  for (let i = 0; i < duration; i++) {
    const val = typeof data[i] === 'number' ? data[i] : 0;
    currentSum += val;
  }
  maxAvg = currentSum / duration;

  // Sliding Window safe
  for (let i = duration; i < data.length; i++) {
    const valIn = typeof data[i] === 'number' ? data[i] : 0;
    const valOut = typeof data[i - duration] === 'number' ? data[i - duration] : 0;
    
    currentSum += valIn - valOut;
    const avg = currentSum / duration;
    if (avg > maxAvg) maxAvg = avg;
  }

  return maxAvg;
}

// --- CONFIGURATION ---
const METRICS_CONFIG = [
  // PUISSANCE
  { id: 'P1s', category: 'power', source: 'watts', duration: 1, limit: 2500 },
  { id: 'P5s', category: 'power', source: 'watts', duration: 5, limit: 2000 },
  { id: 'P30s', category: 'power', source: 'watts', duration: 30, limit: 1500 },
  { id: 'P1m', category: 'power', source: 'watts', duration: 60, limit: 1200 },
  { id: 'P5m', category: 'power', source: 'watts', duration: 300, limit: 800 },
  { id: 'P20m', category: 'power', source: 'watts', duration: 1200, limit: 600 },
  { id: 'P60m', category: 'power', source: 'watts', duration: 3600, limit: 500 },
  // P_Avg géré prioritairement par DB
  { id: 'P_Avg', category: 'power', source: 'watts', duration: 0, limit: 500 }, 

  // CARDIO
  // HR_Max et HR_Avg gérés prioritairement par DB
  { id: 'HR_Max', category: 'heartrate', source: 'heartrate', duration: 1, limit: 250 },
  { id: 'HR_Avg', category: 'heartrate', source: 'heartrate', duration: 0, limit: 230 },
  { id: 'HR_1m', category: 'heartrate', source: 'heartrate', duration: 60, limit: 240 },
  { id: 'HR_5m', category: 'heartrate', source: 'heartrate', duration: 300, limit: 230 },
  { id: 'HR_20m', category: 'heartrate', source: 'heartrate', duration: 1200, limit: 220 },
  { id: 'HR_60m', category: 'heartrate', source: 'heartrate', duration: 3600, limit: 210 },
];

export function analyzeActivityForHallOfFame(activity: any) {
  const records: any[] = [];
  const foundGlobalMetrics = new Set<string>();

  try {
      // 1. Parsing Streams (si présents)
      let streams = activity.streams_data;
      if (typeof streams === 'string') {
          try { streams = JSON.parse(streams); } catch (e) { streams = null; }
      }

      const userId = activity.user_id;
      const activityId = activity.id;
      const dateRecorded = activity.start_time || new Date().toISOString(); 

      // -----------------------------------------------------------------------
      // A. CALORIES (RECALCUL SYSTÉMATIQUE)
      // -----------------------------------------------------------------------
      // Par défaut, on prend la valeur BDD au cas où on n'a pas de puissance
      let finalCalories = activity.calories_kcal || 0;
      
      // MAIS : Si on a AvgPower et Duration, ON ÉCRASE systématiquement la valeur BDD
      // car elle est considérée comme fausse.
      if (typeof activity.avg_power_w === 'number' && activity.avg_power_w > 0 && 
          typeof activity.duration_s === 'number' && activity.duration_s > 0) {
          
          // Ton calcul exact : (AvgWatts * DurationSec) / 1000 = kJ
          const workKj = (activity.avg_power_w * activity.duration_s) / 1000;
          
          // Conversion kJ -> kcal avec ton ratio spécifique
          const recalculated = Math.round(workKj / 1.00416);
          
          if (recalculated > 0) {
              finalCalories = recalculated;
          }
      }

      // -----------------------------------------------------------------------
      // B. PHYSIQUE (Avec Calories recalculées)
      // -----------------------------------------------------------------------
      if (activity.distance_km > 0) records.push(createRow(userId, activityId, dateRecorded, 'physics', 'Dist_Max', 0, activity.distance_km));
      if (activity.elevation_gain_m > 0) records.push(createRow(userId, activityId, dateRecorded, 'physics', 'Elev_Max', 0, activity.elevation_gain_m));
      if (activity.max_speed_kmh > 0) records.push(createRow(userId, activityId, dateRecorded, 'physics', 'Speed_Max', 1, activity.max_speed_kmh));
      if (activity.avg_speed_kmh > 0) records.push(createRow(userId, activityId, dateRecorded, 'physics', 'Speed_Avg', 0, activity.avg_speed_kmh));
      if (activity.duration_s > 0) records.push(createRow(userId, activityId, dateRecorded, 'physics', 'Duration_Max', 0, activity.duration_s));
      
      // On insère le record Calorie si la valeur recalculée est réaliste (< 20k)
      if (finalCalories > 0 && finalCalories < 20000) {
          records.push(createRow(userId, activityId, dateRecorded, 'physics', 'Cal_Max', 0, finalCalories));
      }

      // -----------------------------------------------------------------------
      // C. GLOBAL STATS (Priorité BDD -> Fallback Stream)
      // -----------------------------------------------------------------------
      
      // 1. FC MOYENNE
      if (activity.avg_heartrate > 0) {
          records.push(createRow(userId, activityId, dateRecorded, 'heartrate', 'HR_Avg', 0, activity.avg_heartrate));
          foundGlobalMetrics.add('HR_Avg');
      }

      // 2. FC MAX
      if (activity.max_heart_rate > 0) {
          records.push(createRow(userId, activityId, dateRecorded, 'heartrate', 'HR_Max', 1, activity.max_heart_rate));
          foundGlobalMetrics.add('HR_Max');
      }

      // 3. PUISSANCE MOYENNE
      if (activity.avg_power_w > 0) {
          records.push(createRow(userId, activityId, dateRecorded, 'power', 'P_Avg', 0, activity.avg_power_w));
          foundGlobalMetrics.add('P_Avg');
      }

      // -----------------------------------------------------------------------
      // D. INTERVAL STATS (Streams)
      // -----------------------------------------------------------------------
      
      if (streams) {
        METRICS_CONFIG.forEach(config => {
          // Si métrique déjà trouvée via BDD (ex: HR_Avg), on ignore
          if (foundGlobalMetrics.has(config.id)) return;

          try {
              const streamData = streams[config.source]; 
              if (streamData && Array.isArray(streamData) && streamData.length > 0) {
                  let value = 0;

                  // Cas Moyenne Globale (Fallback)
                  if (config.duration === 0) {
                       const validValues = streamData.filter((v: any) => typeof v === 'number' && v > 0);
                       if (validValues.length > 0) {
                         const sum = validValues.reduce((a: number, b: number) => a + b, 0);
                         value = sum / validValues.length;
                       }
                  } 
                  // Cas Intervalle (P5s, HR5m...)
                  else {
                       value = getSimpleMaxAverage(streamData, config.duration);
                  }
                  
                  // Filtres de cohérence
                  const minThreshold = config.source === 'watts' ? 10 : (config.source === 'heartrate' ? 30 : 0);
                  if (value > minThreshold && value < config.limit) {
                    records.push(createRow(userId, activityId, dateRecorded, config.category, config.id, config.duration, value));
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