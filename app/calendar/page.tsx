import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth"; 
import { supabaseAdmin } from "../../lib/supabaseAdminClient";
import { redirect } from "next/navigation";
import CalendarClient from './calendarClient';
import { ShopData } from "./types";

// 🔥 NOUVEAU : On importe calculateWallet et SHOP_EFFECTS
import { calculateWallet } from './utils';
import { SHOP_EFFECTS } from './constants';

// CRITIQUE : Force le recalcul à chaque visite 
export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    redirect('/auth/signin');
  }

  // ⚡ FIX: Conversion de l'ID en nombre pour la cohérence BDD
  const userId = Number(session.user.id);

  // 🚀 OPTIMISATION 1 : Parallélisation des lectures (Le Fix du Waterfall)
  const [
    { data: activitiesData },
    { data: purchasesData },
    { data: settingsData }
  ] = await Promise.all([
    supabaseAdmin
      .from('activities')
      .select('id, strava_id, name, start_time, distance_km, avg_speed_kmh, elevation_gain_m, duration_s, tss, type, avg_power_w, avg_heartrate, polyline, weather_code, temp_min, temp_max, temp_avg') 
      .eq('user_id', userId)
      .order('start_time', { ascending: true }),
    supabaseAdmin
      .from('shop_purchases')
      .select('effect_id')
      .eq('user_id', userId),
    supabaseAdmin
      .from('user_settings')
      .select('equipped_loadout')
      .eq('user_id', userId)
      .maybeSingle()
  ]);

  const activities = (activitiesData || []) as any[];
  const purchases = (purchasesData || []) as any[];
  const settings = settingsData as any;

  // ----------------------------------------------------
  // 🔥 SYNCHRONISATION CRITIQUE DU SOLDE NET 🔥
  // ----------------------------------------------------

  // A. CALCUL DES GAINS (Revenu Brut Total basé sur l'effort TSS)
  const totalGrossTSS = calculateWallet(activities); 

  // B. CALCUL DES DÉPENSES (Somme des prix des items possédés)
  const effectPrices = new Map(SHOP_EFFECTS.map(e => [e.id, e.price]));
  let actualSpentTSS = 0;
  const ownedEffects = purchases.map(p => p.effect_id) || [];
  
  ownedEffects.forEach(effectId => {
      actualSpentTSS += effectPrices.get(effectId) || 0; 
  });
  
  // C. CALCUL DU SOLDE NET FINAL
  const finalWalletBalance = Math.max(0, totalGrossTSS - actualSpentTSS); 

  // D. MISE À JOUR DU SOLDE EN BASE DE DONNÉES (Source de vérité)
  // 🚀 OPTIMISATION 2 : Élimination du blocage d'écriture (Fire and Forget)
  (supabaseAdmin.from('users') as any)
    .update({ 
        wallet_balance: finalWalletBalance,
        spent_tss: actualSpentTSS 
    })
    .eq('id', userId)
    .catch((err: any) => console.error("Erreur critique lors de la sauvegarde du portefeuille en arrière-plan :", err));
  
  // ----------------------------------------------------

  const rawLoadout = settings?.equipped_loadout || {};

  // Construction de l'objet ShopData pour le client
  const shopData: ShopData = {
    serverBalance: finalWalletBalance,
    spentTSS: actualSpentTSS,
    ownedEffects,
    loadout: {
        FRAME: rawLoadout.FRAME || null, 
        HOVER: rawLoadout.HOVER || null, 
        TRAIL: rawLoadout.TRAIL || null,
        INTERACTION: rawLoadout.INTERACTION || null, 
        AMBIANCE: rawLoadout.AMBIANCE || null,
        TODAY: rawLoadout.TODAY || null,
        SPECIAL: rawLoadout.SPECIAL || null,
        AURA: rawLoadout.AURA || null, 
    },
  };

  return (
    <CalendarClient 
      activities={activities} 
      initialShopData={shopData} 
    />
  );
}