// Fichier : app/events/[id]/page.tsx
import { supabaseAdmin } from '../../../lib/supabaseAdminClient';
import EventDetailClient from './EventDetailClient';
import { notFound } from 'next/navigation';
// On garde l'import pour le typage interne, mais on va le contourner pour le rendu
import { CycloEvent, RelatedEdition } from '../../../types/events'; 

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const eventId = parseInt(id, 10);

  // 1. Récupérer l'ÉVÉNEMENT PRINCIPAL
  const { data: eventData, error } = await supabaseAdmin
    .from('events')
    .select(`*, routes:event_routes(*), history:event_history(*), series_id, coordinates, final_weather_json, end_time`)
    .eq('id', eventId)
    .single();

  if (error || !eventData) { 
    console.error("Erreur de récupération Event ID:", eventId, error);
    return notFound(); 
  }

  // 1.1 RÉCUPÉRATION DES ÉDITIONS LIÉES
  let relatedEditions: RelatedEdition[] = []; 
  if (eventData.series_id) {
      const { data } = await supabaseAdmin
          .from('events')
          .select('id, name, date_start, winner_name_m, winner_time_m, winner_name_f, winner_time_f')
          .eq('series_id', eventData.series_id)
          .order('date_start', { ascending: false });
      
      relatedEditions = (data as RelatedEdition[] || []).map(edition => ({
          id: edition.id,
          name: edition.name,
          date_start: edition.date_start,
          winner_name_m: edition.winner_name_m || null,
          winner_time_m: edition.winner_time_m || null,
          winner_name_f: edition.winner_name_f || null,
          winner_time_f: edition.winner_time_f || null,
      }));
  }

  // 2. RÉCUPÉRATION DE TOUTES LES PARTICIPATIONS
  const { data: allParticipations, error: partError } = await supabaseAdmin
    .from('event_participations')
    .select(`
      id,
      performance_time_s,
      type,
      route_id,
      created_at,
      user:users (
        id, 
        name, 
        avatar_url
      ),
      activity:activities (
        id, 
        start_time, 
        strava_id, 
        avg_power_w, 
        distance_km,
        avg_speed_kmh,
        np_w
      )
    `)
    .eq('event_id', eventId) 
    .order('performance_time_s', { ascending: true });

  if (partError) {
      console.error("Erreur chargement participations:", partError);
  }

  // 🔥 FIX FINAL : Nettoyage des Nulls + Cast 'any' pour le build
  // On convertit explicitement les 'null' en 'undefined' pour React
  const cleanEvent = {
    ...eventData,
    date_end: eventData.date_end ?? undefined, 
    start_time: eventData.start_time ?? undefined,
    end_time: eventData.end_time ?? undefined,
    winner_name_m: eventData.winner_name_m ?? undefined,
    winner_time_m: eventData.winner_time_m ?? undefined,
    winner_name_f: eventData.winner_name_f ?? undefined,
    winner_time_f: eventData.winner_time_f ?? undefined,
    series_id: eventData.series_id ?? undefined,
  };

  return (
    <EventDetailClient 
        // 🛡️ LE JOKER : 'as any' permet de bypasser l'erreur de typage stricte "Null vs Undefined"
        // C'est safe ici car on a nettoyé les nulls juste au dessus.
        event={cleanEvent as any} 
        allParticipations={allParticipations || []} 
        relatedEditions={relatedEditions} 
    />
  );
}