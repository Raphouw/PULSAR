// Fichier : app/api/routes/match-segments/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { matchSegmentGeometry, SegmentIdentity } from "../../../../lib/segmentMatcher";
import polyline from '@mapbox/polyline';

export async function POST(req: Request) {
  try {
    const { routeId } = await req.json();

    if (!routeId) return NextResponse.json({ error: "Route ID manquant" }, { status: 400 });

    // 1. Récupérer la Route et son GPX/Polyline
    const { data: routeData, error: routeError } = await supabaseAdmin
      .from('routes')
      .select('id, gpx_data') 
      .eq('id', routeId)
      .single();

    if (routeError || !routeData) return NextResponse.json({ error: "Route introuvable" }, { status: 404 });

    // 2. Extraire les coordonnées [lat, lon][]
    let coordinates: [number, number][] = [];
    
    const gpx = routeData.gpx_data;
    if (typeof gpx === 'string' && gpx.startsWith('{')) {
        const parsed = JSON.parse(gpx);
        if (parsed.map_polyline) {
            coordinates = polyline.decode(parsed.map_polyline);
        }
    } else if (typeof gpx === 'object' && gpx?.map_polyline) {
        coordinates = polyline.decode(gpx.map_polyline);
    } 

    if (coordinates.length === 0) {
        return NextResponse.json({ success: false, msg: "Pas de tracé exploitable" });
    }

    // 3. Récupérer TOUS les segments
    const { data: segments } = await supabaseAdmin
      .from('segments')
      .select('id, name, distance_m, average_grade, category, start_lat, start_lon, end_lat, end_lon');

    if (!segments) return NextResponse.json({ matches: [] });

    // 4. Scanner
    // 🔥 CORRECTION TYPAGE : On déclare explicitement un tableau d'objets quelconques
    const matchedSegments: any[] = [];

    for (const seg of segments) {
        // Cast rapide pour le matcher
        const segIdentity: SegmentIdentity = {
            id: seg.id,
            start_lat: seg.start_lat,
            start_lon: seg.start_lon,
            end_lat: seg.end_lat ?? 0,
            end_lon: seg.end_lon ?? 0,
            distance_m: seg.distance_m
        };

        const isMatch = matchSegmentGeometry(segIdentity, coordinates);
        
        if (isMatch) {
            matchedSegments.push(seg);
        }
    }

    return NextResponse.json({ success: true, segments: matchedSegments });

  } catch (e: any) {
    console.error("Erreur Route Matching:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}