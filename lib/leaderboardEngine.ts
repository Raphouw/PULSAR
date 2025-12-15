// Fichier : lib/leaderboardEngine.ts
import { supabaseAdmin } from "./supabaseAdminClient";

export type LeaderboardFilter = {
  segmentId: number;
  year?: number;
  weightClass?: 'light' | 'mid' | 'heavy'; // <65, 65-80, >80
  ageClass?: 'young' | 'senior' | 'master'; // <30, 30-45, >45
  sortBy?: 'duration_s' | 'w_kg' | 'vam' | 'avg_power_w';
};

/**
 * Récupère le classement filtré d'un segment avec les données physiologiques des athlètes.
 */
export async function getSegmentLeaderboard(filters: LeaderboardFilter) {
  let query = supabaseAdmin
    .from('activity_segments')
    .select(`
      id,
      duration_s,
      avg_power_w,
      np_w,
      w_kg,
      vam,
      avg_heartrate,
      avg_cadence,
      created_at,
      activities!inner (
        start_time,
        user_id,
        users!inner (
          id,
          name,
          avatar_url,
          weight,
          age,
          height
        )
      )
    `)
    .eq('segment_id', filters.segmentId);

  // Filtrage par année
  if (filters.year) {
    const startYear = `${filters.year}-01-01T00:00:00`;
    const endYear = `${filters.year}-12-31T23:59:59`;
    query = query.gte('activities.start_time', startYear).lte('activities.start_time', endYear);
  }

  const { data, error } = await query;
  if (error) throw error;

  // --- FIX DES ERREURS DE TYPE ---
  // On cast la donnée pour forcer TS à comprendre que 'users' et 'activities' sont des objets uniques
  const rawData = data as unknown as any[];

  let filteredData = rawData || [];

  if (filters.weightClass) {
    filteredData = filteredData.filter(row => {
      // Supabase peut renvoyer un objet ou un tableau selon la config, on blinde l'accès
      const userData = Array.isArray(row.activities?.users) ? row.activities.users[0] : row.activities?.users;
      const w = userData?.weight || 75;
      
      if (filters.weightClass === 'light') return w < 65;
      if (filters.weightClass === 'mid') return w >= 65 && w <= 80;
      return w > 80;
    });
  }

  if (filters.ageClass) {
    filteredData = filteredData.filter(row => {
      const userData = Array.isArray(row.activities?.users) ? row.activities.users[0] : row.activities?.users;
      const age = userData?.age || 35;
      
      if (filters.ageClass === 'young') return age < 30;
      if (filters.ageClass === 'senior') return age >= 30 && age <= 45;
      return age > 45;
    });
  }

  // --- LOGIQUE DE TRI ---
  filteredData.sort((a, b) => {
    const key = filters.sortBy || 'duration_s';
    if (key === 'duration_s') return a.duration_s - b.duration_s;
    return b[key] - a[key];
  });

  // --- PR UNIQUE PAR UTILISATEUR ---
  const uniqueUsers = new Map();
  filteredData.forEach(effort => {
    const userId = effort.activities?.user_id;
    if (!uniqueUsers.has(userId) || effort.duration_s < uniqueUsers.get(userId).duration_s) {
      uniqueUsers.set(userId, effort);
    }
  });

  // On retourne le tableau final formaté proprement pour l'UI
  return Array.from(uniqueUsers.values()).map(row => ({
      ...row,
      user: Array.isArray(row.activities?.users) ? row.activities.users[0] : row.activities?.users
  }));
}