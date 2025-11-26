// Fichier : app/segments/[id]/page.tsx
import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient";
import { redirect, notFound } from "next/navigation";
import SegmentDisplay from "./segmentDisplay";

// Type aligné avec la BDD
export type SegmentDetail = {
  id: number;
  name: string;
  distance_m: number;
  elevation_gain_m: number;
  average_grade: number;
  max_grade: number | null;
  category: string | null;
  start_lat: number;
  start_lon: number;
  end_lat?: number;
  end_lon?: number;
  polyline?: number[][] | null; 
  tags?: { label: string; color: string; }[] | null; 
  efforts: {
    id: number;
    activity_id: number;
    duration_s: number;
    avg_power_w: number | null;
    avg_speed_kmh: number;
    start_time: string;
    user_id: string;              
    user: {                        
        name: string | null;
        avatar_url: string | null;
    } | null;
    // On garde ces propriétés dans le type TS pour le front, 
    // mais on les remplira manuellement ou par défaut si absentes de la BDD
    avg_heartrate?: number | null; 
    avg_cadence?: number | null;   
  }[];
};

async function fetchSegmentData(segmentId: string): Promise<SegmentDetail | null> {
  const segmentIdNum = parseInt(segmentId);
  if (isNaN(segmentIdNum)) return null;

  // 1. Le Segment
  const { data: segment, error: segmentError } = await supabaseAdmin
    .from("segments")
    .select("*, polyline, tags") 
    .eq("id", segmentIdNum)
    .single();

  if (segmentError || !segment) return null;

  // 2. TOUS les efforts
  // 🔥 FIX SQL : Retrait de avg_heartrate et avg_cadence qui n'existent pas dans la table activities
  const { data: efforts, error: effortsError } = await supabaseAdmin
    .from("activity_segments")
    .select(`
      id,
      activity_id,
      duration_s,
      avg_power_w,
      avg_speed_kmh,
      activities!inner ( 
        start_time, 
        user_id,
        users ( name, avatar_url ) 
      )
    `)
    .eq("segment_id", segmentIdNum)
    .order("duration_s", { ascending: true })
    .limit(100); 

  if (effortsError) console.error("Err efforts:", effortsError);

  // 3. Compilation
  const cleanedEfforts = (efforts || []).map((e: any) => ({
    id: e.id,
    activity_id: e.activity_id,
    duration_s: e.duration_s,
    avg_power_w: e.avg_power_w,
    avg_speed_kmh: e.avg_speed_kmh,
    start_time: e.activities?.start_time,
    user_id: e.activities?.user_id,
    user: e.activities?.users,
    // Fallback valeurs nulles car pas en BDD
    avg_heartrate: null, 
    avg_cadence: null
  }));

  return {
    ...segment,
    efforts: cleanedEfforts,
  };
}

type Props = { params: Promise<{ id: string }> };

export default async function SegmentDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) redirect("/auth/signin");

  const segmentData = await fetchSegmentData(id);
  if (!segmentData) notFound();

  return (
    <div className="min-h-screen bg-[#050505] text-[#F1F1F1]">
        <SegmentDisplay segment={segmentData} currentUserId={session.user.id} />
    </div>
  );
}