import { supabaseAdmin } from '../../../../lib/supabaseAdminClient';
import EventRouteAnalysis from './EventRouteAnalysis';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RouteAnalysisPage({ params }: Props) {
  // 1. On attend la résolution des paramètres d'URL
  const { id } = await params;
  const routeId = parseInt(id, 10);

  // 2. Récupération de la route d'événement avec jointure sur l'event
  // ⚡ FIX: On cast le builder en 'any' pour éviter que TS ne bloque sur la relation 'event'
  const { data: routeRaw, error } = await (supabaseAdmin
    .from('event_routes')
    .select(`
        *,
        event:events(id, name, date_start) 
    `) as any)
    .eq('id', routeId)
    .single();

  // ⚡ FIX: Cast de la donnée brute en 'any'
  const route = routeRaw as any;

  if (error || !route) {
    console.error("Erreur de récupération Route ID:", routeId, error);
    return notFound();
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff' }}>
        {/* Header de navigation tactique */}
        <div style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link 
              href={`/events/${route.event_id || route.event?.id}`} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#aaa', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}
            >
                <ArrowLeft size={16} /> Retour à l'événement
            </Link>
            <span style={{ color: '#444' }}>|</span>
            <span style={{ color: '#d04fd7', fontWeight: 700 }}>
              ANALYSE POUSSÉE : {route.name}
            </span>
        </div>

        {/*  */}

        {/* Le moteur d'analyse Client (Visualisations 3D, Profil de pente, etc.) */}
        <EventRouteAnalysis route={route} />
    </div>
  );
}