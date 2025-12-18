import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";
import { redirect } from "next/navigation";
import OnboardingClient from './OnboardingClient';

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    redirect('/auth/signin');
  }

  // ⚡ FIX: Conversion de l'ID en Number pour la cohérence BDD
  const userId = Number(session.user.id);

  // On récupère l'user pour pré-remplir (ex: poids venant de Strava)
  const { data: userData, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  // ⚡ FIX: Cast en any pour accéder aux propriétés dynamiques (name, etc.)
  const user = userData as any;

  if (error || !user) {
    console.error("Erreur chargement utilisateur onboarding:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white font-mono">
        ERREUR DE SYNCHRONISATION DU PROFIL
      </div>
    );
  }

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
         Bienvenue, {user.name?.split(' ')[0] || 'Athlète'} !
      </h1>
      <p style={{ textAlign: 'center', color: '#888', marginBottom: '3rem' }}>
        Pour commencer, configurons votre profil athlétique. Vos zones d'entraînement se mettront à jour automatiquement.
      </p>
      
      

      <OnboardingClient user={user} />
    </div>
  );
}