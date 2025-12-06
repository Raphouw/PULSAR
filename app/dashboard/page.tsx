// Fichier : app/dashboard/page.tsx
import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabaseAdminClient.js";
import { redirect } from "next/navigation";
import DashboardClient from './dashboardClient';
import DashboardGuard from './DashboardGuard';
import { 
  calculateCP_WPrime, 
  calculateStressBalance, 
} from "../../lib/physics";

export const dynamic = 'force-dynamic';

// --- Helpers pour les Dates ---
const getISODateXDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

const getMonthBoundaries = (): { start: string; prevStart: string; prevEnd: string } => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevStart = prevMonthDate.toISOString();
  prevMonthDate.setDate(today.getDate());
  const prevEnd = prevMonthDate.toISOString();
  return { start, prevStart, prevEnd };
};

// --- Helper Stats ---
type StatBlock = {
  distance: number;
  elevation: number;
  time: number;
  tss: number;
  count: number;
  avg_power: number;
};

type DailyTSSItem = { date: string; tss: number; };

function computePeriodScore(current: StatBlock, previous: StatBlock): number {
  const metrics: (keyof StatBlock)[] = ["tss", "distance", "elevation", "time", "count", "avg_power"];
  
  const scores = metrics.map(m => {
    const prevValue = previous[m] as number;
    const currValue = current[m] as number;

    if (prevValue === 0) {
      return currValue > 0 ? 1.5 : 1.0;
    }
    
    const variation = (currValue - prevValue) / prevValue;
    let score = 1.0 + variation;
    return Math.min(2.0, Math.max(0, score));
  });

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

const calculateStats = (activities: any[]): StatBlock => {
  const stats = activities.reduce((acc, act) => {
    acc.distance += act.distance_km || 0;
    acc.elevation += act.elevation_gain_m || 0;
    acc.time += act.duration_s || 0;
    acc.tss += Number(act.tss) || 0; 
    acc.avg_power += act.avg_power_w || 0;
    acc.count += 1;
    return acc;
  }, { distance: 0, elevation: 0, time: 0, tss: 0, count: 0, avg_power: 0 });

  if (stats.count > 0) {
    stats.avg_power = stats.avg_power / stats.count;
  }
  return stats;
};

export type RecentActivity = {
  id: number;
  name: string;
  distance_km: number;
  elevation_gain_m: number;
  start_time: string;
  avg_speed_kmh: number;
  avg_power_w: number | null;
  tss: number | null;
  polyline: { polyline: string } | null;
};

export type DashboardData = {
  allTimeStats: StatBlock;
  stats: {
    last7: StatBlock;
    prev7: StatBlock;
    month: StatBlock;
    prevMonth: StatBlock;
    last30: StatBlock;
    prev30: StatBlock;
    last90: StatBlock;
    prev90: StatBlock;
  };
  consistency: {
    score7j: number;
    scoreMonth: number;
    score30j: number;
    score90j: number;
    global: number;
  };
  cpCurve: { [key: string]: number };
  dailyTSS: DailyTSSItem[]; 
  recentActivities: RecentActivity[];
  powerModel: {
    metrics: { CP: number; WPrime: number };
    curve: { duration: string; seconds: number; real: number | null; model: number }[];
  };
  fitnessData: { date: string; ctl: number; atl: number; tsb: number }[];
};

function getEmptyDashboardData(): DashboardData {
  const emptyStat: StatBlock = {
    distance: 0, elevation: 0, time: 0, tss: 0, count: 0, avg_power: 0
  };
  
  return {
    allTimeStats: emptyStat,
    stats: {
      last7: emptyStat, prev7: emptyStat,
      month: emptyStat, prevMonth: emptyStat,
      last30: emptyStat, prev30: emptyStat,
      last90: emptyStat, prev90: emptyStat,
    },
    consistency: {
      score7j: 0, scoreMonth: 0, score30j: 0, score90j: 0, global: 0
    },
    cpCurve: {},
    dailyTSS: [],
    recentActivities: [],
    powerModel: { metrics: { CP: 0, WPrime: 0 }, curve: [] },
    fitnessData: []
  };
}

async function checkStravaConnection(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('strava_access_token, strava_refresh_token')
      .eq('id', userId)
      .single();

    if (error || !data) return false;
    return !!(data.strava_access_token && data.strava_refresh_token);
  } catch (error) {
    console.error('Erreur vérification Strava:', error);
    return false;
  }
}

