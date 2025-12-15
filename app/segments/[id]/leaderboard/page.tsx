// Fichier : app/segments/[id]/leaderboard/page.tsx
import React from 'react';
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { getSegmentLeaderboard } from "../../../../lib/leaderboardEngine";
import LeaderboardClient from "./LeaderboardClient";
import { ArrowLeft, Mountain } from 'lucide-react';
import Link from 'next/link';

// Typage correct pour Next.js 15+
type Props = {
  params: Promise<{ id: string }>;
};

export default async function SegmentLeaderboardPage({ params }: Props) {
    // 1. Déballer la Promise params (Crucial pour corriger l'erreur)
    const resolvedParams = await params;
    const segmentId = parseInt(resolvedParams.id);

    // 2. Récupération des métadonnées du segment
    const { data: segment } = await supabaseAdmin
        .from('segments')
        .select('name, distance_m, average_grade, pulsar_index, pulsar_category, elevation_gain_m')
        .eq('id', segmentId)
        .single();

    if (!segment) return <div className="p-20 text-center font-black">SEGMENT_NOT_FOUND</div>;

    // 3. Récupérer le classement initial (Tous temps)
    const initialData = await getSegmentLeaderboard({ segmentId, sortBy: 'duration_s' });

    return (
        <div className="min-h-screen bg-[#050505] text-[#F1F1F1] font-sans pb-20">
            {/* HEADER DESIGNER */}
            <div className="relative h-64 flex items-end px-8 pb-8 overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent z-10" />
                <Mountain className="absolute -right-20 -bottom-20 w-96 h-96 text-white/5 -rotate-12" />
                
                <div className="relative z-20 max-w-7xl mx-auto w-full flex justify-between items-end">
                    <div>
                        <Link href={`/segments/${segmentId}`} className="flex items-center gap-2 text-[#d04fd7] mb-4 hover:opacity-70 transition-all">
                            <ArrowLeft size={18} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Retour Analyse</span>
                        </Link>
                        <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none">
                            Hall of <span className="text-[#d04fd7] drop-shadow-[0_0_15px_rgba(208,79,215,0.5)]">Legends</span>
                        </h1>
                        <p className="text-gray-500 font-mono text-sm mt-2 uppercase tracking-widest">
                            {segment.name} // {segment.pulsar_category} // Index {segment.pulsar_index}
                        </p>
                    </div>
                    <div className="text-right hidden md:block">
                        <div className="text-4xl font-mono font-black text-white">{(segment.distance_m / 1000).toFixed(2)}km</div>
                        <div className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Distance Totale</div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 mt-12">
                <LeaderboardClient 
                    segmentId={segmentId} 
                    initialData={initialData}
                    segmentMeta={segment}
                />
            </div>
        </div>
    );
}