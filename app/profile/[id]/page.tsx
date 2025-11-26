// Fichier : app/profile/[id]/page.tsx
import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient";
import { redirect } from "next/navigation";
import ProfileClient from './profileClient';

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Next.js 15 await params
  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id;

  // 1. Récupérer le PROFIL CIBLÉ
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, name, email, avatar_url, created_at, ftp, weight')
    .eq('id', id)
    .single();

  if (profileError || !profile) {
    return <div style={{padding:'4rem', textAlign:'center', color:'#ef4444'}}>Profil introuvable.</div>;
  }

  // 2. Vérifier la relation (Est-ce que je le suis ?)
  let isFollowing = false;
  if (viewerId && viewerId !== id) {
      const { data: relation } = await supabaseAdmin
        .from('friends')
        .select('id')
        .eq('user_id', viewerId)
        .eq('friend_id', id)
        .eq('status', 'following')
        .single();
      if (relation) isFollowing = true;
  }

  // 3. Récupérer ses ACTIVITÉS RÉCENTES (Public)
  // On limite à 5 pour la rapidité, le reste sera chargé si besoin
  const { data: activities } = await supabaseAdmin
    .from('activities')
    .select('*')
    .eq('user_id', id)
    .order('start_time', { ascending: false })
    .limit(10);

  // 4. Calculer des STATS GLOBALES (Vite fait bien fait)
  // On utilise une requête RPC ou un calcul simple ici
  // Pour l'exemple, on fait une somme simple sur les activités récupérées (à améliorer avec une table de stats)
  // Idéalement, tu as une table 'user_stats', sinon on fait une query d'aggrégation.
  const { data: allStats } = await supabaseAdmin
    .from('activities')
    .select('distance_km, elevation_gain_m, duration_s')
    .eq('user_id', id);
    
  const stats = {
      totalDist: allStats?.reduce((acc, curr) => acc + (curr.distance_km || 0), 0) || 0,
      totalElev: allStats?.reduce((acc, curr) => acc + (curr.elevation_gain_m || 0), 0) || 0,
      totalTime: allStats?.reduce((acc, curr) => acc + (curr.duration_s || 0), 0) || 0,
      count: allStats?.length || 0
  };

  // 5. Récupérer les RECORDS (Power Curve - Optionnel)
  // Si tu as une table records, fetch-la ici.

  return (
    <div style={{ minHeight: '100vh', background: '#050505' }}>
        <ProfileClient 
            profile={profile} 
            activities={activities || []} 
            stats={stats}
            isViewer={viewerId === id}
            initialIsFollowing={isFollowing}
            viewerId={viewerId}
        />
    </div>
  );
}