'use server';

import { supabaseAdmin } from '@/lib/supabaseAdminClient';

export async function getLegendDetails(userId: string | number, type: 'KOM' | 'TOP10') {
  try {
    // 1. Récupérer TOUS les passages Top 10 de l'utilisateur
    let query = supabaseAdmin
      .from('activity_segments')
      .select(`
        avg_speed_kmh,
        avg_power_w,
        duration_s,
        rank_global,
        segment_id,
        segments ( name, city ),
        activities ( name, start_time )
      `)
      .eq('user_id', userId)
      .lte('rank_global', 10);

    const { data, error } = await query;
    if (error) throw error;

    // 2. DÉDOUBLONNAGE JS : On ne garde que le meilleur passage par segment unique
    const uniqueSegments = new Map();

    (data as any[]).forEach((row) => {
      const sid = row.segment_id;
      
      // On ne garde que la ligne avec le meilleur rang (le plus petit chiffre)
      if (!uniqueSegments.has(sid) || row.rank_global < uniqueSegments.get(sid).rank) {
        uniqueSegments.set(sid, {
          segment_id: sid, // ⚡ FIX : Ajout de l'ID pour le lien de redirection
          segmentName: row.segments?.name || 'Segment Inconnu',
          segmentCity: row.segments?.city || 'Local',
          activityName: row.activities?.name || 'Sortie vélo',
          date: row.activities?.start_time || new Date().toISOString(),
          speed: row.avg_speed_kmh || 0,
          power: row.avg_power_w || 0,
          duration: row.duration_s || 0,
          rank: row.rank_global
        });
      }
    });

    // 3. FILTRAGE & TRI FINAL
    const result = Array.from(uniqueSegments.values());
    
    if (type === 'KOM') {
      return result
        .filter(s => s.rank === 1)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    
    // Pour le Top 10, on trie par rang (1er en haut) puis par date récente
    return result
        .sort((a, b) => a.rank - b.rank || new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error('Erreur getLegendDetails:', error);
    return [];
  }
}