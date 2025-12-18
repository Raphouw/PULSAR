import { supabaseAdmin } from '../../../lib/supabaseAdminClient';
import EventDetailClient from './EventDetailClient';
import { notFound } from 'next/navigation';
import { RelatedEdition } from '../../../types/events'; 

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const eventId = parseInt(id, 10);

  // 1. RÉCUPÉRATION DE L'ÉVÉNEMENT
  // On cast en 'any' pour éviter que TS ne bloque sur les relations routes/history
  const { data: eventRaw, error } = await supabaseAdmin
    .from('events')
    .select(`*, routes:event_routes(*), history:event_history(*), series_id, coordinates, final_weather_json, end_time`)
    .eq('id', eventId)
    .single();

  if (error || !eventRaw) { 
    console.error("Erreur de récupération Event ID:", eventId, error);
    return notFound(); 
  }

  const eventData = eventRaw as any;

  // 1.1 RÉCUPÉRATION DES ÉDITIONS LIÉES (Séries)
  let relatedEditions: RelatedEdition[] = []; 
  if (eventData.series_id) {
      const { data: editionsData } = await supabaseAdmin
          .from('events')
          .select('id, name, date_start, winner_name_m, winner_time_m, winner_name_f, winner_time_f')
          .eq('series_id', eventData.series_id)
          .order('date_start', { ascending: false });
      
      relatedEditions = (editionsData as any[] || []).map(edition => ({
          id: edition.id,
          name: edition.name,
          date_start: edition.date_start,
          winner_name_m: edition.winner_name_m || null,
          winner_time_m: edition.winner_time_m || null,
          winner_name_f: edition.winner_name_f || null,
          winner_time_f: edition.winner_time_f || null,
      }));
  }

  // 2. RÉCUPÉRATION DES PARTICIPATIONS (Classement)
  const { data: participationsData, error: partError } = await supabaseAdmin
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

  const allParticipations = (participationsData || []) as any[];

  // 3. NETTOYAGE FINAL DES DONNÉES
  // On transforme les nulls en undefined pour le composant Client
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
        event={cleanEvent as any} 
        allParticipations={allParticipations} 
        relatedEditions={relatedEditions} 
    />
  );
}