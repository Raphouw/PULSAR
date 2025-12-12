// Fichier : app/actions/getWrapped.ts
'use server'

import { supabaseAdmin } from "../../lib/supabaseAdminClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { WrappedStats } from "../../types/wrapped";
import { calculateWrappedStats } from "../../lib/wrapped-analytics"; // 🔥 Importe ton moteur ici

export async function getWrappedData(year: number = 2025): Promise<WrappedStats | null> {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return null;

    try {
        // 1. Récupération du profil utilisateur (Besoin du poids/ftp/taille pour les calculs)
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, weight, ftp, name, height')
            .eq('email', session.user.email)
            .single();

        if (userError || !user) return null;

        // 2. Récupération des activités de l'année
        const { data: activities, error: actError } = await supabaseAdmin
            .from('activities')
            .select('*') // Récupère tout, y compris polyline et type
            .eq('user_id', user.id)
            .gte('start_time', `${year}-01-01T00:00:00Z`)
            .lte('start_time', `${year}-12-31T23:59:59Z`);

        if (actError) throw actError;

        // 3. Récupération des Records
        const { data: records } = await supabaseAdmin
            .from('records')
            .select('*, activities(start_time)')
            .eq('user_id', user.id);

        if (!activities || activities.length < 3) return null;

        // 🔥 LA CLÉ : Utiliser le moteur de calcul que nous avons peaufiné
        // Cela garantit que l'objet retourné correspond exactement à WrappedStats
        const stats = calculateWrappedStats(
            activities, 
            records || [], 
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