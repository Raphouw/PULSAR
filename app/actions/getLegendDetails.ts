'use server';

import { supabaseAdmin } from '@/lib/supabaseAdminClient';

export async function getLegendDetails(userId: string | number, type: 'KOM' | 'TOP10') {
  try {
    // On construit la requête de base sur activity_segments
    let query = supabaseAdmin
      .from('activity_segments')
      .select(`
        id,
        avg_speed_kmh,
        avg_power_w,
        duration_s,
        rank_global,
        created_at,
        segments (
            name,
            city
        ),
        activities (
            start_time,
            name
        )
      `)
      .eq('user_id', userId);

    // FILTRE SELON LE TYPE DEMANDÉ
    if (type === 'KOM') {
        // Uniquement les 1ers
        query = query.eq('rank_global', 1);
    } else {
        // Top 10 (inclut les 1ers, mais on peut exclure les 1ers si on veut que les places d'honneurs)
        // Ici on met tout le top 10
        query = query.lte('rank_global', 10).gt('rank_global', 1); 
        // Note: j'ai mis gt(1) pour éviter d'avoir les KOMs en double dans la liste Top 10, 
        // mais tu peux enlever .gt('rank_global', 1) si tu veux voir les KOMs aussi dans la liste Top 10.
    }

    // Tri par rang (les meilleurs en haut) puis par date récente
    query = query.order('rank_global', { ascending: true }).order('created_at', { ascending: false }).limit(50);

    const { data, error } = await query;

    if (error) {
        console.error("Erreur DB Details:", error);
        throw error;
    }

    // Mapping propre pour le frontend
    return data.map((row: any) => ({
      segmentName: row.segments?.name || 'Segment Inconnu',
      segmentCity: row.segments?.city,
      activityName: row.activities?.name || 'Sortie vélo',
      date: row.activities?.start_time || row.created_at,
      speed: row.avg_speed_kmh || 0,
      power: row.avg_power_w || 0,
      duration: row.duration_s || 0,
      rank: row.rank_global // Le vrai rang de la BDD
    }));

  } catch (error) {
    console.error('Erreur getLegendDetails:', error);
    return [];
  }
}