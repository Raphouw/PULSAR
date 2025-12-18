import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";
import { redirect } from "next/navigation";
import ProfileClient from './profileClient';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    redirect('/auth/signin');
  }

  // ⚡ FIX: Conversion de l'ID en Number
  const userId = Number(session.user.id);

  // On récupère tout, y compris les nouvelles colonnes FC
  const { data: userData, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  // ⚡ FIX: Cast en any pour accéder aux propriétés sans erreur 'never'
  const user = userData as any;

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white font-mono">
        ERREUR CHARGEMENT PROFIL
      </div>
    );
  }

  const isStravaConnected = !!user.strava_id && user.strava_id !== 0;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
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