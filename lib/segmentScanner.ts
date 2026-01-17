// fichier : lib/segmentScanner.ts

import { supabaseAdmin } from "./supabaseAdminClient";
import { matchSegmentInStream, ActivityStreamForMatching, SegmentIdentity } from "./segmentMatcher";
import { NPformulaCoggan } from "./physics";

// --- INTERFACES POUR TYPESCRIPT (FINI LES ERREURS 'NEVER') ---

interface ActivityMetadata {
  id: number;
  user_id: string;
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
  users?: {
    weight: number;
  };
}

interface CandidateSegment {
  id: number;
  name: string;
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  distance_m: number;
  elevation_gain_m: number;
  average_grade: number;
}

interface SegmentMatchResult {
  activity_id: number;
  segment_id: number;
  user_id: string;
  duration_s: number;
  avg_power_w: number;
  avg_speed_kmh: number;
  start_index: number;
  end_index: number;
  np_w: number;
  avg_heartrate: number | null;
  max_heartrate: number | null;
  avg_cadence: number | null;
  vam: number;
  w_kg: number;
  created_at: string;
  // Champs ajoutés après calcul des rangs
  rank_global?: number | null;
  rank_personal?: number;
  is_pr?: boolean;
  pr_gap_seconds?: number;
}

// --- HELPER : Calcul des Rangs ---
async function calculateRanks(supabase: any, segmentId: number, userId: string, durationSeconds: number) {
  // 1. Rang Global via RPC (Fonction stockée Postgres)
  const { data: rankGlobal, error: errGlobal } = await supabase
    .rpc('get_global_rank_unique', { 
        _segment_id: segmentId, 
        _duration_s: durationSeconds 
    });

  // 2. Rang Personnel
  const { count: fasterPersonalCount, error: errPerso } = await supabase
    .from('activity_segments')
    .select('*', { count: 'exact', head: true })
    .eq('segment_id', segmentId)
    .eq('user_id', userId)
    .lt('duration_s', durationSeconds);

  if (errGlobal || errPerso) {
    return { rank_global: null, rank_personal: null, is_pr: false }; 
  }

  const rank_personal = (fasterPersonalCount || 0) + 1;
  const is_pr = rank_personal === 1;

  return { rank_global: rankGlobal, rank_personal, is_pr };
}

/**
 * SCANNER OPTIMISÉ V2 (TYPESAFE & SQL FILTER)
 */
