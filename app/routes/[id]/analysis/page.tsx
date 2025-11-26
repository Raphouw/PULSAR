// Fichier : app/routes/[id]/analysis/page.tsx
import { supabaseAdmin } from '../../../../lib/supabaseAdminClient';
import EventRouteAnalysis from './EventRouteAnalysis';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// 🔥 CORRECTION TYPE : params est une Promise<{ id: string }>
type Props = {
  params: Promise<{ id: string }>;
};

export default async function RouteAnalysisPage({ params }: Props) {
  // 🔥 CORRECTION LOGIQUE : On await les params avant de lire l'ID
  const { id } = await params;
  const routeId = parseInt(id, 10);

  // Récupération de la route d'événement
  const { data: route, error } = await supabaseAdmin
    .from('event_routes')
    .select(`
        *,
        event:events(name, date_start) 
    `)
    .eq('id', routeId)
    .single();

  if (error || !route) {
    return <div style={{ color: '#ef4444', padding: '4rem', textAlign: 'center' }}>Parcours introuvable ou erreur serveur.</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff' }}>
        {/* Header de navigation simple */}
        <div style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href={`/events/${route.event_id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#aaa', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
                <ArrowLeft size={16} /> Retour à l'événement
            </Link>
            <span style={{ color: '#444' }}>|</span>
            <span style={{ color: '#d04fd7', fontWeight: 700 }}>ANALYSE POUSSÉE : {route.name}</span>
        </div>

        {/* Le composant Client lourd */}
        <EventRouteAnalysis route={route} />
    </div>
  );
}