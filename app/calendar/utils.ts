import { CalendarActivity, ShopEffect } from "./types";
import {
  ChevronLeft, ChevronRight, TrendingUp, Activity, Clock, Zap, MapPin, Flame, Mountain,
  ArrowUpRight, Trophy, BatteryCharging, Sofa, Heart, Wind, Target, Award, ShoppingBag, Sparkles,
  Check, X,
} from "lucide-react"
import { PUNCHLINES } from './constants'

// --- CONSTANTES CSS & COLORS ---
export const getTssColor = (tss: number) => {
  if (tss === 0) return "#333"
  if (tss < 50) return "#10b981"
  if (tss < 100) return "#00f3ff"
  if (tss < 200) return "#f59e0b"
  return "#d04fd7"
}

// --- LOGIQUE WALLET ---
export const calculateWallet = (activities: CalendarActivity[]) => {
  let totalPoints = 0;
  const weekCounts: Record<string, number> = {};

  activities.forEach(act => {
    const effectiveTSS = act.tss || estimateTSS(act);
    
    // Bonus "No Pain No Gain"
    let points = effectiveTSS;
    if (effectiveTSS >= 200) points = Math.floor(effectiveTSS * 1.5);
    else if (effectiveTSS >= 100) points = Math.floor(effectiveTSS * 1.2);

    totalPoints += points;

    // Logique Semaine
    const date = new Date(act.start_time);
    const onejan = new Date(date.getFullYear(), 0, 1);
    const weekNum = Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    const key = `${date.getFullYear()}-W${weekNum}`;
    weekCounts[key] = (weekCounts[key] || 0) + 1;
  });

  // Bonus Constance (4 sorties / semaine)
  Object.values(weekCounts).forEach(count => {
    if (count >= 4) totalPoints += 150;
  });

  return Math.round(totalPoints);
};

export const estimateTSS = (act: CalendarActivity): number => {
  if (act.tss && act.tss > 0) return act.tss;

  const hours = act.duration_s / 3600;
  if (hours <= 0) return 0;

  if (act.avg_heartrate && act.avg_heartrate > 0) {
     const hrMax = act.max_heartrate || 190; 
     const intensity = act.avg_heartrate / hrMax;
     
     let estimatedIF = 0.5;
     if (intensity > 0.6) estimatedIF = 0.6;
     if (intensity > 0.7) estimatedIF = 0.7;
     if (intensity > 0.8) estimatedIF = 0.85;
     if (intensity > 0.9) estimatedIF = 0.95;

     return Math.round(100 * hours * (estimatedIF * estimatedIF));
  }

  const speed = act.avg_speed_kmh || 0;
  let tssPerHour = 30;
  if (speed > 25) tssPerHour = 50;
  if (speed > 30) tssPerHour = 70;

  return Math.round(hours * tssPerHour);
};

