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

    // ÉTAPE CRUCIALE : Récupérer l'ID BigInt via l'email
    // On assume que l'email est unique dans ta table public.users
    const { data: publicUser, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, weight, ftp, name, height')
        .eq('email', session.user.email)
        .single();

    if (userError || !publicUser) {
        console.error("User not found in public table", userError);
        return <div className="text-white p-10">Erreur : Profil utilisateur introuvable.</div>;
    }

    const userId = publicUser.id; // C'est le BigInt !
    const weight = publicUser.weight || 68;
    const ftp = publicUser.ftp || 300;
    const height = publicUser.height || 175;

    // 2. Fetch Activities avec l'ID correct
    const { data: activities } = await supabaseAdmin
        .from('activities')
        .select(`
            id,
            start_time, 
            duration_s,
            distance_km, 
            elevation_gain_m, 
            avg_power_w,
            max_speed_kmh,
            tss,
            avg_heartrate,
            np_w,
            type, 
            polyline
        `) 
        .eq('user_id', userId) // On utilise le BigInt ici
        .gte('start_time', `${currentYear}-01-01T00:00:00`)
        .lte('start_time', `${currentYear}-12-31T23:59:59`)
        .order('start_time', { ascending: true });

    // 3. Fetch Records avec l'ID correct
   const { data: rawRecords } = await supabaseAdmin
        .from('records') 
        .select(`
            duration_s, 
            value, 
            date_recorded, 
            type,
            activities ( start_time ) 
        `)
        .eq('user_id', userId);

    // --- DEBUG ZONE ---
    // Regarde ta console serveur (terminal VS Code) quand tu charges la page
    console.log(`🔍 DEBUG: ${rawRecords?.length || 0} records trouvés au total.`);
    
    // FILTRAGE JS (Plus fiable)
    // On ne garde que les records dont l'ACTIVITÉ liée est bien en 2025
   const validRecords = (rawRecords || []).filter((r: any) => {
        
        // On gère le cas où activities est un tableau ou un objet (bizarrerie Supabase parfois)
        const actDate = Array.isArray(r.activities) 
            ? r.activities[0]?.start_time 
            : r.activities?.start_time;
            
        const fallbackDate = r.date_recorded;
        
        // La date qu'on va utiliser pour vérifier l'année
        const dateStr = actDate || fallbackDate;
        
        if (!dateStr) return false;

        // On garde seulement si ça commence par "2025"
        return dateStr.startsWith(String(currentYear));
    });

    console.log(`✅ DEBUG: ${validRecords.length} records valides pour ${currentYear}.`);
    
    // Vérifions ton CP3 spécifiquement
    const cp3Check = validRecords
        .filter(r => r.duration_s >= 175 && r.duration_s <= 185)
        .sort((a, b) => b.value - a.value)[0]; // Le plus fort
    
    console.log("🏆 RECORD CP3 TROUVÉ :", cp3Check ? `${cp3Check.value}W` : "AUCUN");
    // -------------------

    if (!activities || activities.length < 5) {
        return <div className="text-white">Pas assez de données. (Activités: {activities?.length})</div>;
    }

    // 4. Calculs via le moteur
    const stats = calculateWrappedStats(
        activities, 
        validRecords as any[], // On passe les records filtrés
        { id: userId, weight, ftp, height }
    );
    
    stats.userName = publicUser.name || "Athlète";

    return <WrappedClient stats={stats} />;
}