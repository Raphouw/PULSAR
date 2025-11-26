// Fichier : app/activities/[id]/page.tsx
import React from "react";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ActivityDisplay from "./activityDisplay";
import { ActivityStreams } from "../../../types/next-auth.d";
import { AlertTriangle, ArrowLeft, Lock } from 'lucide-react';

export type Activity = {
  id: number;
  name: string;
  distance_km: number;
  elevation_gain_m: number;
  duration_s: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  avg_power_w: number | null;
  np_w: number | null;
  tss: number | null;
  calories_kcal: number | null;
  avg_heartrate: number | null;
  start_time: string;
  polyline: { polyline: string } | string | null;
  strava_id: number | null;
  streams_data: ActivityStreams | null;
  user_weight: number | null;
  user_ftp: number | null;
  user_id: string | number; // Ajouté pour la vérification
};

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const activityId = resolvedParams.id;

  // 1. AUTHENTIFICATION
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    redirect('/auth/signin');
  }
  const viewerId = session.user.id;

  // 2. RÉCUPÉRATION DE L'ACTIVITÉ (+ infos user pour le calcul physique)
  const { data: activity, error } = await supabaseAdmin
    .from("activities")
    .select(`*, users ( weight, ftp )`)
    .eq("id", activityId)
    .maybeSingle();

  // 3. GESTION ERREUR / 404 (Ton design original)
  if (error || !activity) {
    return (
        <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.4))' }} />
            <h1 style={{ fontSize: '4rem', fontWeight: 900, color: '#ef4444', margin: 0, lineHeight: 1 }}>ERREUR CRITIQUE</h1>
            <p style={{ fontSize: '1.2rem', color: '#888', marginBottom: '2rem', fontFamily: 'monospace' }}>ACT_ID_{activityId} :: NOT_FOUND</p>
            <Link href="/activities" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#d04fd7', textDecoration: 'none', fontWeight: 700, border: '1px solid #d04fd7', padding: '10px 20px', borderRadius: '8px' }}>
                <ArrowLeft size={20} /> RETOUR AU JOURNAL
            </Link>
        </div>
    );
  }

  // 4. 🛡️ SÉCURITÉ (LE GARDEN)
  const isOwner = String(activity.user_id) === String(viewerId);
  let hasAccess = isOwner;

  // Si pas propriétaire, on vérifie l'amitié
  if (!isOwner) {
    const { data: relation } = await supabaseAdmin
        .from('friends')
        .select('status')
        .eq('user_id', viewerId) // C'est MOI qui regarde
        .eq('friend_id', activity.user_id) // C'est LUI l'auteur
        .eq('status', 'following') // Je dois le suivre
        .maybeSingle();
    
    if (relation) {
        hasAccess = true;
    }
  }

  // 5. BLOCAGE SI PAS D'ACCÈS
  if (!hasAccess) {
    return (
        <div style={{ 
            minHeight: '100vh', background: '#050505', color: '#fff', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem'
        }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '3rem', borderRadius: '20px', border: '1px solid #ef4444', textAlign: 'center', maxWidth: '500px' }}>
                <Lock size={64} color="#ef4444" style={{ margin: '0 auto 1.5rem auto' }} />
                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#ef4444' }}>ACCÈS PRIVÉ</h1>
                <p style={{ color: '#ccc', marginTop: '1rem', lineHeight: 1.6 }}>
                    Cette activité appartient à un athlète que vous ne suivez pas. <br/>
                    Abonnez-vous à son profil pour débloquer les données télémétriques complètes.
                </p>
                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <Link href="/friends" style={{ padding: '10px 20px', background: '#fff', color: '#000', fontWeight: 700, borderRadius: '8px', textDecoration: 'none' }}>
                        Trouver l'athlète
                    </Link>
                    <Link href="/dashboard" style={{ padding: '10px 20px', border: '1px solid #555', color: '#aaa', fontWeight: 600, borderRadius: '8px', textDecoration: 'none' }}>
                        Mon Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
  }

  // 6. FORMATAGE DES DONNÉES (Ton code original préservé)
  // @ts-ignore
  const userData: any = activity.users;
  // @ts-ignore
  const user_weight = userData?.weight ?? 75; 
  // @ts-ignore
  const user_ftp = userData?.ftp ?? 200; 
  // @ts-ignore
  delete activity.users; 

  const formattedActivity: Activity = {
    ...activity,
    user_weight,
    user_ftp
  };

  return <ActivityDisplay activity={formattedActivity} />;
}