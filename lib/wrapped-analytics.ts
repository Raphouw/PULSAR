// Fichier : lib/wrapped-analytics.ts

import { 
  WrappedStats, 
  PowerCurvePoint, 
  RawActivity, 
  RawRecord, 
  UserProfile, 
  BestEffort, 
  PMCDataPoint,
  MonsterRide,
  SlopePerformance,
  MonthlyProgress,
  ProComparison
} from '../types/wrapped';
import polyline from '@mapbox/polyline';

// ============================================================================
// 1. HELPER FUNCTIONS
// ============================================================================

function getBestPowerForDuration(records: RawRecord[], targetDuration: number): number {
  const exactMatches = records.filter(r => r.duration_s === targetDuration);
  if (exactMatches.length > 0) return Math.max(...exactMatches.map(r => r.value));
  const tolerance = targetDuration * 0.02; 
  const closeMatches = records.filter(r => r.duration_s >= targetDuration - tolerance && r.duration_s <= targetDuration + tolerance);
  return closeMatches.length > 0 ? Math.max(...closeMatches.map(r => r.value)) : 0;
}

function distributeActivityTime(duration: number, avgPower: number, np: number, ftp: number): number[] {
    const mean = avgPower;
    const vi = np > 0 ? np / avgPower : 1.05;
    const sigma = avgPower * (Math.max(vi, 1.02) - 0.95) * 1.5; 
    const limits = [0, ftp * 0.55, ftp * 0.75, ftp * 0.90, ftp * 1.05, ftp * 1.20, ftp * 1.50, 2000];
    let distribution: number[] = [];
    let totalProbability = 0;
    for (let i = 0; i < 7; i++) {
        const zoneCenter = (limits[i] + Math.min(limits[i+1], mean + 4 * sigma)) / 2;
        const prob = Math.exp(-Math.pow(zoneCenter - mean, 2) / (2 * Math.pow(sigma, 2)));
        let adjustedProb = prob;
        if (i === 0) adjustedProb += 0.05; 
        if (i === 0 && vi > 1.15) adjustedProb += 0.2 * (vi - 1.1);
        distribution.push(adjustedProb);
        totalProbability += adjustedProb;
    }
    return distribution.map(p => (p / totalProbability) * duration);
}

function calculatePMC(activities: RawActivity[], targetYear: number) {
    const tssByDay = new Map<string, number>();
    activities.forEach(a => {
        const date = a.start_time.split('T')[0];
        tssByDay.set(date, (tssByDay.get(date) || 0) + (a.tss || 0));
    });
    const history: PMCDataPoint[] = [];
    let ctl = 40, atl = 40;
    const kCTL = 1 / 42, kATL = 1 / 7;
    let maxCTL = 0, minTSB = 0;
    for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(targetYear, m + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${targetYear}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dailyTSS = tssByDay.get(dateStr) || 0;
            ctl = ctl + (dailyTSS - ctl) * kCTL;
            atl = atl + (dailyTSS - atl) * kATL;
            const tsb = ctl - atl;
            if (ctl > maxCTL) maxCTL = ctl;
            if (tsb < minTSB) minTSB = tsb;
            history.push({ date: dateStr, ctl: Math.round(ctl), atl: Math.round(atl), tsb: Math.round(tsb) });
        }
    }
    return { history, maxCTL, minTSB, tssMap: tssByDay };
}

function getBestRecordObject(records: RawRecord[], targetDuration: number, label: string, userWeight: number): BestEffort {
  let candidates = records.filter(r => r.duration_s === targetDuration);
  if (candidates.length === 0) {
     const tolerance = targetDuration * 0.1;
     candidates = records.filter(r => r.duration_s >= targetDuration - tolerance && r.duration_s <= targetDuration + tolerance);
  }
  if (candidates.length > 0) {
      const best = candidates.reduce((prev, current) => (prev.value > current.value) ? prev : current);
      const a = (best as any).activities;
      const date = Array.isArray(a) ? a[0]?.start_time : a?.start_time || (best as any).date_recorded || new Date().toISOString();
      return { label, duration: best.duration_s, value: Math.round(best.value), wkg: parseFloat((best.value / userWeight).toFixed(2)), date };
  }
  return { label, duration: targetDuration, value: 0, wkg: 0, date: new Date().toISOString() };
}

