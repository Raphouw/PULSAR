// Fichier : lib/fitnessEngine.ts
import { supabaseAdmin } from './supabaseAdminClient';

// ==============================================================================
// ⚙️ CONFIGURATION & CONSTANTES (V4.1)
// ==============================================================================
const PERFORMANCE_WINDOW_DAYS = 60;

// 0.12% de perte max par jour (≈0.8% / semaine)
const MAX_DAILY_DROP_PERCENT = 0.0012;

// Seuil anti-bug capteur / sorties poubelle
const MIN_VIABLE_ACTIVITY_POWER = 80; // Watts

// Limites physiologiques "Hard Cap"
const MAX_VALID_CP3 = 1100; // Watts
const MAX_VALID_CP12 = 800; // Watts

// Limites du Modèle (Résultats)
const FTP_MIN = 80;
const FTP_MAX = 600;
const WPRIME_MIN = 1000;
const WPRIME_MAX = 60000;

// Arrondi W'
const WPRIME_ROUNDING = 100;

// Lissage / EMA
const DEFAULT_ALPHA_RECORDS = 0.25; // alpha pour CP3/CP12 smoothing
const DEFAULT_ALPHA_WPRIME = 0.15;  // lissage pour W'

// Plafonds d'évolution
const MAX_DAILY_FTP_INCREASE_PERCENT = 0.01; // ≈1%/jour en hausse max (si validée)
const HARD_FTP_DROP_WATTS = 10; // on empêche >10W de drop instantanément en mode decay

// Banister params (si on veut estimer forme à partir de daily TSS)
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
  if (val === null || val === undefined || !Number.isFinite(val) || Number.isNaN(val)) {
    return fallback;
  }
  return val;
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** EMA smoothing helper */
function smoothRecord(previous: number | undefined | null, current: number, alpha: number = DEFAULT_ALPHA_RECORDS) {
  if (!previous || previous === 0) return current;
  return (alpha * current) + ((1 - alpha) * previous);
}