// --- PARTICULES & FX ---
export const createParticles = (e: React.MouseEvent | DOMRect, effect: ShopEffect | null, trigger: "hover" | "flip") => {
    if (!effect) return;
    const colors = effect.colors || ["#fff"]
    
    let originX, originY;
    if ('clientX' in e) { 
        const rect = e.currentTarget.getBoundingClientRect();
        originX = e.clientX;
        originY = e.clientY;
        if (trigger === "flip") {
             originX = rect.left + rect.width / 2;
             originY = rect.top + rect.height / 2;
        }
    } else { 
        originX = e.left + Math.random() * e.width;
        originY = e.top + Math.random() * e.height;
        if (effect.id === "firetrail") originY = e.bottom - 10;
    }
    
    let count = trigger === "flip" ? 40 : 3;
    let physicsClass = "physic-float"; 
    let sizeBase = 6;
    let isConfetti = false;

    if (effect.id === "firetrail") { physicsClass = "physic-fire"; count = 3; }
    else if (effect.id === "snow") { physicsClass = "physic-gravity"; count = 2; }
    else if (effect.id === "matrix") { physicsClass = "physic-gravity"; count = 1; }
    else if (effect.id === "lightning") { physicsClass = "physic-zap"; count = 1; }
    else if (effect.id === "explosion") { physicsClass = "physic-blast"; count = 50; }
    else if (effect.id === "confetti") { 
        physicsClass = "physic-gravity"; 
        count = 40; 
        isConfetti = true; 
    }
    else if (effect.id === "bubbles") { physicsClass = "physic-bubble"; count = 1; }
    else if (effect.id === "shatter") { count = 20; physicsClass = "physic-gravity"; }
    else if (effect.id === "black_hole") { physicsClass = "physic-spiral"; count = 40; }

    for (let i = 0; i < count; i++) {
      const particle = document.createElement("div")
      particle.className = `particle-base ${physicsClass}`
      particle.style.left = `${originX}px`
      particle.style.top = `${originY}px`
      particle.style.width = `${Math.max(2, Math.random() * sizeBase)}px`
      particle.style.height = particle.style.width

      if (isConfetti) {
          particle.style.width = `${Math.random() * 8 + 4}px`;
          particle.style.height = `${Math.random() * 6 + 4}px`;
          particle.style.borderRadius = "0";
          particle.style.transform = `rotate(${Math.random() * 360}deg)`;
      } else {
          particle.style.width = `${Math.max(2, Math.random() * sizeBase)}px`
          particle.style.height = particle.style.width
      }

      const color = colors[Math.floor(Math.random() * colors.length)]
      particle.style.background = color

      if (effect.id === "matrix") {
        particle.innerText = Math.random() > 0.5 ? "1" : "0";
        particle.style.background = "transparent";
        particle.style.color = color;
        particle.style.fontSize = "10px";
        particle.style.fontWeight = "bold";
        particle.style.fontFamily = "monospace";
      } 
      else if (effect.id === "explosion" || effect.id === "confetti") {
        const angle = Math.random() * Math.PI * 2
        const velocity = 50 + Math.random() * 200
        particle.style.setProperty("--tx", `${Math.cos(angle) * velocity}px`)
        particle.style.setProperty("--ty", `${Math.sin(angle) * velocity}px`)
      }
      else if (effect.id === "lightning") {
        particle.style.transform = `translate(${(Math.random() - 0.5) * 50}px, ${(Math.random() - 0.5) * 50}px) rotate(${Math.random() * 360}deg)`;
        particle.style.boxShadow = `0 0 15px ${color}`;
      }

      if (isConfetti) {
         const drift = (Math.random() - 0.5) * 100;
         particle.style.setProperty("--tx", `${drift}px`);
      }

      document.body.appendChild(particle)
      setTimeout(() => particle.remove(), 1000)
    }
}

// --- VISUELS & LOGIQUE ---
export const getStreakConfig = (streakIndex: number) => {
  if (streakIndex < 3) return null
  if (streakIndex === 3)
    return {
      level: "bronze",
      color: "#cd7f32",
      gradient: "linear-gradient(90deg, #8B4513, #cd7f32)",
      className: "streak-connector-bronze",
      glowClass: null,
      label: "BRONZE",
      icon: "🥉",
    }
  if (streakIndex >= 4 && streakIndex < 7)
    return {
      level: "silver",
      color: "#c0c0c0",
      gradient: "linear-gradient(90deg, #555, #c0c0c0)",
      className: "streak-connector-silver",
      glowClass: "week-silver-glow",
      label: "ARGENT",
      icon: "🥈",
    }
  if (streakIndex >= 7 && streakIndex < 14)
    return {
      level: "gold",
      color: "#ffd700",
      gradient: "linear-gradient(90deg, #B8860B, #ffd700)",
      className: "streak-connector-gold",
      glowClass: "week-gold-glow",
      label: "OR",
      icon: "🥇",
    }
  if (streakIndex >= 14 && streakIndex < 21)
    return {
      level: "diamond",
      color: "#b9f2ff",
      gradient: "linear-gradient(90deg, #00f3ff, #b9f2ff)",
      className: "streak-connector-diamond",
      glowClass: "week-diamond-glow",
      label: "DIAMANT",
      icon: "💎",
    }
  return {
    level: "mythic",
    color: "#d04fd7",
    gradient: "linear-gradient(90deg, #00f3ff, #d04fd7, #00f3ff)",
    className: "streak-connector-mythic",
    glowClass: "week-mythic-glow",
    label: "MYTHIQUE",
    icon: "👑",
  }
}

export const getTssLevelClass = (tss: number) => {
  if (tss >= 10000) return "tss-level-ultime"
  if (tss >= 5000) return "tss-level-5k"
  if (tss >= 4000) return "tss-level-4k"
  if (tss >= 3000) return "tss-level-3k"
  if (tss >= 2000) return "tss-level-2k"
  if (tss >= 1000) return "tss-level-1k"
  return ""
}

