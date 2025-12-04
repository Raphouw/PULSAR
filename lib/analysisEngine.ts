import { supabaseAdmin } from './supabaseAdminClient';
import { 
  findBestInterval, 
  calculateWork, 
  NPformulaCoggan,
} from './physics';

const RECORD_DURATIONS = [1, 5, 15, 30, 60, 180, 300, 600, 720, 1200, 1800, 2700, 3600, 7200, 10800, 14400, 18000];

export type AnalysisResult = {
  success: boolean;
  brokenRecords: { duration: number; value: number; old: number; type: string }[];
};

export async function analyzeAndSaveActivity(activityId: number, stravaId: number, streams: any, userWeight: number = 75, userFtp: number = 250): Promise<AnalysisResult> {
  // console.log(`⚙️ [AnalysisEngine] Analyse activité #${activityId}...`);
  
  const brokenRecords: { duration: number; value: number; old: number; type: string }[] = [];

  // 1. Extraction Sécurisée & Tolérante
  // 🔥 MODIF : Si pas de watts, on met un tableau vide [] au lieu de undefined
  const watts = streams.watts?.data || streams.watts || []; 
  const time = streams.time?.data || streams.time;
  const distance = streams.distance?.data || streams.distance; 
  const hr = streams.heartrate?.data || streams.heartrate || []; 

  // Si pas de temps, l'activité est corrompue ou vide, là on doit stop
  if (!time || !Array.isArray(time) || time.length === 0) {
    console.error("❌ [AnalysisEngine] Erreur: Stream 'time' manquant.");
    // On pourrait marquer l'activité comme 'error' en BDD pour ne plus la reprocesser
    // Pour l'instant on renvoie false
    return { success: false, brokenRecords: [] };
  }

  // 🔥 MODIF : On ne bloque plus ici. On log juste une info.
  if (watts.length === 0) {
    console.log("ℹ️ [AnalysisEngine] Pas de données de puissance (Run/Hike/Vélo sans capteur). Calcul partiel.");
  }

  // --- 2. CALCUL STATS GLOBALES ---
  const durationSeconds = time[time.length - 1] - time[0];
  
  // Sécurité pour les calculs de puissance
  const np = watts.length > 0 ? NPformulaCoggan(watts) : 0;
  
  let tss = 0;
  let intensity_factor = 0;
  
  // On ne calcule le TSS que si on a des watts et une FTP valide
  if (userFtp > 0 && np > 0) {
    intensity_factor = np / userFtp;
    tss = (durationSeconds * np * intensity_factor) / (userFtp * 3600) * 100;
  }

  const totalWatts = watts.reduce((a: number, b: number) => a + (b || 0), 0);
  const avgPower = watts.length > 0 ? totalWatts / watts.length : 0;
  
  // Calcul du travail (Kj)
  const workKj = calculateWork(avgPower, durationSeconds);
  
  // Calories : Si on a des Watts, on utilise workKj. Sinon, on laisse null (ou on pourrait estimer via HR plus tard)
  // Strava envoie souvent "kilojoules" dans l'import initial, on essaie de ne pas écraser s'il n'y a pas de watts
  let calories: number | null = workKj ? Math.round(workKj) : null;

  // --- SAUVEGARDE EN BDD ---
  // 🔥 C'est ici que la boucle infinie se brise. 
  // Même si TSS = 0, on l'écrit en BDD. La prochaine requête "tss is null" ignorera donc cette activité.
  
  const updateData: any = {
      avg_power_w: Math.round(avgPower),
      np_w: Math.round(np),
      tss: Math.round(tss), // Sera 0 si pas de watts
      intensity_factor: parseFloat(intensity_factor.toFixed(2)),
  };

  // On n'écrase les calories que si on a pu les calculer via la puissance
  if (calories !== null && calories > 0) {
      updateData.calories_kcal = calories;
  }

  await supabaseAdmin.from('activities').update(updateData).eq('id', activityId);


  // --- 3. RECORDS & DÉTECTION PR (Uniquement si Watts présents) ---
  if (watts.length > 0) {
      const { data: activityData } = await supabaseAdmin
        .from('activities')
        .select('user_id, start_time')
        .eq('id', activityId)
        .single();
        
      const userId = activityData?.user_id;
      const activityDate = activityData?.start_time || new Date().toISOString();

      const { data: allExistingRecords } = await supabaseAdmin
        .from('records')
        .select('duration_s, value')
        .eq('user_id', userId);

      const currentBests = new Map<number, number>();
      allExistingRecords?.forEach(r => {
          const existing = currentBests.get(r.duration_s) || 0;
          if (r.value > existing) currentBests.set(r.duration_s, r.value);
      });

      await supabaseAdmin.from('records').delete().eq('activity_id', activityId);

      const recordsToInsert: any[] = [];

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

      if (recordsToInsert.length > 0) {
        await supabaseAdmin.from('records').insert(recordsToInsert);
      }
  }

  return { success: true, brokenRecords };
}