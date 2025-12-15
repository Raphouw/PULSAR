//fichier: app\api\analysis\match-event\route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import polyline from '@mapbox/polyline';

// Helper Distance (Haversine)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI/180); 
  const dLon = (lon2 - lon1) * (Math.PI/180); 
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const { activityId } = await req.json();


    // 1. Récupérer l'activité cible
    const { data: activity } = await supabaseAdmin
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single();

    if (!activity) return NextResponse.json({ error: "Activité introuvable" }, { status: 404 });

    // --- A. DÉCODAGE POINT DÉPART ACTIVITÉ ---
    let actLat = 0, actLon = 0;
    try {
        const pStr = typeof activity.polyline === 'string' ? activity.polyline : activity.polyline?.polyline;
        if (pStr) {
            const decoded = polyline.decode(pStr);
            if (decoded.length > 0) { actLat = decoded[0][0]; actLon = decoded[0][1]; }
        }
    } catch (e) { console.error("Erreur décodage polyline activité", e); }

    // Si pas de GPS sur l'activité, impossible de matcher
    if (actLat === 0) return NextResponse.json({ error: "Pas de trace GPS exploitable" }, { status: 400 });


    // 2. Récupérer TOUS les événements et leurs parcours
    // 🔥 IMPORTANT : On charge 'polyline' et 'id' pour la comparaison précise
    const { data: events } = await supabaseAdmin
      .from('events')
      .select(`
        id, date_start, 
        routes:event_routes(id, name, distance_km, polyline)
      `);

    // 🔥 CORRECTION TYPE : Tableau typé explicitement
    const matches: { eventId: number; routeId: number; type: string }[] = [];

    if (events) {
        for (const event of events) {
            // On teste chaque parcours de l'événement
            for (const route of event.routes) {
                
                // --- B. DÉCODAGE POINT DÉPART PARCOURS ---
                let routeLat = 0, routeLon = 0;
                try {
                    if (route.polyline) {
                        const decodedR = polyline.decode(route.polyline);
                        if (decodedR.length > 0) { routeLat = decodedR[0][0]; routeLon = decodedR[0][1]; }
                    }
                } catch (e) {}

                // Si le parcours n'a pas de tracé en base, on skip
                if (routeLat === 0) continue;

                // --- C. CALCUL DISTANCE GÉOGRAPHIQUE ---
                const distGeo = getDistanceFromLatLonInKm(actLat, actLon, routeLat, routeLon);
                
                // Tolérance : 20km autour du départ réel du parcours
                if (distGeo < 10) {
                    // --- D. CHECK DISTANCE TOTALE (+/- 15%) ---
                    const ratio = activity.distance_km / route.distance_km;
                    
                    if (ratio > 0.95 && ratio < 1.05) {
                        
                        const actDate = new Date(activity.start_time).toISOString().split('T')[0];
                        const evtDate = new Date(event.date_start).toISOString().split('T')[0];
                        const type = actDate === evtDate ? 'RACE' : 'RECON';

                        // Insertion en BDD
                        const { error } = await supabaseAdmin
                            .from('event_participations')
                            .upsert({
                                user_id: userId,
                                event_id: event.id,
                                route_id: route.id,
                                activity_id: activity.id,
                                type: type,
                                performance_time_s: activity.duration_s,
                                created_at: new Date().toISOString()
                            }, { onConflict: 'activity_id, event_id' });

                        if (!error) {
                            matches.push({ eventId: event.id, routeId: route.id, type });
                        }
                    }
                }
            }
        }
    }

    return NextResponse.json({ success: true, matches });

  } catch (err: any) {
    
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}