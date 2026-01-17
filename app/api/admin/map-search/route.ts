import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

export async function POST(req: Request) {
  try {
    const { minLat, maxLat, minLon, maxLon } = await req.json();

    console.log(`[MAP SEARCH] Zone: [${minLat}, ${minLon}] -> [${maxLat}, ${maxLon}]`);

    // On utilise supabaseAdmin pour contourner la RLS et tout voir
    const { data, error } = await supabaseAdmin
        .from('segments')
        .select('id, name, polyline, is_official, start_lat, start_lon, tags')
        // Filtre géographique sur le point de départ
        .gte('start_lat', minLat)
        .lte('start_lat', maxLat)
        .gte('start_lon', minLon)
        .lte('start_lon', maxLon)
        .limit(100); // On limite pour pas faire exploser la carte

    if (error) {
        console.error("❌ [MAP SEARCH] Erreur DB:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}