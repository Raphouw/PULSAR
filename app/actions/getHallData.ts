'use server';

import { supabaseAdmin } from '@/lib/supabaseAdminClient';
import { unstable_noStore as noStore } from 'next/cache';

export async function getHallData(userId: string | number) {
  try {
    noStore();

    // 1. Récupération des Records (boucle while supprimée, limite fixée à 500 pour alléger la RAM)
    const { data: recordsData, error: recordsErr } = await supabaseAdmin
        .from('hall_of_records')
        .select(`
            *,
            activities (id, name, start_time)
        `)
        .eq('user_id', userId)
        .order('date_recorded', { ascending: false })
        .limit(500); 

    if (recordsErr) throw recordsErr;

    // 2. Récupération des Stats Physiques (limitée également)
    const { data: activitiesData, error: actErr } = await supabaseAdmin
      .from('activities')
      .select('id, name, start_time, distance_km, elevation_gain_m, duration_s, max_speed_kmh, avg_speed_kmh, calories_kcal')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(500);

    if (actErr) throw actErr;

    const allRecords = recordsData || [];
    const activities = (activitiesData || []) as any[];
    const physicalRecords: any[] = [];
    
    if (activities.length > 0) {
        for (const act of activities) {
            const base: any = {
                id: `act-${act.id}`,
                user_id: userId,
                date_recorded: act.start_time,
                activity_id: act.id,
                activities: { id: act.id, name: act.name, start_time: act.start_time }
            };

            if (act.distance_km > 0) physicalRecords.push({ ...base, type: 'physical_distance', metric_id: 'physical_distance', value: act.distance_km });
            if (act.elevation_gain_m > 0) physicalRecords.push({ ...base, type: 'physical_elevation', metric_id: 'physical_elevation', value: act.elevation_gain_m });
            if (act.duration_s > 0) physicalRecords.push({ ...base, type: 'physical_duration', metric_id: 'physical_duration', value: act.duration_s });
            if (act.max_speed_kmh > 0) physicalRecords.push({ ...base, type: 'physical_speed_max', metric_id: 'physical_speed_max', value: act.max_speed_kmh });
            if (act.avg_speed_kmh > 0) physicalRecords.push({ ...base, type: 'physical_speed_avg', metric_id: 'physical_speed_avg', value: act.avg_speed_kmh });
            if (act.calories_kcal > 0) physicalRecords.push({ ...base, type: 'physical_calories', metric_id: 'physical_calories', value: act.calories_kcal });
        }
    }

    // Plus besoin de JSON.parse(JSON.stringify(...)) bloquant, Next.js gère la sérialisation native
    return [...allRecords, ...physicalRecords];

  } catch (e) {
    console.error("Crash getHallData", e);
    return [];
  }
}