import { supabaseAdmin } from './supabaseAdminClient';
import { 
  findBestInterval, 
  calculateWork, 
  NPformulaCoggan,
} from './physics';
import { updateUserFitnessProfile } from './fitnessEngine';

const RECORD_DURATIONS = [1, 5, 15, 30, 60, 180, 300, 600, 720, 1200, 1800, 2700, 3600, 7200, 10800, 14400, 18000];

export type AnalysisResult = {
  success: boolean;
  brokenRecords: { duration: number; value: number; old: number; type: string }[];
  fitnessUpdate?: any;
};

export async function analyzeAndSaveActivity(
  activityId: number, 
  stravaId: number, 
  streams: any, 
  userWeight: number = 75, 
  userFtp: number = 250
): Promise<AnalysisResult> {
  const brokenRecords: { duration: number; value: number; old: number; type: string }[] = [];

  const watts = streams.watts || []; 
  const time = streams.time || [];
  const distance = streams.distance || []; 
  const hr = streams.heartrate || []; 

  if (!time || time.length === 0) {
    console.error("❌ [AnalysisEngine] Erreur: Stream 'time' manquant ou vide.");
    return { success: false, brokenRecords: [] };
  }

  // --- 1. CALCULS PHYSIOLOGIQUES ---
  // 
  
  const durationSeconds = time[time.length - 1] - time[0];
  const np = watts.length > 0 ? NPformulaCoggan(watts) : 0;
  
  let tss = 0;
  let intensity_factor = 0;
  
  if (userFtp > 0 && np > 0) {
    intensity_factor = np / userFtp;
    // Formule Coggan : TSS = [(sec * NP * IF) / (FTP * 3600)] * 100
    tss = (durationSeconds * np * intensity_factor) / (userFtp * 3600) * 100;
  }

  const totalWatts = watts.reduce((a: number, b: number) => a + (b || 0), 0);
  const avgPower = watts.length > 0 ? totalWatts / watts.length : 0;
  
  // Calcul du travail mécanique (kJ)
  const workKj = calculateWork(avgPower, durationSeconds);
  let calories: number | null = workKj ? Math.round(workKj) : null;

  const updateData: any = {
      np_w: Math.round(np),
      tss: Math.round(tss),
      intensity_factor: parseFloat(intensity_factor.toFixed(2)),
  };
  if (calories !== null) updateData.calories_kcal = calories;

  // Mise à jour de l'activité avec les nouvelles métriques
  await (supabaseAdmin.from('activities') as any).update(updateData).eq('id', activityId);

  // --- 2. DÉTECTION DES RECORDS ---
  // 
  
  let userIdStr: string | null = null;
  let activityDateISO: string | null = null;

  if (watts.length > 0) {
      const { data: activityDataRaw } = await supabaseAdmin.from('activities').select('user_id, start_time').eq('id', activityId).single();
      const activityData = activityDataRaw as any;
      
      const userId = activityData?.user_id;
      userIdStr = userId ? String(userId) : null;
      activityDateISO = activityData?.start_time || new Date().toISOString();

      // On récupère les records existants pour comparer
      const { data: allExistingRecords } = await supabaseAdmin.from('records').select('duration_s, value').eq('user_id', userId);
      const currentBests = new Map<number, number>();
      (allExistingRecords as any[])?.forEach(r => {
          const existing = currentBests.get(r.duration_s) || 0;
          if (r.value > existing) currentBests.set(r.duration_s, r.value);
      });

      // Nettoyage avant recalcul (pour éviter les doublons d'ID d'activité)
      await (supabaseAdmin.from('records') as any).delete().eq('activity_id', activityId);

      const recordsToInsert: any[] = [];

      for (const duration of RECORD_DURATIONS) {
        if (duration > durationSeconds) continue;
        const bestInterval = findBestInterval(watts, time, distance, hr, duration, userWeight);

        if (bestInterval) {
            let typeLabel = `P${duration}s`;
            if (duration === 180) typeLabel = 'CP3';
            else if (duration === 300) typeLabel = 'CP5'; // Utilisé pour l'estimation de VO2 Max
            else if (duration === 720) typeLabel = 'CP12';
            else if (duration === 1200) typeLabel = 'CP20'; // Utilisé pour l'estimation de la FTP (95%)
            else if (duration === 3600) typeLabel = 'CP60';

            const newVal = bestInterval.watts;
            const oldRecord = currentBests.get(duration) || 0;

            if (newVal > oldRecord && oldRecord > 0) {
                brokenRecords.push({ duration, value: newVal, old: oldRecord, type: typeLabel });
            }
            
            recordsToInsert.push({
                user_id: userId,
                activity_id: activityId,
                date_recorded: activityDateISO,
                type: typeLabel,
                duration_s: duration,
                value: newVal,
            });
        }
      }

      if (recordsToInsert.length > 0) {
        await (supabaseAdmin.from('records') as any).insert(recordsToInsert);
      }
  }

  // --- 3. 🔥 MISE À JOUR DU PROFIL DE FORME ---
  let fitnessUpdate: any = null;
  
  if (userIdStr && activityDateISO) {
      console.log(`[Analysis] ⚡ Recalcul profil fitness pour User ${userIdStr} au ${activityDateISO}...`);
      
      // On déclenche la mise à jour des CTL/ATL/TSB
      fitnessUpdate = await updateUserFitnessProfile(userIdStr, activityDateISO, activityId);
  }

  return { success: true, brokenRecords, fitnessUpdate };
}