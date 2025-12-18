import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient";
import { notFound } from "next/navigation";
import ProfileClient from './profileClient';

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  // ⚡ FIX: On s'assure que viewerId est soit un nombre (si possible), soit null
  const viewerId = session?.user?.id ? session.user.id : null;

  // 1. Récupérer le PROFIL CIBLÉ
  const { data: profileRaw, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, name, email, avatar_url, created_at, ftp, weight')
    .eq('id', id)
    .single();

  // ⚡ FIX: Cast en any pour lire les propriétés sans blocage TS
  const profile = profileRaw as any;

  if (profileError || !profile) {
    console.error("Profil non trouvé:", id);
    return notFound();
  }

  // 2. Vérifier la relation (Est-ce que je le suis ?)
  let isFollowing = false;
  if (viewerId && String(viewerId) !== String(id)) {
      const { data: relation } = await supabaseAdmin
        .from('friends')
        .select('id')
        .eq('user_id', viewerId)
        .eq('friend_id', id)
        .eq('status', 'following')
        .maybeSingle(); // maybeSingle est plus sûr ici que single()
      
      if (relation) isFollowing = true;
  }

  // 3. Récupérer les ACTIVITÉS RÉCENTES
  const { data: activitiesData } = await supabaseAdmin
    .from('activities')
    .select('*')
    .eq('user_id', id)
    .order('start_time', { ascending: false })
    .limit(10);

  const activities = (activitiesData || []) as any[];

  // 4. Calculer les STATS GLOBALES (Agrégation côté serveur)
  const { data: allStatsData } = await supabaseAdmin
    .from('activities')
    .select('distance_km, elevation_gain_m, duration_s')
    .eq('user_id', id);
    
  const allStats = (allStatsData || []) as any[];
    
  const stats = {
      totalDist: allStats.reduce((acc, curr) => acc + (curr.distance_km || 0), 0) || 0,
      totalElev: allStats.reduce((acc, curr) => acc + (curr.elevation_gain_m || 0), 0) || 0,
      totalTime: allStats.reduce((acc, curr) => acc + (curr.duration_s || 0), 0) || 0,
      count: allStats.length || 0
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505' }}>
        <ProfileClient 
            profile={profile} 
            activities={activities} 
            stats={stats}
            isViewer={String(viewerId) === String(id)}
            initialIsFollowing={isFollowing}
            viewerId={viewerId}
        />
    </div>
  );
}