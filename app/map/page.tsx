import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth"; 
import { supabaseAdmin } from "../../lib/supabaseAdminClient"; 
import { redirect } from "next/navigation";
import GlobalMapClient from './GlobalMapClient';

export const metadata = {
  title: 'Carte Tactique Globale | PULSAR',
  description: 'Visualisation haute définition de l\'historique d\'exploration.',
};

export default async function MapPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  let userId = session.user?.id;
  
  // Fallback de sécurité
  if (!userId && session.user?.email) {
    const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single();
    if (user) userId = user.id;
  }

  if (!userId) {
    redirect('/auth/signin?error=SessionExpired');
  }

  // Récupération Optimisée (Uniquement les champs nécessaires)
  const { data: activities, error } = await supabaseAdmin
    .from('activities')
    .select('id, name, type, start_time, polyline')
    .eq('user_id', userId)
    .not('polyline', 'is', null) 
    .order('start_time', { ascending: false });

  if (error) {
    console.error("❌ ERREUR MAP DATA:", error);
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-red-500 font-mono gap-4">
            <div className="text-4xl font-black tracking-tighter">ERREUR SYSTÈME</div>
            <div className="text-sm opacity-70">Connexion à la base de données échouée.</div>
        </div>
    );
  }

  // Normalisation stricte pour éviter les erreurs de sérialisation
  const cleanActivities = activities?.map(a => {
    let polyStr: string | null = null;

    if (typeof a.polyline === 'string') {
        polyStr = a.polyline;
    } else if (typeof a.polyline === 'object' && a.polyline !== null) {
        // @ts-ignore
        polyStr = a.polyline.polyline || null;
    }

    return {
      id: a.id,
      name: a.name || 'Zone Inconnue',
      type: a.type,
      start_time: a.start_time || new Date().toISOString(),
      polyline: polyStr
    };
  }).filter(a => a.polyline !== null && a.polyline.length > 10) || []; 

  return (
    <div className="w-full h-screen bg-[#050505] overflow-hidden">
      <GlobalMapClient activities={cleanActivities} />
    </div>
  );
}