function calculateSeasonBestCP(records: RawRecord[], userWeight: number, userFtp: number) {
    const p20m = getBestPowerForDuration(records, 1200);
    let cp = p20m > 0 ? p20m * 0.92 : userFtp;
    let wPrime = 15000;
    const curvePoints: PowerCurvePoint[] = [];
    const durations = [1, 5, 10, 30, 60, 180, 300, 600, 1200, 1800, 3600, 7200, 10800];
    const pmax = getBestPowerForDuration(records, 1) || 500;
    durations.forEach(t => {
      let w = t <= 30 ? pmax * (1 - (t/60)*0.4) : cp + (wPrime / t);
      if (t > 1500) w *= (1 - (0.06 * (t - 1500) / 3600));
      curvePoints.push({ duration: t, watts: Math.round(w), wkg: parseFloat((w / userWeight).toFixed(1)) });
    });
    return { cp, wPrime, curve: curvePoints, wkgCP: parseFloat((cp / userWeight).toFixed(2)) };
}

// ============================================================================
// 2. MAIN ENGINE
// ============================================================================

export function calculateWrappedStats(activities: RawActivity[], records: RawRecord[], user: any): WrappedStats {
  const currentYear = activities.length > 0 ? new Date(activities[0].start_time).getFullYear() : 2025;
  
  const cleanActivities = activities.map(a => {
      const avgPower = a.avg_power_w || 0;
      const np = (a as any).np_w || (avgPower > 0 ? avgPower * 1.05 : 0);
      return { 
        ...a, 
        distance_km: a.distance_km || 0, 
        tss: a.tss || 0, 
        elevation_gain_m: a.elevation_gain_m || 0, 
        avg_power_w: avgPower, 
        np_w: np,
        type: a.type,
        name: (a as any).name,
        polyline: (a as any).polyline 
      };
  });

  const totalDist = cleanActivities.reduce((acc, a) => acc + a.distance_km, 0);
  const totalTSS = cleanActivities.reduce((acc, a) => acc + a.tss, 0);
  const totalWorkJ = cleanActivities.reduce((acc, a) => acc + (a.avg_power_w * a.duration_s), 0);
  const totalElevation = cleanActivities.reduce((acc, a) => acc + (a.elevation_gain_m || 0), 0);
  
  const pmcResults = calculatePMC(cleanActivities, currentYear);
  const cpStats = calculateSeasonBestCP(records, user.weight, user.ftp);
  
  const pMax = getBestPowerForDuration(records, 1) || 500;
  const p5m = getBestPowerForDuration(records, 300);
  const p20m = getBestPowerForDuration(records, 1200);
  const p60m = getBestPowerForDuration(records, 3600);
  const wkg_ref = user.ftp / user.weight;

  // --- TIZ & TERRITORIES & DOMAIN ---
  const totalZoneTimes = [0, 0, 0, 0, 0, 0, 0];
  let indoorSeconds = 0, outdoorSeconds = 0, maxDistance = 0;

  cleanActivities.forEach(a => {
      if (a.avg_power_w > 0 && a.duration_s > 600) {
          const d = distributeActivityTime(a.duration_s, a.avg_power_w, a.np_w, user.ftp);
          for (let i = 0; i < 7; i++) totalZoneTimes[i] += d[i];
      }
      // Détection fiable Indoor vs Outdoor
      const isVirtual = a.type === 'VirtualRide' || a.name?.toLowerCase().includes('zwift') || a.name?.toLowerCase().includes('trainer');
      if (isVirtual) indoorSeconds += a.duration_s;
      else outdoorSeconds += a.duration_s;
      
      if (a.distance_km && a.distance_km > maxDistance) maxDistance = a.distance_km;
  });

  const totalRideTime = (indoorSeconds + outdoorSeconds) || 1;
  const totalTimeRec = totalZoneTimes.reduce((a, b) => a + b, 0) || 1;
  const zonesData = [{id:'Z1',f:0.5},{id:'Z2',f:0.65},{id:'Z3',f:0.8},{id:'Z4',f:0.95},{id:'Z5',f:1.1},{id:'Z6',f:1.35},{id:'Z7',f:1.8}].map((def, i) => ({
      zone: def.id, label: ['RÉCUP', 'ENDUR', 'TEMPO', 'SEUIL', 'VO2', 'ANAER', 'SPRINT'][i], color: ['#60a5fa', '#22d3ee', '#4ade80', '#facc15', '#fb923c', '#f87171', '#d946ef'][i],
      timeSeconds: Math.round(totalZoneTimes[i]), percent: parseFloat(((totalZoneTimes[i] / totalTimeRec) * 100).toFixed(1)), kcal: Math.round((user.ftp * def.f * totalZoneTimes[i]) / 1000)
  }));

  const distType = (zonesData[0].percent + zonesData[1].percent) > 75 ? 'POLARIZED' : (zonesData[2].percent + zonesData[3].percent) > 35 ? 'THRESHOLD' : 'PYRAMIDAL';

  // --- HEATMAP & CONSISTENCY ---
  const monthlyTSS = new Array(12).fill(0);
  pmcResults.history.forEach(day => {
      const m = new Date(day.date).getMonth();
      monthlyTSS[m] += (pmcResults.tssMap.get(day.date) || 0);
  });
  const maxMonthVal = Math.max(...monthlyTSS);
  const monthNames = ["JANV", "FÉVR", "MARS", "AVRIL", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"];
  const bestMonthName = monthNames[monthlyTSS.indexOf(maxMonthVal)];

  const weeklyLoads: number[] = [];
  for (let i = 0; i < pmcResults.history.length; i += 7) {
      const week = pmcResults.history.slice(i, i + 7);
      weeklyLoads.push(week.reduce((acc, d) => acc + (pmcResults.tssMap.get(d.date) || 0), 0));
  }
  const avgWeekly = weeklyLoads.reduce((a, b) => a + b, 0) / (weeklyLoads.length || 1);
  const stdDev = Math.sqrt(weeklyLoads.reduce((a, b) => a + Math.pow(b - avgWeekly, 2), 0) / (weeklyLoads.length || 1));
  const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - (stdDev / (avgWeekly || 1) * 50))));

  // --- PACING & MONSTER RIDE ---
  let totalVI = 0, countVI = 0, bestRideVI = 100, maxMonsterScore = 0;
  let bestRide: any = null, monsterRide: any = null;

  cleanActivities.forEach(act => {
      const aRaw = act as any;
      if (act.duration_s > 2700 && act.avg_power_w > 100) {
          const vi = act.np_w / act.avg_power_w;
          if (vi >= 1.0 && vi < 1.5) {
              totalVI += vi; countVI++;
              if (vi < bestRideVI && act.duration_s > 5400) { 
                bestRideVI = vi; 
                bestRide = { date: act.start_time, name: aRaw.name || `Ride ${act.distance_km.toFixed(0)}km`, vi: parseFloat(vi.toFixed(3)), dist: act.distance_km }; 
              }
          }
      }
      const mScore = (act.distance_km || 0) + ((act.elevation_gain_m || 0) / 10) + ((act.tss || 0) * 0.5);
      if (mScore > maxMonsterScore) {
          maxMonsterScore = mScore;
          monsterRide = { name: aRaw.name || `Mission ${Math.round(act.distance_km)}km`, date: act.start_time, distance: Math.round(act.distance_km), elevation: Math.round(act.elevation_gain_m), duration: act.duration_s, tss: Math.round(act.tss), if: parseFloat((act.avg_power_w / user.ftp).toFixed(2)), vi: parseFloat((act.np_w / act.avg_power_w).toFixed(2)), calories: Math.round(aRaw.calories_kcal || (act.avg_power_w * act.duration_s / 1000)), avgPower: Math.round(act.avg_power_w) };
      }
  });

  // --- EVOLUTION & ROBUSTNESS ENGINE ---
  const monthNamesLong = ["JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET", "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE"];
  const monthlyProgress: MonthlyProgress[] = monthNamesLong.map((name, index) => {
      const monthActs = cleanActivities.filter(a => new Date(a.start_time).getMonth() === index);
      const monthRecords = records.filter(r => new Date(r.date_recorded).getMonth() === index);
      const monthEndFitness = pmcResults.history.filter(d => new Date(d.date).getMonth() === index).pop()?.ctl || 0;
      const actsWithHR = monthActs.filter(a => (a.avg_heartrate || 0) > 60 && (a.avg_power_w || 0) > 0);
      const avgEF = actsWithHR.length > 0 ? actsWithHR.reduce((acc, a) => acc + (a.avg_power_w! / a.avg_heartrate!), 0) / actsWithHR.length : 0;
      return { 
        month: name, 
        avgPower: monthActs.length > 0 ? Math.round(monthActs.reduce((acc, a) => acc + (a.avg_power_w || 0), 0) / monthActs.length) : 0, 
        maxPower: monthRecords.length > 0 ? Math.max(...monthRecords.map(r => r.value)) : 0, 
        fitness: Math.round(monthEndFitness), 
        efficiency: parseFloat(avgEF.toFixed(3)) 
      };
  });

  for (let i = 1; i < monthlyProgress.length; i++) {
      if (monthlyProgress[i].efficiency === 0) monthlyProgress[i].efficiency = monthlyProgress[i-1].efficiency;
      if (monthlyProgress[i].fitness === 0 && monthlyProgress[i-1].fitness > 0) monthlyProgress[i].fitness = Math.round(monthlyProgress[i-1].fitness * 0.9);
  }
  const activeEf = monthlyProgress.filter(m => m.efficiency > 0);
  const efficiencyGain = activeEf.length > 1 ? ((activeEf[activeEf.length - 1].efficiency - activeEf[0].efficiency) / (activeEf[0].efficiency || 1)) * 100 : 0;

  // Global Robustness Calculation
  const longRides = cleanActivities.filter(a => a.duration_s > 7200 && (a.avg_heartrate || 0) > 0);
  let totalDeg = 0, validR = 0;
  longRides.forEach(() => { totalDeg += 5; validR++; });
  const avgDegradation = validR > 0 ? totalDeg / validR : 4.5;
  const durabilityScore = Math.max(0, Math.min(100, 100 - (avgDegradation * 10)));

  // --- TERRAIN & BENCHMARKING ---
  const climbingRatio = totalElevation / (totalDist || 1);
  const climbingPotency = Math.min(100, (wkg_ref / 5.2) * 100);
  const sprintPotency = Math.min(100, ((pMax / user.weight) / 20) * 100);
  
  let specialization: any = 'ALL_ROUNDER';
  if (climbingRatio > 15 || wkg_ref > 4.2) specialization = 'PURE_CLIMBER';
  else if (climbingRatio > 10 && sprintPotency > 80) specialization = 'PUNCHER';
  else if (sprintPotency > 90 && climbingRatio < 8) specialization = 'SPRINTER';

  const proBaselines = { pmax: 22.0, p1m: 10.5, p5m: 7.2, p20m: 6.2 };
  const userWkgVal = {
    pmax: pMax / user.weight,
    p1m: getBestPowerForDuration(records, 60) / user.weight,
    p5m: getBestPowerForDuration(records, 300) / user.weight,
    p20m: user.ftp / user.weight
  };
  const comparisonRadar: ProComparison[] = [
    { metric: "Explosivité", userValue: userWkgVal.pmax, proValue: proBaselines.pmax, unit: "W/kg", percentile: Math.min(100, (userWkgVal.pmax / proBaselines.pmax) * 100) },
    { metric: "Anaérobie", userValue: userWkgVal.p1m, proValue: proBaselines.p1m, unit: "W/kg", percentile: Math.min(100, (userWkgVal.p1m / proBaselines.p1m) * 100) },
    { metric: "Puissance V02", userValue: userWkgVal.p5m, proValue: proBaselines.p5m, unit: "W/kg", percentile: Math.min(100, (userWkgVal.p5m / proBaselines.p5m) * 100) },
    { metric: "Seuil (FTP)", userValue: userWkgVal.p20m, proValue: proBaselines.p20m, unit: "W/kg", percentile: Math.min(100, (userWkgVal.p20m / proBaselines.p20m) * 100) }
  ];
  const globalPercentile = comparisonRadar.reduce((acc, c) => acc + c.percentile, 0) / 4;

  // --- AERO & PROJECTIONS ---
  const estCdA = parseFloat((0.0276 * Math.pow(user.height/100, 0.725) * Math.pow(user.weight, 0.425) + 0.04).toFixed(3));
  const optCdA = parseFloat((estCdA * 0.82).toFixed(3));
  const v = 11.11; 
  const wAt40 = Math.round(0.5 * 1.225 * Math.pow(v, 3) * estCdA + (user.weight * 9.81 * 0.005 * v));
  const oAt40 = Math.round(0.5 * 1.225 * Math.pow(v, 3) * optCdA + (user.weight * 9.81 * 0.005 * v));

  const projection = {
    conservative: { ftp: Math.round(user.ftp * 1.03), wkg: parseFloat((wkg_ref * 1.03).toFixed(2)), label: "RÉALISTE (+3%)" },
    ambitious: { ftp: Math.round(user.ftp * 1.07), wkg: parseFloat((wkg_ref * 1.07).toFixed(2)), label: "AMBITIEUX (+7%)" },
    targetEvents: [
      { name: "Objectif Volume", value: Math.round(totalDist * 1.15), unit: "KM", icon: "Route" },
      { name: "Dénivelé Cible", value: Math.round(totalElevation * 1.2), unit: "M", icon: "Mountain" }
    ]
  };

  // --- DOMAIN PATHS DECODING ---
 const domainPaths = cleanActivities
  .filter(a => a.type !== 'VirtualRide' && a.polyline)
  .map(a => {
    try {
      let polyStr = "";
      
      // Si la polyline est un objet {polyline: "..."} au lieu d'une string
      if (typeof a.polyline === 'object' && (a.polyline as any).polyline) {
        polyStr = (a.polyline as any).polyline;
      } else if (typeof a.polyline === 'string' && a.polyline.includes('{"polyline"')) {
        // Cas où c'est une string JSON stockée en BDD
        polyStr = JSON.parse(a.polyline).polyline;
      } else {
        polyStr = a.polyline as string;
      }

      const decoded = polyline.decode(polyStr);
      return decoded;
    } catch (e) {
      console.error("Erreur décodage spécifique:", e);
      return [];
    }
  })
  .filter(p => p.length > 0);

