import { supabaseAdmin } from '../../lib/supabaseAdminClient';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import WrappedClient from './WrappedClient';
import { calculateWrappedStats } from '../../lib/wrapped-analytics';

export default async function WrappedPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) redirect("/auth/signin");

    const currentYear = 2025; 

    // 1. Récupérer l'ID utilisateur (BigInt/Number) via l'email
    // ⚡ FIX: On cast le retour en 'any' pour éviter l'erreur 'never'
    const { data: publicUserData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, weight, ftp, name, height')
        .eq('email', session.user.email)
        .single();

    const publicUser = publicUserData as any;

    if (userError || !publicUser) {
        console.error("User not found in public table", userError);
        return <div className="text-white p-10 bg-black min-h-screen">Erreur : Profil utilisateur introuvable.</div>;
    }

    const userId = Number(publicUser.id); // Sécurité pour le typage BigInt/Number
    const weight = publicUser.weight || 68;
    const ftp = publicUser.ftp || 300;
    const height = publicUser.height || 175;

    // 2. Fetch Activities pour l'année 2025
    const { data: activitiesData } = await supabaseAdmin
        .from('activities')
        .select(`
            id, start_time, duration_s, distance_km, elevation_gain_m, 
            avg_power_w, max_speed_kmh, tss, avg_heartrate, np_w, type, polyline
        `) 
        .eq('user_id', userId)
        .gte('start_time', `${currentYear}-01-01T00:00:00`)
        .lte('start_time', `${currentYear}-12-31T23:59:59`)
        .order('start_time', { ascending: true });

    const activities = (activitiesData || []) as any[];

    // 3. Fetch Records (Power Curve)
    // ⚡ FIX: Cast builder 'any' pour la jointure complexes sur 'activities'
    const { data: rawRecordsData } = await (supabaseAdmin
        .from('records') 
        .select(`
            duration_s, value, date_recorded, type,
            activities ( start_time ) 
        `) as any)
        .eq('user_id', userId);

    const rawRecords = (rawRecordsData || []) as any[];

    // 4. Filtrage JS des records pour l'année en cours
    const validRecords = rawRecords.filter((r: any) => {
        const actDate = Array.isArray(r.activities) 
            ? r.activities[0]?.start_time 
            : r.activities?.start_time;
            
        const fallbackDate = r.date_recorded;
        const dateStr = actDate || fallbackDate;
        
        return dateStr && dateStr.startsWith(String(currentYear));
    });

    if (activities.length < 5) {
        return (
            <div className="text-white bg-black min-h-screen flex items-center justify-center font-mono">
                PAS ASSEZ DE DONNÉES POUR GÉNÉRER TON WRAPPED. (Min: 5 activités)
            </div>
        );
    }

    // 5. Calculs analytiques via le moteur PULSAR
    // 
    const stats = calculateWrappedStats(
        activities, 
        validRecords, 
        { id: userId, weight, ftp, height }
    );
    
    stats.userName = publicUser.name || "Athlète";

    return <WrappedClient stats={stats} />;
}