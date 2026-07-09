// Fichier : app/actions/getLegendsList.ts
'use server';

import { supabaseAdmin } from '@/lib/supabaseAdminClient';
import { unstable_noStore as noStore } from 'next/cache';

export async function getLegendsList() {
  try {
    noStore(); // Désactivation du cache pour avoir le classement en temps réel

    // ÉTAPE 4 : Appel direct à ta vue SQL optimisée
    const { data, error } = await supabaseAdmin
      .from('leaderboard_legends')
      .select('*');

    if (error) {
      console.error("[LEGENDS] Erreur lors de la récupération de la vue:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[LEGENDS] Crash dans getLegendsList:", error);
    return [];
  }
}