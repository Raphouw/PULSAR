// Fichier : app/dashboard/page.tsx
import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";
import { redirect } from "next/navigation";
import DashboardClient from './dashboardClient';
import DashboardGuard from './DashboardGuard';
import { 
  calculateCP_WPrime, 
  calculateStressBalance, 
} from "../../lib/physics";

// 🔥 IMPORTANT : Force le recalcul à chaque chargement de page
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

// --- Types et Helpers Stats ---
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
  duration_s: number;
  type: string | null;
  np_w?: number | null;
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
  fitnessHistory: any[]; 
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
    fitnessData: [],
    fitnessHistory: []
  };
}

async function checkStravaConnection(userId: string): Promise<boolean> {
  try {
    const uid = Number(userId); 
    if(isNaN(uid)) return false;

    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('strava_access_token, strava_refresh_token')
      .eq('id', uid)
      .single();

    if (error || !userData) return false;
    
    // ⚡ FIX: Cast pour éviter l'erreur 'never'
    const data = userData as any;
    return !!(data.strava_access_token && data.strava_refresh_token);
  } catch (error) {
    console.error('Erreur vérification Strava:', error);
    return false;
  }
}

// --- MAIN DATA FETCHING ---
async function getDashboardData(userId: string): Promise<DashboardData> {
  if (!userId || userId === 'undefined' || userId === 'null') {
    throw new Error('Identifiant utilisateur invalide');
  }

  const uid = Number(userId);
  if(isNaN(uid)) throw new Error('ID invalide');

  const fetchLimitDate = getISODateXDaysAgo(180); 

  try {
    // 0. 🔥 PROFIL UTILISATEUR
    const { data: userProfileData } = await supabaseAdmin
        .from('users')
        .select('w_prime, ftp, updated_at')
        .eq('id', uid)
        .single();
    
    const userProfile = userProfileData as any; // ⚡ FIX CAST

    // 1. Récupérer toutes les activités
    const { data: activitiesData, error: activitiesError } = await supabaseAdmin
      .from('activities')
      .select('id, name, distance_km, elevation_gain_m, start_time, duration_s, tss, avg_power_w, type, avg_speed_kmh')
      .eq('user_id', uid)
      .gte('start_time', fetchLimitDate)
      .order('start_time', { ascending: false });

    if (activitiesError) {
      console.error("Erreur récupération activités:", activitiesError);
      return getEmptyDashboardData();
    }

    const allActivities: any[] = activitiesData || [];

    // 2. FITNESS & TSS
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

    // 3. Records (90j glissants)
    const { data: recordsData } = await supabaseAdmin
      .from('records')
      .select('type, duration_s, value')
      .eq('user_id', uid)
      .gte('date_recorded', getISODateXDaysAgo(90));
    
    const records: any[] = recordsData || []; 

    // 4. STATS GLOBALES
    const { data: allStatsData } = await supabaseAdmin
      .from('activities')
      .select('distance_km, elevation_gain_m, duration_s, avg_power_w, tss') 
      .eq('user_id', uid);

    const allTimeStats = calculateStats((allStatsData as any[]) || []);
    
    // 5. FILTRAGE TEMPOREL
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

    // 6. MODÈLE BIOLOGIQUE
    const cpCurveObj: { [key: string]: number } = {};
    records.forEach(r => {
        if (!cpCurveObj[r.type] || r.value > cpCurveObj[r.type]) {
            cpCurveObj[r.type] = r.value;
        }
    });

    const getBestRecord = (sec: number) => {
        const matches = records.filter(r => r.duration_s === sec);
        return matches && matches.length > 0 ? Math.max(...matches.map(r => r.value)) : 0;
    };
    
    const p3m = getBestRecord(180) || cpCurveObj['CP3'] || 250;
    const p12m = getBestRecord(720) || cpCurveObj['CP12'] || 200;
    const calculated = calculateCP_WPrime(p3m, p12m);
    
    const dbWPrime = userProfile?.w_prime || 0; 
    const calcWPrime = calculated.WPrime;
    const updatedAt = userProfile?.updated_at ? new Date(userProfile.updated_at) : new Date();

    let finalWPrime = dbWPrime;

    // CAS 1 : PROGRESSION
    if (calcWPrime > dbWPrime + 100) {
        // ⚡ FIX: On cast le builder en any pour éviter le blocage 'never' sur l'update
        await (supabaseAdmin.from('users') as any)
            .update({ w_prime: calcWPrime, updated_at: new Date().toISOString() }) 
            .eq('id', uid);
        finalWPrime = calcWPrime;
    }
    // CAS 2 : ÉROSION
    else if (calcWPrime < dbWPrime) {
        const now = new Date();
        const diffMs = now.getTime() - updatedAt.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays >= 1) {
            const decayRate = 0.005; 
            const decayAmount = Math.floor(dbWPrime * decayRate * diffDays);
            const decayedWPrime = Math.max(calcWPrime, dbWPrime - decayAmount);

            if (decayedWPrime < dbWPrime) {
                // ⚡ FIX: On cast le builder en any pour éviter le blocage 'never' sur l'update
                await (supabaseAdmin.from('users') as any)
                    .update({ w_prime: decayedWPrime, updated_at: new Date().toISOString() })
                    .eq('id', uid);
                finalWPrime = decayedWPrime;
            }
        }
    }
    
    if (finalWPrime === 0) finalWPrime = calcWPrime;

    const CP = calculated.CP; 
    const WPrime = finalWPrime; 

    const curvePoints: { label: string, sec: number }[] = [ { label: '30s', sec: 30 } ];
    const minutesToAdd = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 45, 60, 90, 120, 180];
    
    minutesToAdd.forEach(min => {
        curvePoints.push({ label: `${min}m`, sec: min * 60 });
    });

    const powerCurveData = curvePoints.map(pt => {
        const model = pt.sec > 0 ? CP + (WPrime / pt.sec) : CP;
        return {
            duration: pt.label,
            seconds: pt.sec,
            real: null, 
            model: Math.round(model)
        };
    });

    // 7. Activités Récentes (14j)
    const twoWeeksAgoISO = getISODateXDaysAgo(14);
    const { data: recentActivitiesData } = await supabaseAdmin
      .from("activities")
      .select(`id, name, distance_km, elevation_gain_m, start_time, avg_speed_kmh, avg_power_w, tss, polyline, duration_s, type`)
      .eq("user_id", uid)
      .gte("start_time", twoWeeksAgoISO)
      .order("start_time", { ascending: false })
      .limit(20);

    // 8. Scores
    const score7j = computePeriodScore(processedStats.last7, processedStats.prev7);
    const scoreMonth = computePeriodScore(processedStats.month, processedStats.prevMonth);
    const score30j = computePeriodScore(processedStats.last30, processedStats.prev30);
    const score90j = computePeriodScore(processedStats.last90, processedStats.prev90);
    const globalScore = (1*score7j + 1*scoreMonth + 4*score30j + 12*score90j) / 18;

    const { data: graphdata } = await supabaseAdmin
      .from("user_fitness_history")
      .select(`id, user_id, date_calculated, ftp_value, w_prime_value, cp3_value, cp12_value, vo2max_value, tte_value, source_activity_id, model_cp3, model_cp12`)
      .eq("user_id", uid)
      .order("date_calculated", { ascending: false });

    return {
      allTimeStats,
      stats: processedStats,
      consistency: { score7j, scoreMonth, score30j, score90j, global: globalScore },
      cpCurve: cpCurveObj,
      dailyTSS,
      recentActivities: (recentActivitiesData as unknown as RecentActivity[]) || [], // ⚡ FORCE CAST FINAL
      powerModel: { metrics: { CP, WPrime }, curve: powerCurveData },
      fitnessData,
      fitnessHistory: (graphdata as any[]) || []
    };

  } catch (error) {
    console.error('Erreur dans getDashboardData:', error);
    return getEmptyDashboardData();
  }
}

// --- Page Serveur ---
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin');

  let userId = session.user?.id;
  
  // Récupération ID si connexion email pure
  if (!userId && session.user?.email) {
    const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single();
    
    // ⚡ FIX CAST
    const u = user as any;
    if (u) userId = u.id;
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