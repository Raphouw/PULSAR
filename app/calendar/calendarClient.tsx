// Fichier : app/calendar/calendarClient.tsx
"use client"

import type React from "react"
import { useState, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import {
  ChevronLeft, ChevronRight, TrendingUp, Activity, Clock, Zap, Flame, Mountain,
  ArrowUpRight, Trophy, Wind, Target, Award, ShoppingBag, Sparkles,
  Check, X, Eye, Lock, Backpack, Trash2, MousePointerClick
} from "lucide-react"
import { BarChart, Bar, AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts"
import "./calendar.css"
import { CalendarActivity, ShopEffect, CalendarDay, CumulativeDataPoint, ShopData, UserLoadout, EffectSlot } from "./types"
import { SHOP_EFFECTS, MONTHS } from "./constants"
import {
  getTssColor,
  getStreakConfig,
  getTssLevelInfo,
  getSmartCardStyle,
  calculateBaseline,
  getAdvancedFeedback,
  getTssLevelClass,
  calculateWallet,
  estimateTSS,
  resolveCardClass
} from "./utils"
import WeatherSystem from "./WeatherSystem"
import ActivityWeatherIcon from "./ActivityWeatherIcon"

// --- TYPES LOCAUX & CONFIG UI ---
type ShopTab = { id: EffectSlot, label: string, icon: string }

const SHOP_TABS: ShopTab[] = [
    { id: 'FRAME', label: 'Cadres', icon: '🖼️' },
    { id: 'HOVER', label: 'Survol', icon: '✨' },
    { id: 'INTERACTION', label: 'Clics', icon: '💥' },
    { id: 'AMBIANCE', label: 'Ambiance', icon: '🌤️' },
    { id: 'TODAY', label: 'Spécial', icon: '📅' },
];

// --- STYLES INLINE ---
const styles = {
  container: {
    display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" as const,
    maxHeight: "100vh", overflow: "hidden", padding: "0.5rem",
  },
  calendarSection: {
    flex: "1 1 70%", minWidth: "0", maxHeight: "100vh", overflow: "hidden"
  },
  sidebarSection: {
    flex: "0 0 22%", display: "flex", flexDirection: "column" as const, gap: "0.75rem",
    maxHeight: "100vh", overflowY: "auto" as const, overflowX: "hidden" as const, scrollbarWidth: "none" as const,
  },
  glassPanel: {
    background: "rgba(20, 20, 30, 0.6)", backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "14px", padding: "1rem",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)", position: "relative" as const,
  },
  headerRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem",
    background: "rgba(255,255,255,0.03)", padding: "0.5rem 0.75rem", borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap" as const, gap: "0.5rem",
  },
  monthTitle: {
    fontSize: "1.5rem", fontWeight: 900,
    background: "linear-gradient(90deg, #fff 0%, #a0a0a0 100%)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    margin: 0, textTransform: "uppercase" as const, minWidth: "200px",
  },
  navButton: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
  },
  gridHeader: {
    display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", marginBottom: "0.4rem"
  },
  gridHeaderCell: {
    textAlign: "center" as const, color: "#666", fontSize: "0.7rem", fontWeight: 700,
    textTransform: "uppercase" as const, letterSpacing: "1px", paddingBottom: "0.4rem",
  },
  gridContainer: {
    display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "6px"
  },
  dayCellBase: {
    minHeight: "110px", borderRadius: "8px", padding: "0.5rem",
    display: "flex", flexDirection: "column" as const, position: "relative" as const,
    overflow: "visible", zIndex: 1, cursor: "pointer",
    transition: "transform 0.2s ease, border-color 0.2s ease"
  },
  dateNumber: (isToday: boolean, hasActivity: boolean, color: string) => ({
    fontSize: "0.85rem", fontWeight: isToday ? 900 : 600,
    color: isToday ? "#00f3ff" : hasActivity ? "#fff" : "#666",
    marginBottom: "4px", display: "flex", justifyContent: "space-between", alignItems: "center",
  }),
  tssBadge: (color: string) => ({
    fontSize: "0.55rem", fontWeight: 800, color: "#000",
    background: color, padding: "2px 4px", borderRadius: "4px", boxShadow: `0 0 5px ${color}`,
  }),
  activityRow: {
    display: "flex", alignItems: "center", gap: "5px", fontSize: "0.65rem",
    color: "rgba(255,255,255,0.8)", marginTop: "3px", overflow: "hidden",
    whiteSpace: "nowrap" as const, textOverflow: "ellipsis" as const, maxWidth: "100%",
  },
  cyberButton: (color: string, filled: boolean = false) => ({
    padding: "8px 16px",
    background: filled ? `linear-gradient(135deg, ${color}cc, ${color}66)` : "rgba(255, 255, 255, 0.03)",
    border: `1px solid ${filled ? "transparent" : color}`,
    borderRadius: "8px", 
    color: filled ? "#fff" : color,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex", alignItems: "center", gap: "6px",
    fontSize: "0.75rem",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    boxShadow: filled ? `0 4px 15px ${color}40` : "none",
    transition: "all 0.2s ease",
    backdropFilter: "blur(5px)"
  }),
  compactStatRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  compactStatLabel: {
    fontSize: "0.7rem", color: "#888", fontWeight: 600,
    display: "flex", alignItems: "center", gap: "6px",
  },
  compactStatValue: { fontSize: "0.85rem", fontWeight: 700, color: "#fff" },
  sidebarLabel: {
    fontSize: "0.65rem", color: "#888", fontWeight: 600, textTransform: "uppercase" as const
  },
  highlightValue: { fontSize: "2.2rem", fontWeight: 900, lineHeight: 1 },
  chartContainer: { height: "80px", width: "100%", marginTop: "0.4rem" },
  progressContainer: {
    display: "flex", gap: "0.75rem", padding: "0.5rem",
    background: "rgba(255,255,255,0.02)", borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.05)", marginBottom: "0.75rem", flexWrap: "wrap" as const,
  },
  progressItem: { flex: "1 1 150px", minWidth: "120px" },
  progressLabel: {
    fontSize: "0.65rem", color: "#888", fontWeight: 700, textTransform: "uppercase" as const,
    marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px",
  },
  progressBarBg: {
    width: "100%", height: "8px", background: "rgba(255,255,255,0.05)",
    borderRadius: "10px", overflow: "hidden" as const, position: "relative" as const,
  },
  progressBarFill: (color: string, percent: number) => ({
    height: "100%", width: `${Math.min(100, percent)}%`,
    background: `linear-gradient(90deg, ${color}, ${color}dd)`,
    borderRadius: "10px", transition: "width 0.5s ease", boxShadow: `0 0 10px ${color}80`,
  }),
  progressValue: { fontSize: "0.7rem", color: "#fff", fontWeight: 700, marginTop: "2px" },
}