async function getDashboardData(userId: string): Promise<DashboardData> {
  if (!userId || userId === 'undefined' || userId === 'null') {
    throw new Error('Identifiant utilisateur invalide');
  }

  const fetchLimitDate = getISODateXDaysAgo(180); 

  try {
    // 0. 🔥 ON RÉCUPÈRE LA "VÉRITÉ" EN BDD (Ton W' de référence)
    const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('w_prime, ftp')
        .eq('id', userId)
        .single();

    // 1. Récupérer activités
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('activities')
      .select('id, name, distance_km, elevation_gain_m, start_time, duration_s, tss, avg_power_w')
      .eq('user_id', userId)
      .gte('start_time', fetchLimitDate)
      .order('start_time', { ascending: false });

    if (activitiesError) {
      console.error("Erreur récupération activités:", activitiesError);
      return getEmptyDashboardData();
    }

    const allActivities = activities || [];

    // 2. FITNESS
    const tssMap = new Map<string, number>();
    allActivities.forEach(act => {
        if (act.start_time) {
            const dateKey = new Date(act.start_time).toISOString().split('T')[0];
            const val = Number(act.tss) || 0;
            const current = tssMap.get(dateKey) || 0;
            tssMap.set(dateKey, current + val);
        }
    });

    const daysToGenerate = 180;
    const dailyTSSArray: { date: string; tss: number }[] = [];

    for (let i = daysToGenerate; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        dailyTSSArray.push({
            date: dateStr,
            tss: tssMap.get(dateStr) || 0
        });
    }

    const fitnessData = calculateStressBalance(dailyTSSArray);
    const dailyTSS = dailyTSSArray.slice(-8);

    // 3. Records pour le calcul théorique
    const { data: records } = await supabaseAdmin
      .from('records')
      .select('type, duration_s, value')
      .eq('user_id', userId)
      .gte('date_recorded', getISODateXDaysAgo(90));

    // 4. Stats Globales
    const { data: allStatsData } = await supabaseAdmin
      .from('activities')
      .select('distance_km, elevation_gain_m, duration_s, avg_power_w, tss') 
      .eq('user_id', userId);

    const allTimeStats = calculateStats(allStatsData || []);
    
    // 5. Filtrage temporel (inchangé)
    const date_7_ago = new Date(getISODateXDaysAgo(7));
    const date_14_ago = new Date(getISODateXDaysAgo(14));
    const date_30_ago = new Date(getISODateXDaysAgo(30));
    const date_60_ago = new Date(getISODateXDaysAgo(60));
    const date_90_ago = new Date(getISODateXDaysAgo(90));
    const date_180_ago = new Date(getISODateXDaysAgo(180));
    const monthBounds = getMonthBoundaries();
    const date_month_start = new Date(monthBounds.start);
    const date_prev_month_start = new Date(monthBounds.prevStart);
    const date_prev_month_end = new Date(monthBounds.prevEnd);

    const statsLast7 = allActivities.filter(a => new Date(a.start_time) >= date_7_ago);
    const statsPrev7 = allActivities.filter(a => new Date(a.start_time) < date_7_ago && new Date(a.start_time) >= date_14_ago);
    const statsMonth = allActivities.filter(a => new Date(a.start_time) >= date_month_start);
    const statsPrevMonth = allActivities.filter(a => new Date(a.start_time) >= date_prev_month_start && new Date(a.start_time) < date_prev_month_end);
    const statsLast30 = allActivities.filter(a => new Date(a.start_time) >= date_30_ago);
    const statsPrev30 = allActivities.filter(a => new Date(a.start_time) < date_30_ago && new Date(a.start_time) >= date_60_ago);
    const statsLast90 = allActivities.filter(a => new Date(a.start_time) >= date_90_ago);
    const statsPrev90 = allActivities.filter(a => new Date(a.start_time) < date_90_ago && new Date(a.start_time) >= date_180_ago);

    const processedStats = {
      last7: calculateStats(statsLast7),
      prev7: calculateStats(statsPrev7),
      month: calculateStats(statsMonth),
      prevMonth: calculateStats(statsPrevMonth),
      last30: calculateStats(statsLast30),
      prev30: calculateStats(statsPrev30),
      last90: calculateStats(statsLast90),
      prev90: calculateStats(statsPrev90),
    };

    // 6. CALCUL ET SYNCHRO W'
    const cpCurveObj: { [key: string]: number } = {};
    (records || []).forEach(r => {
        if (!cpCurveObj[r.type] || r.value > cpCurveObj[r.type]) {
            cpCurveObj[r.type] = r.value;
        }
    });

    const getBestRecordForDuration = (sec: number) => {
        const matchingRecords = records?.filter(r => r.duration_s === sec);
        if (matchingRecords && matchingRecords.length > 0) {
            return Math.max(...matchingRecords.map(r => r.value));
        }
        return 0;
    };
    
    // Calcul basé sur les 90 derniers jours
    const p3m = getBestRecordForDuration(180) || cpCurveObj['CP3'] || 250;
    const p12m = getBestRecordForDuration(720) || cpCurveObj['CP12'] || 200;
    const calculated = calculateCP_WPrime(p3m, p12m);
    
    // --- 🔥 LA LOGIQUE INTELLIGENTE ICI ---
    const dbWPrime = userProfile?.w_prime || 0; // Ta réf en base (ex: 20400)
    const calcWPrime = calculated.WPrime;       // Ton niveau calculé récent (ex: 10600)

    // Par défaut, on affiche TOUJOURS la valeur BDD (car on suppose qu'elle est juste ou historique)
    let finalWPrime = dbWPrime;

    // SAUF SI le calcul récent est MEILLEUR que la BDD (tu as progressé !)
    if (calcWPrime > dbWPrime) {
        // Alors on met à jour la BDD pour la prochaine fois
        await supabaseAdmin
            .from('users')
            .update({ w_prime: calcWPrime })
            .eq('id', userId);
        
        // Et on affiche cette nouvelle valeur glorieuse
        finalWPrime = calcWPrime;
    }
    
    // Si BDD (20400) > Calcul (10600), on garde 20400.
    // Si BDD est vide (0), on prend le calcul.
    if (finalWPrime === 0) finalWPrime = calcWPrime;

    const CP = calculated.CP; // Le CP, lui, peut fluctuer, c'est moins grave.
    const WPrime = finalWPrime;

    // Génération courbe
    const curvePoints: { label: string, sec: number }[] = [ { label: '30s', sec: 30 } ];
    for (let min = 1; min <= 5; min += 0.5) curvePoints.push({ label: `${min}m`, sec: min * 60 });
    for (let min = 6; min <= 9; min += 1) curvePoints.push({ label: `${min}m`, sec: min * 60 });
    for (let min = 10; min <= 180; min += 5) curvePoints.push({ label: `${min}m`, sec: min * 60 });

    const powerCurveData = curvePoints.map(pt => {
        const model = pt.sec > 0 ? CP + (WPrime / pt.sec) : CP;
        return {
            duration: pt.label,
            seconds: pt.sec,
            real: null, 
            model: Math.round(model)
        };
    });

    // 7. Activités récentes
    const twoWeeksAgoISO = getISODateXDaysAgo(14);
    const { data: recentActivitiesData } = await supabaseAdmin
      .from("activities")
      .select(`id, name, distance_km, elevation_gain_m, start_time, avg_speed_kmh, avg_power_w, tss, polyline`)
      .eq("user_id", userId)
      .gte("start_time", twoWeeksAgoISO)
      .order("start_time", { ascending: false })
      .limit(20);

    // 8. Scores
    const score7j = computePeriodScore(processedStats.last7, processedStats.prev7);
    const scoreMonth = computePeriodScore(processedStats.month, processedStats.prevMonth);
    const score30j = computePeriodScore(processedStats.last30, processedStats.prev30);
    const score90j = computePeriodScore(processedStats.last90, processedStats.prev90);
    const globalScore = (1*score7j + 1*scoreMonth + 4*score30j + 12*score90j) / 18;

    return {
      allTimeStats,
      stats: processedStats,
      consistency: { score7j, scoreMonth, score30j, score90j, global: globalScore },
      cpCurve: cpCurveObj,
      dailyTSS,
      recentActivities: (recentActivitiesData as RecentActivity[]) || [],
      powerModel: { metrics: { CP, WPrime }, curve: powerCurveData },
      fitnessData
    };

  } catch (error) {
    console.error('Erreur dans getDashboardData:', error);
    return getEmptyDashboardData();
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin');

  let userId = session.user?.id;
  if (!userId && session.user?.email) {
    const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', session.user.email).single();
    if (user) userId = user.id;
  }
  if (!userId) redirect('/auth/signin');

  let hasStrava = false;
  let data: DashboardData;

  try {
    hasStrava = await checkStravaConnection(userId);
    data = await getDashboardData(userId);
  } catch (error) {
    console.error('Erreur récupération données:', error);
    data = getEmptyDashboardData();
    hasStrava = false;
  }

  return (
    <DashboardGuard>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <DashboardClient 
          data={data} 
          session={session} 
          hasStrava={hasStrava}
          userName={session.user?.name || 'Athlète'}
        />
      </div>
    </DashboardGuard>
  );
}