// Fichier : app/actions/getLegendsList.ts
'use server';

import { supabaseAdmin } from '@/lib/supabaseAdminClient';
import { unstable_noStore as noStore } from 'next/cache';

export async function getLegendsList() {
  try {
    noStore(); // On veut des données fraîches à chaque fois

    // 1. Récupération des segments performants (Top 10)
    const { data: segmentsData, error: segError } = await supabaseAdmin
      .from('activity_segments')
      .select('user_id, rank_global')
      .lte('rank_global', 10)
      .not('user_id', 'is', null);

    if (segError) throw segError;

    // ⚡ FIX: On cast en any[] pour éviter l'erreur 'never'
    const segments = segmentsData as any[];

    // 2. Récupération des utilisateurs
    const { data: usersData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, avatar_url');

    if (userError) throw userError;

    // ⚡ FIX: On cast en any[] pour pouvoir boucler dessus
    const users = usersData as any[];

    // 3. Calcul du Classement (Agrégation JS)
    const leaderboard: Record<string, any> = {};

    // Init
    users?.forEach(u => {
        // On convertit l'ID en string pour l'utiliser comme clé
        const uid = String(u.id);
        
        leaderboard[uid] = {
            user_id: u.id,
            name: u.name || `Athlète #${u.id}`,
            image: u.avatar_url,
            count_koms: 0,
            count_top10: 0,
            total_segments: 0
        };
    });

    // Comptage
    segments?.forEach(seg => {
        const uid = String(seg.user_id);
        
        if (leaderboard[uid]) {
            if (seg.rank_global === 1) {
                leaderboard[uid].count_koms++;
            }
            leaderboard[uid].count_top10++;
            leaderboard[uid].total_segments++;
        }
    });

    // 4. Tri (KOMs > Top10)
    const sortedLegends = Object.values(leaderboard)
        .filter((l: any) => l.count_top10 > 0)
        .sort((a: any, b: any) => {
            if (b.count_koms !== a.count_koms) return b.count_koms - a.count_koms;
            return b.count_top10 - a.count_top10;
        });

    return JSON.parse(JSON.stringify(sortedLegends));

  } catch (err) {
    console.error("Erreur getLegendsList:", err);
    return [];
  }
}