/** Estimate VO2max from CP5 (if available) and fallback to CP3 linkage */
function estimateVo2Mixed(p5: number | undefined, cp3: number | undefined, weightKg: number | undefined) {
  // Returns an integer VO2max (ml/kg/min)
  // If p5 + weight available -> standard conversion
  if (p5 && weightKg && weightKg >= 30) {
    // classical approximation (Leger-esque) scaled to power: empirical
    const vo2FromP5 = ((p5 / weightKg) * 10.8) + 7;
    // cp3 linkage fallback if cp3 present
    if (cp3) {
      const vo2FromCp3 = (cp3 * 0.0115) + 35; // empirical linking factor
      // Blend both (p5 70% / cp3 30%)
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

/** Regressed CP model from two-duration points (3min & 12min) */
function calculateCriticalPowerModel(p3: number, p12: number): { cp: number; wPrime: number; valid: boolean } {
  // 1. Sanity Check des Inputs
  if (p3 > MAX_VALID_CP3 || p12 > MAX_VALID_CP12) {
      console.warn(`[FitnessEngine] ⚠️ Inputs aberrants: CP3=${p3}, CP12=${p12}.`);
      return { cp: 0, wPrime: 0, valid: false };
  }

  // Correction courbe plate : si p3 trop proche de p12, on force p3 légèrement plus haut
  if (p3 <= p12 * 1.05) {
    p3 = Math.max(p3, p12 * 1.10);
  }

  const t3 = 180;   // 3 minutes
  const t12 = 720;  // 12 minutes

  // Convertir en énergie (J)
  const w3 = p3 * t3;
  const w12 = p12 * t12;

  const cp = (w12 - w3) / (t12 - t3);
  const wPrime = w3 - (cp * t3);

  // 2. Sanity Check des Outputs
  if (!Number.isFinite(cp) || !Number.isFinite(wPrime) || cp < 0 || wPrime < 0 || cp > FTP_MAX || wPrime > WPRIME_MAX) {
      return { cp: 0, wPrime: 0, valid: false };
  }

  return {
    cp: ensureFinite(cp, 0),
    wPrime: ensureFinite(wPrime, 0),
    valid: true
  };
}

// ==============================================================================
// 📡 FETCHING HELPERS
// ==============================================================================

async function fetchBestRawRecord(
  userId: string,
  type: string,
  endDateISO: string,
  windowDays: number
): Promise<{ value: number; date: string } | null> {
  const endDate = new Date(endDateISO);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - windowDays);

  const { data: records, error } = await supabaseAdmin
    .from('records')
    .select('value, date_recorded')
    .eq('user_id', userId)
    .eq('type', type)
    .gte('date_recorded', startDate.toISOString())
    .lte('date_recorded', endDateISO)
    .order('value', { ascending: false })
    .limit(1);

  if (error || !records || records.length === 0) return null;
  return { value: records[0].value, date: records[0].date_recorded };
}

async function fetchActivitySpecificPeaks(activityId: number): Promise<{ cp3: number, cp12: number }> {
    const { data: records } = await supabaseAdmin
        .from('records')
        .select('type, value')
        .eq('activity_id', activityId)
        .in('type', ['CP3', 'CP12']);
    
    let cp3 = 0;
    let cp12 = 0;

    if (records) {
        records.forEach((r: any) => {
            if (r.type === 'CP3') cp3 = r.value;
            if (r.type === 'CP12') cp12 = r.value;
        });
    }
    return { cp3, cp12 };
}

/** Try to fetch recent daily TSS for Banister (fallback empty array if table doesn't exist) */
async function fetchRecentDailyTSS(userId: string, endDateISO: string, days: number): Promise<number[]> {
  try {
    const endDate = new Date(endDateISO);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('user_daily_tss')
      .select('date, tss')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString())
      .lte('date', endDateISO)
      .order('date', { ascending: true });

    if (error || !data || data.length === 0) return [];
    return data.map((r: any) => Number(r.tss) || 0);
  } catch (err) {
    // table may not exist or permission issue -> ignore
    return [];
  }
}

// ==============================================================================
// 🧪 BANISTER (fitness / fatigue / form)
// ==============================================================================
function computeBanisterFromSeries(dailyTSS: number[]) {
  let fitness = 0;
  let fatigue = 0;
  const tauFit = BANISTER_TAU_FIT;
  const tauFat = BANISTER_TAU_FAT;

  for (const tss of dailyTSS) {
    fitness = fitness * Math.exp(-1 / tauFit) + tss;
    fatigue = fatigue * Math.exp(-1 / tauFat) + tss;
  }

  return {
    fitness: Math.round(fitness),
    fatigue: Math.round(fatigue),
    form: Math.round(fitness - fatigue)
  };
}

// ==============================================================================
// 🚀 MAIN ENGINE V4.1 (Anti-Paradox, Smooth, Banister, VO2 linkage)
// ==============================================================================

export async function updateUserFitnessProfile(
  userId: string,
  activityDateISO: string,
  sourceActivityId?: number
): Promise<FitnessUpdateResult> {
  
  console.log(`[FitnessEngine V4.1] 🏁 Démarrage User ${userId} | Date ${activityDateISO.substring(0, 10)}`);

  try {
    const activityDate = new Date(activityDateISO);

    // 0. Gatekeeper activité (delete trivial records if too low)
    if (sourceActivityId) {
        const { data: activityData, error: actError } = await supabaseAdmin
            .from('activities')
            .select('avg_power_w, name')
            .eq('id', sourceActivityId)
            .single();
        
        if (!actError && activityData) {
             const avgPower = activityData.avg_power_w || 0;
             if (avgPower < MIN_VIABLE_ACTIVITY_POWER) {
                 console.warn(`[FitnessEngine] 🗑️ Activité ignorée (<${MIN_VIABLE_ACTIVITY_POWER}W).`);
                 await supabaseAdmin.from('records').delete().eq('activity_id', sourceActivityId);
                 return { success: false, message: "Activity ignored: Low Power" };
             }
        }
    }

    // 1. Context User
    // NOTE: On récupère 'modeled_ftp' au lieu de 'ftp'
    const { data: userProfile, error: userError } = await supabaseAdmin
        .from('users')
        // On suppose que la colonne 'ftp' est renommée en 'modeled_ftp' dans la BDD pour le tracking du moteur
        .select('weight, modeled_ftp, w_prime, manual_ftp') 
        .eq('id', userId)
        .single();

    if (userError || !userProfile) {
        return { success: false, message: `User ${userId} introuvable` };
    }

    // Récupérer Historique Précédent (Avec les anciens records modèles)
    const { data: lastHistory } = await supabaseAdmin
      .from('user_fitness_history')
      // NOTE: Le moteur utilise 'ftp_value' qui correspond à l'ancienne 'ftp' / nouvelle 'modeled_ftp'
      .select('ftp_value, w_prime_value, date_calculated, model_cp3, model_cp12') 
      .eq('user_id', userId)
      .lt('date_calculated', activityDateISO)
      .order('date_calculated', { ascending: false })
      .limit(1)
      .maybeSingle();

    // NOTE: On utilise 'modeled_ftp' du profil utilisateur comme base si pas d'historique
    let prevModeledFtp = lastHistory?.ftp_value || userProfile.modeled_ftp || 200; 
    let prevWPrime = lastHistory?.w_prime_value || userProfile.w_prime || 20000;
    const prevModelCp12 = lastHistory?.model_cp12 || 0;
    const prevModelCp3 = lastHistory?.model_cp3 || 0;
    
    let daysSinceLastUpdate = 1;
    if (lastHistory?.date_calculated) {
        const lastDate = new Date(lastHistory.date_calculated);
        const diffMs = activityDate.getTime() - lastDate.getTime();
        daysSinceLastUpdate = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    // 2. INPUTS MODÈLE (Best 60j)
    // ... (Reste de la récupération des records non modifié)
    const bestP3 = await fetchBestRawRecord(userId, 'CP3', activityDateISO, PERFORMANCE_WINDOW_DAYS);
    const bestP5 = await fetchBestRawRecord(userId, 'CP5', activityDateISO, PERFORMANCE_WINDOW_DAYS); 
    const bestP12 = await fetchBestRawRecord(userId, 'CP12', activityDateISO, PERFORMANCE_WINDOW_DAYS);

    if (!bestP3 || !bestP12 || bestP3.value === 0 || bestP12.value === 0) {
      return { success: false, message: 'Données insuffisantes.' };
    }

    // 3. INPUTS ACTIVITÉ (peaks spécifiques à l'activité)
    // ... (Reste de la récupération des pics non modifié)
    let activityPeaks = { cp3: 0, cp12: 0 };
    if (sourceActivityId) {
        activityPeaks = await fetchActivitySpecificPeaks(sourceActivityId);
    }

    // -------------------------
    // 4. SMOOTHING DES RECORDS
    // -------------------------
    let smoothedP3 = smoothRecord(prevModelCp3, bestP3.value, DEFAULT_ALPHA_RECORDS);
    let smoothedP12 = smoothRecord(prevModelCp12, bestP12.value, DEFAULT_ALPHA_RECORDS);

    // Protection anti-spike CP3 : si CP3 augmente trop en 1 update -> cap à +10% (plutôt que +25%)
    if (prevModelCp3 > 0) {
      const cp3Ratio = (smoothedP3 - prevModelCp3) / prevModelCp3;
      if (cp3Ratio > 0.15) { // 15% raw threshold
        // on ne laisse pas plus de +10% instantané (gain doit être progressif)
        const capped = prevModelCp3 * 1.10;
        console.log(`[FitnessEngine] ⚠️ CP3 spike détecté (${(cp3Ratio * 100).toFixed(1)}%). Capping ${smoothedP3.toFixed(0)} -> ${capped.toFixed(0)}`);
        smoothedP3 = capped;
      }
    }

    // 5. CALCUL MODÈLE (avec valeurs lissées)
    const model = calculateCriticalPowerModel(smoothedP3, smoothedP12);

    if (!model.valid) {
        console.warn(`[FitnessEngine] 🛑 Skip update (Invalid Model).`);
        return { success: true, message: "Skipped: Invalid Model" };
    }

    const calculatedFtpRaw = Math.round(model.cp);
    const calculatedWPrimeRaw = Math.round(model.wPrime);

    // 6. LOGIQUE DE DÉCISION (Anti-Paradoxe améliorée)
    let finalModeledFtp = prevModeledFtp; // Renommé
    let finalWPrime = prevWPrime;

    // --- LOGIQUE FTP ---
    // On considère une amélioration "réelle" uniquement si :
    // - FTP calculée > prevModeledFtp + small margin
    // - et le CP12 smoothed n'a pas drastiquement baissé (tolérance 15W)
    const cp12OkForIncrease = smoothedP12 >= (prevModelCp12 - 15);
    const isRealImprovement = (calculatedFtpRaw > prevModeledFtp + 2) && cp12OkForIncrease;

    if (isRealImprovement) {
        // Cap de hausse journalière pour éviter explosion en 1 update
        const maxAllowedIncrease = Math.round(prevModeledFtp * (1 + (MAX_DAILY_FTP_INCREASE_PERCENT * daysSinceLastUpdate)));
        // autorise la montée mais pas au-delà du cap
        finalModeledFtp = Math.min(calculatedFtpRaw, maxAllowedIncrease);
        console.log(`[FitnessEngine] 📈 Modeled FTP UP validé: ${prevModeledFtp} -> ${finalModeledFtp}W (calc ${calculatedFtpRaw})`);
    } else {
        // Mode DECAY ou STAGNATION — calmer la chute
        const ageP3 = (activityDate.getTime() - new Date(bestP3.date).getTime()) / (1000 * 3600 * 24);
        const ageP12 = (activityDate.getTime() - new Date(bestP12.date).getTime()) / (1000 * 3600 * 24);
        const avgRecordAge = (ageP3 + ageP12) / 2;

        // Recency factor : pénalise doucement si records sont vieux
        let recencyFactor = 1.0;
        if (avgRecordAge > 14) {
            recencyFactor = Math.max(0.90, 1 - ((avgRecordAge - 14) * 0.003)); // moins agressif
        }

        // Si paradoxe (calc > prev mais CP12 descend), on garde prev comme base
        const baseValue = (calculatedFtpRaw > prevModeledFtp) ? prevModeledFtp : calculatedFtpRaw;
        const targetFtp = Math.round(baseValue * recencyFactor);

        // Protection chute journalière
        const maxAllowedDrop = prevModeledFtp * MAX_DAILY_DROP_PERCENT * daysSinceLastUpdate;
        const minAllowedFtp = Math.round(prevModeledFtp - maxAllowedDrop);

        finalModeledFtp = Math.max(minAllowedFtp, targetFtp);

        // Hard floor : on n'autorise pas une perte instantanée > HARD_FTP_DROP_WATTS
        const hardFloor = prevModeledFtp - HARD_FTP_DROP_WATTS;
        finalModeledFtp = Math.max(finalModeledFtp, hardFloor);

        // Sécurité : en decay, on ne dépasse jamais la valeur précédente
        finalModeledFtp = Math.min(finalModeledFtp, prevModeledFtp);

        console.log(`[FitnessEngine] 📉 Modeled FTP DECAY/STABLE: ${prevModeledFtp} -> ${finalModeledFtp}W (target ${targetFtp})`);
    }

    // --- LOGIQUE W' ---
    // ... (Logique W' non modifiée, utilise prevWPrime)
    let smoothedWPrime = smoothRecord(prevWPrime, calculatedWPrimeRaw, DEFAULT_ALPHA_WPRIME);

    if (calculatedWPrimeRaw > prevWPrime) {
        finalWPrime = Math.round(smoothedWPrime);
        console.log(`[FitnessEngine] 🔋 W' UP lissé: ${prevWPrime} -> ${finalWPrime}J`);
    } else {
        const maxWDrop = prevWPrime * MAX_DAILY_DROP_PERCENT * daysSinceLastUpdate;
        const minAllowedWPrime = Math.round(prevWPrime - maxWDrop);
        finalWPrime = Math.max(minAllowedWPrime, Math.round(smoothedWPrime));
        console.log(`[FitnessEngine] 🔋 W' DOWN protégé: ${prevWPrime} -> ${finalWPrime}J`);
    }

    // CLAMP & ARRONDI
    finalModeledFtp = Math.max(FTP_MIN, Math.min(FTP_MAX, finalModeledFtp));
    finalWPrime = Math.max(WPRIME_MIN, Math.min(WPRIME_MAX, finalWPrime));
    finalWPrime = roundToNearest(finalWPrime, WPRIME_ROUNDING);

    // 7. VO2 & TTE
    // Use bestP5 if available + cp3 blend for more stability
    const p5Val = bestP5 ? bestP5.value : undefined;
    const vo2Max = estimateVo2Mixed(p5Val, smoothedP3, userProfile.weight);
    const ratioProfile = finalWPrime / finalModeledFtp;
    let estimatedTte = Math.round(Math.max(2400, Math.min(4200, 3000 + (ratioProfile * 10))));

    // 8. BANISTER (optionnel) -> try to fetch recent TSS series
    const recentTSS = await fetchRecentDailyTSS(userId, activityDateISO, BANISTER_WINDOW_DAYS);
    const banister = recentTSS.length > 0 ? computeBanisterFromSeries(recentTSS) : { fitness: 0, fatigue: 0, form: 0 };

    // 9. SAUVEGARDE -> update user + history
    const updateTimeISO = new Date().toISOString();

    // NOTE: On met à jour la nouvelle colonne 'modeled_ftp' au lieu de 'ftp'
    await supabaseAdmin.from('users').update({
      modeled_ftp: finalModeledFtp,
      w_prime: finalWPrime,
      vo2max: vo2Max,
      TTE: estimatedTte,
      updated_at: updateTimeISO
    }).eq('id', userId);

    if (sourceActivityId) {
        // Remove conflicting history rows tied to same source activity
        await supabaseAdmin.from('user_fitness_history')
            .delete()
            .eq('source_activity_id', sourceActivityId);
    }

    const historyPayload = {
      user_id: userId,
      date_calculated: activityDateISO,
      // NOTE: 'ftp_value' correspond maintenant à la 'modeled_ftp' dans l'historique
      ftp_value: finalModeledFtp, 
      w_prime_value: finalWPrime,
      cp3_value: activityPeaks.cp3,
      cp12_value: activityPeaks.cp12,
      model_cp3: Math.round(smoothedP3),
      model_cp12: Math.round(smoothedP12),
      vo2max_value: vo2Max,
      tte_value: estimatedTte,
      source_activity_id: sourceActivityId || null
    };

    const { error: insertHistoryError } = await supabaseAdmin
        .from('user_fitness_history')
        .insert(historyPayload);

    if (insertHistoryError) {
        console.error(`[FitnessEngine] 🔥 Erreur DB:`, insertHistoryError.message);
        return { success: false, message: `DB Error: ${insertHistoryError.message}` };
    }

    console.log(`[FitnessEngine V4.1] ✅ (Modeled FTP: ${finalModeledFtp}W, W': ${finalWPrime}J, VO2: ${vo2Max} ml/kg, Banister form: ${banister.form})`);

    return {
      success: true,
      newFtp: finalModeledFtp,
      newWPrime: finalWPrime,
      newCp3: activityPeaks.cp3,
      newCp12: activityPeaks.cp12,
      newVo2Max: vo2Max,
      newTte: estimatedTte
    };

  } catch (err: any) {
    console.error('[FitnessEngine V4.1] Critical Exception:', err);
    return { success: false, message: err.message || 'Unknown error' };
  }
}
