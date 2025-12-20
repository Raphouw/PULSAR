import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { detectClimbsInStream, generateAutoName } from "@/lib/climbDetection";
import { getDistanceFromLatLonInMeters } from "../../../../lib/mapUtils"; 

export const maxDuration = 120; 

// Helper: Vérifie si un point est proche (< 30m) d'une ligne existante
function isPointNearPolyline(lat: number, lon: number, polyline: any[], thresholdMeters = 30): boolean {
    if (!polyline || !Array.isArray(polyline)) return false;
    // On check chaque point de la polyline (Bruteforce optimisé pour segments courts)
    // Pour être ultra-précis, il faudrait projeter le point sur le segment de droite, 
    // mais vérifier la proximité aux points constituants suffit souvent pour le vélo
    for (const pt of polyline) {
        const d = getDistanceFromLatLonInMeters(lat, lon, pt[0], pt[1]);
        if (d < thresholdMeters) return true;
    }
    return false;
}

export async function POST(req: Request) {
  try {
    const { activityId } = await req.json();
    if (!activityId) return NextResponse.json({ error: "Missing activityId" }, { status: 400 });

    // 1. Fetch Streams
    const { data: actData, error: actError } = await (supabaseAdmin
      .from('activities') as any)
      .select('id, streams_data, user_id')
      .eq('id', activityId)
      .single();

    if (actError || !actData?.streams_data) return NextResponse.json({ success: false, message: "No streams" });

    // 2. Run Algo
    const candidates = detectClimbsInStream(actData.streams_data);
    const createdSegments: number[] = [];

    // 3. Process & Deduplicate
    for (const cand of candidates) {
        // Récupérer les segments dans la zone large (Bounding Box 0.02 deg)
        const { data: nearbySegments } = await (supabaseAdmin.from('segments') as any)
            .select('id, start_lat, start_lon, end_lat, end_lon, polyline')
            .gte('start_lat', cand.start_lat - 0.02)
            .lte('start_lat', cand.start_lat + 0.02)
            .gte('start_lon', cand.start_lon - 0.02)
            .lte('start_lon', cand.start_lon + 0.02);

        let isRedundant = false;

        if (nearbySegments && nearbySegments.length > 0) {
            for (const seg of nearbySegments) {
                // Check 1: Doublon exact (Start & End identiques à 50m près)
                const distStart = getDistanceFromLatLonInMeters(cand.start_lat, cand.start_lon, seg.start_lat, seg.start_lon);
                const distEnd = getDistanceFromLatLonInMeters(cand.end_lat, cand.end_lon, seg.end_lat, seg.end_lon);
                
                if (distStart < 50 && distEnd < 50) {
                    isRedundant = true;
                    console.log(`[SKIP] Doublon exact trouvé (Seg ID ${seg.id})`);
                    break;
                }

                // Check 2: Inclusion (Sous-segment)
                // Si le candidat commence SUR un segment existant ET finit SUR ce même segment
                // Et que le segment existant est plus long (pour éviter d'effacer le parent)
                if (seg.polyline && Array.isArray(seg.polyline)) {
                    // On vérifie si Start et End du candidat sont "collés" à la polyline existante
                    const startOnLine = isPointNearPolyline(cand.start_lat, cand.start_lon, seg.polyline);
                    const endOnLine = isPointNearPolyline(cand.end_lat, cand.end_lon, seg.polyline);

                    if (startOnLine && endOnLine) {
                        isRedundant = true;
                        console.log(`[SKIP] Sous-segment détecté (Inclus dans Seg ID ${seg.id})`);
                        break;
                    }
                }
            }
        }

        if (!isRedundant) {
            // ... (Code d'insertion inchangé, cf réponse précédente)
            const autoName = generateAutoName(cand.start_lat, cand.start_lon, cand.avg_grade, cand.distance_m / 1000);
            const { data: newSeg } = await (supabaseAdmin.from('segments') as any)
                .insert({
                    name: `[AUTO] ${autoName}`,
                    start_lat: cand.start_lat,
                    start_lon: cand.start_lon,
                    end_lat: cand.end_lat,
                    end_lon: cand.end_lon,
                    distance_m: cand.distance_m,
                    elevation_gain_m: cand.elevation_gain_m,
                    average_grade: cand.avg_grade,
                    max_grade: 0,
                    category: cand.elevation_gain_m > 600 ? 'HC' : cand.elevation_gain_m > 300 ? '1' : '2',
                    polyline: cand.polyline,
                    is_official: false, // Pending
                    tags: { status: 'pending_review', source: 'auto_detect', source_activity: activityId },
                    pulsar_category: 'PENDING'
                })
                .select()
                .single();
            if (newSeg) createdSegments.push(newSeg.id);
        }
    }

    return NextResponse.json({ success: true, created: createdSegments.length, ids: createdSegments });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}