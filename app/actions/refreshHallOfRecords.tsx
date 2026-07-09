// Fichier : app/actions/refreshHallOfRecords.tsx
'use server';

import { supabaseAdmin } from '@/lib/supabaseAdminClient';
import { analyzeActivityForHallOfFame } from '@/lib/fullHistoryScanner';
import { unstable_noStore as noStore } from 'next/cache';

const BATCH_SIZE = 15;

export async function refreshHallOfRecords(
    userId: string | number, 
    cursorDate: string | null = null
) {
  try {
    noStore();
    
    // 1. Début au "Big Bang" si pas de curseur (réglé à l'étape 1)
    const startDate = cursorDate || '1970-01-01T00:00:00Z';

    console.log(`[SCANNER] Recherche activités après : ${startDate} (User: ${userId})`);

    // 2. Récupération des activités brutes (Batch)
    const { data: activitiesData, error } = await supabaseAdmin
      .from('activities')
      .select('id, user_id, start_time, name, distance_km, elevation_gain_m, duration_s, max_speed_kmh, avg_speed_kmh, calories_kcal, streams_data, avg_heartrate, max_heart_rate, avg_power_w')
      .eq('user_id', Number(userId))
      .gt('start_time', startDate) 
      .order('start_time', { ascending: true }) 
      .limit(BATCH_SIZE);

    if (error) {
        console.error("[SCANNER] Erreur Fetch Activités:", error);
        throw error;
    }

    const activities = (activitiesData || []) as any[];

    if (!activities || activities.length === 0) {
        console.log("[SCANNER] Aucune nouvelle activité trouvée. Fin du scan.");
        return { success: true, count: 0, nextCursor: null, finished: true };
    }

    console.log(`[SCANNER] ${activities.length} activités trouvées. Analyse en cours...`);

    // 3. Traitement et formattage strict pour la table 'records'
    const rowsToInsert: any[] = [];
    const lastActivityDate = activities[activities.length - 1].start_time;

    for (const act of activities) {
        const actRows = analyzeActivityForHallOfFame(act);
        
        if (actRows.length > 0) {
            // ÉTAPE 2 : On s'assure que les clés correspondent EXACTEMENT au schéma de 'records'
            const formattedRows = actRows.map((row: any) => ({
                user_id: Number(userId),
                activity_id: act.id,
                type: row.type || row.metric_id, // Fallback au cas où le scanner utilise l'ancienne clé
                value: row.value,
                duration_s: row.duration_s || 0,
                date_recorded: act.start_time
            }));
            rowsToInsert.push(...formattedRows);
        }
    }

    console.log(`[SCANNER] ${rowsToInsert.length} records générés prêts à l'insertion.`);

    // 4. Insertion dans la bonne table 'records'
    if (rowsToInsert.length > 0) {
        // Ajout de 'as any' pour forcer le typage et bypasser l'erreur TS
        const { error: insertErr } = await supabaseAdmin
            .from('records')
            .upsert(rowsToInsert as any, { onConflict: 'activity_id, type' });
        
        if (insertErr) {
            console.error("[SCANNER] ERREUR INSERTION CRITIQUE:", insertErr);
        } else {
            console.log("[SCANNER] Insertion réussie dans 'records'.");
        }
    }

    return { 
        success: true, 
        count: activities.length, 
        nextCursor: lastActivityDate, 
        finished: false 
    };

  } catch (err) {
    console.error("Erreur refreshHallOfRecords:", err);
    return { success: false, message: "Erreur serveur.", finished: true };
  }
}

export async function getTotalActivitiesCount(userId: string | number) {
    const { count, error } = await supabaseAdmin
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', Number(userId));
    
    if (error) return 0;
    return count || 0;
}