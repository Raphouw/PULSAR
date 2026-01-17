//fichier : app\api\admin\segment-decision\route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

// Helper pour calculer la boite du segment
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
    const { id, decision, segmentData } = await req.json();

    if (decision === 'approve') {
        // 1. Update Segment
        const { error: updateError } = await (supabaseAdmin.from('segments') as any).update({
            name: segmentData.name,
            is_official: true, 
            polyline: segmentData.polyline,
            start_lat: segmentData.start_lat, start_lon: segmentData.start_lon,
            end_lat: segmentData.end_lat, end_lon: segmentData.end_lon,
            distance_m: segmentData.distance_m, elevation_gain_m: segmentData.elevation_gain_m,
            average_grade: segmentData.average_grade,
            tags: { ...segmentData.tags, status: 'approved', validator: 'ADMIN', decided_at: new Date().toISOString() },
            pulsar_category: 'OFFICIAL'
        }).eq('id', id);
        
        if (updateError) throw updateError;

        // 2. 🔥 FILTRAGE PAR BOUNDING BOX 🔥
        // On calcule la boite du segment
        const segBounds = getPolylineBounds(segmentData.polyline);
        
        // Marge de sécurité (ex: 0.02 degrés ~= 2km) pour attraper les activités qui frôlent
        const MARGIN = 0.02; 

        console.log(`📦 [DECISION] Recherche intersection Box : Lat[${segBounds.minLat}-${segBounds.maxLat}] Lon[${segBounds.minLon}-${segBounds.maxLon}]`);

        // Logique d'intersection :
        // L'activité doit avoir son MIN inférieur au MAX du segment (et inversement)
        const { data: geoActivities } = await supabaseAdmin
            .from('activities')
            .select('id')
            // Optimisation : On ne prend que celles qui ont une chance de croiser le segment
            .lte('min_lat', segBounds.maxLat + MARGIN)  // L'activité ne doit pas commencer trop au Nord
            .gte('max_lat', segBounds.minLat - MARGIN)  // L'activité ne doit pas finir trop au Sud
            .lte('min_lon', segBounds.maxLon + MARGIN)  // L'activité ne doit pas commencer trop à l'Est
            .gte('max_lon', segBounds.minLon - MARGIN)  // L'activité ne doit pas finir trop à l'Ouest
            .limit(50000); // Sécurité

        const queue = (geoActivities || []).map((a: any) => a.id);
        console.log(`🔍 [DECISION] Activités pertinentes (Box Match) : ${queue.length}`);

        if (queue.length > 0) {
            await (supabaseAdmin.from('admin_jobs') as any).insert({
                type: 'global_sync', 
                status: 'pending',
                total: queue.length,
                progress: 0,
                payload: { 
                    segmentId: id, 
                    segmentName: `Calcul Rétroactif : ${segmentData.name}`, 
                    queue: queue 
                },
                created_at: new Date().toISOString()
            });
        }
    } 
    else if (decision === 'reject') {
        await (supabaseAdmin.from('segments') as any).update({
            is_official: false,
            tags: { ...segmentData.tags, status: 'rejected', reason: 'Admin rejection' }
        }).eq('id', id);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("❌ [DECISION ERROR]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}