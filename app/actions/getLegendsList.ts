// Fichier : app/actions/getLegendsList.ts
'use server';

import { supabaseAdmin } from '@/lib/supabaseAdminClient';
import { unstable_noStore as noStore } from 'next/cache';

export async function getLegendsList() {
  try {
    noStore(); // Force des données fraîches

    // 1. Récupération de TOUS les efforts sur segments (sans filtre Top 10 au départ)
    // On a besoin de tout pour calculer le nombre total de segments "chassés"
    const { data: allEffortsData, error: segError } = await supabaseAdmin
      .from('activity_segments')
      .select('user_id, rank_global, segment_id')
      .not('user_id', 'is', null);

    if (segError) throw segError;
    const allEfforts = allEffortsData as any[];

    // 2. Récupération des utilisateurs pour construire le leaderboard
    const { data: usersData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, avatar_url');

    if (userError) throw userError;
    const users = usersData as any[];

    // 3. Initialisation du dictionnaire de classement
    const leaderboard: Record<string, any> = {};

    users?.forEach(u => {
        const uid = String(u.id);
        leaderboard[uid] = {
            user_id: u.id,
            name: u.name || `Athlète #${u.id}`,
            image: u.avatar_url,
            count_koms: 0,
            count_top10: 0,
            total_segments: 0, // Compteur "Segments chassés"
            // Sets pour dédoublonner en JS (non envoyés au client)
            unique_explored: new Set<string>(),
            unique_koms: new Set<string>(),
            unique_top10: new Set<string>()
        };
    });

    // 4. Traitement des données avec logique de dédoublonnage par segment
    allEfforts?.forEach(effort => {
        const uid = String(effort.user_id);
        const sid = String(effort.segment_id);
        const rank = effort.rank_global;

        if (leaderboard[uid]) {
            // A. LOGIQUE EXPLORATION : On compte chaque segment unique visité
            if (!leaderboard[uid].unique_explored.has(sid)) {
                leaderboard[uid].total_segments++;
                leaderboard[uid].unique_explored.add(sid);
            }

            // B. LOGIQUE PALMARÈS : KOM (Rang 1)
            if (rank === 1) {
                if (!leaderboard[uid].unique_koms.has(sid)) {
                    leaderboard[uid].count_koms++;
                    leaderboard[uid].unique_koms.add(sid);
                }
            }

            // C. LOGIQUE PALMARÈS : TOP 10 (Rang 1 à 10)
            if (rank >= 1 && rank <= 10) {
                if (!leaderboard[uid].unique_top10.has(sid)) {
                    leaderboard[uid].count_top10++;
                    leaderboard[uid].unique_top10.add(sid);
                }
            }
        }
    });

    // 5. Nettoyage, Tri et Formatage final
    const sortedLegends = Object.values(leaderboard)
        // On ne garde que ceux qui ont au moins un segment au compteur
        .filter((l: any) => l.total_segments > 0)
        .map((l: any) => {
            // Extraction des données utiles et suppression des Sets (non sérialisables)
            const { unique_explored, unique_koms, unique_top10, ...rest } = l;
            return rest;
        })
        .sort((a: any, b: any) => {
            // Tri prioritaire : KOMs > Top 10 > Total Segments
            if (b.count_koms !== a.count_koms) return b.count_koms - a.count_koms;
            if (b.count_top10 !== a.count_top10) return b.count_top10 - a.count_top10;
            return b.total_segments - a.total_segments;
        });

    return JSON.parse(JSON.stringify(sortedLegends));

  } catch (err) {
    console.error("Erreur getLegendsList:", err);
    return [];
  }
}