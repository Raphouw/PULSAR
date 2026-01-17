// fichier : app/api/admin/detect-climbs/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { detectClimbsInStream, generateAutoName } from "@/lib/climbDetection";
import { getDistanceFromLatLonInMeters } from "../../../../lib/mapUtils"; 

const isNear = (lat1: number, lon1: number, lat2: number, lon2: number, threshold = 150) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return false;
    return getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) < threshold;
};

export async function POST(req: Request) {
  let activityId: number | null = null;

  try {
    const bodyText = await req.text();
    if (!bodyText) return NextResponse.json({ error: "Empty body" }, { status: 400 });
    const body = JSON.parse(bodyText);
    activityId = body.activityId;
    if (!activityId) return NextResponse.json({ error: "Missing activityId" }, { status: 400 });

    // 1. Récupération
    const { data: actData, error: actError } = await (supabaseAdmin.from('activities') as any)
      .select('id, name, user_id, streams_data, type')
      .eq('id', activityId).single();

    if (actError || !actData) {
        console.log(`❌ [API] Act #${activityId} introuvable en base.`);
        return NextResponse.json({ success: false, error: "Activity not found" });
    }

    // 2. Parsing JSON streams
    let streams = actData.streams_data;
    if (typeof streams === 'string') {
        try { streams = JSON.parse(streams); } 
        catch (e) { 
            console.error(`❌ [API] Erreur parsing JSON #${activityId}`);
            return NextResponse.json({ success: false, error: "Invalid streams JSON" });
        }
    }

    // 3. LOGS EXPLICITES SI SAUTÉ
    if (!streams || !streams.latlng || streams.latlng.length === 0) {
        console.log(`⏩ [API] Act #${activityId} ignorée : Pas de données GPS.`);
        return NextResponse.json({ success: true, message: "No GPS streams", created: 0 });
    }

    // 4. Réparation Distance
    if (!streams.distance || streams.distance.length < streams.latlng.length) {
        // console.log(`🛠️ [API] Réparation distance #${activityId}`);
        const newDist = [0];
        let totalDist = 0;
        for (let i = 1; i < streams.latlng.length; i++) {
            const p1 = streams.latlng[i-1];
            const p2 = streams.latlng[i];
            totalDist += getDistanceFromLatLonInMeters(p1[0], p1[1], p2[0], p2[1]);
            newDist.push(parseFloat(totalDist.toFixed(1)));
        }
        streams.distance = newDist;
    }

    // 5. Détection Algorithmique (CPU Bound)
    const candidates = detectClimbsInStream(streams);
    
    // Si aucun candidat, on logue pour comprendre pourquoi le "0 candidats"
    if (candidates.length === 0) {
        console.log(`🔍 [API] Act #${activityId} analysée : 0 candidat.`);
        return NextResponse.json({ success: true, created: 0 });
    }

    console.log(`📊 [API] Act #${activityId} : ${candidates.length} candidats potentiels.`);
    const createdSegments: number[] = [];

    // 6. TRAITEMENT PARALLÈLE (Optimisation Vitesse)
    // On lance toutes les vérifs et insertions en même temps
    await Promise.all(candidates.map(async (cand) => {
        // Validation basique
        if (isNaN(cand.dist_m) || isNaN(cand.avg_grade) || cand.polyline.length < 2) return;

        const startPt = cand.polyline[0];
        const endPt = cand.polyline[cand.polyline.length - 1];

        // Anti-Doublon Géographique (Recherche rapide)
        const { data: nearby } = await (supabaseAdmin.from('segments') as any)
            .select('id, start_lat, start_lon, end_lat, end_lon')
            .gte('start_lat', startPt[0] - 0.01).lte('start_lat', startPt[0] + 0.01) // Réduit la zone de recherche
            .gte('start_lon', startPt[1] - 0.01).lte('start_lon', startPt[1] + 0.01);

        const isDuplicate = nearby?.some((seg: any) => 
            isNear(startPt[0], startPt[1], seg.start_lat, seg.start_lon) &&
            isNear(endPt[0], endPt[1], seg.end_lat, seg.end_lon)
        );

        if (isDuplicate) return;

        const autoName = generateAutoName(cand.dist_m, cand.avg_grade);

        // Insertion
        const { data: newSeg, error: insertError } = await (supabaseAdmin.from('segments') as any)
            .insert({
                name: autoName,
                user_id: actData.user_id,
                start_lat: startPt[0], start_lon: startPt[1],
                end_lat: endPt[0], end_lon: endPt[1],
                distance_m: cand.dist_m,
                elevation_gain_m: cand.elev_m,
                average_grade: cand.avg_grade,
                max_grade: cand.max_grade, 
                polyline: cand.polyline, 
                pulsar_index: cand.pulsar_index,
                pulsar_density: cand.pulsar_density,
                pulsar_category: cand.pulsar_category,
                category: cand.pulsar_category,
                is_official: false,
                city: null, 
                tags: { 
                    status: 'pending_review', 
                    source: 'auto_detect', 
                    source_activity: activityId,
                    detected_at: new Date().toISOString(),
                    sigma: cand.pulsar_sigma
                }
            }).select('id').single();

        if (newSeg) {
            console.log(`✨ Créé : ${autoName} [${cand.pulsar_category}]`);
            createdSegments.push(newSeg.id);
        }
    }));

    return NextResponse.json({ success: true, created: createdSegments.length, ids: createdSegments });
  } catch (err: any) {
    console.error(`💥 Erreur Critique Act #${activityId}:`, err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}