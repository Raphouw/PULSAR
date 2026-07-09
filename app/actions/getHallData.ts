// Fichier : app/actions/getHallData.ts
'use server';

import { supabaseAdmin } from '@/lib/supabaseAdminClient';
import { unstable_noStore as noStore } from 'next/cache';

export async function getHallData(userId: string | number) {
  try {
    noStore(); // Pas de cache

    const uid = Number(userId);
    if (isNaN(uid)) throw new Error("Invalid User ID");

    const pageSize = 1000;

    // 1. Récupération de TOUS les Records depuis la VRAIE table (Pagination)
    let allRecords: any[] = [];
    let hasMoreRecords = true;
    let recordPage = 0;

    while (hasMoreRecords) {
        const { data, error } = await supabaseAdmin
            .from('records') // CORRECTION : On pointe sur 'records'
            .select(`
                *,
                activities (id, name, start_time)
            `)
            .eq('user_id', uid)
            .order('date_recorded', { ascending: false })
            .range(recordPage * pageSize, (recordPage + 1) * pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
            allRecords = [...allRecords, ...data];
            if (data.length < pageSize) hasMoreRecords = false;
            else recordPage++;
        } else {
            hasMoreRecords = false;
        }
    }

    // 2. Récupération de TOUTES les Stats Physiques (Pagination également)
    let allActivities: any[] = [];
    let hasMoreAct = true;
    let actPage = 0;

    while (hasMoreAct) {
        const { data: actData, error: actErr } = await supabaseAdmin
          .from('activities')
          .select('id, name, start_time, distance_km, elevation_gain_m, duration_s, max_speed_kmh, avg_speed_kmh, calories_kcal')
          .eq('user_id', uid)
          .order('start_time', { ascending: false })
          .range(actPage * pageSize, (actPage + 1) * pageSize - 1);

        if (actErr) throw actErr;

        if (actData && actData.length > 0) {
            allActivities = [...allActivities, ...actData];
            if (actData.length < pageSize) hasMoreAct = false;
            else actPage++;
        } else {
            hasMoreAct = false;
        }
    }

    // 3. Transformation des activités en format "Record" pour l'UI
    const physicalRecords: any[] = [];
    
    if (allActivities.length > 0) {
        for (const act of allActivities) {
            const base: any = {
                id: `act-${act.id}`,
                user_id: uid,
                date_recorded: act.start_time,
                activity_id: act.id,
                activities: { id: act.id, name: act.name, start_time: act.start_time }
            };

            // On formate les données de l'activité pour les insérer dans l'UI des records
            if (act.distance_km > 0) physicalRecords.push({ ...base, type: 'physical_distance', metric_id: 'physical_distance', value: act.distance_km });
            if (act.elevation_gain_m > 0) physicalRecords.push({ ...base, type: 'physical_elevation', metric_id: 'physical_elevation', value: act.elevation_gain_m });
            if (act.duration_s > 0) physicalRecords.push({ ...base, type: 'physical_duration', metric_id: 'physical_duration', value: act.duration_s });
            if (act.max_speed_kmh > 0) physicalRecords.push({ ...base, type: 'physical_speed_max', metric_id: 'physical_speed_max', value: act.max_speed_kmh });
            if (act.avg_speed_kmh > 0) physicalRecords.push({ ...base, type: 'physical_speed_avg', metric_id: 'physical_speed_avg', value: act.avg_speed_kmh });
            if (act.calories_kcal > 0) physicalRecords.push({ ...base, type: 'physical_calories', metric_id: 'physical_calories', value: act.calories_kcal });
        }
    }

    // 4. Fusion de toutes les données
    const mergedData = [...allRecords, ...physicalRecords];
    
    // Sérialisation JSON nécessaire pour Next.js Server Actions
    return JSON.parse(JSON.stringify(mergedData));

  } catch (e) {
    console.error("Crash getHallData", e);
    return [];
  }
}