export async function scanActivityAgainstSegments(
  activityId: number, 
  targetSegmentId?: number,
  providedStreams?: ActivityStreamForMatching
) {
  try {
    let streams: ActivityStreamForMatching | null = providedStreams || null;
    let userId: string;
    let userWeight: number;

    // ---------------------------------------------------------
    // ÉTAPE 1 : CHARGEMENT METADATA ACTIVITÉ
    // ---------------------------------------------------------
    
    // On type explicitement le retour pour éviter les erreurs "Property does not exist"
    const { data: actData, error: errLight } = await supabaseAdmin
        .from('activities')
        .select('id, user_id, min_lat, max_lat, min_lon, max_lon, users(weight)')
        .eq('id', activityId)
        .single();

    if (errLight || !actData) {
        console.log(`⚠️ [SCANNER] Act #${activityId} introuvable ou erreur DB.`);
        return { success: false, error: "Activity not found" };
    }
    
    // Casting manuel car Supabase ne devine pas toujours les jointures
    const actLight = actData as unknown as ActivityMetadata;
    
    userId = actLight.user_id;
    userWeight = actLight.users?.weight || 75; // Poids par défaut si pas trouvé

    // Vérification des bornes GPS (Box)
    // On utilise les vrais noms de colonnes de ta DB : min_lat, max_lat, etc.
    if (actLight.min_lat === null || actLight.min_lat === undefined) {
         console.log(`⏩ [SCANNER] Act #${activityId} ignorée (Pas de bornes GPS calculées).`);
         return { success: true, matchesFound: 0, skipped: true };
    }

    // Définition de la Box de l'activité
    const actBox = {
        minLat: actLight.min_lat,
        maxLat: actLight.max_lat,
        minLon: actLight.min_lon,
        maxLon: actLight.max_lon
    };

    // ---------------------------------------------------------
    // ÉTAPE 2 : RÉCUPÉRATION DES SEGMENTS (FILTRE SQL BOX)
    // ---------------------------------------------------------
    
    // On cherche les segments qui COMMENCENT dans (ou très proche de) la boite de l'activité.
    // MARGE : 0.02 degrés (~2km) pour attraper les segments qui démarrent juste au bord.
    const MARGIN = 0.02;

    let query = supabaseAdmin
      .from('segments')
      .select('id, name, start_lat, start_lon, end_lat, end_lon, distance_m, elevation_gain_m, average_grade')
      .eq('is_official', true);

    if (targetSegmentId) {
        // Cas : On scanne UN seul segment spécifique
        query = query.eq('id', targetSegmentId);
    } else {
        // Cas : Scan global optimisé
        // On ne prend que les segments dont le point de départ est dans la box de l'activité
        query = query
            .lte('start_lat', actBox.maxLat + MARGIN)
            .gte('start_lat', actBox.minLat - MARGIN)
            .lte('start_lon', actBox.maxLon + MARGIN)
            .gte('start_lon', actBox.minLon - MARGIN);
    }
    
    const { data: segData, error: segError } = await query;

    if (segError) throw segError;

    // Typage explicite ici pour résoudre l'erreur "never"
    const candidateSegments: CandidateSegment[] = (segData || []) as CandidateSegment[];

    if (candidateSegments.length === 0) {
        return { success: true, matchesFound: 0 };
    }

    // ---------------------------------------------------------
    // ÉTAPE 3 : CHARGEMENT DES STREAMS (Seulement si candidats)
    // ---------------------------------------------------------
    if (!streams) {
        const { data: heavyData } = await supabaseAdmin
            .from('activities')
            .select('streams_data')
            .eq('id', activityId)
            .single();
            
        const heavyAct = heavyData as any; // On cast car streams_data est souvent un JSONB complexe

        if (!heavyAct?.streams_data) {
            return { success: false, error: "No streams" };
        }
        streams = heavyAct.streams_data;
    }

    // Initialisation typée du tableau de résultats
    const allNewMatches: SegmentMatchResult[] = [];

    // ---------------------------------------------------------
    // ÉTAPE 4 : MATCHING PRÉCIS (Algo glissant)
    // ---------------------------------------------------------
    for (const seg of candidateSegments) {
        // TypeScript est content car seg est typé CandidateSegment
        const segmentTyped: SegmentIdentity = {
            id: seg.id, 
            start_lat: seg.start_lat, start_lon: seg.start_lon,
            end_lat: seg.end_lat, end_lon: seg.end_lon, 
            distance_m: seg.distance_m
        };
    
        let currentStartIndex = 0;
    
        // On boucle sur le stream pour trouver le segment (potentiellement plusieurs fois, ex: circuit)
        while (currentStartIndex < streams!.latlng.length) {
            const subStream: ActivityStreamForMatching = {
                ...streams!,
                latlng: streams!.latlng.slice(currentStartIndex),
                distance: streams!.distance.slice(currentStartIndex),
                time: streams!.time.slice(currentStartIndex),
                watts: streams!.watts?.slice(currentStartIndex),
                heartrate: streams!.heartrate?.slice(currentStartIndex),
                cadence: streams!.cadence?.slice(currentStartIndex),
                altitude: streams!.altitude?.slice(currentStartIndex)
            };
    
            const result = matchSegmentInStream(segmentTyped, subStream);
            
            if (result) {
                const globalStartIndex = currentStartIndex + result.start_index;
                const globalEndIndex = currentStartIndex + result.end_index;
                
                // Extraction des données sur la portion matchée
                const segmentWatts = (streams!.watts || []).slice(globalStartIndex, globalEndIndex + 1).filter((n): n is number => n !== null);
                const segmentHR = (streams!.heartrate || []).slice(globalStartIndex, globalEndIndex + 1).filter((n): n is number => n !== null);
                const segmentCad = (streams!.cadence || []).slice(globalStartIndex, globalEndIndex + 1).filter((n): n is number => n !== null);
    
                const avgPwr = segmentWatts.length > 0 ? segmentWatts.reduce((a, b) => a + b, 0) / segmentWatts.length : result.avg_power_w;
                const np = segmentWatts.length > 30 ? NPformulaCoggan(segmentWatts) : avgPwr;
                const vam = (result.duration_s > 0) ? (seg.elevation_gain_m || 0) / (result.duration_s / 3600) : 0;
    
                allNewMatches.push({
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
    
                // On avance l'index pour chercher si le segment est refait plus loin dans la sortie
                currentStartIndex = globalEndIndex + 1;
            } else {
                // Plus de match trouvé pour ce segment, on passe au segment suivant
                break;
            }
        }
    }

    // ---------------------------------------------------------
    // ÉTAPE 5 : CALCULS RANGS & INSERTION
    // ---------------------------------------------------------
    if (allNewMatches.length > 0) {
       // Calcul des rangs en parallèle
       await Promise.all(allNewMatches.map(async (m) => {
            const { rank_global, rank_personal, is_pr } = await calculateRanks(supabaseAdmin, m.segment_id, userId, m.duration_s);
            m.rank_global = rank_global;
            m.rank_personal = rank_personal;
            m.is_pr = is_pr;
            // Optionnel : Calcul du gap
            m.pr_gap_seconds = 0; // À implémenter si besoin
       }));

      // Insertion en base
      const { error: upsertError } = await (supabaseAdmin.from('activity_segments') as any)
    .upsert(allNewMatches, { onConflict: 'activity_id, segment_id, start_index' });
  
  if (upsertError) throw upsertError;
}
    return { success: true, matchesFound: allNewMatches.length };

  } catch (err: any) {
    console.error(`!!! [SCANNER FAILURE] Act #${activityId}:`, err);
    return { success: false, error: err.message };
  }
}