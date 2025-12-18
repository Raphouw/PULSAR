'use server';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';
import { unstable_noStore as noStore } from 'next/cache';

export async function getHallData(userId: string | number) {
  try {
    noStore(); // Pas de cache

    let allRecords: any[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000; // Taille max standard de Supabase

    console.log(`[GET_DATA] Démarrage récupération complète pour user ${userId}...`);

    while (hasMore) {
        // On récupère par tranche (0-999, 1000-1999, etc.)
        const { data, error } = await supabaseAdmin
            .from('hall_of_records')
            .select(`
                *,
                activities (id, name)
            `)
            .eq('user_id', userId)
            .order('date_recorded', { ascending: false }) // On garde l'ordre récent -> vieux
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error("Erreur durant la pagination:", error);
            throw error;
        }

        if (data && data.length > 0) {
            allRecords = [...allRecords, ...data];
            // Si on a reçu moins que la taille demandée, c'est qu'on est à la fin
            if (data.length < pageSize) {
                hasMore = false;
            } else {
                page++;
            }
        } else {
            hasMore = false;
        }
    }

    console.log(`[GET_DATA] Terminé. Total records récupérés : ${allRecords.length}`);
    
    // Debug : Affiche les années extrêmes pour vérifier
    if (allRecords.length > 0) {
        const first = allRecords[0].date_recorded;
        const last = allRecords[allRecords.length - 1].date_recorded;
        console.log(`[GET_DATA] Plage de données : de ${first} à ${last}`);
    }

    return JSON.parse(JSON.stringify(allRecords));

} catch (e) {
    console.error("Crash getHallData", e);
    return [];
  }
}