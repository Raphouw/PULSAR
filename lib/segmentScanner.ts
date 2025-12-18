import { supabaseAdmin } from "./supabaseAdminClient";
import { matchSegmentInStream, ActivityStreamForMatching, SegmentIdentity } from "./segmentMatcher";
import { calculatePulsarScore, NPformulaCoggan } from "./physics";

/**
 * Helper: Calcule le rang Global et Personnel avant insertion
 */
async function calculateRanks(supabase: any, segmentId: number, userId: string, durationSeconds: number) {
  // 1. GLOBAL : Utilisation de la fonction SQL RPC
  const { data: rankGlobal, error: errGlobal } = await supabase
    .rpc('get_global_rank_unique', { 
        _segment_id: segmentId, 
        _duration_s: durationSeconds 
    });

  // 2. PERSO : Calcul du rang parmi ses propres essais
  const { count: fasterPersonalCount, error: errPerso } = await supabase
    .from('activity_segments')
    .select('*', { count: 'exact', head: true })
    .eq('segment_id', segmentId)
    .eq('user_id', userId)
    .lt('duration_s', durationSeconds);

  if (errGlobal || errPerso) {
    console.error("Erreur calcul rangs:", errGlobal || errPerso);
    return { rank_global: null, rank_personal: null, is_pr: false }; 
  }

  const rank_personal = (fasterPersonalCount || 0) + 1;
  const is_pr = rank_personal === 1;

  return { rank_global: rankGlobal, rank_personal, is_pr };
}

/**
 * Scanne une activité contre les segments certifiés.
 */
