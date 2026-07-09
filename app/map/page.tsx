import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth"; 
import { supabaseAdmin } from "../../lib/supabaseAdminClient"; 
import { redirect } from "next/navigation";
import GlobalMapClient from './GlobalMapClient';
import MapTabsWrapper from './MapTabsWrapper';

export const metadata = {
  title: 'Carte Globale | PULSAR',
  description: 'Visualisation haute définition de l\'historique d\'exploration.',
};

export default async function MapPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  let userId: string | number | undefined = session.user?.id;
  
  if (!userId && session.user?.email) {
    const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single();
    if (userData) userId = (userData as any).id;
  }

  if (!userId) {
    redirect('/auth/signin?error=SessionExpired');
  }

  const dbUserId = Number(userId);

  // 🚀 OPTIMISATION : Parallélisation des requêtes (Activités + Blacklist)
  const [
    { data: activitiesData, error: activitiesError },
    { data: blacklistData, error: blacklistError }
  ] = await Promise.all([
    supabaseAdmin
      .from('activities')
      .select('id, name, type, start_time, polyline')
      .eq('user_id', dbUserId)
      .not('polyline', 'is', null) 
      .neq('type', 'VirtualRide') // Maintien strict de la précision outdoor
      .order('start_time', { ascending: false }),
    supabaseAdmin
      .from('blacklisted_tiles')
      .select('tile_key')
      .eq('user_id', dbUserId)
  ]);

  if (activitiesError) {
    console.error("❌ ERREUR MAP DATA:", activitiesError);
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-red-500 font-mono gap-4">
            <div className="text-4xl font-black tracking-tighter">ERREUR SYSTÈME</div>
            <div className="text-sm opacity-70">Connexion à la base de données échouée.</div>
        </div>
    );
  }

  if (blacklistError) console.error("❌ ERREUR BLACKLIST:", blacklistError);

  const initialBlacklist: string[] = blacklistData ? blacklistData.map((b: any) => b.tile_key) : [];

  const activities = (activitiesData || []) as any[];

  const cleanActivities = activities.map(a => {
    let polyStr: string | null = null;
    if (typeof a.polyline === 'string') {
        polyStr = a.polyline;
    } else if (typeof a.polyline === 'object' && a.polyline !== null) {
        polyStr = a.polyline.polyline || null;
    }
    return {
      id: a.id,
      name: a.name || 'Zone Inconnue',
      type: a.type,
      start_time: a.start_time || new Date().toISOString(),
      polyline: polyStr
    };
  }).filter(a => a.polyline !== null && a.polyline.length > 10); 

  return (
    <div className="w-full h-screen bg-[#050505] overflow-hidden">
      <MapTabsWrapper activities={cleanActivities} initialBlacklist={initialBlacklist} userId={dbUserId} />
    </div>
  );
}