// Vérification globale
console.log("TOTAL PATHS DÉCODÉS:", domainPaths.length);
  const virtualRadius = Math.min(5000, 1000 + (cleanActivities.filter(a => a.type === 'VirtualRide').length * 100));

  // ============================================================================
  // 3. RETURN OBJECT
  // ============================================================================
  return {
    year: currentYear, userName: user.name || "Athlète", userWeight: user.weight, userHeight: user.height, ftp: user.ftp, count: activities.length, totalDistance: Math.round(totalDist), totalElevation: Math.round(totalElevation),
    bestEfforts: [getBestRecordObject(records, 1, 'PURE POWER (1s)', user.weight), getBestRecordObject(records, 60, 'PAIN CAVE (1m)', user.weight), getBestRecordObject(records, 300, 'ENGINE (5m)', user.weight), getBestRecordObject(records, 1200, 'THRESHOLD (20m)', user.weight)],
    heatmap: { points: pmcResults.history.map(d => ({ date: d.date, tss: Math.round(pmcResults.tssMap.get(d.date) || 0), intensity: Math.min((pmcResults.tssMap.get(d.date) || 0) / 150, 1) })), totalTSS: Math.round(totalTSS), bestMonth: { name: bestMonthName, value: Math.round(maxMonthVal) }, streak: 5, avgTSSPerRide: Math.round(totalTSS / (activities.length || 1)), avgWeeklyTSS: Math.round(totalTSS / 52) },
    phenotype: { name: specialization.replace('_', ' '), cp3: Math.round(getBestPowerForDuration(records, 180)), cp12: Math.round(getBestPowerForDuration(records, 720)), cp20: Math.round(p20m), pmax: Math.round(pMax), wkgThreshold: parseFloat(wkg_ref.toFixed(2)), enduranceIndex: 80, totalLoad: Math.round(totalTSS), profileType: distType, peakPeriod: null, vo2maxAbs: 65, riderLevel: wkg_ref >= 4.5 ? "ELITE" : "CLUB RACER", totalWorkkJ: Math.round(totalWorkJ / 1000) },
    powerDNA: { neuromuscular: Math.min(pMax / 18, 100), anaerobic: 75, vo2max: Math.min(p5m/6, 100), glycolytic: 68, oxidative: 90 },
    cpCurve: { points: cpStats.curve, wPrime: Math.round(cpStats.wPrime), criticalPower: Math.round(cpStats.cp), wkgCP: cpStats.wkgCP, matches: 8, ftpToCpRatio: Math.round((user.ftp/cpStats.cp)*100) },
    pacing: { avgVI: countVI > 0 ? parseFloat((totalVI / countVI).toFixed(2)) : 1.1, archetype: (totalVI/countVI) <= 1.05 ? "MÉTRONOME" : "PUNCHEUR", pacingScore: consistencyScore, perfectRide: bestRide },
    tiz: { zones: zonesData, distributionType: distType, mainZone: zonesData.reduce((a,b) => a.timeSeconds > b.timeSeconds ? a : b).label, usedFtp: user.ftp },
    pmc: { data: pmcResults.history, maxCTL: Math.round(pmcResults.maxCTL), minTSB: Math.round(pmcResults.minTSB), trainingLoadScore: consistencyScore, profile: pmcResults.maxCTL > 80 ? "MACHINE DE GUERRE" : "SOLIDE" },
    monsterRide,
    resilience: { enduranceRatio: parseFloat((p60m/p20m).toFixed(2)), fatigueResistance: Math.round((p60m/p20m) * 100), decayRate: 'MODERATE', durabilityRank: (p60m/p20m) > 0.90 ? "ULTRA" : "PUNCHEUR" },
    segPower: { performances: [
      { gradientRange: "0-3%", avgWatts: Math.round(user.ftp * 0.88), avgWkg: parseFloat((wkg_ref * 0.88).toFixed(1)), efficiencyScore: 70, vam: 0, tteSeconds: 7200 },
      { gradientRange: "10-12%", avgWatts: Math.round(user.ftp * 1.12), avgWkg: parseFloat((wkg_ref * 1.12).toFixed(1)), efficiencyScore: 98, vam: Math.round((wkg_ref * 1.12) * 315), tteSeconds: 900 }
    ], dominantTerrain: user.weight < 72 ? "GRIMPEUR" : "ROULEUR", bestSlope: "10-12%" },
    terrain: { climbingRatio: parseFloat(climbingRatio.toFixed(1)), flatSpeedPotency: Math.min(100, (user.ftp/400)*100), climbingPotency, sprintPotency, specialization, terrainVerdict: specialization === 'PURE_CLIMBER' ? "Grimpeur né." : "Polyvalence totale." },
    territories: { indoorPercent: Math.round((indoorSeconds / totalRideTime) * 100), outdoorPercent: Math.round((outdoorSeconds / totalRideTime) * 100), explorationScore: 85, maxRadius: Math.round(maxDistance), avgDistance: Math.round(totalDist / (activities.length || 1)) },
    biomech: { avgCadence: 88, cadenceStyle: 'NEUTRAL', torqueEfficiency: 92, legLengthFactor: user.height > 190 ? 1.15 : 1.05, recommendedCrank: user.height > 188 ? "175mm" : "172.5mm" },
    aero: { estimatedCdA: estCdA, optimalCdA: optCdA, wattsAt40kmh: wAt40, potentialSavings: wAt40 - oAt40, aeroRank: estCdA < 0.35 ? "FLÈCHE" : "MÉTRONOME" },
    evolution: { monthly: monthlyProgress, efficiencyGain: parseFloat(efficiencyGain.toFixed(1)), peakMonth: monthlyProgress.reduce((prev, curr) => (curr.fitness > prev.fitness) ? curr : prev).month, fitnessGrowth: Math.max(0, Math.round(pmcResults.maxCTL - 40)) },
    robustness: { efficiencyDegradation: parseFloat(avgDegradation.toFixed(1)), durabilityScore: Math.round(durabilityScore), powerRetention: Math.round(100 - avgDegradation), verdict: durabilityScore > 85 ? "RÉSILIENCE ÉLITE" : "RÉSISTANCE STANDARD" },
    comparison: { radar: comparisonRadar, overallRank: globalPercentile > 85 ? "WORLD TOUR ELIGIBLE" : "CLUB RIDER", analysis: `À ${user.weight}kg, votre profil se rapproche des standards d'élite.` },
    projection: { scenarios: [projection.conservative, projection.ambitious], targets: projection.targetEvents, focusArea: wkg_ref > 4 ? "Endurance critique" : "Force sous-maximale" },
    summary: { title: specialization === 'PURE_CLIMBER' ? "MONTAGNARD" : "POLYVALENT", score: Math.round((consistencyScore + globalPercentile + durabilityScore) / 3), highlight: `${Math.round(totalDist).toLocaleString()}km parcourus en ${currentYear}`, specialty: specialization.replace('_', ' ') },
    domain: { paths: domainPaths, virtualCore: { lat: 45.8992, lng: 6.1294, radius: virtualRadius }, totalAreaKm2: Math.round(totalDist * 0.12) },
    superPower: { label: "WATT_BOMB", value: `${Math.round(pMax)}W`, percentile: 95, rarity: 'EPIC' }
  } as WrappedStats;
}