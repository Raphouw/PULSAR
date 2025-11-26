// Fichier : app/calendar/page.tsx
import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabaseAdminClient.js";
import { redirect } from "next/navigation";
import CalendarClient from './calendarClient';
import { ShopData } from "./types"; // Importe le type créé étape 2

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    redirect('/auth/signin');
  }

  // On récupère tout, trié par date
 const { data: activities, error } = await supabaseAdmin
    .from('activities')
    // AJOUTE 'average_temp' ICI
    .select('id, strava_id, name, start_time, distance_km, avg_speed_kmh, elevation_gain_m, duration_s, tss, type, avg_power_w, avg_heartrate, polyline, weather_code, temp_min, temp_max, temp_avg') 
    .eq('user_id', session.user.id)
    .order('start_time', { ascending: true });

const { data: purchases } = await supabaseAdmin
    .from('shop_purchases')
    .select('effect_id, cost')
    .eq('user_id', session.user.id);

  // 3. Récupérer le Loadout (Équipement actuel)
  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('equipped_loadout')
    .eq('user_id', session.user.id)
    .single();

const spentTSS = purchases?.reduce((acc, p) => acc + p.cost, 0) || 0;
  const ownedEffects = purchases?.map(p => p.effect_id) || [];
  const initialLoadout = settings?.equipped_loadout || {};

  const shopData: ShopData = {
    spentTSS,
    ownedEffects,
    loadout: {
        hover: initialLoadout.hover || null,
        flip: initialLoadout.flip || null,
        card: initialLoadout.card || null,
        passive: initialLoadout.passive || null,
        click: initialLoadout.click || null,
        today: initialLoadout.today || null,
    }
  };


  if (error) {
    console.error("Erreur Calendar:", error);
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      // RETIRE ou COMMENTE cette ligne :
      // background: 'radial-gradient(...)', 
      // On laisse le body gérer le fond via le CSS global
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1800px', margin: '0 auto' }}>
        <CalendarClient activities={activities || []} initialShopData={shopData} />
      </div>
    </div>
  );
}