export const getTssLevelInfo = (tss: number) => {
  if (tss >= 10000) return { label: "X", emoji: "🌟", color: "#fff" }
  if (tss >= 5000) return { label: "V", emoji: "🌈", color: "#d04fd7" }
  if (tss >= 4000) return { label: "IV", emoji: "🔥", color: "#ef4444" }
  if (tss >= 3000) return { label: "III", emoji: "⭐", color: "#ffd700" }
  if (tss >= 2000) return { label: "II", emoji: "⚡", color: "#00f3ff" }
  if (tss >= 1000) return { label: "I", emoji: "💜", color: "#d04fd7" }
  return { label: "EN COURS", emoji: "🚴", color: "#888" }
}

export const getStablePhrase = (categoryObj: any, type: "PUNCH" | "MOTIV" | "EGG", seed: number) => {
  if (type === "EGG") return categoryObj.EGG
  const list = categoryObj[type]
  const index = seed % list.length
  return list[index]
}

export const calculateBaseline = (allActivities: CalendarActivity[]) => {
  if (allActivities.length === 0) return null
  const monthlyGroups: Record<string, { tss: number; elev: number; dist: number; count: number }> = {}
  allActivities.forEach((a) => {
    const key = a.start_time.substring(0, 7)
    if (!monthlyGroups[key]) monthlyGroups[key] = { tss: 0, elev: 0, dist: 0, count: 0 }
    monthlyGroups[key].tss += a.tss || 0
    monthlyGroups[key].elev += a.elevation_gain_m || 0
    monthlyGroups[key].dist += a.distance_km || 0
    monthlyGroups[key].count += 1
  })
  const months = Object.values(monthlyGroups)
  const totalMonths = months.length
  if (totalMonths === 0) return null
  return {
    avgMonthlyTSS: months.reduce((acc, m) => acc + m.tss, 0) / totalMonths,
    avgMonthlyElev: months.reduce((acc, m) => acc + m.elev, 0) / totalMonths,
    avgMonthlyDist: months.reduce((acc, m) => acc + m.dist, 0) / totalMonths,
    avgMonthlyCount: months.reduce((acc, m) => acc + m.count, 0) / totalMonths,
  }
}

export const getAdvancedFeedback = (stats: any, monthIndex: number, year: number, baseline: any) => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  if (year > currentYear || (year === currentYear && monthIndex > currentMonth)) {
    return { title: "FUTUR", text: "Patience... On ne lit pas encore l'avenir.", color: "#666", icon: Clock }
  }
  if (year === currentYear && monthIndex === currentMonth) {
    return {
      title: "EN COURS",
      text: "Le mois n'est pas fini ! C'est maintenant que ça se joue. Va rouler !",
      color: "#00f3ff",
      icon: Activity,
    }
  }

  const { totalTSS, totalDist, count, totalElev, avgPwr, avgHr, maxDist, avgSpeed } = stats
  const seed = Math.round(totalTSS + totalDist + count + monthIndex + year)

  if (count === 0)
    return { title: "HIBERNATION", text: getStablePhrase(PUNCHLINES.ZERO, "PUNCH", seed), color: "#666", icon: Sofa }

  const candidates: { title: string; text: string; color: string; icon: any }[] = []

  if (baseline) {
    if (totalElev > baseline.avgMonthlyElev * 1.3 && totalElev > 1000)
      candidates.push({
        title: "GRIMPEUR FOU",
        text: getStablePhrase(PUNCHLINES.ELEV_HIGH, "MOTIV", seed),
        color: "#f59e0b",
        icon: Mountain,
      })

    if (totalTSS > baseline.avgMonthlyTSS * 1.3)
      candidates.push({
        title: "CYBORG",
        text: getStablePhrase(PUNCHLINES.BIG_TSS, "MOTIV", seed),
        color: "#d04fd7",
        icon: Zap,
      })

    if (totalDist > baseline.avgMonthlyDist * 1.3)
      candidates.push({
        title: "ROULE TOUJOURS",
        text: getStablePhrase(PUNCHLINES.BIG_DIST, "MOTIV", seed),
        color: "#00f3ff",
        icon: MapPin,
      })

    if (totalElev < baseline.avgMonthlyElev * 0.6 && baseline.avgMonthlyElev > 500)
      candidates.push({
        title: "PLATISTE",
        text: getStablePhrase(PUNCHLINES.ELEV_LOW, "PUNCH", seed),
        color: "#aaa",
        icon: ArrowUpRight,
      })
  }

  if (avgPwr > 230) candidates.push({ title: "WATTS MONSTER", text: getStablePhrase(PUNCHLINES.HIGH_WATTS, "MOTIV", seed), color: "#d04fd7", icon: Zap })
  if (maxDist > 150) candidates.push({ title: "ULTRA RIDER", text: getStablePhrase(PUNCHLINES.BIG_DIST, "MOTIV", seed), color: "#00f3ff", icon: MapPin })
  if (avgSpeed > 30) candidates.push({ title: "FUSÉE", text: getStablePhrase(PUNCHLINES.SPEED_VIBE, "MOTIV", seed), color: "#00f3ff", icon: TrendingUp })
  if (avgHr > 165) candidates.push({ title: "ZONE ROUGE", text: getStablePhrase(PUNCHLINES.HR_VIBE, "MOTIV", seed), color: "#ef4444", icon: Heart })
  if (avgPwr > 0 && avgPwr < 130) candidates.push({ title: "MODE ÉCO", text: getStablePhrase(PUNCHLINES.LOW_VIBE, "PUNCH", seed), color: "#10b981", icon: BatteryCharging })
  if (count < 4) candidates.push({ title: "TOURISTE", text: getStablePhrase(PUNCHLINES.VOLUME_MONTH, "PUNCH", seed), color: "#ef4444", icon: Sofa })
  if (avgSpeed > 0 && avgSpeed < 22) candidates.push({ title: "PANIER DE CRABES", text: getStablePhrase(PUNCHLINES.SPEED_VIBE, "PUNCH", seed), color: "#aaa", icon: ArrowUpRight })

  if (candidates.length > 0) return candidates[seed % candidates.length]

  if (count > 8) return { title: "RÉGULIER", text: getStablePhrase(PUNCHLINES.REGULAR, "MOTIV", seed), color: "#10b981", icon: Activity }

  return { title: "SOLIDE", text: "Le travail paie. Continue d'empiler les briques.", color: "#fff", icon: Activity }
}

