// Fichier : app/actions/getRecord.ts
'use server';

import { supabaseAdmin } from '../../lib/supabaseAdminClient';

export async function getUserRecords(userId: string | number) {
  try {
    // 🔥 FIX 1: Conversion stricte en nombre pour Supabase
    const uid = Number(userId);
    if (isNaN(uid)) throw new Error("Invalid User ID");

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
      .eq('user_id', uid) // Utilisation de l'ID converti
      .order('date_recorded', { ascending: false });

    if (recordsError) throw recordsError;

    // 2. Récupérer les Stats Physiques depuis les Activités (Table 'activities')
    const { data: activitiesData, error: activitiesError } = await supabaseAdmin
      .from('activities')
      .select('id, name, start_time, distance_km, elevation_gain_m, duration_s, max_speed_kmh, avg_speed_kmh, calories_kcal')
      .eq('user_id', uid)
      .order('start_time', { ascending: false });

    if (activitiesError) throw activitiesError;

    // 3. Transformer les activités en format "Record" pour l'UI
    const physicalRecords: any[] = [];

    // 🔥 FIX 2: On cast 'activitiesData' en any[] pour contourner l'erreur "never" si elle persiste
    const activities = activitiesData as any[]; 

    if (activities && activities.length > 0) {
      for (const act of activities) {
        const baseRecord = {
          id: `act-${act.id}`, // Faux ID unique
          user_id: uid,
          date_recorded: act.start_time,
          activity_id: act.id,
          activities: {
            id: act.id,
            name: act.name,
            start_time: act.start_time
          }
        };

        // 🔥 FIX 3: Gestion des NULLs avec (?? 0)
        const distance = act.distance_km ?? 0;
        const elevation = act.elevation_gain_m ?? 0;
        const duration = act.duration_s ?? 0;
        const maxSpeed = act.max_speed_kmh ?? 0;
        const avgSpeed = act.avg_speed_kmh ?? 0;
        const calories = act.calories_kcal ?? 0;

        // On crée une ligne de record pour chaque métrique physique si elle existe
        if (distance > 0) {
          physicalRecords.push({ ...baseRecord, type: 'physical_distance', value: distance, duration_s: 0 });
        }
        if (elevation > 0) {
          physicalRecords.push({ ...baseRecord, type: 'physical_elevation', value: elevation, duration_s: 0 });
        }
        if (duration > 0) {
          physicalRecords.push({ ...baseRecord, type: 'physical_duration', value: duration, duration_s: 0 });
        }
        if (maxSpeed > 0) {
          physicalRecords.push({ ...baseRecord, type: 'physical_speed_max', value: maxSpeed, duration_s: 0 });
        }
        if (avgSpeed > 0) {
          physicalRecords.push({ ...baseRecord, type: 'physical_speed_avg', value: avgSpeed, duration_s: 0 });
        }
        if (calories > 0) {
          physicalRecords.push({ ...baseRecord, type: 'physical_calories', value: calories, duration_s: 0 });
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