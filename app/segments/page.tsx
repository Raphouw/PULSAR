// Fichier : app/segments/page.tsx
import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";
import { redirect } from "next/navigation";
import SegmentsClient from "./segmentsClient";

// 🔥 MISE À JOUR DU TYPE Segment POUR INCLURE 'tags' et rendre 'max_grade' optionnel
export type Segment = {
    id: number;
    name: string;
    distance_m: number;
    elevation_gain_m: number;
    average_grade: number;
    max_grade: number | null; // Changé pour être nullable/optionnel
    category: string | null;
    start_lat: number;
    start_lon: number;
    end_lat?: number;
    end_lon?: number;
    polyline?: any; // JSONB
    tags?: { label: string; color: string; }[] | null; // 🔥 NOUVEAU: Tags manuels
};

async function fetchSegments(): Promise<Segment[]> {
    const { data, error } = await supabaseAdmin
        .from("segments")
        // 🔥 AJOUT DE 'tags' dans la requête de sélection
        .select("id, name, distance_m, elevation_gain_m, average_grade, max_grade, category, start_lat, start_lon, end_lat, end_lon, polyline, tags")
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Err fetch segments:", error);
        return [];
    }
    return data as Segment[];
}

export default async function SegmentsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/auth/signin");
    
    // @ts-ignore
    const segments = await fetchSegments();
    
    return (
        <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
            <SegmentsClient initialSegments={segments} userId={session.user.id} />
        </div>
    );
}