// Fichier : app/api/events/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabaseAdminClient';
import { revalidatePath } from 'next/cache';

// Ceci est la route POST pour la CREATION.
export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const isAdmin = userId === '1' || userId === '2';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Accès refusé. Autorisation ADMIN requise.' }, { status: 403 });
    }
    
    // 2. RÉCUPÉRATION DES DONNÉES
    const body = await req.json();
    const { eventData, winner_name_m, winner_time_m, winner_name_f, winner_time_f } = body; 

    if (!eventData) {
        return NextResponse.json({ error: 'Données manquantes.' }, { status: 400 });
    }

    // 3. INSERTION DE L'ÉVÉNEMENT PRINCIPAL (Table 'events')
    const eventInsertData = {
        name: eventData.name,
        description: eventData.description,
        date_start: eventData.date_start,
        date_end: eventData.date_end || null,
        start_time: eventData.start_time, 
        end_time: eventData.end_time,
        location: eventData.location,
        country: eventData.country,
        registration_url: eventData.registration_url,
        website_url: eventData.website_url,
        image_url: eventData.image_url || null, 
        jersey_url: eventData.jersey_url,
        rating_global: eventData.rating_global,
        rating_quality_price: eventData.rating_quality_price,
        series_id: eventData.series_id || null,
        
        coordinates: (eventData.start_lat && eventData.start_lon) 
            ? { lat: eventData.start_lat, lon: eventData.start_lon } 
            : null,
            
        // NOUVEAUX CHAMPS DE RÉSULTATS
        winner_name_m: eventData.winner_name_m || null,
        winner_time_m: eventData.winner_time_m || null,
        winner_name_f: eventData.winner_name_f || null,
        winner_time_f: eventData.winner_time_f || null,
    };

    // ⚡ FIX: Cast du builder en any pour l'insert
    const { data: eventDataResult, error: eventError } = await (supabaseAdmin.from('events') as any)
        .insert(eventInsertData)
        .select()
        .single();

    if (eventError) throw new Error(`Erreur Event: ${eventError.message}`);

    // ⚡ FIX: Cast du résultat en any
    const event = eventDataResult as any;
    const eventId = event.id;

    // 4. INSERTION DES PARCOURS (event_routes)
    if (eventData.routes && eventData.routes.length > 0) {
        const routesToInsert = eventData.routes.map((r: any) => ({
            event_id: eventId,
            name: r.name,
            type: r.type,
            distance_km: r.distance_km,
            elevation_gain_m: r.elevation_gain_m,
            price_eur: r.price_eur,
            participants_limit: r.participants_limit,
            aid_stations_count: r.aid_stations_count,
            start_time: r.start_time ? r.start_time : null,
            gpx_url: r.gpx_url, 
            polyline: r.polyline 
        }));

        // ⚡ FIX: Cast du builder en any pour l'insert routes
        const { error: routesError } = await (supabaseAdmin.from('event_routes') as any)
            .insert(routesToInsert);

        if (routesError) throw new Error(`Erreur Routes: ${routesError.message}`);
    }

    // 5. INSERTION DE L'HISTORIQUE (event_history)
    if (eventData.history && eventData.history.length > 0) {
        const historyToInsert = eventData.history.map((h: any) => ({
            event_id: eventId,
            year: h.year,
            participants_count: h.participants_count,
            winner_name: h.winner_name,
            winner_time: h.winner_time ? h.winner_time : null,
            weather_condition: h.weather_condition
        }));

        // ⚡ FIX: Cast du builder en any pour l'insert history
        const { error: historyError } = await (supabaseAdmin.from('event_history') as any)
            .insert(historyToInsert);

        if (historyError) throw new Error(`Erreur History: ${historyError.message}`);
    }
    
    // 6. REVALIDATION
    revalidatePath('/events');  
    revalidatePath(`/events/${eventId}`);
    
    return NextResponse.json({ success: true, eventId }, { status: 201 }); 

  } catch (error: any) {
    console.error('Erreur Création Event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}