export async function scanActivityAgainstSegments(
  activityId: number, 
  targetSegmentId?: number,
  providedStreams?: ActivityStreamForMatching
) {
  try {
    let streams: ActivityStreamForMatching;
    let userId: string;
    let userWeight: number;

    // 1. RÉCUPÉRATION DES DONNÉES (Injection ou BDD)
    if (providedStreams) {
      const { data: actData, error: errAct } = await supabaseAdmin
        .from('activities')
        .select('user_id, users(weight)')
        .eq('id', activityId)
        .single();

      const act = actData as any;
      if (errAct || !act) throw new Error("Activité introuvable pour injection.");
      
      streams = providedStreams;
      userId = act.user_id;
      userWeight = act.users?.weight || 75;
    } else {
      const { data: activityData, error: actError } = await supabaseAdmin
        .from('activities')
        .select(`id, streams_data, user_id, users ( weight )`)
        .eq('id', activityId)
        .single();

      const activity = activityData as any;
      if (actError || !activity || !activity.streams_data) throw new Error("Streams introuvables");
      
      streams = activity.streams_data;
      userId = activity.user_id;
      userWeight = activity.users?.weight || 75;
    }

    // 2. RÉCUPÉRATION DES SEGMENTS RÉFÉRENTS
    let query = supabaseAdmin
      .from('segments')
      .select('id, name, start_lat, start_lon, end_lat, end_lon, distance_m, elevation_gain_m, average_grade, polyline');

    if (targetSegmentId) query = query.eq('id', targetSegmentId);
    
    const { data: segmentsData, error: segError } = await query;
    const segments = (segmentsData || []) as any[];

    if (segError || segments.length === 0) return { success: true, matchesFound: 0 };

    console.log(`[SCANNER] Analyse contre ${segments.length} segments...`);
    const allNewMatches: any[] = [];

    for (const seg of segments) {
      const segmentTyped: SegmentIdentity = {
        id: seg.id, start_lat: seg.start_lat, start_lon: seg.start_lon,
        end_lat: seg.end_lat, end_lon: seg.end_lon, distance_m: seg.distance_m
      };

      let currentStartIndex = 0;
      const matchesForThisSegment: any[] = [];

      // --- LOGIQUE MULTI-PASSAGE (Boucles) ---
      while (currentStartIndex < streams.latlng.length) {
        const subStream: ActivityStreamForMatching = {
          ...streams,
          latlng: streams.latlng.slice(currentStartIndex),
          distance: streams.distance.slice(currentStartIndex),
          time: streams.time.slice(currentStartIndex),
          watts: streams.watts?.slice(currentStartIndex),
          heartrate: streams.heartrate?.slice(currentStartIndex),
          cadence: streams.cadence?.slice(currentStartIndex),
          altitude: streams.altitude?.slice(currentStartIndex)
        };

        const result = matchSegmentInStream(segmentTyped, subStream);
        
        if (result) {
          const globalStartIndex = currentStartIndex + result.start_index;
          const globalEndIndex = currentStartIndex + result.end_index;
          
          const segmentWatts = (streams.watts || []).slice(globalStartIndex, globalEndIndex + 1).filter((n): n is number => n !== null);
          const segmentHR = (streams.heartrate || []).slice(globalStartIndex, globalEndIndex + 1).filter((n): n is number => n !== null);
          const segmentCad = (streams.cadence || []).slice(globalStartIndex, globalEndIndex + 1).filter((n): n is number => n !== null);

          const avgPwr = segmentWatts.length > 0 ? segmentWatts.reduce((a, b) => a + b, 0) / segmentWatts.length : result.avg_power_w;
          const np = segmentWatts.length > 30 ? NPformulaCoggan(segmentWatts) : avgPwr;
          const vam = (result.duration_s > 0) ? (seg.elevation_gain_m || 0) / (result.duration_s / 3600) : 0;

          matchesForThisSegment.push({
            activity_id: activityId,
            segment_id: seg.id,
            user_id: userId,
            duration_s: result.duration_s,
            avg_power_w: Math.round(avgPwr),
            avg_speed_kmh: result.avg_speed_kmh,
            start_index: globalStartIndex,
            end_index: globalEndIndex,
            np_w: Math.round(np),
            avg_heartrate: segmentHR.length > 0 ? Math.round(segmentHR.reduce((a, b) => a + b, 0) / segmentHR.length) : null,
            max_heartrate: segmentHR.length > 0 ? Math.max(...segmentHR) : null,
            avg_cadence: segmentCad.length > 0 ? Math.round(segmentCad.reduce((a, b) => a + b, 0) / segmentCad.length) : null,
            vam: Math.round(vam),
            w_kg: parseFloat((avgPwr / userWeight).toFixed(2)),
            created_at: new Date().toISOString()
          });

          currentStartIndex = globalEndIndex + 1;
        } else {
          break; 
        }
      }

      // --- DÉTECTION PR & RANKING ---
      if (matchesForThisSegment.length > 0) {
        const { data: globalBest } = await supabaseAdmin
          .from('activity_segments')
          .select('duration_s')
          .eq('segment_id', seg.id)
          .eq('user_id', userId)
          .order('duration_s', { ascending: true })
          .limit(1)
          .maybeSingle();

        const historicalBestTime = (globalBest as any)?.duration_s || Infinity;

        await Promise.all(matchesForThisSegment.map(async (m) => {
             const { rank_global, rank_personal, is_pr } = await calculateRanks(supabaseAdmin, seg.id, userId, m.duration_s);

             m.rank_global = rank_global;
             m.rank_personal = rank_personal;
             m.is_pr = is_pr;
             m.pr_gap_seconds = is_pr ? 0 : (historicalBestTime !== Infinity ? (m.duration_s - historicalBestTime) : 0);

             allNewMatches.push(m);
        }));
      }
    }

    // 3. INSERTION FINALE (Blindage contre les doublons)
    if (allNewMatches.length > 0) {
      const { error: upsertError } = await (supabaseAdmin.from('activity_segments') as any)
        .upsert(allNewMatches, { onConflict: 'activity_id, segment_id, start_index' });
      
      if (upsertError) throw upsertError;
    }

    return { success: true, matchesFound: allNewMatches.length };

  } catch (err: any) {
    console.error(`!!! [SCANNER FAILURE]:`, err);
    return { success: false, error: err.message };
  }
}