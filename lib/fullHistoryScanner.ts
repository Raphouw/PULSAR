import { supabaseAdmin } from '@/lib/supabaseAdminClient';

// --- FONCTIONS MATHÉMATIQUES AVANCÉES (TIME-BASED) ---

// Calcule la moyenne max (pour la puissance et cardio) en utilisant les vraies secondes
function getTrueTimeMaxAverage(valData: number[], timeData: number[], targetDuration: number): number {
    if (!valData || !timeData || valData.length !== timeData.length) return 0;
    
    let maxAvg = 0;
    let i = 0; // Pointeur de début
    let currentSum = 0;
    let currentCount = 0;

    for (let j = 0; j < timeData.length; j++) {
        currentSum += (typeof valData[j] === 'number' ? valData[j] : 0);
        currentCount++;

        // On rétrécit la fenêtre si le temps écoulé dépasse la durée cible
        while (timeData[j] - timeData[i] > targetDuration && i <= j) {
            currentSum -= (typeof valData[i] === 'number' ? valData[i] : 0);
            currentCount--;
            i++;
        }

        const timeDiff = timeData[j] - timeData[i];
        
        // On ne valide que si la fenêtre est pleine (au moins 90% du temps demandé)
        if (timeDiff >= targetDuration * 0.9 && currentCount > 0) {
            const avg = currentSum / currentCount;
            if (avg > maxAvg) maxAvg = avg;
        }
    }
    return maxAvg;
}

// Cherche la plus grande différence de valeur sur une durée cible (ex: VAM, Km en X heures)
function getMaxDeltaForDuration(valData: number[], timeData: number[], targetDuration: number, isDistance: boolean = false): number {
    if (!valData || !timeData || valData.length !== timeData.length) return 0;
    let maxDelta = 0;
    let i = 0;

    for (let j = 0; j < timeData.length; j++) {
        while (timeData[j] - timeData[i] > targetDuration && i < j) {
            i++;
        }

        const timeDiff = timeData[j] - timeData[i];
        
        // On accepte si la fenêtre est très proche de la durée cible (à 5 secondes près)
        if (timeDiff >= targetDuration - 5 && timeDiff <= targetDuration + 5) {
            const delta = valData[j] - valData[i];

            // ⚡ FILTRE ANTI-GLITCH : Vitesse max 100 km/h (27.7 m/s)
            if (isDistance) {
                const speedMs = delta / timeDiff;
                if (speedMs > 28) continue; // C'est un saut GPS, on ignore
            }

            if (delta > maxDelta) maxDelta = delta;
        }
    }
    return maxDelta;
}

