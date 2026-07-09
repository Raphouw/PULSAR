'use server';

import { supabaseAdmin } from '@/lib/supabaseAdminClient';
import { unstable_noStore as noStore } from 'next/cache';

export async function getLegendsList() {
  try {
    noStore(); 

    // On interroge directement la nouvelle vue SQL et on trie nativement
    const { data, error } = await supabaseAdmin
      .from('leaderboard_legends')
      .select('*')
      .order('count_koms', { ascending: false })
      .order('count_top10', { ascending: false })
      .order('total_segments', { ascending: false });

    if (error) throw error;

    return data || [];

  } catch (err) {
    console.error("Erreur getLegendsList:", err);
    return [];
  }
}