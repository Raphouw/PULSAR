import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth"; // Ajuste le chemin relatif selon ton dossier
import { supabaseAdmin } from "../../lib/supabaseAdminClient"; // Ajuste le chemin relatif
import { redirect } from "next/navigation";
import GlobalMapClient from './GlobalMapClient';

export const metadata = {
  title: 'Carte Globale | PULSAR',
  description: 'Visualisation tactique de l\'historique.',
};

export default async function MapPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  // 1. Identification robuste de l'utilisateur
  let userId = session.user?.id;
  
  // Fallback si l'ID n'est pas dans la session (rare mais possible avec vieux tokens)
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

  // 2. Récupération optimisée des tracés
  // On ne select que le strict nécessaire pour alléger la charge serveur
  const { data: activities, error } = await supabaseAdmin
    .from('activities')
    .select('id, name, type, start_time, polyline')
    .eq('user_id', userId)
    .not('polyline', 'is', null) // Filtre SQL directement
    .order('start_time', { ascending: false });

  if (error) {
    console.error("❌ ERREUR MAP DATA:", error);
    return (
        <div className="flex items-center justify-center h-screen bg-black text-red-500 font-mono">
            ERREUR CRITIQUE DE CHARGEMENT DE LA BASE DE DONNÉES
        </div>
    );
  }

  // 3. Normalisation des données
  // PostgreSQL/Supabase jsonb peut être retourné comme objet ou string selon le driver
  const cleanActivities = activities?.map(a => {
    let polyStr: string | null = null;

    if (typeof a.polyline === 'string') {
        polyStr = a.polyline;
    } else if (typeof a.polyline === 'object' && a.polyline !== null) {
        // @ts-ignore : Supabase typage jsonb parfois capricieux
        polyStr = a.polyline.polyline || null;
    }

    return {
      id: a.id,
      name: a.name || 'Activité Inconnue',
      type: a.type,
      start_time: a.start_time || new Date().toISOString(),
      polyline: polyStr
    };
  }).filter(a => a.polyline !== null) || []; // Double sécurité

  return (
    <div className="w-full h-screen p-0 md:p-5 bg-black box-border overflow-hidden">
      <GlobalMapClient activities={cleanActivities} />
    </div>
  );
}