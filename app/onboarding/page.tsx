// Fichier : app/onboarding/page.tsx
import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";
import { redirect } from "next/navigation";
import OnboardingClient from './OnboardingClient'; // On crée ce fichier juste après

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    redirect('/auth/signin');
  }

  // On récupère l'user pour pré-remplir (ex: poids venant de Strava)
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!user) return <div>Erreur chargement utilisateur</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
       <h1 style={{ 
          marginBottom: '1rem', 
          fontSize: '2.5rem', 
          background: 'linear-gradient(90deg, #F1F1F1 0%, #A0A0A0 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 800,
          textAlign: 'center'
        }}>
        Bienvenue, {user.name?.split(' ')[0]} !
      </h1>
      <p style={{ textAlign: 'center', color: '#888', marginBottom: '3rem' }}>
        Pour commencer, configurons votre profil athlétique. Vos zones d'entraînement se mettront à jour automatiquement ci-dessous.
      </p>
      
      <OnboardingClient user={user} />
    </div>
  );
}