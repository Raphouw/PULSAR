import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabaseAdminClient.js";
import { redirect } from "next/navigation";
import ProfileClient from './profileClient';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    redirect('/auth/signin');
  }

  // On récupère tout, y compris les nouvelles colonnes FC
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !user) {
    return <div>Erreur chargement profil</div>;
  }

  const isStravaConnected = !!user.strava_id && user.strava_id !== 0;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
       <h1 style={{ 
          marginBottom: '2rem', 
          fontSize: '2.5rem', 
          background: 'linear-gradient(90deg, #F1F1F1 0%, #A0A0A0 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 800
        }}>
        Mon Profil
      </h1>
      
      <ProfileClient user={user} isStravaConnected={isStravaConnected} />
    </div>
  );
}