// Fichier : app/events/[id]/page.tsx
import { supabaseAdmin } from '../../../lib/supabaseAdminClient';
import EventDetailClient from './EventDetailClient';
import { notFound } from 'next/navigation';
import { CycloEvent, RelatedEdition } from '../../../types/events'; // Import de RelatedEdition

// Type helper pour la page
type Props = {
  params: Promise<{ id: string }>;
};

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const eventId = parseInt(id, 10);

  // 1. Récupérer l'ÉVÉNEMENT PRINCIPAL
  const { data: eventData, error } = await supabaseAdmin
    .from('events')
    // 🔥 CORRECTION: Utiliser une chaîne de sélection simple et plate
    .select(`*, routes:event_routes(*), history:event_history(*), series_id, coordinates, final_weather_json, end_time`)
    .eq('id', eventId)
    .single();

  if (error || !eventData) { 
        console.error("Erreur de récupération Event ID:", eventId, error);
        return notFound(); 
    }

  // 1.1 RÉCUPÉRATION DES ÉDITIONS LIÉES (CHRONOLOGIE DES VAINQUEURS)
  let relatedEditions: RelatedEdition[] = []; 
  if (eventData.series_id) {
      const { data } = await supabaseAdmin
          .from('events')
          // 🔥 CORRECTION: Sélectionner tous les champs de vainqueurs
          .select('id, name, date_start, winner_name_m, winner_time_m, winner_name_f, winner_time_f')
          .eq('series_id', eventData.series_id)
          .order('date_start', { ascending: false });
      
      // 🔥 MAPPING POUR GARANTIR L'EXISTENCE DES CHAMPS (solution aux problèmes de type/affichage vide)
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

  // 2. RÉCUPÉRATION DE TOUTES LES PARTICIPATIONS (Course + Recos)
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
        avg_heartrate, 
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

  // 3. On passe tout au client
  return (
    <EventDetailClient 
        event={eventData as CycloEvent} 
        allParticipations={allParticipations || []} 
        relatedEditions={relatedEditions} // Passons les données mappées
    />
  );
}