import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth"; 
import { supabaseAdmin } from "../../lib/supabaseAdminClient";
import { redirect } from "next/navigation";
import CalendarClient from './calendarClient';
import { ShopData } from "./types";

// 🔥 CRITIQUE : Force le recalcul à chaque visite (sinon le Solde reste figé par le cache Vercel)
export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    redirect('/auth/signin');
  }

  // 1. RÉCUPÉRATION DES ACTIVITÉS (Optimisée)
  // ⚠️ On exclut 'streams_data' (trop lourd)
  // ✅ On garde 'polyline' (nécessaire pour ta météo / localisation)
  const { data: activities, error } = await supabaseAdmin
    .from('activities')
    .select('id, strava_id, name, start_time, distance_km, avg_speed_kmh, elevation_gain_m, duration_s, tss, type, avg_power_w, avg_heartrate, polyline, weather_code, temp_min, temp_max, temp_avg') 
    .eq('user_id', session.user.id)
    .order('start_time', { ascending: true });

  if (error) {
    console.error("🔥 ERREUR SUPABASE:", error.message);
  }

  // 2. RÉCUPÉRATION DU VRAI SOLDE (Le Coffre-fort)
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('wallet_balance, spent_tss')
    .eq('id', session.user.id)
    .single();

  // 3. RÉCUPÉRATION DE L'INVENTAIRE
  const { data: purchases } = await supabaseAdmin
    .from('shop_purchases')
    .select('effect_id')
    .eq('user_id', session.user.id);

  // 4. RÉCUPÉRATION DU LOADOUT (Équipement)
  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('equipped_loadout')
    .eq('user_id', session.user.id)
    .single();

  // Valeurs par défaut robustes (si user tout neuf)
  const walletBalance = userData?.wallet_balance ?? 0; 
  const spentTSS = userData?.spent_tss ?? 0;
  const ownedEffects = purchases?.map(p => p.effect_id) || [];
  const rawLoadout = settings?.equipped_loadout || {};

  // Construction de l'objet ShopData
  const shopData: ShopData = {
    serverBalance: walletBalance, // Le vrai argent
    spentTSS,
    ownedEffects,
    loadout: {
        FRAME: rawLoadout.FRAME || null, 
        HOVER: rawLoadout.HOVER || null, 
        TRAIL: rawLoadout.TRAIL || null,
        INTERACTION: rawLoadout.INTERACTION || null, 
        AMBIANCE: rawLoadout.AMBIANCE || null, 
        TODAY: rawLoadout.TODAY || null, 
        SPECIAL: rawLoadout.SPECIAL || null,
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1800px', margin: '0 auto' }}>
        <CalendarClient activities={activities || []} initialShopData={shopData} />
      </div>
    </div>
  );
}