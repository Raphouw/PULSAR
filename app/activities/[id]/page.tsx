// Fichier : app/activities/[id]/page.tsx
import React from "react";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ActivityDisplay from "./activityDisplay";
import type { ActivityStreams } from "../../../types/next-auth"; 
import { AlertTriangle, ArrowLeft, Lock } from 'lucide-react';

// ... (Types SegmentMatch et Activity inchangés) ...
export type SegmentMatch = {
  id: number;
  segment_id: number;
  duration_s: number;
  avg_power_w: number;
  avg_speed_kmh: number;
  start_index: number;
  end_index: number;
  is_pr: boolean;
  pr_gap_seconds: number;
  np_w?: number;
  avg_heartrate?: number;
  max_heartrate?: number;
  avg_cadence?: number;
  vam?: number;
  rank_global?: number | null;
  rank_personal?: number | null;
  user_best_rank?: number | null; // 🔥 Le champ qu'on ajoute
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
  // ... (champs Activity inchangés) ...
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
  intensity_factor: number | null;
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

  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) redirect('/auth/signin');
  const viewerId = session.user.id;

  // 1. RÉCUPÉRATION DE L'ACTIVITÉ
  const { data: activityRaw, error } = await supabaseAdmin
    .from('activities')
    .select(`
      *,
      users (weight, ftp),
      activity_segments (
        id, segment_id, duration_s, avg_power_w, avg_speed_kmh,
        start_index, end_index, is_pr, pr_gap_seconds,
        np_w, avg_heartrate, max_heartrate, avg_cadence, vam, w_kg,
        rank_global, rank_personal,
        segment:segments (
            name, distance_m, average_grade, elevation_gain_m,
            category, polyline, tags
        )
      )
    `)
    .eq('id', activityId)
    .single();

  // 2. GESTION ERREUR / 404
  if (error || !activityRaw) {
    // ... (Code erreur inchangé) ...
    return (
        <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.4))' }} />
            <h1 style={{ fontSize: '4rem', fontWeight: 900, color: '#ef4444', margin: 0, lineHeight: 1 }}>ERREUR SYSTÈME</h1>
            <p style={{ fontSize: '1.2rem', color: '#888', marginBottom: '2rem', fontFamily: 'monospace' }}>ID_{activityId} :: NOT_FOUND_OR_CORRUPTED</p>
            <Link href="/activities" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#d04fd7', textDecoration: 'none', fontWeight: 700, border: '1px solid #d04fd7', padding: '10px 20px', borderRadius: '8px' }}>
                <ArrowLeft size={20} /> RETOUR AU JOURNAL
            </Link>
        </div>
    );
  }

  // ⚡ FIX: On cast l'objet activité pour débloquer l'accès aux propriétés
  const activity = activityRaw as any;

  // 3. 🛡️ SÉCURITÉ ACCÈS
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
    
    if (relation) hasAccess = true;
  }

  if (!hasAccess) {
    // ... (Code blocage inchangé) ...
    return (
        <div style={{ 
            minHeight: '100vh', background: '#050505', color: '#fff', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem'
        }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '3rem', borderRadius: '20px', border: '1px solid #ef4444', textAlign: 'center', maxWidth: '500px' }}>
                <Lock size={64} color="#ef4444" style={{ margin: '0 auto 1.5rem auto' }} />
                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#ef4444' }}>ACCÈS RESTREINT</h1>
                <p style={{ color: '#ccc', marginTop: '1rem', lineHeight: 1.6 }}>
                    Les données télémétriques de cette mission sont privées. <br/>
                    Suivez cet athlète pour débloquer l'accès aux segments et analyses.
                </p>
                {/* ... boutons ... */}
            </div>
        </div>
    );
  }

  // 4. 🔥 RÉCUPÉRATION ET INJECTION DES MEILLEURS RANGS HISTORIQUES
  const segmentIds = activity.activity_segments.map((as: any) => as.segment_id);
  const bestRanksMap = new Map<number, number>();
  
  if (segmentIds.length > 0) {
      const { data: bestEfforts } = await supabaseAdmin
        .from('activity_segments')
        .select('segment_id, rank_global')
        .eq('user_id', activity.user_id)
        .in('segment_id', segmentIds)
        .eq('is_pr', true);

      if (bestEfforts) {
          bestEfforts.forEach((effort: any) => {
              if (effort.rank_global) {
                  const currentBest = bestRanksMap.get(effort.segment_id);
                  if (!currentBest || effort.rank_global < currentBest) {
                      bestRanksMap.set(effort.segment_id, effort.rank_global);
                  }
              }
          });
      }
  }

  // Création de la liste enrichie AVEC le tri
  const segmentsWithBestRank = ((activity.activity_segments || []) as SegmentMatch[])
    .sort((a, b) => a.start_index - b.start_index)
    .map(seg => ({
        ...seg,
        user_best_rank: bestRanksMap.get(seg.segment_id) || null
    }));

  // 5. FORMATAGE FINAL DES DONNÉES
  const userRelation = activity.users as unknown as { weight: number | null, ftp: number | null } | null;
  const user_weight = userRelation?.weight ?? 75; 
  const user_ftp = userRelation?.ftp ?? 200; 

  // ⚡ FIX: On déstructure proprement pour éviter l'erreur de spread sur 'never'
  const { users, ...activityRest } = activity;

  const formattedActivity: Activity = {
    ...activityRest,
    user_weight,
    user_ftp,
    // 🔥 CORRECTION ICI : UTILISER LA NOUVELLE LISTE
    activity_segments: segmentsWithBestRank 
  } as Activity;

  return (
    <div>
        <ActivityDisplay activity={formattedActivity} />
    </div>
  );
}