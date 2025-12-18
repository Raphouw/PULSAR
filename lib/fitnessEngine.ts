import { supabaseAdmin } from './supabaseAdminClient';

// ==============================================================================
// ⚙️ CONFIGURATION & CONSTANTES (V4.1)
// ==============================================================================
const PERFORMANCE_WINDOW_DAYS = 60;
const MAX_DAILY_DROP_PERCENT = 0.0012;
const MIN_VIABLE_ACTIVITY_POWER = 80;
const MAX_VALID_CP3 = 1100;
const MAX_VALID_CP12 = 800;
const FTP_MIN = 80;
const FTP_MAX = 600;
const WPRIME_MIN = 1000;
const WPRIME_MAX = 60000;
const WPRIME_ROUNDING = 100;
const DEFAULT_ALPHA_RECORDS = 0.25;
const DEFAULT_ALPHA_WPRIME = 0.15;
const MAX_DAILY_FTP_INCREASE_PERCENT = 0.01;
const HARD_FTP_DROP_WATTS = 10;
const BANISTER_WINDOW_DAYS = 90;
const BANISTER_TAU_FIT = 42;
const BANISTER_TAU_FAT = 7;

export type FitnessUpdateResult = {
  success: boolean;
  newFtp?: number;
  newWPrime?: number;
  newCp3?: number;
  newCp12?: number;
  newTte?: number;
  newVo2Max?: number;
  message?: string;
};