// --- MOTEUR DE PARTICULES ---
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
        if (effect.id === "firetrail") {
             originY = e.bottom - 10;
        }
    }
    
    let count = trigger === "flip" ? 40 : 3;
    let physicsClass = "physic-float"; 
    let sizeBase = 6;

    if (effect.id === "firetrail") { physicsClass = "physic-fire"; count = 3; }
    else if (effect.id === "snow") { physicsClass = "physic-gravity"; count = 2; }
    else if (effect.id === "matrix") { physicsClass = "physic-gravity"; count = 1; }
    else if (effect.id === "lightning") { physicsClass = "physic-zap"; count = 1; }
    else if (effect.id === "explosion") { physicsClass = "physic-blast"; count = 50; }
    else if (effect.id === "confetti") { physicsClass = "physic-blast"; count = 30; }
    else if (effect.id === "spiral") { physicsClass = "physic-spiral"; count = 20; }
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

      document.body.appendChild(particle)
      setTimeout(() => particle.remove(), 1000)
    }
}

export default function CalendarClient({ activities, initialShopData }: { activities: CalendarActivity[], initialShopData: ShopData }) {

  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date())
  const [spentTSS, setSpentTSS] = useState(initialShopData.spentTSS)
  const [ownedEffects, setOwnedEffects] = useState<Set<string>>(new Set(initialShopData.ownedEffects))
  const [loadout, setLoadout] = useState<UserLoadout>(initialShopData.loadout)

  // Shop UI
  const [shopOpen, setShopOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<EffectSlot>("FRAME")
  const [selectedEffect, setSelectedEffect] = useState<ShopEffect | null>(null) // 🔥 CLIC
  const [hoveredEffect, setHoveredEffect] = useState<ShopEffect | null>(null) // 🔥 SURVOL
  const previewCardRef = useRef<HTMLDivElement>(null);
  
  const [previewCycle, setPreviewCycle] = useState(0); 

  // Animation States
  const [flippingCells, setFlippingCells] = useState<Set<number>>(new Set())
  const [clickingCells, setClickingCells] = useState<Set<number>>(new Set())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  // Reset sélection shop
  useEffect(() => {
      if (!shopOpen) {
          setSelectedEffect(null);
          setHoveredEffect(null);
      }
  }, [shopOpen]);

  // --- CALCULS STATS ---
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

  // --- LOGIQUE INTERACTION CALENDRIER ---
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, hasActivity: boolean) => {
      const effectId = loadout.HOVER; 
      if (!effectId || !hasActivity) return;
      const effect = SHOP_EFFECTS.find(ef => ef.id === effectId);
      
      if (effectId === "flashlight") {
          const target = e.currentTarget;
          const rect = target.getBoundingClientRect();
          target.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
          target.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
      } else if (Math.random() > 0.3) {
          createParticles(e, effect || null, "hover");
      }
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, day: CalendarDay) => {
      const target = e.currentTarget as HTMLDivElement;
      target.style.transform = "translateY(-2px)"
      const effectId = loadout.HOVER;
      if (day.acts.length > 0 && effectId && effectId !== "flashlight") {
          const effect = SHOP_EFFECTS.find(ef => ef.id === effectId);
          createParticles(e, effect || null, "hover")
      }
  }

  const triggerClickEffect = (effect: ShopEffect | undefined, index: number, e: React.MouseEvent) => {
      if (!effect) return;
      createParticles(e, effect, "flip");
      
      if (effect.cssClass) {
           setClickingCells((prev) => new Set(prev).add(index))
           setTimeout(() => {
                setClickingCells((prev) => { const n = new Set(prev); n.delete(index); return n; })
           }, 800)
      } else {
          const duration = effect.id === "black_hole" ? 4000 : 600;
          setFlippingCells((prev) => new Set(prev).add(index))
          setTimeout(() => {
               setFlippingCells((prev) => { const s = new Set(prev); s.delete(index); return s; })
          }, duration)
      }
  }

  const handleCardClick = (dayIndex: number, hasActivity: boolean, e: React.MouseEvent) => {
    if (!hasActivity) return;
    const clickId = loadout.INTERACTION;
    const effect = SHOP_EFFECTS.find(ef => ef.id === clickId);
    triggerClickEffect(effect, dayIndex, e);
  }

  // --- 🔥 LOGIQUE BOUTIQUE & SAUVEGARDE (CORRIGÉE V4) ---
  const walletTotal = useMemo(() => calculateWallet(activities), [activities]);
  const currentBalance = walletTotal - spentTSS;

  // 1. Fonction centrale de sauvegarde
  const saveLoadoutToDB = (newLoadout: UserLoadout) => {
      fetch('/api/shop/equip', { 
          method: 'POST', 
          body: JSON.stringify({ loadout: newLoadout }) 
      }).catch(err => console.error("Erreur sauvegarde loadout:", err));
  };

  // 2. Toggle : Calcul propre + appel externe
  const toggleEffect = (effect: ShopEffect) => {
      if (!ownedEffects.has(effect.id)) return;

      const currentInSlot = loadout[effect.slot];
      // Si déjà équipé, on déséquipe (null). Sinon on remplace.
      const newValue = currentInSlot === effect.id ? null : effect.id;
      
      const newLoadout = { ...loadout, [effect.slot]: newValue };
      
      setLoadout(newLoadout); // MAJ UI
      saveLoadoutToDB(newLoadout); // MAJ BDD
  };

  // 3. Tout retirer
  const unequipAll = () => {
      const emptyLoadout: UserLoadout = { FRAME: null, HOVER: null, INTERACTION: null, AMBIANCE: null, TODAY: null };
      setLoadout(emptyLoadout);
      saveLoadoutToDB(emptyLoadout);
  };

  // 4. Achat : Achat + Equipement immédiat
  const purchaseEffect = async (effect: ShopEffect) => {
      if (currentBalance >= effect.price && !ownedEffects.has(effect.id)) {
          // A. MAJ Locale (Optimiste)
          setSpentTSS(prev => prev + effect.price);
          setOwnedEffects(prev => new Set(prev).add(effect.id));
          
          // B. Equipement Auto
          const newLoadout = { ...loadout, [effect.slot]: effect.id };
          setLoadout(newLoadout);
          saveLoadoutToDB(newLoadout);

          // C. Sauvegarde Achat BDD
          try {
              await fetch('/api/shop/buy', { method: 'POST', body: JSON.stringify({ effectId: effect.id, cost: effect.price }) });
          } catch(e) { console.error("Erreur achat:", e); }
      }
  };

  // --- AUTOMATISATION PREVIEW ---
  // On affiche le survolé (temporaire) OU le sélectionné (fixe)
  const displayEffect = hoveredEffect || selectedEffect;

  useEffect(() => {
      if (!shopOpen || !displayEffect) return;

      const infoInterval = setInterval(() => {
          setPreviewCycle(prev => (prev + 1) % 3); 
      }, 2000); 

      let particleInterval: NodeJS.Timeout;
      
      if (displayEffect.slot === "HOVER" && previewCardRef.current) {
          if (displayEffect.id === "flashlight") {
              let angle = 0;
              particleInterval = setInterval(() => {
                  if (!previewCardRef.current) return;
                  angle += 0.1;
                  const rect = previewCardRef.current.getBoundingClientRect();
                  const x = (rect.width / 2) + Math.cos(angle) * 40;
                  const y = (rect.height / 2) + Math.sin(angle) * 40;
                  previewCardRef.current.style.setProperty("--mouse-x", `${x}px`);
                  previewCardRef.current.style.setProperty("--mouse-y", `${y}px`);
              }, 50);
          } else {
              particleInterval = setInterval(() => {
                  if (!previewCardRef.current) return;
                  const rect = previewCardRef.current.getBoundingClientRect();
                  createParticles(rect, displayEffect, "hover");
              }, 400);
          }
      }

      return () => {
          clearInterval(infoInterval);
          if (particleInterval) clearInterval(particleInterval);
      };
  }, [shopOpen, displayEffect]);


  // --- RENDER PREVIEW CARD ---
  const renderPreviewCard = () => {
      const effect = displayEffect;
      const isReactor = effect?.id === "reactor_today";
      const isSmart = effect?.id === "smart_analysis";
      const isWeather = effect?.id === "weather_dynamic";
      const isFlashlight = effect?.id === "flashlight";

      let classes = `day-cell`;
      let style: React.CSSProperties = { 
          width: '140px', height: '140px', position: 'relative',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1rem',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius:'12px'
      };

      if (effect?.cssClass) classes += ` ${effect.cssClass}`;
      if (isFlashlight) classes += ` stealth-mode`;
      
      let smartLabel = "";
      if (isSmart) {
          const states = [
              { class: 'smart-heat', label: 'INTENSITÉ 🔥' },
              { class: 'smart-speed', label: 'VITESSE ⚡' },
              { class: 'smart-climb', label: 'MONTAGNE ⛰️', style: { "--climb-h": "60%" } }
          ];
          const current = states[previewCycle];
          classes += ` ${current.class}`;
          if (current.style) Object.assign(style, current.style);
          smartLabel = current.label;
      }

      if (isReactor) {
          classes += " today-reactor";
          style.background = "transparent"; style.border = "none";
      }

      const previewIndex = 999;
      if (flippingCells.has(previewIndex)) classes += " flipping";
      if (clickingCells.has(previewIndex) && effect?.cssClass) classes += ` ${effect.cssClass}`;
      if (flippingCells.has(previewIndex) && effect?.id === "black_hole") classes += " anim-blackhole";
      if (flippingCells.has(previewIndex) && effect?.id === "shatter") classes += " anim-shatter";

      const mockWeather = [ { code: 0, avg: 25 }, { code: 63, avg: 12 }, { code: 71, avg: -2 } ][previewCycle];

      return (
          <div 
              ref={previewCardRef}
              className={classes}
              style={style}
              onClick={(e) => {
                  if (effect?.slot === "INTERACTION") triggerClickEffect(effect, previewIndex, e);
              }}
          >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00f3ff', fontWeight: 900, fontSize: '1.1rem', position:'relative', zIndex:2 }}>
                  <span>24</span>
                  <span style={{ fontSize: '0.6rem', background: '#00f3ff', color: '#000', padding: '2px 6px', borderRadius: '4px' }}>150</span>
              </div>
              
              <div style={{position:'relative', zIndex:2}}>
                  {isSmart ? (
                      <div style={{textAlign:'center', fontWeight:800, color:'#fff', fontSize:'0.9rem', textShadow:'0 0 10px currentColor'}}>{smartLabel}</div>
                  ) : (
                      <>
                        <div style={{ height: '4px', width: '4px', background: '#00f3ff', borderRadius: '50%', marginBottom: '4px' }} />
                        <div style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 700 }}>54km</div>
                        <div style={{ fontSize: '0.6rem', color: '#888' }}>Sortie Test</div>
                      </>
                  )}
              </div>

              {isWeather && (
                  <div style={{position:'absolute', bottom:8, left:8}}>
                      <ActivityWeatherIcon 
                          activity={{ weather_code: mockWeather.code, temp_avg: mockWeather.avg }} 
                          indexDelay={0} 
                          active={true} 
                          isBigMode={true} 
                      />
                  </div>
              )}
              
              {isSmart && <div className="preview-desc-overlay" style={{color:'#fff'}}>Analyse auto : {smartLabel}</div>}
          </div>
      );
  };

  // --- RENDU DATA MENSUELLES ---
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
    
    const weeks: CalendarDay[][] = []
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
    weeks.forEach((week) => {
      if (week.length === 7 && week.every((d) => d.dayNum !== 0 && d.acts.length > 0)) {
          week.forEach((d) => (d.isFullWeek = true))
      }
    })
    return days;
  }, [year, month, activities])

  const feedback = useMemo(() => getAdvancedFeedback(stats, month, year, baseline), [stats, month, year, baseline])
  const FeedbackIcon = feedback.icon
  const tssLevelInfo = getTssLevelInfo(stats.totalTSS)
  const tssLevelClass = getTssLevelClass(stats.totalTSS)
  const isWeatherActive = loadout.AMBIANCE === "weather_dynamic";

  return (
    <div style={styles.container}>
      <WeatherSystem active={isWeatherActive} />
      
      {/* --- MODAL ARMURERIE (V4 Secure Buy) --- */}
      {shopOpen && (
        <div className="modal-overlay" onClick={() => setShopOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '1100px', width:'95%', padding: '0', overflow: 'hidden', display:'flex', flexDirection:'column', background: '#121218', border: '1px solid #333' }} onClick={(e) => e.stopPropagation()}>
            
            {/* HEADER */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <div>
                    <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fff", display: "flex", gap: "0.8rem", alignItems: 'center', margin: 0, letterSpacing:'-1px' }}>
                        <ShoppingBag size={28} color="#d04fd7" /> BOUTIQUE
                    </h2>
                    <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.8rem', fontWeight: 600 }}>PERSONNALISEZ VOTRE EXPÉRIENCE</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: "0.7rem", color: "#888", fontWeight: 700, textTransform: 'uppercase' }}>Solde Disponible</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#fff", display: 'flex', alignItems: 'center', gap: '0.5rem', lineHeight: 1 }}>
                            {currentBalance.toLocaleString()} <Sparkles size={20} color="#ffd700" fill="#ffd700" />
                        </div>
                    </div>
                    <button onClick={() => setShopOpen(false)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "8px", width: "40px", height: "40px", cursor:"pointer", display:'flex', alignItems:'center', justifyContent:'center', transition: 'all 0.2s' }}>
                        <X size={20}/>
                    </button>
                </div>
            </div>

            {/* SPLIT VIEW */}
            <div className="shop-layout">
                
                {/* GAUCHE : SIMULATEUR (PANNEAU D'ACTION) */}
                <div className="shop-preview-panel" style={{ padding: '1.5rem', background: '#0e0e12', display:'flex', flexDirection:'column', gap:'1rem' }}>
                    <div className="preview-card-container">
                        {renderPreviewCard()}
                    </div>

                    {/* 🔥 DESCRIPTION & BOUTONS D'ACTION (SÉCURISÉS) */}
                    <div style={{ minHeight: '140px', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                        {selectedEffect ? (
                            <>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '1.5rem' }}>{selectedEffect.preview}</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>{selectedEffect.name}</span>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: '#aaa', lineHeight: '1.4', margin: 0 }}>{selectedEffect.description}</p>
                                </div>
                                
                                {/* ZONE BOUTONS */}
                                <div style={{ marginTop: '1rem' }}>
                                    {ownedEffects.has(selectedEffect.id) ? (
                                        <button 
                                            onClick={() => toggleEffect(selectedEffect)}
                                            style={{
                                                width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
                                                background: loadout[selectedEffect.slot] === selectedEffect.id ? '#ef4444' : '#10b981',
                                                color: '#fff', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.8rem'
                                            }}
                                        >
                                            {loadout[selectedEffect.slot] === selectedEffect.id ? "RETIRER LE COSMÉTIQUE" : "ÉQUIPER MAINTENANT"}
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => purchaseEffect(selectedEffect)}
                                            disabled={currentBalance < selectedEffect.price}
                                            style={{
                                                width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
                                                background: currentBalance >= selectedEffect.price ? 'linear-gradient(90deg, #d04fd7, #8b5cf6)' : '#333',
                                                color: currentBalance >= selectedEffect.price ? '#fff' : '#666', 
                                                fontWeight: 800, cursor: currentBalance >= selectedEffect.price ? 'pointer' : 'not-allowed', 
                                                textTransform: 'uppercase', fontSize: '0.8rem'
                                            }}
                                        >
                                            ACHETER ({selectedEffect.price.toLocaleString()} TSS)
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '0.8rem', fontStyle: 'italic', flexDirection:'column', gap:'10px' }}>
                                <MousePointerClick size={24} />
                                Sélectionnez un item pour voir les actions
                            </div>
                        )}
                    </div>

                    {/* HOTBAR INVENTAIRE */}
                    <div className="loadout-container">
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'0.5rem'}}>
                            <div className="loadout-title"><Backpack size={12}/> COSMÉTIQUES</div>
                            <button onClick={unequipAll} className="unequip-btn"><Trash2 size={10} style={{display:'inline', marginRight:4}}/>Tout retirer</button>
                        </div>
                        <div className="inventory-bar">
                            {SHOP_TABS.map(tab => {
                                const activeId = loadout[tab.id];
                                const activeItem = SHOP_EFFECTS.find(e => e.id === activeId);
                                return (
                                    <div key={tab.id} 
                                         className={`inventory-slot ${activeId ? 'equipped' : ''}`}
                                         data-tooltip={activeItem ? activeItem.name : tab.label}
                                         onClick={() => setActiveTab(tab.id)}
                                    >
                                        {activeItem ? <span>{activeItem.preview}</span> : <span className="slot-icon" style={{opacity:0.3}}>{tab.icon}</span>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* DROITE : CATALOGUE (SÉLECTION UNIQUEMENT) */}
                <div className="shop-catalog-panel" style={{ padding: '1.5rem', background: '#121218' }}>
                    <div className="shop-tabs-container">
                        {SHOP_TABS.map(tab => (
                            <button key={tab.id} className={`shop-tab-modern ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
                                <span>{tab.icon}</span> {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="shop-items-grid">
                        {SHOP_EFFECTS.filter(e => e.slot === activeTab).map((effect) => {
                            const owned = ownedEffects.has(effect.id)
                            const equipped = loadout[effect.slot] === effect.id;
                            const isSelected = selectedEffect?.id === effect.id;

                            return (
                                <div 
                                    key={effect.id} 
                                    className={`shop-item-card ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}`}
                                    style={{ border: isSelected ? '2px solid #fff' : undefined, transform: isSelected ? 'scale(1.02)' : undefined }}
                                    onMouseEnter={() => setHoveredEffect(effect)}
                                    onMouseLeave={() => setHoveredEffect(null)}
                                    onClick={() => setSelectedEffect(effect)} // 🔥 CLIC = SÉLECTION (PAS ACHAT)
                                >
                                    {equipped && <div style={{ position: 'absolute', top: '8px', right: '8px', background: '#d04fd7', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', zIndex: 2 }}>ÉQUIPÉ</div>}
                                    <div className="shop-item-preview-icon">{effect.preview}</div>
                                    <div className="shop-item-name">{effect.name}</div>
                                    
                                    {owned ? (
                                        <div style={{ marginTop: 'auto', fontSize: '0.7rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} /> ACQUIS</div>
                                    ) : (
                                        <div className="shop-item-price">{effect.price.toLocaleString()} TSS</div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SECTION CALENDRIER (70%) --- */}
      <div style={styles.calendarSection}>
        <div style={styles.headerRow}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <h2 style={styles.monthTitle}>{MONTHS[month]} {year}</h2>
                <div style={{display:"flex", gap:"5px"}}>
                    <button onClick={prevMonth} style={styles.navButton}><ChevronLeft/></button>
                    <button onClick={nextMonth} style={styles.navButton}><ChevronRight/></button>
                </div>
            </div>
            
            {/* BOUTONS HUD */}
            <div style={{display:'flex', gap:'0.8rem'}}>
                <button 
                    onClick={() => setShopOpen(true)} 
                    style={styles.cyberButton("#d04fd7", true)} // Filled
                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                    <ShoppingBag size={16}/> BOUTIQUE
                </button>
                <button 
                    onClick={goToToday} 
                    style={styles.cyberButton("#00f3ff", false)} // Outlined
                >
                    AUJOURD'HUI
                </button>
            </div>
        </div>

        {/* PROGRESS BARS */}
        <div style={styles.progressContainer}>
          <div style={styles.progressItem}>
            <div style={styles.progressLabel}><Target size={12} color="#d04fd7" /> CHARGE TSS</div>
            <div style={styles.progressBarBg}>
              <div className="progress-bar" style={styles.progressBarFill("#d04fd7", (stats.totalTSS / 10000) * 100)} />
            </div>
            <div style={styles.progressValue}>{Math.round(stats.totalTSS)} / 10,000 {tssLevelInfo.emoji}</div>
          </div>
          <div style={styles.progressItem}>
            <div style={styles.progressLabel}><Trophy size={12} color="#ffd700" /> STREAK MAX</div>
            <div style={styles.progressBarBg}>
              <div className="progress-bar" style={styles.progressBarFill("#ffd700", (stats.maxStreak / 30) * 100)} />
            </div>
            <div style={styles.progressValue}>{stats.maxStreak} jours</div>
          </div>
          <div style={styles.progressItem}>
            <div style={styles.progressLabel}><Award size={12} color="#00f3ff" /> SEMAINES</div>
            <div style={styles.progressBarBg}>
              <div className="progress-bar" style={styles.progressBarFill("#00f3ff", (stats.fullWeeksCount / 4) * 100)} />
            </div>
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
              const hasActivity = day.acts.length > 0;
              const tss = day.totalTSS;
              const color = getTssColor(tss);
              
              const smartStyle = getSmartCardStyle(day.acts);
              const slotStyles = {
                  frame: loadout.FRAME ? (SHOP_EFFECTS.find(e => e.id === loadout.FRAME)?.cssClass) : null,
                  // 🔥 CORRECTION BUG TACTICAL VISOR : ON VÉRIFIE SI C'EST BIEN ÉQUIPÉ
                  smart: (loadout.AMBIANCE === "smart_analysis") ? smartStyle?.class : null,
                  today: loadout.TODAY 
              };

              let dynamicClasses = resolveCardClass(hasActivity, isToday, slotStyles);
              
              if (flippingCells.has(i)) dynamicClasses += " flipping";
              const clickEffect = SHOP_EFFECTS.find(e => e.id === loadout.INTERACTION);
              if (clickingCells.has(i) && clickEffect?.cssClass) dynamicClasses += ` ${clickEffect.cssClass}`;
              if (flippingCells.has(i) && clickEffect?.id === "black_hole") dynamicClasses += " anim-blackhole";
              if (flippingCells.has(i) && clickEffect?.id === "shatter") dynamicClasses += " anim-shatter";
              if (day.acts.length > 0 && loadout.HOVER === "flashlight") dynamicClasses += " stealth-mode";

              const finalStyle: React.CSSProperties = { 
                  ...styles.dayCellBase,
                  background: hasActivity ? `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` : "rgba(255, 255, 255, 0.02)",
                  borderColor: isToday ? "#00f3ff" : hasActivity ? `${color}40` : "rgba(255,255,255,0.02)",
                  borderWidth: '1px', borderStyle: 'solid'
              };
              
              if ((loadout.AMBIANCE === "smart_analysis") && smartStyle?.variable) Object.assign(finalStyle, smartStyle.variable);
              if (isToday && loadout.TODAY === "reactor_today") {
                  finalStyle.background = 'transparent'; finalStyle.border = 'none';
              }
              if (hasActivity && loadout.FRAME === "pulse") {
                  const avgBpm = day.acts[0]?.avg_heartrate || 0;
                  const speed = avgBpm > 0 ? Math.max(0.3, 60 / avgBpm) : 2;
                  finalStyle.animationDuration = `${speed}s`;
              }

              const streakConfig = getStreakConfig(day.streakIndex);
              const showConnector = streakConfig && i % 7 !== 0;
              const mainActivityForWeather = day.acts.length > 0 ? day.acts[0] : null;

              return (
                <div
                  key={i}
                  className={dynamicClasses}
                  style={finalStyle}
                  onMouseEnter={(e) => handleMouseEnter(e, day)}
                  onMouseMove={(e) => handleMouseMove(e, hasActivity)}
                  onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.maskImage = "none";
                      e.currentTarget.style.webkitMaskImage = "none";
                  }}
                  onClick={(e) => handleCardClick(i, hasActivity, e)}
                >
                  {showConnector && <div className={streakConfig!.className} />}
                  
                  {/* 🔥 CORRECTION STREAK FIXÉ */}
                  {streakConfig && (
                    <div style={{
                        position: "absolute", top: "0px", right: "42px", 
                        fontSize: "1.2rem", zIndex: 20, 
                        filter: "drop-shadow(0 0 8px rgba(0,0,0,0.8))",
                        animation: "bounce 1s infinite alternate"
                    }}>
                        {streakConfig.icon}
                    </div>
                  )}

                  <div style={styles.dateNumber(isToday, hasActivity, color)}>
                    <span className={isToday ? "today-number" : ""}>{day.dayNum}</span>
                    {tss > 0 && <span style={styles.tssBadge(color)}>{Math.round(tss)}</span>}
                  </div>

                  <div style={{display:"flex", flexDirection:"column", gap:"2px", overflow:"hidden", flex:1, position:'relative', zIndex:2}}>
                    {day.acts.map(act => (
                        <Link key={act.id} href={`/activities/${act.id}`} style={{textDecoration:"none"}}>
                            <div style={styles.activityRow}>
                                <div style={{width:"4px", height:"4px", borderRadius:"50%", background:color}}/>
                                <b>{act.distance_km > 0 ? Math.round(act.distance_km)+'km' : Math.round(act.duration_s/60)+"min"}</b>
                                <span style={{opacity:0.7, overflow:"hidden", textOverflow:"ellipsis"}}>{act.name}</span>
                            </div>
                        </Link>
                    ))}
                  </div>

                  {mainActivityForWeather && (
                      <ActivityWeatherIcon 
                        activity={mainActivityForWeather} 
                        indexDelay={i} 
                        active={isWeatherActive} 
                        isBigMode={true} 
                      />
                  )}
                </div>
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