// Cherche le temps MINIMUM pour parcourir une distance cible (ex: 10km le plus rapide)
function getMinTimeForDistance(distData: number[], timeData: number[], targetDist: number): number {
    if (!distData || !timeData || distData.length !== timeData.length) return 0;
    let minTime = Infinity;
    let j = 0;

    for (let i = 0; i < distData.length; i++) {
        while (j < distData.length && (distData[j] - distData[i]) < targetDist) {
            j++;
        }
        
        if (j < distData.length && (distData[j] - distData[i]) >= targetDist) {
            const timeDiff = timeData[j] - timeData[i];
            const realDist = distData[j] - distData[i];
            
            // ⚡ FILTRE ANTI-GLITCH : Vitesse max 100 km/h (27.7 m/s)
            const speedMs = realDist / (timeDiff || 1);
            
            if (speedMs <= 28 && timeDiff < minTime && timeDiff > 0) {
                minTime = timeDiff;
            }
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

  // CARDIO
  { id: 'HR_Max', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 1, limit: 250 },
  { id: 'HR_1m', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 60, limit: 240 },
  { id: 'HR_5m', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 300, limit: 230 },
  { id: 'HR_20m', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 1200, limit: 220 },
  { id: 'HR_60m', category: 'heartrate', source: 'heartrate', type: 'avg', duration: 3600, limit: 210 },

  // VAM (Calculée sur le dénivelé. Le résultat est retourné brut puis mis à l'heure)
  { id: 'VAM_Max', category: 'vam', source: 'altitude', type: 'delta_rate', duration: 60, multiplier: 60, limit: 4000 },
  { id: 'VAM_1m', category: 'vam', source: 'altitude', type: 'delta_rate', duration: 60, multiplier: 60, limit: 4000 },
  { id: 'VAM_5m', category: 'vam', source: 'altitude', type: 'delta_rate', duration: 300, multiplier: 12, limit: 3000 },
  { id: 'VAM_10m', category: 'vam', source: 'altitude', type: 'delta_rate', duration: 600, multiplier: 6, limit: 2500 },
  { id: 'VAM_20m', category: 'vam', source: 'altitude', type: 'delta_rate', duration: 1200, multiplier: 3, limit: 2200 },
  { id: 'VAM_30m', category: 'vam', source: 'altitude', type: 'delta_rate', duration: 1800, multiplier: 2, limit: 2000 },
  { id: 'VAM_1h', category: 'vam', source: 'altitude', type: 'delta_rate', duration: 3600, multiplier: 1, limit: 1800 },

  // KM / TEMPS (Distance parcourue sur un temps donné, ramené en km)
  { id: 'dist_5m', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 300, multiplier: 0.001, limit: 10 },
  { id: 'dist_15m', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 900, multiplier: 0.001, limit: 25 },
  { id: 'dist_30m', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 1800, multiplier: 0.001, limit: 40 },
  { id: 'dist_1h', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 3600, multiplier: 0.001, limit: 60 },
  { id: 'dist_2h', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 7200, multiplier: 0.001, limit: 120 },
  { id: 'dist_3h', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 10800, multiplier: 0.001, limit: 180 },
  { id: 'dist_4h', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 14400, multiplier: 0.001, limit: 220 },
  { id: 'dist_5h', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 18000, multiplier: 0.001, limit: 260 },
  { id: 'dist_10h', category: 'dist_time', source: 'distance', type: 'delta_rate', duration: 36000, multiplier: 0.001, limit: 500 },

  // TEMPS / KM (Temps minimum pour franchir X mètres) -> Renvoie des secondes
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
      // ⚡ Ne scanner que les vraies sorties de vélo (ignore les marches/randonnées/voiture)
      const allowedTypes = ['Ride', 'VirtualRide', 'EBikeRide', 'GravelRide'];
      if (activity.type && !allowedTypes.includes(activity.type)) {
          return records; 
      }

      let streams = activity.streams_data;
      if (typeof streams === 'string') {
          try { streams = JSON.parse(streams); } catch (e) { streams = null; }
      }

      const userId = activity.user_id;
      const activityId = activity.id;
      const dateRecorded = activity.start_time || new Date().toISOString(); 

      // Insertions BDD Basiques
      if (activity.avg_heartrate > 0) { records.push(createRow(userId, activityId, dateRecorded, 'heartrate', 'HR_Avg', 0, activity.avg_heartrate)); foundGlobalMetrics.add('HR_Avg'); }
      if (activity.avg_power_w > 0) { records.push(createRow(userId, activityId, dateRecorded, 'power', 'P_Avg', 0, activity.avg_power_w)); foundGlobalMetrics.add('P_Avg'); }

      // ANALYSE TIME-BASED DES STREAMS
      if (streams && streams.time && Array.isArray(streams.time)) {
          const timeStream = streams.time;

          METRICS_CONFIG.forEach(config => {
              if (foundGlobalMetrics.has(config.id)) return;

              try {
                  const valStream = streams[config.source]; 
                  if (valStream && Array.isArray(valStream) && valStream.length > 0) {
                      let value = 0;

                      if (config.type === 'avg') {
                          value = getTrueTimeMaxAverage(valStream, timeStream, config.duration || 1);
                      } 
                      else if (config.type === 'delta_rate') {
                          const isDist = config.source === 'distance';
                          const rawDelta = getMaxDeltaForDuration(valStream, timeStream, config.duration || 1, isDist);
                          value = rawDelta * (config.multiplier || 1);
                      } 
                      else if (config.type === 'min_time') {
                          value = getMinTimeForDistance(valStream, timeStream, config.target || 1000);
                      }

                      // Validation finale et cohérence de la donnée
                      if (value > 0 && value < config.limit) {
                          records.push(createRow(userId, activityId, dateRecorded, config.category, config.id, config.duration || 0, value));
                      }
                  }
              } catch (e) { /* ignore single error */ }
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