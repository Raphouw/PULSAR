'use server';

import { supabaseAdmin } from '../../lib/supabaseAdminClient';

export async function getUserRecords(userId: string | number) {
  try {
    // 1. Récupérer les Records de Puissance/Cardio (Table 'records')
    const { data: intervalRecords, error: recordsError } = await supabaseAdmin
      .from('records')
      .select(`
        *,
        activities (
          id,
          name,
          start_time
        )
      `)
      .eq('user_id', userId)
      .order('date_recorded', { ascending: false });

    if (recordsError) throw recordsError;

    // 2. Récupérer les Stats Physiques depuis les Activités (Table 'activities')
    // On prend tout l'historique pour générer les records Distance/D+/Vitesse par année
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('activities')
      .select('id, name, start_time, distance_km, elevation_gain_m, duration_s, max_speed_kmh, avg_speed_kmh, calories_kcal')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });

    if (activitiesError) throw activitiesError;

    // 3. Transformer les activités en format "Record" pour l'UI
const physicalRecords: any[] = [];

    if (activities) {
      for (const act of activities) {
        const baseRecord = {
          id: `act-${act.id}`, // Faux ID unique
          user_id: userId,
          date_recorded: act.start_time,
          activity_id: act.id,
          activities: {
            id: act.id,
            name: act.name,
            start_time: act.start_time
          }
        };

        // On crée une ligne de record pour chaque métrique physique si elle existe
        if (act.distance_km > 0) {
          physicalRecords.push({ ...baseRecord, type: 'physical_distance', value: act.distance_km, duration_s: 0 });
        }
        if (act.elevation_gain_m > 0) {
          physicalRecords.push({ ...baseRecord, type: 'physical_elevation', value: act.elevation_gain_m, duration_s: 0 });
        }
        if (act.duration_s > 0) {
          physicalRecords.push({ ...baseRecord, type: 'physical_duration', value: act.duration_s, duration_s: 0 });
        }
        if (act.max_speed_kmh > 0) {
          physicalRecords.push({ ...baseRecord, type: 'physical_speed_max', value: act.max_speed_kmh, duration_s: 0 });
        }
        if (act.avg_speed_kmh > 0) {
          physicalRecords.push({ ...baseRecord, type: 'physical_speed_avg', value: act.avg_speed_kmh, duration_s: 0 });
        }
        if (act.calories_kcal > 0) {
            physicalRecords.push({ ...baseRecord, type: 'physical_calories', value: act.calories_kcal, duration_s: 0 });
        }
      }
    }

    // 4. Fusionner les deux listes
    const allRecords = [...(intervalRecords || []), ...physicalRecords];

    // Conversion JSON pour Next.js (Server Action serialization)
    return JSON.parse(JSON.stringify(allRecords));

  } catch (error) {
    console.error('Erreur getUserRecords:', error);
    return [];
  }
}