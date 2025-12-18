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
    let startDate = cursorDate;
    
    // 1. Si pas de curseur, on cherche la dernière activité ANALYSÉE
    if (!startDate) {
        const { data: lastEntryData } = await supabaseAdmin
            .from('hall_of_records')
            .select('date_recorded')
            .eq('user_id', Number(userId)) // ⚡ FIX ID
            .order('date_recorded', { ascending: false })
            .limit(1)
            .single();
        
        // ⚡ FIX CAST
        const lastEntry = lastEntryData as any;
        startDate = lastEntry?.date_recorded || '1970-01-01T00:00:00Z';
    }

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

    // ⚡ FIX CAST ARRAY
    const activities = (activitiesData || []) as any[];

    if (!activities || activities.length === 0) {
        console.log("[SCANNER] Aucune nouvelle activité trouvée. Fin du scan.");
        return { success: true, count: 0, nextCursor: null, finished: true };
    }

    console.log(`[SCANNER] ${activities.length} activités trouvées. Analyse en cours...`);

    // 3. Traitement
    const rowsToInsert: any[] = [];
    const lastActivityDate = activities[activities.length - 1].start_time;

    for (const act of activities) {
        // On passe 'act' tel quel, supposant que la fonction analyze gère le any
        const actRows = analyzeActivityForHallOfFame(act);
        if (actRows.length > 0) {
            rowsToInsert.push(...actRows);
        }
    }

    console.log(`[SCANNER] ${rowsToInsert.length} records générés prêts à l'insertion.`);

    // 4. Insertion
    if (rowsToInsert.length > 0) {
        // ⚡ FIX CAST UPSERT
        const { error: insertErr } = await supabaseAdmin
            .from('hall_of_records')
            .upsert(rowsToInsert as any, { onConflict: 'activity_id, metric_id' });
        
        if (insertErr) {
            console.error("[SCANNER] ERREUR INSERTION CRITIQUE:", insertErr);
        } else {
            console.log("[SCANNER] Insertion réussie.");
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