// ==============================================================================
// 🧮 UTILITAIRES
// ==============================================================================
function ensureFinite(val: number | undefined | null, fallback: number = 0): number {
  if (val === null || val === undefined || !Number.isFinite(val)) return fallback;
  return val;
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function smoothRecord(previous: number | undefined | null, current: number, alpha: number = DEFAULT_ALPHA_RECORDS) {
  if (!previous || previous === 0) return current;
  return (alpha * current) + ((1 - alpha) * previous);
}

function estimateVo2Mixed(p5: number | undefined, cp3: number | undefined, weightKg: number | undefined) {
  if (p5 && weightKg && weightKg >= 30) {
    const vo2FromP5 = ((p5 / weightKg) * 10.8) + 7;
    if (cp3) {
      const vo2FromCp3 = (cp3 * 0.0115) + 35;
      return Math.round(Math.max(20, Math.min(95, (vo2FromP5 * 0.7) + (vo2FromCp3 * 0.3))));
    }
    return Math.round(Math.max(20, Math.min(95, vo2FromP5)));
  }
  if (cp3) {
    const vo2FromCp3 = (cp3 * 0.0115) + 35;
    return Math.round(Math.max(20, Math.min(95, vo2FromCp3)));
  }
  return 0;
}

function calculateCriticalPowerModel(p3: number, p12: number): { cp: number; wPrime: number; valid: boolean } {
  if (p3 > MAX_VALID_CP3 || p12 > MAX_VALID_CP12) return { cp: 0, wPrime: 0, valid: false };
  if (p3 <= p12 * 1.05) p3 = Math.max(p3, p12 * 1.10);

  const t3 = 180;   
  const t12 = 720;  
  const w3 = p3 * t3;
  const w12 = p12 * t12;

  const cp = (w12 - w3) / (t12 - t3);
  const wPrime = w3 - (cp * t3);

  if (!Number.isFinite(cp) || cp < FTP_MIN || cp > FTP_MAX || wPrime < WPRIME_MIN || wPrime > WPRIME_MAX) {
      return { cp: 0, wPrime: 0, valid: false };
  }
  return { cp, wPrime, valid: true };
}

// ==============================================================================
// 🚀 MAIN ENGINE V4.1
// ==============================================================================

export async function updateUserFitnessProfile(
  userId: string,
  activityDateISO: string,
  sourceActivityId?: number
): Promise<FitnessUpdateResult> {
  
  try {
    const activityDate = new Date(activityDateISO);
    const dbUserId = Number(userId);

    // 0. Gatekeeper : On cast 'as any' pour lire avg_power_w
    if (sourceActivityId) {
        const { data: actData } = await supabaseAdmin.from('activities').select('avg_power_w').eq('id', sourceActivityId).single();
        const activity = actData as any;
        if (activity && (activity.avg_power_w || 0) < MIN_VIABLE_ACTIVITY_POWER) {
            return { success: false, message: "Activity ignored: Low Power" };
        }
    }

    // 1. Context User
    const { data: userData } = await supabaseAdmin.from('users').select('weight, modeled_ftp, w_prime').eq('id', dbUserId).single();
    const userProfile = userData as any;
    if (!userProfile) return { success: false, message: `User ${userId} introuvable` };

    // 2. Historique : Cast du builder et du résultat
    const { data: lastHistoryData } = await (supabaseAdmin.from('user_fitness_history') as any)
      .select('ftp_value, w_prime_value, date_calculated, model_cp3, model_cp12') 
      .eq('user_id', dbUserId)
      .lt('date_calculated', activityDateISO)
      .order('date_calculated', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastHistory = lastHistoryData as any;
    let prevModeledFtp = lastHistory?.ftp_value || userProfile.modeled_ftp || 200; 
    let prevWPrime = lastHistory?.w_prime_value || userProfile.w_prime || 20000;
    const prevModelCp12 = lastHistory?.model_cp12 || 0;
    const prevModelCp3 = lastHistory?.model_cp3 || 0;
    
    let daysSinceLastUpdate = 1;
    if (lastHistory?.date_calculated) {
        const diffMs = activityDate.getTime() - new Date(lastHistory.date_calculated).getTime();
        daysSinceLastUpdate = Math.max(1, Math.floor(diffMs / 86400000));
    }

    // 3. Récupération Records : Cast du tableau
    const fetchBest = async (type: string) => {
        const startDate = new Date(activityDate);
        startDate.setDate(startDate.getDate() - PERFORMANCE_WINDOW_DAYS);
        const { data } = await supabaseAdmin.from('records').select('value, date_recorded').eq('user_id', dbUserId).eq('type', type).gte('date_recorded', startDate.toISOString()).lte('date_recorded', activityDateISO).order('value', { ascending: false }).limit(1);
        return (data as any)?.[0] || null;
    };

    const bestP3 = await fetchBest('CP3');
    const bestP5 = await fetchBest('CP5');
    const bestP12 = await fetchBest('CP12');

    if (!bestP3 || !bestP12) return { success: false, message: 'Données insuffisantes.' };

    // 4. Smoothing
    let smoothedP3 = smoothRecord(prevModelCp3, bestP3.value);
    let smoothedP12 = smoothRecord(prevModelCp12, bestP12.value);
    if (prevModelCp3 > 0 && (smoothedP3 - prevModelCp3) / prevModelCp3 > 0.15) {
        smoothedP3 = prevModelCp3 * 1.10;
    }

    // 5. Modélisation
    const model = calculateCriticalPowerModel(smoothedP3, smoothedP12);
    if (!model.valid) return { success: true, message: "Skipped: Invalid Model" };

    // 6. Logique FTP
    let finalModeledFtp = prevModeledFtp;
    const cp12OkForIncrease = smoothedP12 >= (prevModelCp12 - 15);
    const isRealImprovement = (model.cp > prevModeledFtp + 2) && cp12OkForIncrease;

    if (isRealImprovement) {
        const maxAllowedIncrease = Math.round(prevModeledFtp * (1 + (MAX_DAILY_FTP_INCREASE_PERCENT * daysSinceLastUpdate)));
        finalModeledFtp = Math.min(Math.round(model.cp), maxAllowedIncrease);
    } else {
        const maxAllowedDrop = prevModeledFtp * MAX_DAILY_DROP_PERCENT * daysSinceLastUpdate;
        finalModeledFtp = Math.max(Math.round(prevModeledFtp - maxAllowedDrop), Math.round(model.cp), prevModeledFtp - HARD_FTP_DROP_WATTS);
        finalModeledFtp = Math.min(finalModeledFtp, prevModeledFtp);
    }

    // 7. Logique W'
    const finalWPrime = roundToNearest(Math.max(WPRIME_MIN, Math.round(smoothRecord(prevWPrime, model.wPrime, DEFAULT_ALPHA_WPRIME))), WPRIME_ROUNDING);

    // 8. VO2 & TTE
    const vo2Max = estimateVo2Mixed(bestP5?.value, smoothedP3, userProfile.weight);
    const estimatedTte = Math.round(Math.max(2400, Math.min(4200, 3000 + ((finalWPrime / finalModeledFtp) * 10))));

    // 9. Sauvegarde User : Cast builder
    await (supabaseAdmin.from('users') as any).update({
      modeled_ftp: finalModeledFtp,
      w_prime: finalWPrime,
      vo2max: vo2Max,
      TTE: estimatedTte,
      updated_at: new Date().toISOString()
    }).eq('id', dbUserId);

    // 10. Sauvegarde Historique : Cast builder
    const historyPayload = {
      user_id: dbUserId,
      date_calculated: activityDateISO,
      ftp_value: finalModeledFtp, 
      w_prime_value: finalWPrime,
      model_cp3: Math.round(smoothedP3),
      model_cp12: Math.round(smoothedP12),
      vo2max_value: vo2Max,
      tte_value: estimatedTte,
      source_activity_id: sourceActivityId || null
    };

    await (supabaseAdmin.from('user_fitness_history') as any).insert(historyPayload);

    return {
      success: true,
      newFtp: finalModeledFtp,
      newWPrime: finalWPrime,
      newVo2Max: vo2Max,
      newTte: estimatedTte
    };

  } catch (err: any) {
    console.error('[FitnessEngine V4.1] Error:', err);
    return { success: false, message: err.message };
  }
}