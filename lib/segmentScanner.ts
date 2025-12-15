// Fichier : lib/segmentScanner.ts
import { supabaseAdmin } from "./supabaseAdminClient";
import { matchSegmentInStream, ActivityStreamForMatching, SegmentIdentity } from "./segmentMatcher";
import { calculatePulsarScore, NPformulaCoggan } from "./physics";

/**
 * Scanne une activité contre les segments certifiés.
 * Supporte l'injection directe de streams pour l'onboarding rapide.
 */
export async function scanActivityAgainstSegments(
  activityId: number, 
  targetSegmentId?: number,
  providedStreams?: ActivityStreamForMatching
) {
  console.log(`>>> [SCANNER] Appel reçu pour ID: ${activityId} | Mode: ${providedStreams ? 'AUTO' : 'MANUEL'}`);

  try {
    let streams: ActivityStreamForMatching;
    let userId: string;
    let userWeight: number;

    // 1. RÉCUPÉRATION DES DONNÉES (Injection ou BDD)
    if (providedStreams) {
      console.log(`[SCANNER] Utilisation de l'injection directe (${providedStreams.latlng?.length} points)`);
      const { data: act, error: errAct } = await supabaseAdmin
        .from('activities')
        .select('user_id, users(weight)')
        .eq('id', activityId)
        .single();

      if (errAct || !act) {
        console.error(`[SCANNER] ÉCHEC : Activité ${activityId} introuvable pour injection.`);
        return { success: false, msg: "Activité introuvable" };
      }
      streams = providedStreams;
      userId = act.user_id as string;
      userWeight = (act.users as any)?.weight || 75;
    } else {
      console.log(`[SCANNER] Récupération BDD pour ID: ${activityId}...`);
      const { data: activity, error: actError } = await supabaseAdmin
        .from('activities')
        .select(`id, streams_data, user_id, users ( weight )`)
        .eq('id', activityId)
        .single();

      if (actError || !activity || !activity.streams_data) {
        console.error(`[SCANNER] ÉCHEC : Streams BDD introuvables pour ${activityId}`);
        return { success: false, msg: "Streams introuvables" };
      }
      streams = activity.streams_data as unknown as ActivityStreamForMatching;
      userId = activity.user_id as string;
      userWeight = (activity.users as any)?.weight || 75;
    }

    // 2. RÉCUPÉRATION DES SEGMENTS RÉFÉRENTS
    let query = supabaseAdmin
      .from('segments')
      .select('id, name, start_lat, start_lon, end_lat, end_lon, distance_m, elevation_gain_m, average_grade, polyline');

    if (targetSegmentId) query = query.eq('id', targetSegmentId);
    
    const { data: segments, error: segError } = await query;
    if (segError || !segments) {
        console.log("[SCANNER] Aucun segment référent trouvé.");
        return { success: true, matchesFound: 0 };
    }

    console.log(`[SCANNER] Analyse de ${streams.latlng?.length} points contre ${segments.length} segments...`);

    const allNewMatches: any[] = [];

    for (const seg of segments) {
      const segmentTyped: SegmentIdentity = {
        id: seg.id, start_lat: seg.start_lat, start_lon: seg.start_lon,
        end_lat: seg.end_lat, end_lon: seg.end_lon, distance_m: seg.distance_m
      };

      // --- LOGIQUE MULTI-PASSAGE (Boucles) ---
      let currentStartIndex = 0;
      const matchesForThisSegment: any[] = [];

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
          
          // Extraction des données sur la portion
          const segmentWatts = (streams.watts || []).slice(globalStartIndex, globalEndIndex + 1).filter((n): n is number => n !== null);
          const segmentHR = (streams.heartrate || []).slice(globalStartIndex, globalEndIndex + 1).filter((n): n is number => n !== null);
          const segmentCad = (streams.cadence || []).slice(globalStartIndex, globalEndIndex + 1).filter((n): n is number => n !== null);

          const avgPwr = segmentWatts.length > 0 ? segmentWatts.reduce((a, b) => a + b, 0) / segmentWatts.length : result.avg_power_w;
          const np = segmentWatts.length > 30 ? NPformulaCoggan(segmentWatts) : avgPwr;
          const vam = (result.duration_s > 0) ? (seg.elevation_gain_m || 0) / (result.duration_s / 3600) : 0;

          matchesForThisSegment.push({
            activity_id: activityId,
            segment_id: seg.id,
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

          // On déplace le curseur pour chercher la prochaine boucle
          currentStartIndex = globalEndIndex + 1;
        } else {
          break; 
        }
      }

      // --- DÉTECTION PR & GAP (LOGIQUE ATOMIQUE) ---
      if (matchesForThisSegment.length > 0) {
        const { data: globalBest } = await supabaseAdmin
          .from('activity_segments')
          .select(`duration_s, activities!inner ( user_id )`)
          .eq('segment_id', seg.id)
          .eq('activities.user_id', userId)
          .neq('activity_id', activityId) 
          .order('duration_s', { ascending: true })
          .limit(1)
          .maybeSingle();

        const historicalBestTime = globalBest?.duration_s || Infinity;
        const bestDurationInSession = [...matchesForThisSegment].sort((a, b) => a.duration_s - b.duration_s)[0].duration_s;

        matchesForThisSegment.forEach(m => {
          const isBestOfSession = m.duration_s === bestDurationInSession;
          // Uniquement si c'est le meilleur du jour ET qu'il bat l'histoire
          m.is_pr = isBestOfSession && (m.duration_s < historicalBestTime);
          
          // Gap par rapport à l'histoire si elle existe, sinon par rapport au meilleur du jour
          m.pr_gap_seconds = (historicalBestTime !== Infinity) 
            ? (m.duration_s - historicalBestTime) 
            : (m.duration_s - bestDurationInSession);
          
          allNewMatches.push(m);
        });
      }
    }

    // 3. INSERTION FINALE (Blindage contre les doublons via start_index)
    if (allNewMatches.length > 0) {
      console.log(`[SCANNER] Sauvegarde de ${allNewMatches.length} efforts détectés...`);
      const { error: upsertError } = await supabaseAdmin
        .from('activity_segments')
        .upsert(allNewMatches, { onConflict: 'activity_id, segment_id, start_index' });
      
      if (upsertError) {
          console.error("!!! [SCANNER UPSERT ERROR]:", upsertError);
          throw upsertError;
      }
    }

    console.log(`[SCANNER] Terminé avec succès pour ID ${activityId}.`);
    return { success: true, matchesFound: allNewMatches.length };

  } catch (err: any) {
    console.error(`!!! [SCANNER CRITICAL FAILURE]:`, err);
    return { success: false, error: err.message };
  }
}