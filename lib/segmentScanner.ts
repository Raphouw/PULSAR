// Fichier : lib/segmentScanner.ts
import { supabaseAdmin } from "./supabaseAdminClient";
import { matchSegmentInStream, ActivityStreamForMatching, SegmentIdentity } from "./segmentMatcher";

/**
 * Type étendu pour l'insertion dans activity_segments avec métriques tactiques
 */
type ActivitySegmentInsert = {
  activity_id: number;
  segment_id: number;
  duration_s: number;
  avg_power_w: number;
  avg_speed_kmh: number;
  // 🔥 NOUVELLES COLONNES TACTIQUES
  start_index: number;
  end_index: number;
  np_w?: number;
  avg_heartrate?: number;
  max_heartrate?: number;
  avg_cadence?: number;
  vam?: number;
  w_kg?: number;
  created_at?: string;
};

/**
 * Scanne une activité spécifique contre TOUS les segments certifiés de la base.
 * Calcule un rapport de performance complet pour chaque match trouvé.
 */
export async function scanActivityAgainstAllSegments(activityId: number) {
  const { data: activity, error: actError } = await supabaseAdmin
    .from('activities')
    .select(`id, streams_data, user_id, users ( weight )`)
    .eq('id', activityId)
    .single();

  if (actError || !activity || !activity.streams_data) return { success: false, msg: "Activity streams not found" };

  const userWeight = (activity.users as any)?.weight || 75;
  const streams = activity.streams_data as unknown as ActivityStreamForMatching;

  const { data: segments } = await supabaseAdmin
    .from('segments')
    .select('id, name, start_lat, start_lon, end_lat, end_lon, distance_m, elevation_gain_m');

  if (!segments) return { success: true, matchesFound: 0 };

  const matches: any[] = []; // 🔥 Utilisation de any[] pour accepter toutes les colonnes tactiques

  for (const seg of segments) {
    const segmentTyped: SegmentIdentity = {
        id: seg.id, start_lat: seg.start_lat, start_lon: seg.start_lon,
        end_lat: seg.end_lat, end_lon: seg.end_lon, distance_m: seg.distance_m
    };

    const result = matchSegmentInStream(segmentTyped, streams);
    
    if (result) {
      const startIndex = result.start_index;
      const endIndex = result.end_index;
      const durationHours = result.duration_s / 3600;

      // --- CALCULS TACTIQUES ---
      const elevationGain = seg.elevation_gain_m || 0;
      const vam = durationHours > 0 ? elevationGain / durationHours : 0;

      const segmentWatts = (streams.watts || []).slice(startIndex, endIndex + 1).filter((n): n is number => n !== null);
      const segmentHR = (streams.heartrate || []).slice(startIndex, endIndex + 1).filter((n): n is number => n !== null);
      const segmentCad = (streams.cadence || []).slice(startIndex, endIndex + 1).filter((n): n is number => n !== null);

      const avgPwr = segmentWatts.length > 0 ? segmentWatts.reduce((a, b) => a + b, 0) / segmentWatts.length : result.avg_power_w;
      const np = segmentWatts.length > 0 ? Math.pow(segmentWatts.reduce((s, x) => s + Math.pow(x, 4), 0) / segmentWatts.length, 0.25) : avgPwr;
      
      // 🔥 FIX : ON INCLUT ENFIN TOUTES LES DONNÉES DANS LE PUSH
      matches.push({
        activity_id: activityId,
        segment_id: seg.id,
        duration_s: result.duration_s,
        avg_power_w: Math.round(avgPwr),
        avg_speed_kmh: result.avg_speed_kmh,
        start_index: startIndex,
        end_index: endIndex,
        np_w: Math.round(np),
        avg_heartrate: segmentHR.length > 0 ? Math.round(segmentHR.reduce((a,b)=>a+b,0)/segmentHR.length) : null,
        max_heartrate: segmentHR.length > 0 ? Math.max(...segmentHR) : null,
        avg_cadence: segmentCad.length > 0 ? Math.round(segmentCad.reduce((a,b)=>a+b,0)/segmentCad.length) : null,
        vam: Math.round(vam),
        w_kg: parseFloat((avgPwr / userWeight).toFixed(2)),
        created_at: new Date().toISOString()
      });
    }
  }

  if (matches.length > 0) {
    const { error } = await supabaseAdmin
      .from('activity_segments')
      .upsert(matches, { onConflict: 'activity_id, segment_id' });
    if (error) throw error;
  }

  return { success: true, matchesFound: matches.length };
}