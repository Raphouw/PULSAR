// Fichier : app/calendar/page.tsx
import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth"; 
import { supabaseAdmin } from "../../lib/supabaseAdminClient";
import { redirect } from "next/navigation";
import CalendarClient from './calendarClient';
import { ShopData } from "./types";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    redirect('/auth/signin');
  }

  // 1. Récupération des activités
  const { data: activities, error } = await supabaseAdmin
    .from('activities')
    .select('id, strava_id, name, start_time, distance_km, avg_speed_kmh, elevation_gain_m, duration_s, tss, type, avg_power_w, avg_heartrate, polyline, weather_code, temp_min, temp_max, temp_avg') 
    .eq('user_id', session.user.id)
    .order('start_time', { ascending: true });

  // 2. Récupération des achats
  const { data: purchases } = await supabaseAdmin
    .from('shop_purchases')
    .select('effect_id, cost')
    .eq('user_id', session.user.id);

  // 3. Récupération du Loadout (Équipement actuel)
  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('equipped_loadout')
    .eq('user_id', session.user.id)
    .single();

  const spentTSS = purchases?.reduce((acc, p) => acc + p.cost, 0) || 0;
  const ownedEffects = purchases?.map(p => p.effect_id) || [];
  
  const rawLoadout = settings?.equipped_loadout || {};

  const shopData: ShopData = {
    spentTSS,
    ownedEffects,
    loadout: {
        // MAPPING ROBUSTE
        FRAME: rawLoadout.FRAME || rawLoadout.card || null, 
        HOVER: rawLoadout.HOVER || rawLoadout.hover || null, 
        TRAIL: rawLoadout.TRAIL || null, // 🔥 NOUVEAU SLOT
        INTERACTION: rawLoadout.INTERACTION || rawLoadout.click || rawLoadout.flip || null, 
        AMBIANCE: rawLoadout.AMBIANCE || rawLoadout.passive || null, 
        TODAY: rawLoadout.TODAY || rawLoadout.today || null, 
        SPECIAL: rawLoadout.SPECIAL || null, // 🔥 Ajouté
    }
  };

  if (error) {
    console.error("Erreur Calendar:", error);
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1800px', margin: '0 auto' }}>
        <CalendarClient activities={activities || []} initialShopData={shopData} />
      </div>
    </div>
  );
}