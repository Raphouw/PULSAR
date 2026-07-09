// Fichier : app/actions/getRecord.ts
'use server';

import { supabaseAdmin } from '@/lib/supabaseAdminClient';

export async function getUserRecords(userId: string | number) {
  try {
    const uid = Number(userId);
    if (isNaN(uid)) throw new Error("Invalid User ID");

    const pageSize = 1000;

    // 1. Récupérer TOUS les Records (Pagination pour contourner la limite de 1000)
    let intervalRecords: any[] = [];
    let hasMoreRecords = true;
    let recordPage = 0;

    while (hasMoreRecords) {
      const { data, error } = await supabaseAdmin
        .from('records')
        .select(`
          *,
          activities (
            id,
            name,
            start_time
          )
        `)
        .eq('user_id', uid)
        .order('date_recorded', { ascending: false })
        .range(recordPage * pageSize, (recordPage + 1) * pageSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        intervalRecords = [...intervalRecords, ...data];
        if (data.length < pageSize) hasMoreRecords = false;
        else recordPage++;
      } else {
        hasMoreRecords = false;
      }
    }

    // 2. Récupérer TOUTES les Stats Physiques (Pagination également)
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

    // 3. Transformer les activités en format "Record" pour l'UI
    const physicalRecords: any[] = [];

    if (allActivities.length > 0) {
      for (const act of allActivities) {
        const baseRecord = {
          id: `act-${act.id}`,
          user_id: uid,
          date_recorded: act.start_time,
          activity_id: act.id,
          activities: {
            id: act.id,
            name: act.name,
            start_time: act.start_time
          }
        };

        const distance = act.distance_km ?? 0;
        const elevation = act.elevation_gain_m ?? 0;
        const duration = act.duration_s ?? 0;
        const maxSpeed = act.max_speed_kmh ?? 0;
        const avgSpeed = act.avg_speed_kmh ?? 0;
        const calories = act.calories_kcal ?? 0;

        if (distance > 0) physicalRecords.push({ ...baseRecord, type: 'physical_distance', value: distance, duration_s: 0 });
        if (elevation > 0) physicalRecords.push({ ...baseRecord, type: 'physical_elevation', value: elevation, duration_s: 0 });
        if (duration > 0) physicalRecords.push({ ...baseRecord, type: 'physical_duration', value: duration, duration_s: 0 });
        if (maxSpeed > 0) physicalRecords.push({ ...baseRecord, type: 'physical_speed_max', value: maxSpeed, duration_s: 0 });
        if (avgSpeed > 0) physicalRecords.push({ ...baseRecord, type: 'physical_speed_avg', value: avgSpeed, duration_s: 0 });
        if (calories > 0) physicalRecords.push({ ...baseRecord, type: 'physical_calories', value: calories, duration_s: 0 });
      }
    }

    // 4. Fusionner les deux listes
    const allRecords = [...intervalRecords, ...physicalRecords];

    return JSON.parse(JSON.stringify(allRecords));

  } catch (error) {
    console.error('Erreur getUserRecords:', error);
    return [];
  }
}