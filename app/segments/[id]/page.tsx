// Fichier : app/segments/[id]/page.tsx
import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient";
import { redirect, notFound } from "next/navigation";
import SegmentDisplay from "./segmentDisplay";
import Link from "next/link"; 
import { Trophy } from "lucide-react"; 

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
    avg_heartrate?: number | null; 
    avg_cadence?: number | null;   
  }[];
};

async function fetchSegmentData(segmentId: string): Promise<SegmentDetail | null> {
  const segmentIdNum = parseInt(segmentId);
  if (isNaN(segmentIdNum)) return null;

  // 1. Récupération du Segment
  const { data: segmentData } = await supabaseAdmin
    .from("segments")
    .select("*, polyline, tags") 
    .eq("id", segmentIdNum)
    .single();

  if (!segmentData) return null;

  // 2. Récupération des Efforts (Leaderboard)
  const { data: effortsData, error: effortsError } = await supabaseAdmin
    .from("activity_segments")
    .select(`
      id,
      activity_id,
      duration_s,
      avg_power_w,
      avg_speed_kmh,
      avg_heartrate, 
      avg_cadence,
      w_kg,
      vam,
      activities!inner ( 
        start_time, 
        user_id,
        users ( name, avatar_url, weight, age, height ) 
      )
    `)
    .eq("segment_id", segmentIdNum)
    .order("duration_s", { ascending: true });

  // ⚡ FIX: On cast en any[] pour naviguer dans la jointure sans erreur TS
  const effortsRaw = (effortsData || []) as any[];

  const cleanedEfforts = effortsRaw.map((e: any) => ({
    id: e.id,
    activity_id: e.activity_id,
    duration_s: e.duration_s,
    avg_power_w: e.avg_power_w,
    avg_speed_kmh: e.avg_speed_kmh,
    avg_heartrate: e.avg_heartrate,
    avg_cadence: e.avg_cadence,
    
    // Mapping des données jointes
    start_time: e.activities?.start_time,
    user_id: String(e.activities?.user_id), // Conversion number -> string
    user: e.activities?.users, 
  }));

  // ⚡ FIX: On cast le segment en any pour autoriser le spread (...)
  const segment = segmentData as any;

  return { 
    ...segment, 
    efforts: cleanedEfforts 
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
        {/* BANDEAU D'ACTION RAPIDE POUR LE LEADERBOARD */}
        <div className="max-w-[1600px] mx-auto pt-6 px-6 flex justify-end">
            <Link 
                href={`/segments/${id}/leaderboard`}
                className="flex items-center gap-2 px-4 py-2 bg-[#FFD166]/10 text-[#FFD166] border border-[#FFD166]/20 rounded-lg hover:bg-[#FFD166]/20 transition-all text-sm font-medium"
            >
                <Trophy className="w-4 h-4" />
                Voir le Classement Complet
            </Link>
        </div>

        <SegmentDisplay segment={segmentData} currentUserId={session.user.id} />
    </div>
  );
}