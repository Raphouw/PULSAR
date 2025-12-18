// Fichier : app/api/legends/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient"; // J'utilise l'alias @, adapte le chemin si nécessaire

// Force le mode dynamique pour avoir des stats à jour à chaque chargement
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // -------------------------------------------------------------------------
    // 1. RÉCUPÉRATION DES DONNÉES (Remplace l'appel à la vue 'view_hall_of_legends')
    // -------------------------------------------------------------------------
    
    // A. On récupère les segments performants (Top 10 seulement pour être léger)
    const { data: segments, error: segError } = await supabaseAdmin
      .from('activity_segments')
      .select('user_id, rank_global')
      .lte('rank_global', 10) // Uniquement le Top 10
      .not('user_id', 'is', null); // Sécurité anti-null

    if (segError) throw segError;

    // B. On récupère les infos utilisateurs (Nom + Avatar)
    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, avatar_url');

    if (userError) throw userError;

    // -------------------------------------------------------------------------
    // 2. CALCUL DU CLASSEMENT (AGRÉGATION)
    // -------------------------------------------------------------------------
    
    const leaderboard: Record<string, any> = {};

    // Initialisation des profils utilisateurs
    users?.forEach(u => {
        leaderboard[u.id] = {
            user_id: u.id,
            name: u.name || `Athlète #${u.id}`,
            image: u.avatar_url,
            count_koms: 0,      // Nouveauté : Compteur de couronnes
            count_top10: 0,     // Nouveauté : Compteur de places d'honneur
            total_segments: 0   // Total segments classés
        };
    });

    // Distribution des points selon les segments trouvés
    segments?.forEach(seg => {
        const uid = seg.user_id;
        if (leaderboard[uid]) {
            // Logique de comptage "Légende"
            if (seg.rank_global === 1) {
                leaderboard[uid].count_koms++; // C'est un KOM !
            }
            leaderboard[uid].count_top10++;    // C'est aussi un Top 10
            leaderboard[uid].total_segments++;
        }
    });

    // -------------------------------------------------------------------------
    // 3. TRI ET RÉPONSE
    // -------------------------------------------------------------------------

    // On transforme l'objet en tableau et on trie :
    // Priorité 1 : Nombre de KOMs
    // Priorité 2 : Nombre de Top 10
    const sortedLegends = Object.values(leaderboard)
        .filter((l: any) => l.count_top10 > 0) // On masque ceux qui n'ont aucun classement
        .sort((a: any, b: any) => {
            if (b.count_koms !== a.count_koms) return b.count_koms - a.count_koms;
            return b.count_top10 - a.count_top10;
        });

    return NextResponse.json(sortedLegends);

  } catch (err: any) {
    console.error("Legends API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}