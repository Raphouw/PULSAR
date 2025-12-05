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

  const userId = session.user.id;

  // 1. RÉCUPÉRATION DES ACTIVITÉS
  const { data: activities } = await supabaseAdmin
    .from('activities')
    .select('id, strava_id, name, start_time, distance_km, avg_speed_kmh, elevation_gain_m, duration_s, tss, type, avg_power_w, avg_heartrate, polyline, weather_code, temp_min, temp_max, temp_avg') 
    .eq('user_id', userId)
    .order('start_time', { ascending: true });

  // 2. RÉCUPÉRATION DE L'INVENTAIRE (Achats réels)
  const { data: purchases } = await supabaseAdmin
    .from('shop_purchases')
    .select('effect_id')
    .eq('user_id', userId);

  // 3. RÉCUPÉRATION DU LOADOUT (Équipement)
  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('equipped_loadout')
    .eq('user_id', userId)
    .single();

  // ----------------------------------------------------
  // 🔥 SYNCHRONISATION CRITIQUE DU SOLDE NET 🔥
  // ----------------------------------------------------

  // A. CALCUL DES GAINS (Revenu Brut Total)
  const totalGrossTSS = calculateWallet(activities || []); 

  // B. CALCUL DES DÉPENSES (Passif Total)
  const effectPrices = new Map(SHOP_EFFECTS.map(e => [e.id, e.price]));
  let actualSpentTSS = 0;
  const ownedEffects = purchases?.map(p => p.effect_id) || [];
  
  ownedEffects.forEach(effectId => {
      // S'assure de n'ajouter que les coûts d'effets existants
      actualSpentTSS += effectPrices.get(effectId) || 0; 
  });
  
  // C. CALCUL DU SOLDE NET FINAL
  // Le vrai montant: Revenu Brut - Dépenses. Utilise Math.max pour éviter les soldes négatifs.
  const finalWalletBalance = Math.max(0, totalGrossTSS - actualSpentTSS); 

  // D. MISE À JOUR DU SOLDE EN BASE DE DONNÉES
  // Ceci rend la colonne 'wallet_balance' la source de vérité pour le client.
  // On met aussi à jour 'spent_tss' pour l'audit, même si on ne l'utilise plus pour l'affichage.
  await supabaseAdmin
    .from('users')
    .update({ 
        wallet_balance: finalWalletBalance,
        spent_tss: actualSpentTSS 
    })
    .eq('id', userId);
  
  // ----------------------------------------------------

  const rawLoadout = settings?.equipped_loadout || {};

  // Construction de l'objet ShopData
  const shopData: ShopData = {
    serverBalance: finalWalletBalance, // 🔥 Le solde synchronisé
    spentTSS: actualSpentTSS,          // Le montant dépensé recalculé
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
      activities={activities || []} 
      initialShopData={shopData} 
    />
  );
}