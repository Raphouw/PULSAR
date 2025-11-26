import { supabaseAdmin } from './supabaseAdminClient';
import { 
  findBestInterval, 
  calculateWork, 
  NPformulaCoggan,
} from './physics';

const RECORD_DURATIONS = [1, 5, 15, 30, 60, 180, 300, 600, 720, 1200, 1800, 2700, 3600, 7200, 10800, 14400, 18000];

// Type pour le retour de la fonction
export type AnalysisResult = {
  success: boolean;
  brokenRecords: { duration: number; value: number; old: number; type: string }[];
};

export async function analyzeAndSaveActivity(activityId: number, stravaId: number, streams: any, userWeight: number = 75, userFtp: number = 250): Promise<AnalysisResult> {
  console.log(`⚙️ [AnalysisEngine] Démarrage analyse activité #${activityId}...`);
  
  const brokenRecords: { duration: number; value: number; old: number; type: string }[] = [];

  // 1. Extraction Sécurisée
  const watts = streams.watts?.data || streams.watts; 
  const time = streams.time?.data || streams.time;
  const distance = streams.distance?.data || streams.distance; 
  const hr = streams.heartrate?.data || streams.heartrate || []; 

  if (!time || !Array.isArray(time) || time.length === 0) {
    console.error("❌ [AnalysisEngine] Erreur: Stream 'time' manquant.");
    return { success: false, brokenRecords: [] };
  }

  if (!watts || !Array.isArray(watts)) {
    console.warn("⚠️ [AnalysisEngine] Pas de watts.");
    return { success: false, brokenRecords: [] };
  }

  // --- 2. CALCUL STATS GLOBALES ---
  const durationSeconds = time[time.length - 1] - time[0];
  const np = NPformulaCoggan(watts);
  
  let tss = 0;
  let intensity_factor = 0;
  
  if (userFtp > 0 && np > 0) {
    intensity_factor = np / userFtp;
    tss = (durationSeconds * np * intensity_factor) / (userFtp * 3600) * 100;
  }

  const totalWatts = watts.reduce((a: number, b: number) => a + (b || 0), 0);
  const avgPower = watts.length > 0 ? totalWatts / watts.length : 0;
  const workKj = calculateWork(avgPower, durationSeconds);
  const calories = workKj ? Math.round(workKj) : null;

  await supabaseAdmin.from('activities').update({
      avg_power_w: Math.round(avgPower),
      np_w: Math.round(np),
      tss: Math.round(tss),
      intensity_factor: parseFloat(intensity_factor.toFixed(2)),
      calories_kcal: calories,
    }).eq('id', activityId);


  // --- 3. RECORDS & DÉTECTION PR ---
  
  // A. Récupérer le user_id et la date
  const { data: activityData } = await supabaseAdmin
    .from('activities')
    .select('user_id, start_time')
    .eq('id', activityId)
    .single();
    
  const userId = activityData?.user_id;
  const activityDate = activityData?.start_time || new Date().toISOString();

  // B. Récupérer TOUS les anciens records de l'utilisateur (Record Absolu)
  const { data: allExistingRecords } = await supabaseAdmin
    .from('records')
    .select('duration_s, value')
    .eq('user_id', userId);

  // Map pour accès rapide : duration -> value record
  const currentBests = new Map<number, number>();
  allExistingRecords?.forEach(r => {
      const existing = currentBests.get(r.duration_s) || 0;
      if (r.value > existing) currentBests.set(r.duration_s, r.value);
  });

  // C. Nettoyage des records de CETTE activité (pour éviter doublons si réanalyse)
  await supabaseAdmin.from('records').delete().eq('activity_id', activityId);

  const recordsToInsert: any[] = [];

  if (watts.length > 0 && userId) {
      for (const duration of RECORD_DURATIONS) {
        if (duration > durationSeconds) continue;

        const bestInterval = findBestInterval(watts, time, distance, hr, duration, userWeight);

        if (bestInterval) {
            let typeLabel = `P${duration}s`;
            if (duration === 180) typeLabel = 'CP3';
            if (duration === 300) typeLabel = 'CP5';
            if (duration === 720) typeLabel = 'CP12';
            if (duration === 1200) typeLabel = 'CP20';
            if (duration === 3600) typeLabel = 'CP60';

            const newVal = bestInterval.watts;
            const oldRecord = currentBests.get(duration) || 0;

            // 🔥 DÉTECTION DU RECORD BATTU
            // On considère un record battu si > à l'ancien et que l'ancien existait (ou > 0)
            // Optionnel : ajouter un seuil (ex: +1 watt)
            if (newVal > oldRecord && oldRecord > 0) {
                brokenRecords.push({
                    duration: duration,
                    value: newVal,
                    old: oldRecord,
                    type: typeLabel
                });
            }

            recordsToInsert.push({
                user_id: userId,
                activity_id: activityId,
                date_recorded: activityDate,
                type: typeLabel,
                duration_s: duration,
                value: newVal,
            });
        }
      }
  }

  if (recordsToInsert.length > 0) {
    await supabaseAdmin.from('records').insert(recordsToInsert);
  }

  return { success: true, brokenRecords };
}