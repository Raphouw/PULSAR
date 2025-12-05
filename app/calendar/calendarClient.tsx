"use client"

import type React from "react"
import { useState, useMemo } from "react"
import {
  ChevronLeft, ChevronRight, TrendingUp, Activity, Clock, Zap, Flame, Mountain,
  ArrowUpRight, Trophy, Wind, Target, Award, ShoppingBag
} from "lucide-react"
import { BarChart, Bar, AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts"
import "./calendar.css"
import { CalendarActivity, ShopEffect, CalendarDay, CumulativeDataPoint, ShopData, UserLoadout } from "./types"
import { SHOP_EFFECTS, MONTHS } from "./constants"
import {
  calculateWallet, estimateTSS, calculateBaseline, getAdvancedFeedback, getTssLevelInfo, getTssLevelClass, createParticles
} from "./utils"
import WeatherSystem from "./WeatherSystem"
import ShopModal from "./components/ShopModal"
import DayCard from "./components/DayCard"

// --- STYLES UTILITAIRES (Pour garder la compatibilité visuelle) ---
// Note: Idéalement à migrer en classes CSS/Tailwind, mais gardé ici pour l'instant
const styles = {
  container: { display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" as const, maxHeight: "100vh", overflow: "hidden", padding: "0.5rem" },
  calendarSection: { flex: "1 1 70%", minWidth: "0", maxHeight: "100vh", overflow: "hidden" },
  sidebarSection: { flex: "0 0 22%", display: "flex", flexDirection: "column" as const, gap: "0.75rem", maxHeight: "100vh", overflowY: "auto" as const, overflowX: "hidden" as const, scrollbarWidth: "none" as const },
  glassPanel: { background: "rgba(20, 20, 30, 0.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "14px", padding: "1rem", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", position: "relative" as const },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", background: "rgba(255,255,255,0.03)", padding: "0.5rem 0.75rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap" as const, gap: "0.5rem" },
  monthTitle: { fontSize: "1.5rem", fontWeight: 900, background: "linear-gradient(90deg, #fff 0%, #a0a0a0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0, textTransform: "uppercase" as const, minWidth: "200px" },
  navButton: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" },
  gridHeader: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", marginBottom: "0.4rem" },
  gridHeaderCell: { textAlign: "center" as const, color: "#666", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", paddingBottom: "0.4rem" },
  gridContainer: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "6px" },
  cyberButton: (color: string, filled: boolean = false) => ({ padding: "8px 16px", background: filled ? `linear-gradient(135deg, ${color}cc, ${color}66)` : "rgba(255, 255, 255, 0.03)", border: `1px solid ${filled ? "transparent" : color}`, borderRadius: "8px", color: filled ? "#fff" : color, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", textTransform: "uppercase" as const, letterSpacing: "1px", boxShadow: filled ? `0 4px 15px ${color}40` : "none", transition: "all 0.2s ease", backdropFilter: "blur(5px)" }),
  progressContainer: { display: "flex", gap: "0.75rem", padding: "0.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "0.75rem", flexWrap: "wrap" as const },
  progressItem: { flex: "1 1 150px", minWidth: "120px" },
  progressLabel: { fontSize: "0.65rem", color: "#888", fontWeight: 700, textTransform: "uppercase" as const, marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" },
  progressBarBg: { width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "10px", overflow: "hidden" as const, position: "relative" as const },
  progressBarFill: (color: string, percent: number) => ({ height: "100%", width: `${Math.min(100, percent)}%`, background: `linear-gradient(90deg, ${color}, ${color}dd)`, borderRadius: "10px", transition: "width 0.5s ease", boxShadow: `0 0 10px ${color}80` }),
  progressValue: { fontSize: "0.7rem", color: "#fff", fontWeight: 700, marginTop: "2px" },
  compactStatRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  compactStatLabel: { fontSize: "0.7rem", color: "#888", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" },
  compactStatValue: { fontSize: "0.85rem", fontWeight: 700, color: "#fff" },
  sidebarLabel: { fontSize: "0.65rem", color: "#888", fontWeight: 600, textTransform: "uppercase" as const },
  highlightValue: { fontSize: "2.2rem", fontWeight: 900, lineHeight: 1 },
  chartContainer: { height: "80px", width: "100%", marginTop: "0.4rem" },
}

export default function CalendarClient({ activities, initialShopData }: { activities: CalendarActivity[], initialShopData: ShopData }) {
  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date())
  const [spentTSS, setSpentTSS] = useState(initialShopData.spentTSS)
  const [ownedEffects, setOwnedEffects] = useState<Set<string>>(new Set(initialShopData.ownedEffects))
  const [loadout, setLoadout] = useState<UserLoadout>(initialShopData.loadout)
  const [shopOpen, setShopOpen] = useState(false)

  // Animation States
  const [flippingCells, setFlippingCells] = useState<Set<number>>(new Set())
  const [clickingCells, setClickingCells] = useState<Set<number>>(new Set())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  // --- LOGIQUE BOUTIQUE ---
  const walletTotal = useMemo(() => calculateWallet(activities), [activities]);
  const currentBalance = walletTotal - spentTSS;

  const saveLoadoutToDB = (newLoadout: UserLoadout) => {
      fetch('/api/shop/equip', { 
          method: 'POST', body: JSON.stringify({ loadout: newLoadout }) 
      }).catch(err => console.error("Erreur sauvegarde loadout:", err));
  };

  const handleToggleEffect = (effect: ShopEffect) => {
      if (!ownedEffects.has(effect.id)) return;
      const currentInSlot = loadout[effect.slot];
      const newValue = currentInSlot === effect.id ? null : effect.id;
      const newLoadout = { ...loadout, [effect.slot]: newValue };
      setLoadout(newLoadout);
      saveLoadoutToDB(newLoadout);
  };

  const handleUnequipAll = () => {
      const emptyLoadout: UserLoadout = { FRAME: null, HOVER: null, TRAIL: null, INTERACTION: null, AMBIANCE: null, TODAY: null, SPECIAL: null };
      setLoadout(emptyLoadout);
      saveLoadoutToDB(emptyLoadout);
  };

  const handlePurchase = async (effect: ShopEffect) => {
      if (currentBalance >= effect.price && !ownedEffects.has(effect.id)) {
          setSpentTSS(prev => prev + effect.price);
          setOwnedEffects(prev => new Set(prev).add(effect.id));
          const newLoadout = { ...loadout, [effect.slot]: effect.id };
          setLoadout(newLoadout);
          saveLoadoutToDB(newLoadout);
          try {
              await fetch('/api/shop/buy', { method: 'POST', body: JSON.stringify({ effectId: effect.id, cost: effect.price }) });
          } catch(e) { console.error("Erreur achat:", e); }
      }
  };

  // --- CALCULS STATS & BASELINE ---
  const baseline = useMemo(() => calculateBaseline(activities), [activities])
  const stats = useMemo(() => {
    const acts = activities.filter((a) => {
      const d = new Date(a.start_time)
      return d.getMonth() === month && d.getFullYear() === year
    })
    const totalDist = acts.reduce((acc, a) => acc + (a.distance_km || 0), 0)
    const totalElev = acts.reduce((acc, a) => acc + (a.elevation_gain_m || 0), 0)
    const totalTime = acts.reduce((acc, a) => acc + (a.duration_s || 0), 0)
    const totalTSS = acts.reduce((acc, a) => acc + (a.tss || estimateTSS(a)), 0)
    const totalKcal = acts.reduce((acc, a) => acc + (a.calories_kcal || (a.tss ? a.tss * 12 : 0)), 0)
    const climbRatio = totalDist > 0 ? (totalElev / totalDist).toFixed(1) : "0"
    const avgSpeed = (totalTime / 3600) > 0 ? totalDist / (totalTime / 3600) : 0
    const count = acts.length
    
    const weeksData = [{ name: "S1", tss: 0 }, { name: "S2", tss: 0 }, { name: "S3", tss: 0 }, { name: "S4", tss: 0 }, { name: "S5", tss: 0 }]
    acts.forEach((a) => {
      const d = new Date(a.start_time).getDate()
      const weekIndex = Math.min(4, Math.floor((d - 1) / 7))
      weeksData[weekIndex].tss += (a.tss || estimateTSS(a))
    })

    const cumulativeData: CumulativeDataPoint[] = []
    let runningDist = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
        const dayDist = acts.filter((a) => new Date(a.start_time).getDate() === d).reduce((sum, a) => sum + (a.distance_km || 0), 0)
        runningDist += dayDist
        cumulativeData.push({ day: d, km: Math.round(runningDist) })
    }

    let currentStreak = 0;
    let maxStreak = 0;
    for (let d = 1; d <= daysInMonth; d++) {
        const dayHasAct = acts.some(a => new Date(a.start_time).getDate() === d);
        if (dayHasAct) currentStreak++; else currentStreak = 0;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
    }
    const fullWeeksCount = weeksData.filter(w => w.tss > 0).length; 

    return { totalDist, totalElev, totalTime, totalTSS, totalKcal, climbRatio, count, weeksData, cumulativeData, avgSpeed, maxDist: 0, maxStreak, fullWeeksCount }
  }, [year, month, activities])

  const feedback = useMemo(() => getAdvancedFeedback(stats, month, year, baseline), [stats, month, year, baseline])
  const FeedbackIcon = feedback.icon
  const tssLevelInfo = getTssLevelInfo(stats.totalTSS)
  const tssLevelClass = getTssLevelClass(stats.totalTSS)
  const isWeatherActive = loadout.AMBIANCE === "weather_dynamic";

  // --- DATA DU MOIS ---
  const monthData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayIndex = new Date(year, month, 1).getDay()
    const startDayOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1
    const days: CalendarDay[] = []
    for (let i = 0; i < startDayOffset; i++) days.push({ dayNum: 0, acts: [], totalTSS: 0, streakIndex: 0 })
    
    let currentStreak = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayActs = activities.filter((a) => {
        const date = new Date(a.start_time)
        return date.getDate() === d && date.getMonth() === month && date.getFullYear() === year
      })
      const totalTSS = dayActs.reduce((acc, a) => acc + (a.tss || estimateTSS(a)), 0)
      if (dayActs.length > 0) currentStreak++; else currentStreak = 0;
      days.push({ dayNum: d, acts: dayActs, totalTSS, streakIndex: currentStreak })
    }
    return days;
  }, [year, month, activities])

  // --- HANDLER CLIC ---
  const handleCardClick = (dayIndex: number, hasActivity: boolean, e: React.MouseEvent) => {
    if (!hasActivity) return;
    const clickId = loadout.INTERACTION;
    const effect = SHOP_EFFECTS.find(ef => ef.id === clickId);
    if (!effect) return;

    createParticles(e, effect, "flip");
    if (effect.cssClass) {
        setClickingCells((prev) => new Set(prev).add(dayIndex))
        setTimeout(() => setClickingCells((prev) => { const n = new Set(prev); n.delete(dayIndex); return n; }), 800)
    } else {
        const duration = effect.id === "black_hole" ? 4000 : 600;
        setFlippingCells((prev) => new Set(prev).add(dayIndex))
        setTimeout(() => setFlippingCells((prev) => { const s = new Set(prev); s.delete(dayIndex); return s; }), duration)
    }
  }

  return (
    <div style={styles.container}>
      <WeatherSystem active={isWeatherActive} />
      
      <ShopModal 
        isOpen={shopOpen}
        onClose={() => setShopOpen(false)}
        shopData={{ spentTSS, ownedEffects: Array.from(ownedEffects), loadout }}
        currentBalance={currentBalance}
        onPurchase={handlePurchase}
        onToggleEffect={handleToggleEffect}
        onUnequipAll={handleUnequipAll}
      />

      {/* --- SECTION CALENDRIER (70%) --- */}
      <div style={styles.calendarSection}>
        {/* HEADER MOIS */}
        <div style={styles.headerRow}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <h2 style={styles.monthTitle}>{MONTHS[month]} {year}</h2>
                <div style={{display:"flex", gap:"5px"}}>
                    <button onClick={prevMonth} style={styles.navButton}><ChevronLeft/></button>
                    <button onClick={nextMonth} style={styles.navButton}><ChevronRight/></button>
                </div>
            </div>
            
            <div style={{display:'flex', gap:'0.8rem'}}>
                <button 
                    onClick={() => setShopOpen(true)} 
                    style={styles.cyberButton("#d04fd7", true)}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                    <ShoppingBag size={16}/> BOUTIQUE
                </button>
                <button onClick={goToToday} style={styles.cyberButton("#00f3ff", false)}>AUJOURD'HUI</button>
            </div>
        </div>

        {/* PROGRESS BARS */}
        <div style={styles.progressContainer}>
          <div style={styles.progressItem}>
            <div style={styles.progressLabel}><Target size={12} color="#d04fd7" /> CHARGE TSS</div>
            <div style={styles.progressBarBg}><div className="progress-bar" style={styles.progressBarFill("#d04fd7", (stats.totalTSS / 10000) * 100)} /></div>
            <div style={styles.progressValue}>{Math.round(stats.totalTSS)} / 10,000 {tssLevelInfo.emoji}</div>
          </div>
          <div style={styles.progressItem}>
            <div style={styles.progressLabel}><Trophy size={12} color="#ffd700" /> STREAK MAX</div>
            <div style={styles.progressBarBg}><div className="progress-bar" style={styles.progressBarFill("#ffd700", (stats.maxStreak / 30) * 100)} /></div>
            <div style={styles.progressValue}>{stats.maxStreak} jours</div>
          </div>
          <div style={styles.progressItem}>
            <div style={styles.progressLabel}><Award size={12} color="#00f3ff" /> SEMAINES</div>
            <div style={styles.progressBarBg}><div className="progress-bar" style={styles.progressBarFill("#00f3ff", (stats.fullWeeksCount / 4) * 100)} /></div>
            <div style={styles.progressValue}>{Math.floor(stats.fullWeeksCount)} / 4</div>
          </div>
        </div>

        {/* GRID CALENDRIER */}
        <div style={styles.glassPanel}>
          <div style={styles.gridHeader}>
            {["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"].map((d) => <div key={d} style={styles.gridHeaderCell}>{d}</div>)}
          </div>
          <div style={styles.gridContainer}>
            {monthData.map((day, i) => {
              if (day.dayNum === 0) return <div key={`ph-${i}`} />;

              const isToday = new Date().getDate() === day.dayNum && new Date().getMonth() === month && new Date().getFullYear() === year;
              
              return (
                <DayCard
                    key={i}
                    dayIndex={i}
                    dayNum={day.dayNum}
                    activities={day.acts}
                    totalTSS={day.totalTSS}
                    streakIndex={day.streakIndex}
                    isToday={isToday}
                    loadout={loadout}
                    flippingCells={flippingCells}
                    clickingCells={clickingCells}
                    onClick={(e, hasAct) => handleCardClick(i, hasAct, e)}
                    showConnector={i % 7 !== 0} // Pas de connecteur le lundi (début de ligne)
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* --- SIDEBAR (22%) --- */}
      <div style={styles.sidebarSection}>
        <div style={{ ...styles.glassPanel, border: `1px solid ${feedback.color}60`, background: `linear-gradient(145deg, ${feedback.color}10 0%, rgba(20,20,30,0.9) 100%)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.4rem" }}>
            <FeedbackIcon size={18} color={feedback.color} />
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: feedback.color, textTransform: "uppercase" }}>{feedback.title}</span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#e0e0e0", fontStyle: "italic", lineHeight: "1.3", margin: 0 }}>"{feedback.text}"</p>
        </div>

        <div className={tssLevelClass} style={{ ...styles.glassPanel, border: `2px solid ${tssLevelInfo.color}`, boxShadow: `0 0 20px ${tssLevelInfo.color}40` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <div>
              <div style={styles.sidebarLabel}>CHARGE TOTALE</div>
              <div style={{ ...styles.highlightValue, color: stats.totalTSS >= 1000 ? "#fff" : "#d04fd7" }}>{Math.round(stats.totalTSS)}</div>
            </div>
            <div style={{ background: `${tssLevelInfo.color}30`, padding: "8px", borderRadius: "10px" }}><Zap size={22} color={tssLevelInfo.color} /></div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#ccc", display: "flex", gap: "6px", alignItems: "center" }}>
            <Activity size={12} color={tssLevelInfo.color} />
            Moy: <b style={{ color: "#fff" }}>{stats.count > 0 ? Math.round(stats.totalTSS / stats.count) : 0} TSS</b> / sortie
          </div>
        </div>

        <div style={styles.glassPanel}>
          <h3 style={{ fontSize: "0.75rem", color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 0.5rem 0" }}>RÉSUMÉ DU MOIS</h3>
          <div style={styles.compactStatRow}><div style={styles.compactStatLabel}><Activity size={12}/> Sorties</div><div style={styles.compactStatValue}>{stats.count}</div></div>
          <div style={styles.compactStatRow}><div style={styles.compactStatLabel}><Clock size={12} color="#00f3ff"/> Heures</div><div style={styles.compactStatValue}>{(stats.totalTime / 3600).toFixed(1)} h</div></div>
          <div style={styles.compactStatRow}><div style={styles.compactStatLabel}><TrendingUp size={12} color="#10b981"/> Distance</div><div style={styles.compactStatValue}>{Math.round(stats.totalDist)} km</div></div>
          <div style={styles.compactStatRow}><div style={styles.compactStatLabel}><Wind size={12} color="#00f3ff"/> Vit. Moy.</div><div style={styles.compactStatValue}>{stats.avgSpeed.toFixed(1)} km/h</div></div>
          <div style={styles.compactStatRow}><div style={styles.compactStatLabel}><Mountain size={12} color="#f59e0b"/> Dénivelé</div><div style={styles.compactStatValue}>{Math.round(stats.totalElev)} m</div></div>
          <div style={styles.compactStatRow}><div style={styles.compactStatLabel}><ArrowUpRight size={12} color="#00f3ff"/> Ratio D+</div><div style={styles.compactStatValue}><span style={{ color: "#00f3ff" }}>{stats.climbRatio}</span> m/km</div></div>
          <div style={styles.compactStatRow}><div style={styles.compactStatLabel}><Flame size={12} color="#ef4444"/> Kcal</div><div style={styles.compactStatValue}>{Math.round(stats.totalKcal).toLocaleString()}</div></div>
        </div>

        <div style={styles.glassPanel}>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.65rem", color: "#aaa", fontWeight: 700, marginBottom: "3px" }}>INTENSITÉ HEBDO (TSS)</div>
            <div style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weeksData} margin={{ top: 12, right: 0, left: 0, bottom: 0 }}>
                  <Bar dataKey="tss" radius={[3, 3, 0, 0]}>
                    {stats.weeksData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.tss > 0 ? "#d04fd7" : "transparent"} />))}
                    <LabelList dataKey="tss" position="top" fill="#fff" fontSize={8} fontWeight={700} formatter={(val: number) => (val > 0 ? Math.round(val) : "")} />
                  </Bar>
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#666" }} axisLine={false} tickLine={false} interval={0} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.65rem", color: "#aaa", fontWeight: 700, marginBottom: "3px" }}>VOLUME CUMULÉ (KM)</div>
            <div style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.cumulativeData}>
                  <defs><linearGradient id="colorKm" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00f3ff" stopOpacity={0.3} /><stop offset="95%" stopColor="#00f3ff" stopOpacity={0} /></linearGradient></defs>
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: "8px", fontSize: "0.7rem" }} formatter={(value: number) => [`${value} km`, "Cumul"]} />
                  <Area type="monotone" dataKey="km" stroke="#00f3ff" fillOpacity={1} fill="url(#colorKm)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}