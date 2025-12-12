// Fichier : app/actions/getWrapped.ts
'use server'

import { supabaseAdmin } from "../../lib/supabaseAdminClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { WrappedData, PulsarPersona } from "../../types/wrapped";

export async function getWrappedData(year: number = new Date().getFullYear()): Promise<WrappedData | null> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) return null;
  
  const userId = session.user.id;
  const startDate = `${year}-01-01T00:00:00Z`;
  const endDate = `${year}-12-31T23:59:59Z`;
  const prevStartDate = `${year - 1}-01-01T00:00:00Z`;
  const prevEndDate = `${year - 1}-12-31T23:59:59Z`;

  try {
    // 1. Récupération des activités de l'année cible
    const { data: activities, error: actError } = await supabaseAdmin
      .from('activities')
      .select('distance_km, elevation_gain_m, duration_s, calories_kcal, tss, start_time, max_speed_kmh, avg_power_w, avg_heartrate')
      .eq('user_id', userId)
      .gte('start_time', startDate)
      .lte('start_time', endDate);

    if (actError) throw actError;

    // 2. Récupération des activités de l'année précédente (pour comparaison)
    const { data: prevActivities } = await supabaseAdmin
      .from('activities')
      .select('distance_km') // On veut juste le volume global pour comparer
      .eq('user_id', userId)
      .gte('start_time', prevStartDate)
      .lte('start_time', prevEndDate);

    // 3. Récupération des Records (PBs) tombés cette année
    const { data: records } = await supabaseAdmin
      .from('records')
      .select('type, value, duration_s')
      .eq('user_id', userId)
      .gte('date_recorded', startDate)
      .lte('date_recorded', endDate);

    const safeActivities = activities || [];
    const safePrevActivities = prevActivities || [];


    const activitiesWithData = safeActivities.filter(a => 
    (a.avg_power_w && a.avg_power_w > 0) && 
    (a.avg_heartrate && a.avg_heartrate > 0) // Supposant que tu as ajouté avg_heartrate au select
).length;

const dataQuality = safeActivities.length > 0 
    ? Math.round((activitiesWithData / safeActivities.length) * 100) 
    : 0;

    // --- CALCULS AGREGÉS ---
    
    const totalDist = safeActivities.reduce((acc, curr) => acc + (curr.distance_km || 0), 0);
    const totalElev = safeActivities.reduce((acc, curr) => acc + (curr.elevation_gain_m || 0), 0);
    const totalTimeS = safeActivities.reduce((acc, curr) => acc + (curr.duration_s || 0), 0);
    const totalCals = safeActivities.reduce((acc, curr) => acc + (curr.calories_kcal || 0), 0);
    const totalTSS = safeActivities.reduce((acc, curr) => acc + (curr.tss || 0), 0);
    
    const prevTotalDist = safePrevActivities.reduce((acc, curr) => acc + (curr.distance_km || 0), 0);

    // Trouver les max dans les activités
    const maxSpeed = Math.max(...safeActivities.map(a => a.max_speed_kmh || 0));
    const longestRide = Math.max(...safeActivities.map(a => a.distance_km || 0));
    const highestRide = Math.max(...safeActivities.map(a => a.elevation_gain_m || 0));

    // Trouver les max dans les records (Power Profile)
    const getBestPower = (sec: number) => {
        // On cherche un record proche de la durée demandée (ex: CP5s, CP1m...)
        // Note: Dans ta table records, 'duration_s' est la clé.
        const relevant = records?.filter(r => r.duration_s === sec);
        if (!relevant || relevant.length === 0) return 0;
        return Math.max(...relevant.map(r => r.value || 0));
    };

    // Mapping approximatif si tu n'as pas exactement 5s/60s/1200s dans ta table records
    // Tu devras peut-être ajuster selon comment tu enregistres tes records (CP5, CP1, etc.)
    const best5s = getBestPower(5);
    const best1m = getBestPower(60);
    const best20m = getBestPower(1200);

    // --- DÉTERMINATION DU PERSONA ---
    let persona: PulsarPersona = 'WEEKEND_WARRIOR';
    
    const distPerRide = safeActivities.length > 0 ? totalDist / safeActivities.length : 0;
    const ratioClimb = totalDist > 0 ? (totalElev / totalDist) : 0; // m par km

    if (totalDist > 10000) {
        persona = 'ENDURANCE_TITAN'; // Gros rouleur
    } else if (ratioClimb > 15) { 
        persona = 'SKY_PIERCER'; // > 15m D+ par km moyen
    } else if (maxSpeed > 65 || best5s > 1000) {
        persona = 'VELOCITY_DEMON';
    } else if (best20m > 300 || (totalTSS / safeActivities.length) > 100) {
        persona = 'WATT_MACHINE';
    }

    // --- STATS MENSUELLES ---
    const monthlyData = Array(12).fill(0).map((_, i) => ({ month: i, distance: 0, tss: 0 }));
    safeActivities.forEach(act => {
        if (!act.start_time) return;
        const month = new Date(act.start_time).getMonth();
        monthlyData[month].distance += (act.distance_km || 0);
        monthlyData[month].tss += (act.tss || 0);
    });

    

    // --- PROGRESSION ---
    let progression = 0;
    if (prevTotalDist > 0) {
        progression = ((totalDist - prevTotalDist) / prevTotalDist) * 100;
    } else if (totalDist > 0) {
        progression = 100; // Nouvelle année, 100% bonus !
    }

    return {
      year,
      userName: session.user.name || "Athlète",
      total: {
        distance: Math.round(totalDist),
        elevation: Math.round(totalElev),
        time: Math.round(totalTimeS / 3600),
        activities: safeActivities.length,
        calories: Math.round(totalCals),
        tss: Math.round(totalTSS),
        data_quality: dataQuality,
      },
      best: {
        power_5s: Math.round(best5s),
        power_1m: Math.round(best1m),
        power_20m: Math.round(best20m),
        speed_max: parseFloat(maxSpeed.toFixed(1)),
        longest_ride_km: parseFloat(longestRide.toFixed(1)),
        highest_elevation_ride_m: Math.round(highestRide),
      },
      monthlyStats: monthlyData,
      persona,
      comparison: {
        percent_vs_last_year: Math.round(progression)
      }
    };

  } catch (error) {
    console.error("PULSAR WRAPPED ERROR:", error);
    return null;
  }
}