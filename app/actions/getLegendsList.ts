// Fichier : app/actions/getLegendsList.ts
'use server';

import { supabaseAdmin } from '@/lib/supabaseAdminClient';
import { unstable_noStore as noStore } from 'next/cache';

export async function getLegendsList() {
  try {
    noStore(); 

    const { data: allEffortsData, error: segError } = await supabaseAdmin
      .from('activity_segments')
      .select('user_id, rank_global, segment_id')
      .not('user_id', 'is', null);

    if (segError) throw segError;
    const allEfforts = allEffortsData as any[];

    // AJOUT : On récupère aussi le 'gender'
    const { data: usersData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, avatar_url, gender');

    if (userError) throw userError;
    const users = usersData as any[];

    const leaderboard: Record<string, any> = {};

    users?.forEach(u => {
        const uid = String(u.id);
        leaderboard[uid] = {
            user_id: u.id,
            name: u.name || `Athlète #${u.id}`,
            image: u.avatar_url,
            gender: u.gender || 'UNKNOWN', // Ajout du genre ici
            count_koms: 0,
            count_top10: 0,
            total_segments: 0, 
            unique_explored: new Set<string>(),
            unique_koms: new Set<string>(),
            unique_top10: new Set<string>()
        };
    });

    allEfforts?.forEach(effort => {
        const uid = String(effort.user_id);
        const sid = String(effort.segment_id);
        const rank = effort.rank_global;

        if (leaderboard[uid]) {
            if (!leaderboard[uid].unique_explored.has(sid)) {
                leaderboard[uid].total_segments++;
                leaderboard[uid].unique_explored.add(sid);
            }

            if (rank === 1) {
                if (!leaderboard[uid].unique_koms.has(sid)) {
                    leaderboard[uid].count_koms++;
                    leaderboard[uid].unique_koms.add(sid);
                }
            }

            if (rank >= 1 && rank <= 10) {
                if (!leaderboard[uid].unique_top10.has(sid)) {
                    leaderboard[uid].count_top10++;
                    leaderboard[uid].unique_top10.add(sid);
                }
            }
        }
    });

    const sortedLegends = Object.values(leaderboard)
        .filter((l: any) => l.total_segments > 0)
        .map((l: any) => {
            const { unique_explored, unique_koms, unique_top10, ...rest } = l;
            return rest;
        })
        .sort((a: any, b: any) => {
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