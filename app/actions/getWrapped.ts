// Fichier : app/actions/getWrapped.ts
'use server'

import { supabaseAdmin } from "../../lib/supabaseAdminClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { WrappedStats } from "../../types/wrapped";
import { calculateWrappedStats } from "../../lib/wrapped-analytics"; 

export async function getWrappedData(year: number = 2025): Promise<WrappedStats | null> {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return null;

    try {
        // 1. Récupération du profil utilisateur
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, weight, ftp, name, height')
            .eq('email', session.user.email)
            .single();

        if (userError || !userData) return null;

        // ⚡ FIX: On cast le user en any pour débloquer l'accès aux propriétés
        const user = userData as any;

        // 2. Récupération des activités de l'année
        const { data: activitiesData, error: actError } = await supabaseAdmin
            .from('activities')
            .select('*') 
            .eq('user_id', user.id) // user.id fonctionne maintenant
            .gte('start_time', `${year}-01-01T00:00:00Z`)
            .lte('start_time', `${year}-12-31T23:59:59Z`);

        if (actError) throw actError;

        // ⚡ FIX: Cast array activities
        const activities = (activitiesData || []) as any[];

        // 3. Récupération des Records
        const { data: recordsData } = await supabaseAdmin
            .from('records')
            .select('*, activities(start_time)')
            .eq('user_id', user.id);

        // ⚡ FIX: Cast array records
        const records = (recordsData || []) as any[];

        if (!activities || activities.length < 3) return null;

        // 🔥 LA CLÉ : Utiliser le moteur de calcul que nous avons peaufiné
        const stats = calculateWrappedStats(
            activities, 
            records, 
            { 
                id: user.id, 
                weight: user.weight || 68, 
                ftp: user.ftp || 300, 
                height: user.height || 192,
                name: user.name 
            }
        );

        return stats;

    } catch (error) {
        console.error("PULSAR WRAPPED ERROR:", error);
        return null;
    }
}