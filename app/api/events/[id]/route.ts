// Fichier : app/api/events/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import type { CycloEvent } from "../../../../types/events";

// Le EventCreatorForm.tsx appelle cette route en PUT pour l'édition

export async function OPTIONS() {
    return NextResponse.json({}, { 
        status: 200, 
        headers: {
            'Allow': 'GET, POST, PUT, DELETE, OPTIONS'
        } 
    });
}

// -------------------------------------------------------------------
// 🔥 MISE À JOUR (PUT) : Édition d'un événement existant et de ses routes
// -------------------------------------------------------------------
export async function PUT(
    req: Request, 
    { params }: { params: Promise<{ id: string }> } 
) {
    try {
        const { id } = await params;
        const eventId = parseInt(id, 10);
        
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { eventData } = body;

        if (!eventData) {
            return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
        }
        
        console.log(`\n🔄 --- DÉBUT MISE À JOUR ÉVÉNEMENT #${eventId} ---`);

        // 1. Prépare les données de l'événement principal
        const eventUpdateData: Partial<CycloEvent> & { 
            coordinates?: { lat: number; lon: number } | null,
            start_time?: string | null;
            updated_at?: string;
            end_time?: string | null;
        } = {
            name: eventData.name,
            description: eventData.description,
            date_start: eventData.date_start,
            date_end: eventData.date_end || null,
            location: eventData.location,
            country: eventData.country,
            start_time: eventData.start_time, 
            end_time: eventData.end_time || null,
            registration_url: eventData.registration_url,
            website_url: eventData.website_url,
            image_url: eventData.image_url || null,
            jersey_url: eventData.jersey_url,
            rating_global: eventData.rating_global,
            rating_quality_price: eventData.rating_quality_price,
            series_id: eventData.series_id || null,
            
            winner_name_m: eventData.winner_name_m || null,
            winner_time_m: eventData.winner_time_m || null,
            winner_name_f: eventData.winner_name_f || null,
            winner_time_f: eventData.winner_time_f || null,

            coordinates: (eventData.start_lat && eventData.start_lon) 
                ? { lat: eventData.start_lat, lon: eventData.start_lon } 
                : null,
            updated_at: new Date().toISOString(),
        };

        // 2. Mise à jour dans la BDD
        // ⚡ FIX: Cast en any pour l'update
        const { error: updateError } = await (supabaseAdmin.from('events') as any)
            .update(eventUpdateData)
            .eq('id', eventId);

        if (updateError) {
            console.error("Erreur UPDATE Event:", updateError);
            return NextResponse.json({ error: `Erreur BDD lors de la mise à jour: ${updateError.message}` }, { status: 500 });
        }
        
        // --- LOGIQUE DE MISE À JOUR DES ROUTES ---
        
        for (const route of eventData.routes) {
            const routeData = {
                event_id: eventId,
                name: route.name,
                type: route.type,
                distance_km: route.distance_km,
                elevation_gain_m: route.elevation_gain_m,
                price_eur: route.price_eur,
                aid_stations_count: route.aid_stations_count,
                start_time: route.start_time,
                participants_limit: route.participants_limit || null,
                gpx_url: route.gpx_url,
                polyline: route.polyline,
            };
            
            if (route.id) {
                // ⚡ FIX: Cast en any pour l'update route
                await (supabaseAdmin.from('event_routes') as any)
                    .update(routeData)
                    .eq('id', route.id);
            } else {
                // ⚡ FIX: Cast en any pour l'insert route
                await (supabaseAdmin.from('event_routes') as any)
                    .insert(routeData);
            }
        }
        
        return NextResponse.json({ success: true, eventId }, { status: 200 });

    } catch (err: any) {
        console.error("🔥 CRASH PUT:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// -------------------------------------------------------------------
// 🔥 RÉCUPÉRATION (GET)
// -------------------------------------------------------------------

export async function GET(
    req: Request, 
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const eventId = parseInt(id, 10);
        
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: eventData, error } = await supabaseAdmin
            .from('events')
            .select(`
                *,
                routes:event_routes(*),
                history:event_history(*)
            `)
            .eq('id', eventId)
            .single();

        // ⚡ FIX: Cast en any pour lire les propriétés jointes
        const event = eventData as any;

        if (error || !event) {
            return NextResponse.json({ error: "Event introuvable" }, { status: 404 });
        }
        
        const mappedEvent = {
            ...event,
            results: {
                winner_name_m: event.winner_name_m,
                winner_time_m: event.winner_time_m,
                winner_name_f: event.winner_name_f,
                winner_time_f: event.winner_time_f,
            },
            routes: event.routes.map((r: any) => ({ ...r, tempId: r.id })),
            history: event.history.map((h: any) => ({ ...h, tempId: h.id })),
        };

        return NextResponse.json({ success: true, event: mappedEvent }, { status: 200 });

    } catch (err: any) {
        console.error("🔥 CRASH GET:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}