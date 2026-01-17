//fichier : app\api\admin\create-segment\route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

// Helper (copie-le ici aussi ou importe-le)
const getPolylineBounds = (polyline: number[][]) => {
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    polyline.forEach(([lat, lon]) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
    });
    return { minLat, maxLat, minLon, maxLon };
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const ADMIN_ID = "1"; 

  if (!session || String((session.user as any).id) !== ADMIN_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, polyline, start_lat, start_lon, end_lat, end_lon, distance_m, elevation_gain_m, average_grade, category, tags } = body;

    // 1. Insertion Segment
    const { data: newSeg, error: insertError } = await (supabaseAdmin.from('segments') as any)
        .insert({
            name, polyline, start_lat, start_lon, end_lat, end_lon,
            distance_m, elevation_gain_m, average_grade,
            category, is_official: true, tags, pulsar_category: 'OFFICIAL'
        })
        .select()
        .single();

    if (insertError) throw insertError;
    const segment = newSeg as any;

    // 2. 🔥 FILTRAGE PAR BOUNDING BOX 🔥
    const segBounds = getPolylineBounds(polyline);
    const MARGIN = 0.02; // ~2km de marge

    const { data: geoActivities } = await supabaseAdmin
        .from('activities')
        .select('id')
        .lte('min_lat', segBounds.maxLat + MARGIN)
        .gte('max_lat', segBounds.minLat - MARGIN)
        .lte('min_lon', segBounds.maxLon + MARGIN)
        .gte('max_lon', segBounds.minLon - MARGIN)
        .limit(50000);

    const queue = (geoActivities || []).map((a: any) => a.id);
    console.log(`🌍 [CREATOR] Activités dans la zone : ${queue.length}`);

    if (queue.length > 0) {
        await (supabaseAdmin.from('admin_jobs') as any).insert({
            type: 'global_sync', 
            status: 'pending',
            total: queue.length,
            progress: 0,
            payload: { 
                segmentId: segment.id,
                segmentName: `Import Manuel : ${segment.name}`,
                queue: queue 
            },
            created_at: new Date().toISOString()
        });
    }

    return NextResponse.json({ success: true, segmentId: segment.id, activitiesCount: queue.length });

  } catch (err: any) {
    console.error("❌ [CREATOR ERROR]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}