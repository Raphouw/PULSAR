// Fichier : app/events/page.tsx
import { supabaseAdmin } from '../../lib/supabaseAdminClient';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import EventsGridClient from './EventGridClient'; // Attention au 's' (EventsGridClient)

export default async function EventsPage() {
    
    // 1. AUTHENTIFICATION
    const session = await getServerSession(authOptions);
    const userId = session?.user.id; 
    
    const isAdmin = userId === '1' || userId === '2'; 

    // 2. RÉCUPÉRATION DES DONNÉES
    const { data: events, error } = await supabaseAdmin
        .from('events')
        .select(`
            *,
            routes:event_routes(*),
            history:event_history(*) 
        `)
        .order('date_start', { ascending: true })
        .order('id', { foreignTable: 'routes', ascending: true });

    if (error) {
        console.error("Erreur de récupération des événements:", error);
        return <div style={{ color: '#ef4444', padding: '4rem', textAlign: 'center' }}>Erreur chargement données.</div>;
    }

    // 3. RENDER
    return (
        <div style={{ minHeight: '100vh', background: '#050505', padding: '2rem 0 4rem 0' }}>
             {/* On ne passe QUE les events et le statut admin ici */}
             <EventsGridClient events={events || []} isAdmin={isAdmin} />
        </div>
    );
}