export const getSmartCardStyle = (activities: CalendarActivity[]) => {
  if (!activities || activities.length === 0) return null;

  const mainAct = [...activities].sort((a, b) => (b.tss || 0) - (a.tss || 0))[0];
  const tss = mainAct.tss || 0;
  const durationHours = (mainAct.duration_s || 0) / 3600;
  const distance = mainAct.distance_km || 0;
  const elevation = mainAct.elevation_gain_m || 0;
  const speed = mainAct.avg_speed_kmh || 0;

  // Ratios
  const tssPerHour = durationHours > 0 ? tss / durationHours : 0;
  const climbRatio = distance > 0 ? elevation / distance : 0;

  // 1. INTENSITÉ
  if (tssPerHour > 98) {
    return { class: "smart-heat", label: "INTENSITÉ 🔥" };
  }

  // 2. VITESSE
  if (speed > 28 && climbRatio < 15) {
    return { class: "smart-speed", label: "VITESSE ⚡" };
  }

  // 3. MONTAGNE
  if (climbRatio > 15) {
    const percent = Math.min(90, Math.max(30, (elevation / (5000) * (50 - 30) + 30)));
    return { 
        class: "smart-climb", 
        label: "MONTAGNE ⛰️",
        variable: { "--climb-h": `${Math.round(percent)}%` } 
    };
  }

  return null;
};

export const getStartCoordFromPolyline = (encoded: string): { lat: number, lon: number } | null => {
  if (!encoded) return null;
  let index = 0, lat = 0, lng = 0;
  let b, shift = 0, result = 0;
  do {
    b = encoded.charCodeAt(index++) - 63;
    result |= (b & 0x1f) << shift;
    shift += 5;
  } while (b >= 0x20);
  const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
  lat += dlat;
  shift = 0;
  result = 0;
  do {
    b = encoded.charCodeAt(index++) - 63;
    result |= (b & 0x1f) << shift;
    shift += 5;
  } while (b >= 0x20);
  const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
  lng += dlng;
  return { lat: lat * 1e-5, lon: lng * 1e-5 };
};

export const resolveCardClass = (
    hasActivity: boolean,
    isToday: boolean,
    slotStyles: { frame?: string | null, smart?: string | null, today?: string | null, hover?: string | null }
): string => {
    let classes = "day-cell";
    if (isToday && slotStyles.today === "reactor_today") return `${classes} today-reactor`;
    
    // 🔥 AJOUT ICI : Smart + Frame + HOVER (Corrigé)
    if (slotStyles.smart) classes += ` ${slotStyles.smart}`;
    if (hasActivity && slotStyles.frame) classes += ` ${slotStyles.frame}`;
    if (hasActivity && slotStyles.hover) classes += ` ${slotStyles.hover}`; // Le fix pour les effets Jelly/Glitch
    
    return classes;
};