import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth"; 
import { supabaseAdmin } from "../../lib/supabaseAdminClient";
import { redirect } from "next/navigation";
import CalendarClient from './calendarClient';
import { ShopData } from "./types";

// 🔥 FIX CRITIQUE : Désactive le cache statique de Vercel
export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    redirect('/auth/signin');
  }

  // 1. Récupération des activités
  const { data: activities, error } = await supabaseAdmin
    .from('activities')
    .select('id, strava_id, name, start_time, distance_km, avg_speed_kmh, elevation_gain_m, duration_s, tss, type, avg_power_w, avg_heartrate, polyline, weather_code, temp_min, temp_max, temp_avg, streams_data') 
    .eq('user_id', session.user.id)
    .order('start_time', { ascending: true });

  // 2. Récupération des achats ET DU SOLDE UTILISATEUR (NEW)
  // On récupère aussi le wallet_balance directement depuis la table users
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('wallet_balance, spent_tss')
    .eq('id', session.user.id)
    .single();

  const { data: purchases } = await supabaseAdmin
    .from('shop_purchases')
    .select('effect_id, cost')
    .eq('user_id', session.user.id);

  // 3. Récupération du Loadout
  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('equipped_loadout')
    .eq('user_id', session.user.id)
    .single();

  // 🔥 CHANGEMENT ICI : On prend la valeur BDD, sinon 0
  const walletBalance = userData?.wallet_balance || 0; 
  const spentTSS = userData?.spent_tss || 0; // Ou via purchases.reduce si tu préfères, mais la BDD l'a déjà.

  const ownedEffects = purchases?.map(p => p.effect_id) || [];
  const rawLoadout = settings?.equipped_loadout || {};

  const shopData: ShopData = {
    // On passe le vrai solde calculé par le serveur
    serverBalance: walletBalance, 
    spentTSS, // Optionnel, juste pour info
    ownedEffects,
    loadout: {
        FRAME: rawLoadout.FRAME || rawLoadout.card || null, 
        HOVER: rawLoadout.HOVER || rawLoadout.hover || null, 
        TRAIL: rawLoadout.TRAIL || null,
        INTERACTION: rawLoadout.INTERACTION || rawLoadout.click || rawLoadout.flip || null, 
        AMBIANCE: rawLoadout.AMBIANCE || rawLoadout.passive || null, 
        TODAY: rawLoadout.TODAY || rawLoadout.today || null, 
        SPECIAL: rawLoadout.SPECIAL || null,
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