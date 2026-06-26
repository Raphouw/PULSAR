'use server';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';
import { unstable_noStore as noStore } from 'next/cache';

export async function getHallData(userId: string | number) {
  try {
    noStore(); // Pas de cache

    // 1. Récupération des Records (Puissance, VAM, Temps/Km...)
    let allRecords: any[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000; 

    while (hasMore) {
        const { data, error } = await supabaseAdmin
            .from('hall_of_records')
            .select(`
                *,
                activities (id, name, start_time)
            `)
            .eq('user_id', userId)
            .order('date_recorded', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
            allRecords = [...allRecords, ...data];
            if (data.length < pageSize) hasMore = false;
            else page++;
        } else {
            hasMore = false;
        }
    }

    // 2. Récupération des Stats Physiques depuis les activités
    const { data: activitiesData, error: actErr } = await supabaseAdmin
      .from('activities')
      .select('id, name, start_time, distance_km, elevation_gain_m, duration_s, max_speed_kmh, avg_speed_kmh, calories_kcal')
      .eq('user_id', userId);

    if (actErr) throw actErr;

    const physicalRecords: any[] = [];
    
    // ⚡ FIX TYPESCRIPT ICI : On force le type pour que TS arrête de paniquer
    const activities = (activitiesData || []) as any[];

    if (activities.length > 0) {
        for (const act of activities) {
            // ⚡ FIX TYPESCRIPT ICI : On force aussi le type de base
            const base: any = {
                id: `act-${act.id}`,
                user_id: userId,
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

    // Fusion de toutes les données
    const mergedData = [...allRecords, ...physicalRecords];
    return JSON.parse(JSON.stringify(mergedData));

} catch (e) {
    console.error("Crash getHallData", e);
    return [];
  }
}