// Fichier : app/api/events/[id]/scan/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../lib/supabaseAdminClient";
import polyline from '@mapbox/polyline';

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI/180); 
  const dLon = (lon2 - lon1) * (Math.PI/180); 
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const eventId = parseInt(id, 10);
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // ⚡ FIX: Conversion ID User
    const userId = Number(session.user.id);

    console.log(`\n🚀 --- SCAN CIBLÉ (Event #${eventId}) ---`);

    // 1. Récupérer l'événement et ses routes AVEC la polyline
    const { data: eventData } = await supabaseAdmin
      .from('events')
      .select(`
        id, date_start, 
        routes:event_routes(id, name, distance_km, polyline)
      `)
      .eq('id', eventId)
      .single();

    // ⚡ FIX: Cast Event
    const event = eventData as any;

    if (!event) return NextResponse.json({ error: "Event introuvable" }, { status: 400 });

    // CHECK DES ROUTES
    console.log(`📊 Parcours disponibles :`);
    // ⚡ FIX: Cast Routes pour itération
    const routes = (event.routes || []) as any[];
    
    routes.forEach((r: any) => {
        const hasPoly = r.polyline && r.polyline.length > 650;
        console.log(`   - Route "${r.name}" : ${hasPoly ? "✅ Polyline OK" : "❌ POLYLINE MANQUANTE (NULL)"}`);
    });

    // 2. Récupérer les activités
    const { data: activitiesData } = await supabaseAdmin
      .from('activities')
      .select('*')
      .eq('user_id', userId);

    // ⚡ FIX: Cast Activities
    const activities = (activitiesData || []) as any[];

    const matches: { eventId: number; routeId: number; type: string }[] = [];

    if (activities.length > 0) {
        for (const activity of activities) {
            // A. DÉCODAGE ACTIVITÉ
            let actLat = 0, actLon = 0;
            try {
                const pStr = typeof activity.polyline === 'string' ? activity.polyline : activity.polyline?.polyline;
                if (pStr) {
                    const decoded = polyline.decode(pStr);
                    if (decoded.length > 0) { actLat = decoded[0][0]; actLon = decoded[0][1]; }
                }
            } catch (e) { }

            if (actLat === 0) continue;

            // B. TEST CONTRE LES PARCOURS
            for (const route of routes) {
                let routeLat = 0, routeLon = 0;
                
                // Décodage Route
                if (route.polyline) {
                    try {
                        const decodedR = polyline.decode(route.polyline);
                        if (decodedR.length > 0) { routeLat = decodedR[0][0]; routeLon = decodedR[0][1]; }
                    } catch (e) {}
                }

                if (routeLat === 0) continue; // Pas de tracé de référence

                // Distance Géographique
                const distGeo = getDistanceFromLatLonInKm(actLat, actLon, routeLat, routeLon);
                
                // On loggue si on est proche (< 50km) pour debug
                if (distGeo < 50) {
                    console.log(`🚴 Proche ! Act "${activity.name}" est à ${distGeo.toFixed(1)}km du parcours "${route.name}"`);
                }

                if (distGeo < 20) { // Tolérance 20km
                    const actDist = Number(activity.distance_km);
                    const routeDist = Number(route.distance_km);
                    const ratio = routeDist > 0 ? actDist / routeDist : 0;
                    
                    // Tolérance Distance 15%
                    if (ratio > 0.85 && ratio < 1.15) {
                        console.log(`   🎉 MATCH CONFIRMÉ !`);
                        
                        const actDate = new Date(activity.start_time).toISOString().split('T')[0];
                        const evtDate = new Date(event.date_start).toISOString().split('T')[0];
                        const type = actDate === evtDate ? 'RACE' : 'RECON';

                        // ⚡ FIX: Cast builder Upsert
                        await (supabaseAdmin.from('event_participations') as any).upsert({
                            user_id: userId,
                            event_id: event.id,
                            route_id: route.id,
                            activity_id: activity.id,
                            type: type,
                            performance_time_s: activity.duration_s,
                            created_at: new Date().toISOString()
                        }, { onConflict: 'activity_id, event_id' });

                        matches.push({ eventId: event.id, routeId: route.id, type });
                    }
                }
            }
        }
    }

    console.log(`🏁 Résultat : ${matches.length} matchs.`);
    return NextResponse.json({ success: true, matches, matchFound: matches.length > 0 });

  } catch (err: any) {
    console.error("🔥 CRASH:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}