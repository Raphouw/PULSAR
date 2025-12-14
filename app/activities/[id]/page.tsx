// Fichier : app/activities/[id]/page.tsx
import React from "react";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ActivityDisplay from "./activityDisplay";
import MatchedSegmentsList from "./MatchedSegmentsList";
import type { ActivityStreams } from "../../../types/next-auth"; 
import { AlertTriangle, ArrowLeft, Lock } from 'lucide-react';

// --- TYPES SYNCHRONISÉS AVEC LE NOUVEAU SCANNER ---
export type SegmentMatch = {
  id: number;
  segment_id: number;
  duration_s: number;
  avg_power_w: number;
  avg_speed_kmh: number;
  // 🔥 Champs tactiques requis pour le Cockpit
  start_index: number;
  end_index: number;
  np_w?: number;
  avg_heartrate?: number;
  max_heartrate?: number;
  avg_cadence?: number;
  vam?: number;
  w_kg?: number;
  segment: {
    name: string;
    distance_m: number;
    average_grade: number;
    elevation_gain_m: number;
    category: string | null;
    polyline?: number[][];
    tags?: { label: string; color: string; }[] | null;
  };
};

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
  user_id: string | number;
  activity_segments: SegmentMatch[];
};

export default async function ActivityPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params; 
  const activityId = id;

  // 1. AUTHENTIFICATION
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    redirect('/auth/signin');
  }
  const viewerId = session.user.id;

  // 2. RÉCUPÉRATION DE L'ACTIVITÉ + USER + SEGMENTS (Requête nettoyée)
  const { data: activity, error } = await supabaseAdmin
    .from('activities')
    .select(`
      *,
      users (
        weight,
        ftp
      ),
      activity_segments (
        id,
        segment_id,
        duration_s,
        avg_power_w,
        avg_speed_kmh,
        start_index,
        end_index,
        np_w,
        avg_heartrate,
        max_heartrate,
        avg_cadence,
        vam,
        w_kg,
        segment:segments (
            name,
            distance_m,
            average_grade,
            elevation_gain_m,
            category,
            polyline,
            tags
        )
      )
    `)
    .eq('id', activityId)
    .single();

  // 3. GESTION ERREUR / 404
  if (error || !activity) {
    console.error("[ActivityPage] Error:", error);
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

  // 4. 🛡️ SÉCURITÉ ACCÈS
  const isOwner = String(activity.user_id) === String(viewerId);
  let hasAccess = isOwner;

  if (!isOwner) {
    const { data: relation } = await supabaseAdmin
        .from('friends')
        .select('status')
        .eq('user_id', viewerId)
        .eq('friend_id', activity.user_id)
        .eq('status', 'following')
        .maybeSingle();
    
    if (relation) {
        hasAccess = true;
    }
  }

  // 5. BLOCAGE SI PAS ACCÈS
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

  // 6. FORMATAGE FINAL DES DONNÉES
  const userRelation = activity.users as unknown as { weight: number | null, ftp: number | null } | null;
  const user_weight = userRelation?.weight ?? 75; 
  const user_ftp = userRelation?.ftp ?? 200; 

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { users, ...activityWithoutUsers } = activity;

  const formattedActivity: Activity = {
    ...activityWithoutUsers,
    user_weight,
    user_ftp,
    // Cast sécurisé des segments vers le type étendu
    activity_segments: (activity.activity_segments || []) as SegmentMatch[]
  } as Activity;

  return (
    <div>
        {/* Composant principal de contrôle de mission */}
        <ActivityDisplay activity={formattedActivity} />
    </div>
  );
}