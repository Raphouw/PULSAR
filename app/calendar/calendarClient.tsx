"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {ChevronLeft,  ChevronRight,  TrendingUp,  Activity,  Clock,  Zap, Flame,  Mountain,
  ArrowUpRight,  Trophy,   Wind,  Target,  Award,  ShoppingBag,  Sparkles,
  Check,  X,
} from "lucide-react"
import { BarChart, Bar, AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts"
import "./calendar.css" // On importe le CSS directement !
import { CalendarActivity, ShopEffect, CalendarDay, CumulativeDataPoint, ShopData, UserLoadout } from "./types"
import { SHOP_EFFECTS, MONTHS } from "./constants"
import { 
  getTssColor, 
  getStreakConfig, 
  getTssLevelInfo, 
  getSmartCardStyle, 
  calculateBaseline, 
  getAdvancedFeedback,
  getTssLevelClass,
  calculateWallet
} from "./utils"
import WeatherSystem from "./WeatherSystem"
import ActivityWeatherIcon from "./ActivityWeatherIcon"



const styles = {
  container: {
    display: "flex",
    gap: "1rem",
    alignItems: "flex-start",
    flexWrap: "wrap" as const,
    maxHeight: "100vh",
    overflow: "hidden",
    padding: "0.5rem",
   
  },
  calendarSection: {
    flex: "1 1 70%",
    minWidth: "0",
    maxHeight: "100vh",
    overflow: "hidden",
  },
  sidebarSection: {
    flex: "0 0 22%",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem",
    maxHeight: "100vh",
    overflowY: "auto" as const,
    overflowX: "hidden" as const,
    scrollbarWidth: "none" as const,
  },
  glassPanel: {
    background: "rgba(20, 20, 30, 0.6)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "14px",
    padding: "1rem",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    position: "relative" as const,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.75rem",
    background: "rgba(255,255,255,0.03)",
    padding: "0.5rem 0.75rem",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.05)",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
  },
  monthTitle: {
    fontSize: "1.5rem",
    fontWeight: 900,
    background: "linear-gradient(90deg, #fff 0%, #a0a0a0 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: 0,
    textTransform: "uppercase" as const,
    minWidth: "200px",
  },
  navButton: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  gridHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    marginBottom: "0.4rem",
  },
  gridHeaderCell: {
    textAlign: "center" as const,
    color: "#666",
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    paddingBottom: "0.4rem",
  },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: "6px",
  },
  dayCell: (isToday: boolean, isEmpty: boolean, color: string, intensity: number, streakColor: string | null) => ({
    // ... (background et minHeight inchangés) ...
    minHeight: "110px",
    background: isEmpty
      ? "transparent"
      : intensity > 0
        ? `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`
        : "rgba(255, 255, 255, 0.02)",

    // CORRECTION ICI : On passe l'opacité par défaut de 0.05 à 0.02
    border: isEmpty ? "none" : `1px solid ${intensity > 0 ? `${color}40` : "rgba(255, 255, 255, 0.02)"}`,
    
    // ... (le reste inchangé) ...
    borderRadius: "8px",
    padding: "0.5rem",
    display: "flex",
    flexDirection: "column" as const,
    transition: "transform 0.2s ease, border-color 0.2s ease",
    position: "relative" as const,
    cursor: isEmpty ? "default" : "pointer",
    
    // On s'assure que le box-shadow par défaut n'ajoute pas de "glow" blanc non voulu
    boxShadow: isToday
      ? `0 0 0 2px #00f3ff, inset 0 0 20px rgba(0, 243, 255, 0.2)`
      : streakColor
        ? `inset 8px 0 15px -5px ${streakColor}40`
        : intensity > 0
          ? `inset 0 0 15px ${color}10`
          : "none",
          
    overflow: "visible",
    zIndex: 1,
  }),
  dateNumber: (isToday: boolean, hasActivity: boolean, color: string) => ({
    fontSize: "0.85rem",
    fontWeight: isToday ? 900 : 600,
    color: isToday ? "#00f3ff" : hasActivity ? "#fff" : "#666",
    marginBottom: "4px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }),
  tssBadge: (color: string) => ({
    fontSize: "0.55rem",
    fontWeight: 800,
    color: "#000",
    background: color,
    padding: "2px 4px",
    borderRadius: "4px",
    boxShadow: `0 0 5px ${color}`,
  }),
  activityRow: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "0.65rem",
    color: "rgba(255,255,255,0.8)",
    marginTop: "3px",
    overflow: "hidden",
    whiteSpace: "nowrap" as const,
    textOverflow: "ellipsis" as const,
    maxWidth: "100%",
  },
  compactStatRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  compactStatLabel: {
    fontSize: "0.7rem",
    color: "#888",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  compactStatValue: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#fff",
  },
  sidebarLabel: { fontSize: "0.65rem", color: "#888", fontWeight: 600, textTransform: "uppercase" as const },
  highlightValue: { fontSize: "2.2rem", fontWeight: 900, lineHeight: 1 },
  chartContainer: {
    height: "80px",
    width: "100%",
    marginTop: "0.4rem",
  },
  progressContainer: {
    display: "flex",
    gap: "0.75rem",
    padding: "0.5rem",
    background: "rgba(255,255,255,0.02)",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.05)",
    marginBottom: "0.75rem",
    flexWrap: "wrap" as const,
  },
  progressItem: {
    flex: "1 1 150px",
    minWidth: "120px",
  },
  progressLabel: {
    fontSize: "0.65rem",
    color: "#888",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    marginBottom: "4px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  progressBarBg: {
    width: "100%",
    height: "8px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "10px",
    overflow: "hidden" as const,
    position: "relative" as const,
  },
  progressBarFill: (color: string, percent: number) => ({
    height: "100%",
    width: `${Math.min(100, percent)}%`,
    background: `linear-gradient(90deg, ${color}, ${color}dd)`,
    borderRadius: "10px",
    transition: "width 0.5s ease",
    boxShadow: `0 0 10px ${color}80`,
  }),
  progressValue: {
    fontSize: "0.7rem",
    color: "#fff",
    fontWeight: 700,
    marginTop: "2px",
  },
}

export const createParticles = (e: React.MouseEvent, effect: ShopEffect | null, trigger: "hover" | "flip") => {
    if (!effect) return;

    const colors = effect.colors || ["#fff"]
    // Pour le hover, on utilise la position de la souris. Pour le flip, le centre de la carte.
    const rect = e.currentTarget.getBoundingClientRect()
    const originX = trigger === "hover" ? e.clientX : rect.left + rect.width / 2
    const originY = trigger === "hover" ? e.clientY : rect.top + rect.height / 2

    // Configuration par défaut selon le TRIGGER
    let count = trigger === "flip" ? 40 : 3; // Moins de particules en hover (car on move la souris), beaucoup en flip
    
    // Détection de la physique selon l'ID de l'effet
    let physicsClass = "physic-float"; // Défaut: monte doucement (Bulles, Etoiles)
    let sizeBase = 6;

    if (effect.id === "firetrail") { physicsClass = "physic-fire"; count = 3; }
    else if (effect.id === "snow") { physicsClass = "physic-gravity"; count = 2; }
    else if (effect.id === "matrix") { physicsClass = "physic-gravity"; count = 1; } // Chiffres
    else if (effect.id === "lightning") { physicsClass = "physic-zap"; count = 1; }
    else if (effect.id === "explosion") { physicsClass = "physic-blast"; count = 50; }
    else if (effect.id === "confetti") { physicsClass = "physic-gravity"; count = 30; } // Tombent comme la neige mais explosent d'abord
    else if (effect.id === "spiral") { physicsClass = "physic-spiral"; count = 20; }
    else if (effect.id === "bubbles") { physicsClass = "physic-bubble"; count = 1; } // Une bulle à la fois mais grosse
    if (effect.id === "confetti" || effect.id === "explosion") {
        count = effect.id === "explosion" ? 100 : 50; // Beaucoup plus pour Supernova
        physicsClass = "physic-blast"; // On utilise blast pour l'impulsion de départ
    }
if (effect.id === "shatter") {
        count = 20; physicsClass = "physic-gravity"; // Tombent
    }    else if (effect.id === "black_hole") { physicsClass = "physic-spiral"; count = 40; } // Aspiration

    for (let i = 0; i < count; i++) {
      const particle = document.createElement("div")
      particle.className = `particle-base ${physicsClass}`
      
      // Styles communs
      particle.style.left = `${originX}px`
      particle.style.top = `${originY}px`
      particle.style.width = `${Math.max(2, Math.random() * sizeBase)}px`
      particle.style.height = particle.style.width // Rond par défaut
      
      // Couleurs
      const color = colors[Math.floor(Math.random() * colors.length)]
      particle.style.background = color

      // --- LOGIQUES SPÉCIFIQUES ---
      if (effect.id === "shatter") {
         // Triangles de verre
         particle.style.width = `${5 + Math.random() * 10}px`;
         particle.style.height = particle.style.width;
         particle.style.clipPath = "polygon(50% 0%, 0% 100%, 100% 100%)";
         particle.style.background = "rgba(255, 255, 255, 0.8)";
         // Chute avec rotation aléatoire
         particle.style.marginLeft = `${(Math.random() - 0.5) * 50}px`;
         particle.style.transform = `rotate(${Math.random() * 360}deg)`;
      }
      else if (effect.id === "black_hole") {
         // Les particules sont aspirées VERS le centre
         // On triche : on les fait spawn loin et on inverse l'animation via CSS ou on utilise blast inversé
         // Pour faire simple ici : on utilise le spiral existant mais couleur violette sombre
         particle.style.boxShadow = "0 0 5px #4b0082";
      }
      else if (effect.id === "bubbles") {
         particle.style.width = `${10 + Math.random() * 20}px`; // Grosses bulles
         particle.style.height = particle.style.width;
      }


      if (effect.id === "matrix") {
        particle.innerText = Math.random() > 0.5 ? "1" : "0";
        particle.style.background = "transparent";
        particle.style.color = color;
        particle.style.fontSize = "10px";
        particle.style.fontWeight = "bold";
        particle.style.fontFamily = "monospace";
        particle.style.width = "auto";
        particle.style.height = "auto";
        // Dispersion horizontale légère
        particle.style.marginLeft = `${(Math.random() - 0.5) * 20}px`;
      } 
      else if (effect.id === "snow" || effect.id === "confetti") {
        // Dispersion horizontale aléatoire pour la chute
        particle.style.marginLeft = `${(Math.random() - 0.5) * (trigger === 'flip' ? 100 : 30)}px`;
        if(effect.id === 'confetti') particle.style.borderRadius = "0"; // Carrés
      }
      else if (effect.id === "firetrail") {
        // Oscillation horizontale (var --rx)
        particle.style.setProperty("--rx", `${(Math.random() - 0.5) * 30}px`);
      }
      else if (effect.id === "explosion" || effect.id === "confetti") {
        // Explosion: Direction 360 degres
        const angle = Math.random() * Math.PI * 2
        const velocity = 50 + Math.random() * 200
        const tx = Math.cos(angle) * velocity
        const ty = Math.sin(angle) * velocity
        if (effect.id === "explosion") particle.style.animationDuration = "0.5s";
        particle.style.setProperty("--tx", `${tx}px`)
        particle.style.setProperty("--ty", `${ty}px`)
        
        // Si confetti, on surcharge la physique pour utiliser blast (départ) puis gravity (CSS trick possible mais restons simples pour l'instant : blast suffit)
        if (effect.id === 'confetti') {
             particle.className = `particle-base physic-blast`; // On force le blast pour les confettis aussi au début
        }
      }
      else if (effect.id === "lightning") {
    // Eclair : position aléatoire et rotation brutale
    const offsetX = (Math.random() - 0.5) * 50;
    const offsetY = (Math.random() - 0.5) * 50;
    const rotation = Math.random() * 360;
    
    particle.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`;
    
    // La couleur doit être appliquée ici car la classe CSS utilise currentColor ou box-shadow
    // Mais comme on a mis un background dans le CSS physic-zap, ça va marcher.
    // On ajoute un petit hack pour la couleur brillante
    particle.style.backgroundColor = color; 
    particle.style.boxShadow = `0 0 15px ${color}`;
}

      document.body.appendChild(particle)
      setTimeout(() => particle.remove(), 1000)
    }
  }

  

 

export default function CalendarClient({ activities,initialShopData }: { activities: CalendarActivity[],initialShopData: ShopData }) {

  const [spentTSS, setSpentTSS] = useState(initialShopData.spentTSS)
  const getEffectById = (id: string | null) => SHOP_EFFECTS.find(e => e.id === id) || null;


  const [currentDate, setCurrentDate] = useState(new Date())
  const [flippingCells, setFlippingCells] = useState<Set<number>>(new Set())
  const [shopOpen, setShopOpen] = useState(false)
  const [shopCategory, setShopCategory] = useState<"styles" | "hover" | "interaction">("styles")
  const [ownedEffects, setOwnedEffects] = useState<Set<string>>(new Set(initialShopData.ownedEffects))
const [activeHoverEffect, setActiveHoverEffect] = useState<ShopEffect | null>(getEffectById(initialShopData.loadout.hover))
const [activeFlipEffect, setActiveFlipEffect] = useState<ShopEffect | null>(getEffectById(initialShopData.loadout.flip))
const [activeCardEffect, setActiveCardEffect] = useState<ShopEffect | null>(getEffectById(initialShopData.loadout.card))

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  const baseline = useMemo(() => calculateBaseline(activities), [activities])



const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, hasActivity: boolean) => {
      // 1. LOGIQUE LAMPE TORCHE (Mise à jour des coordonnées seulement)
      if (activeHoverEffect?.id === "flashlight" && hasActivity) {
          const target = e.currentTarget;
          const rect = target.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          // On envoie juste la position au CSS
          target.style.setProperty("--mouse-x", `${x}px`);
          target.style.setProperty("--mouse-y", `${y}px`);
      }

      // 2. LOGIQUE PARTICULES (Inchangée)
      if (!hasActivity || !activeHoverEffect) return;
      if (activeHoverEffect.id !== "flashlight" && Math.random() > 0.3) {
          createParticles(e, activeHoverEffect, "hover");
      }
  }
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, day: CalendarDay) => {
      // On "cast" (force le type) ici pour rassurer TypeScript
      const target = e.currentTarget as HTMLDivElement;

      // Animation CSS de base via JS (léger soulèvement)
      target.style.transform = "translateY(-2px)"
      target.style.borderColor = getTssColor(day.totalTSS)

      // 1. Particules JS (Eclairs, Etoiles, etc.)
      if ((day.acts.length > 0 && activeHoverEffect) || (day.isFullWeek && !activeHoverEffect)) {
          const effect = activeHoverEffect || ({ colors: ["#d04fd7"] } as ShopEffect)
          createParticles(e, effect, "hover")
      }
  }



const handleCardClick = (dayIndex: number, hasActivity: boolean, e: React.MouseEvent) => {
    if (!hasActivity) return

    // 1. Particules JS (Explosion, etc.)
    if (activeFlipEffect) {
        createParticles(e, activeFlipEffect, "flip")
    }

    // 2. Animation CSS
    if (activeClickEffect) {
       // Cas A : Un effet est activé (Rubber / Shockwave)
       setClickingCells((prev) => new Set(prev).add(dayIndex))
       setTimeout(() => {
            setClickingCells((prev) => {
               const newSet = new Set(prev)
               newSet.delete(dayIndex)
               return newSet
            })
       }, 800)
    } else {

       
       if (activeFlipEffect) { 

        const duration = activeFlipEffect.id === "black_hole" ? 4000 : 600;
        
            setFlippingCells((prev) => new Set(prev).add(dayIndex))
           setTimeout(() => {
             setFlippingCells((prev) => { 
           const s = new Set(prev); s.delete(dayIndex); return s; 
              })
           }, duration)
       }
    }
  }

  

  const filteredShopItems = useMemo(() => {
    let items = SHOP_EFFECTS.filter(item => {
      if (shopCategory === "styles") return item.type === "passive" || item.type === "card"
    
      if (shopCategory === "hover") return item.type === "hover"
      if (shopCategory === "interaction") return item.type === "click" || item.type === "flip"
      return false
    })
    return items.sort((a, b) => a.price - b.price)
  }, [shopCategory])

  const totalGeneratedTSS = useMemo(() => {
    return calculateWallet(activities);
  }, [activities])



  const currentBalance = totalGeneratedTSS - spentTSS

  const purchaseEffect = async (effect: ShopEffect) => {
    if (currentBalance >= effect.price && !ownedEffects.has(effect.id)) {
      
      // 1. Optimistic UI Update (Immédiat)
      setSpentTSS((prev) => prev + effect.price)
      setOwnedEffects((prev) => new Set(prev).add(effect.id))

      // 2. Auto-équipement (Comme avant)
      if (effect.type === "hover") setActiveHoverEffect(effect)
      else if (effect.type === "flip") setActiveFlipEffect(effect)
      else if (effect.type === "card") setActiveCardEffect(effect)
      else if (effect.type === "passive") {
          if (effect.id === "reactor_today") setActiveTodayEffect(effect)
          else setActivePassiveEffect(effect)
      }
      else if (effect.type === "click") setActiveClickEffect(effect)

      // 3. APPEL API (Sauvegarde l'achat)
      try {
          await fetch('/api/shop/buy', {
              method: 'POST',
              body: JSON.stringify({ effectId: effect.id, cost: effect.price })
          });
      } catch (e) {
          console.error("Erreur achat", e);
          // En vrai prod, il faudrait annuler l'UI ici, mais pour l'instant ça ira
      }
    }
  }

const [activePassiveEffect, setActivePassiveEffect] = useState<ShopEffect | null>(getEffectById(initialShopData.loadout.passive))
const [activeTodayEffect, setActiveTodayEffect] = useState<ShopEffect | null>(getEffectById(initialShopData.loadout.today))
const [activeClickEffect, setActiveClickEffect] = useState<ShopEffect | null>(getEffectById(initialShopData.loadout.click))
const [clickingCells, setClickingCells] = useState<Set<number>>(new Set()) // Pour gérer l'anim JS

const saveLoadoutToDB = async () => {
    // On construit l'objet propre
    const loadout = {
        hover: activeHoverEffect?.id || null,
        flip: activeFlipEffect?.id || null,
        card: activeCardEffect?.id || null,
        passive: activePassiveEffect?.id || null,
        click: activeClickEffect?.id || null,
        today: activeTodayEffect?.id || null
    };

    // Appel API silencieux (pas besoin d'attendre le résultat pour l'UI)
    fetch('/api/shop/equip', {
        method: 'POST',
        body: JSON.stringify({ loadout })
    }).catch(e => console.error("Save loadout error", e));
  };

  // On utilise un useEffect pour sauvegarder à chaque changement d'équipement
  // (Debounce naturel : React regroupe les mises à jour proches)
  useEffect(() => {
      // On attend juste que le composant soit monté pour éviter de sauvegarder l'initialisation
      if (ownedEffects.size > 0) { 
          saveLoadoutToDB();
      }
  }, [activeHoverEffect, activeFlipEffect, activeCardEffect, activePassiveEffect, activeClickEffect, activeTodayEffect]);

useEffect(() => {
    // Liste des classes possibles pour nettoyage
    const weatherClasses = ["bg-phase-night", "bg-phase-dawn", "bg-phase-day", "bg-phase-dusk"];
    document.body.classList.remove(...weatherClasses);

    // On active la logique seulement si l'effet est équipé
    if (activePassiveEffect?.id === "weather_dynamic") {
        const now = new Date();
        const month = now.getMonth(); // 0 = Janvier, 11 = Décembre
        const hour = now.getHours();

        // --- CONFIGURATION SAISONNIÈRE ---
        
        // Est-ce l'hiver ? (Octobre à Mars inclus)
        const isWinter = month >= 9 || month <= 2; 

        let phase = "bg-phase-night"; // Par défaut

        if (isWinter) {
            // HIVER : Soleil tard (8h), Nuit tôt (17h)
            if (hour >= 8 && hour < 9) phase = "bg-phase-dawn";       // Aube (8h-9h)
            else if (hour >= 9 && hour < 16) phase = "bg-phase-day";  // Jour court (9h-16h)
            else if (hour >= 16 && hour < 18) phase = "bg-phase-dusk";// Crépuscule long (16h-18h)
            else phase = "bg-phase-night";                            // Nuit le reste du temps
        } else {
            // ÉTÉ : Soleil tôt (6h), Nuit tard (22h)
            if (hour >= 6 && hour < 7) phase = "bg-phase-dawn";       // Aube (6h-7h)
            else if (hour >= 7 && hour < 21) phase = "bg-phase-day";  // Jour long (7h-21h)
            else if (hour >= 21 && hour < 23) phase = "bg-phase-dusk";// Crépuscule tardif (21h-23h)
            else phase = "bg-phase-night";                            // Nuit le reste du temps
        }

        document.body.classList.add(phase);
    }

    return () => {
        document.body.classList.remove(...weatherClasses);
    };
  }, [activePassiveEffect]);


const toggleEffect = (effect: ShopEffect) => {
    if (!ownedEffects.has(effect.id)) return

    // CAS SPÉCIAL : RÉACTEUR (Géré à part)
    if (effect.id === "reactor_today") {
       setActiveTodayEffect(activeTodayEffect?.id === effect.id ? null : effect)
       return; // On arrête là pour ne pas déclencher le reste
    }

    // Le reste de la logique standard
    if (effect.type === "hover") {
      setActiveHoverEffect(activeHoverEffect?.id === effect.id ? null : effect)
    } else if (effect.type === "flip") {
      setActiveFlipEffect(activeFlipEffect?.id === effect.id ? null : effect)
    } else if (effect.type === "card") {
      setActiveCardEffect(activeCardEffect?.id === effect.id ? null : effect)
    } else if (effect.type === "passive") {
      setActivePassiveEffect(activePassiveEffect?.id === effect.id ? null : effect)
    } else if (effect.type === "click") {
      setActiveClickEffect(activeClickEffect?.id === effect.id ? null : effect)
    }
  }

  const monthData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayIndex = new Date(year, month, 1).getDay()
    const startDayOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1

    const days: CalendarDay[] = []
    for (let i = 0; i < startDayOffset; i++) days.push({ dayNum: 0, acts: [], totalTSS: 0, streakIndex: 0 })

    let currentStreak = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const dayActs = activities.filter((a) => {
        const date = new Date(a.start_time)
        return date.getDate() === d && date.getMonth() === month && date.getFullYear() === year
      })
      const totalTSS = dayActs.reduce((acc, a) => acc + (a.tss || 0), 0)

      if (dayActs.length > 0) {
        currentStreak++
      } else {
        currentStreak = 0
      }

      days.push({ dayNum: d, acts: dayActs, totalTSS, streakIndex: currentStreak })
    }

    const weeks: CalendarDay[][] = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }
    weeks.forEach((week) => {
      const isFull = week.length === 7 && week.every((d) => d.dayNum !== 0 && d.acts.length > 0)
      if (isFull) week.forEach((d) => (d.isFullWeek = true))
    })

    return days
  }, [year, month, activities])

  const stats = useMemo(() => {
    const acts = activities.filter((a) => {
      const d = new Date(a.start_time)
      return d.getMonth() === month && d.getFullYear() === year
    })

    const totalDist = acts.reduce((acc, a) => acc + (a.distance_km || 0), 0)
    const totalElev = acts.reduce((acc, a) => acc + (a.elevation_gain_m || 0), 0)
    const totalTime = acts.reduce((acc, a) => acc + (a.duration_s || 0), 0)
    const totalTSS = acts.reduce((acc, a) => acc + (a.tss || 0), 0)
    const totalKcal = acts.reduce((acc, a) => acc + (a.calories_kcal || (a.tss ? a.tss * 12 : 0)), 0)
    const climbRatio = totalDist > 0 ? (totalElev / totalDist).toFixed(1) : "0"

    const validTimeHours = totalTime / 3600
    const avgSpeed = validTimeHours > 0 ? totalDist / validTimeHours : 0

    const count = acts.length
    const avgPwr = count > 0 ? acts.reduce((acc, a) => acc + (a.avg_power_w || 0), 0) / count : 0
    const avgHr = count > 0 ? acts.reduce((acc, a) => acc + (a.avg_heartrate || 0), 0) / count : 0
    const maxDist = count > 0 ? Math.max(...acts.map((a) => a.distance_km || 0)) : 0

    const weeksData = [
      { name: "S1", tss: 0 },
      { name: "S2", tss: 0 },
      { name: "S3", tss: 0 },
      { name: "S4", tss: 0 },
      { name: "S5", tss: 0 },
    ]
    acts.forEach((a) => {
      const d = new Date(a.start_time).getDate()
      const weekIndex = Math.min(4, Math.floor((d - 1) / 7))
      weeksData[weekIndex].tss += a.tss || 0
    })

    const maxWeekTSS = Math.max(...weeksData.map((w) => w.tss))
    const isTitanMode = maxWeekTSS > 850

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cumulativeData: CumulativeDataPoint[] = []
    let runningDist = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDist = acts
        .filter((a) => new Date(a.start_time).getDate() === d)
        .reduce((sum, a) => sum + (a.distance_km || 0), 0)
      runningDist += dayDist
      cumulativeData.push({ day: d, km: Math.round(runningDist) })
    }

    const maxStreak = Math.max(...monthData.map((d) => d.streakIndex), 0)
    const fullWeeksCount = monthData.filter((d) => d.isFullWeek).length / 7

    return {
      totalDist,
      totalElev,
      totalTime,
      totalTSS,
      totalKcal,
      climbRatio,
      count,
      weeksData,
      cumulativeData,
      avgPwr,
      avgHr,
      avgSpeed,
      maxDist,
      isTitanMode,
      maxStreak,
      fullWeeksCount,
    }
  }, [year, month, activities, monthData])

  const feedback = useMemo(() => getAdvancedFeedback(stats, month, year, baseline), [stats, month, year, baseline])
  const FeedbackIcon = feedback.icon

  const tssLevelClass = getTssLevelClass(stats.totalTSS)
  const tssLevelInfo = getTssLevelInfo(stats.totalTSS)
  const isWeatherActive = activePassiveEffect?.id === "weather_dynamic";

  return (
    <div style={styles.container}>
      <WeatherSystem active={isWeatherActive} />
      {shopOpen && (
        <div className="modal-overlay" onClick={() => setShopOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
    <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <ShoppingBag size={28} color="#d04fd7" /> BOUTIQUE
    </h2>
    <button onClick={() => setShopOpen(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: "40px", height: "40px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <X size={20} />
    </button>
  </div>

  <div style={{ background: "linear-gradient(135deg, rgba(208, 79, 215, 0.2), rgba(0, 243, 255, 0.2))", padding: "1rem", borderRadius: "12px", marginBottom: "1.5rem", border: "1px solid rgba(255,255,255,0.1)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "0.8rem", color: "#ccc", fontWeight: 600 }}>SOLDE DISPONIBLE</span>
      <span style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff" }}>
        {currentBalance.toLocaleString()} <Sparkles size={20} style={{ display: "inline", marginLeft: "0.25rem", color: "#ffd700" }} />
      </span>
    </div>
  </div>

  {/* TABS CATÉGORIES */}
  <div className="shop-tabs">
    <button 
      className={`shop-tab ${shopCategory === "styles" ? "active" : ""}`}
      onClick={() => setShopCategory("styles")}
    >
      STYLES PERMANENTS
    </button>
    <button 
      className={`shop-tab ${shopCategory === "hover" ? "active" : ""}`}
      onClick={() => setShopCategory("hover")}
    >
      EFFETS DE SURVOL
    </button>
    <button 
      className={`shop-tab ${shopCategory === "interaction" ? "active" : ""}`}
      onClick={() => setShopCategory("interaction")}
    >
      CLIC & ACTION
    </button>
  </div>

  {/* GRILLE FILTRÉE */}
  <div className="shop-grid">
    {filteredShopItems.map((effect) => {




      const owned = ownedEffects.has(effect.id)
      const active =
  (effect.id === "reactor_today" && activeTodayEffect?.id === effect.id) || // Vérif spécifique Réacteur
  (effect.type === "hover" && activeHoverEffect?.id === effect.id) ||
  (effect.type === "flip" && activeFlipEffect?.id === effect.id) ||
  (effect.type === "card" && activeCardEffect?.id === effect.id) ||
  // On vérifie le passif SEULEMENT si ce n'est pas le réacteur
  (effect.type === "passive" && effect.id !== "reactor_today" && activePassiveEffect?.id === effect.id) ||
  (effect.type === "click" && activeClickEffect?.id === effect.id)

      const canAfford = currentBalance >= effect.price

      return (
        <div
          key={effect.id}
          style={{
            background: owned
              ? "linear-gradient(145deg, rgba(16, 185, 129, 0.15), rgba(20, 20, 30, 0.6))"
              : "linear-gradient(145deg, rgba(50, 50, 60, 0.4), rgba(20, 20, 30, 0.6))",
            border: active
              ? "2px solid #10b981"
              : owned
                ? "1px solid rgba(16, 185, 129, 0.3)"
                : "1px solid rgba(255,255,255,0.05)",
            borderRadius: "12px",
            padding: "1.25rem",
            position: "relative",
            transition: "all 0.2s",
            opacity: !owned && !canAfford ? 0.6 : 1
          }}
        >
          {owned && (
            <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "#10b981", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check size={12} color="#fff" />
            </div>
          )}

          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{effect.preview}</div>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fff", margin: "0 0 0.25rem 0" }}>{effect.name}</h3>
          <p style={{ fontSize: "0.7rem", color: "#aaa", margin: "0 0 0.75rem 0", lineHeight: "1.3", minHeight: "2.6em" }}>{effect.description}</p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: owned ? "#10b981" : canAfford ? "#ffd700" : "#666" }}>
              {owned ? "ACQUIS" : `${effect.price.toLocaleString()} TSS`}
            </span>

            {owned ? (
              <button
                onClick={() => toggleEffect(effect)}
                style={{
                  background: active ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
                  border: active ? "1px solid #ef4444" : "1px solid #10b981",
                  color: active ? "#ef4444" : "#10b981",
                  padding: "0.3rem 0.6rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase"
                }}
              >
                {active ? "RETIRER" : "EQUIPER"}
              </button>
            ) : (
              <button
                onClick={() => purchaseEffect(effect)}
                disabled={!canAfford}
                style={{
                  background: canAfford ? "rgba(208, 79, 215, 0.2)" : "transparent",
                  border: canAfford ? "1px solid #d04fd7" : "1px solid #444",
                  color: canAfford ? "#fff" : "#555",
                  padding: "0.3rem 0.6rem", borderRadius: "6px", cursor: canAfford ? "pointer" : "not-allowed", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase"
                }}
              >
                ACHETER
              </button>
            )}
          </div>
        </div>
      )
    })}
  </div>
</div>
        </div>
      )}

      {/* 1. CALENDRIER */}
      <div style={styles.calendarSection}>
        <div style={styles.headerRow}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <h2 style={styles.monthTitle}>
              {MONTHS[month]} {year}
            </h2>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button onClick={prevMonth} style={styles.navButton}>
                <ChevronLeft size={18} />
              </button>
              <button onClick={nextMonth} style={styles.navButton}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              onClick={() => setShopOpen(true)}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                background: "transparent",
                border: "1px solid #ffd700",
                color: "#ffd700",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "1px",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 215, 0, 0.1)"
                e.currentTarget.style.transform = "scale(1.05)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.transform = "scale(1)"
              }}
            >
              <ShoppingBag size={14} />
              BOUTIQUE
            </button>
            <button
              onClick={goToToday}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                background: "transparent",
                border: "1px solid #d04fd7",
                color: "#d04fd7",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Aujourd'hui
            </button>
          </div>
        </div>

        <div style={styles.progressContainer}>
          <div style={styles.progressItem}>
            <div style={styles.progressLabel}>
              <Target size={12} color="#d04fd7" />
              CHARGE TSS
            </div>
            <div style={styles.progressBarBg}>
              <div className="progress-bar" style={styles.progressBarFill("#d04fd7", (stats.totalTSS / 10000) * 100)} />
            </div>
            <div style={styles.progressValue}>
              {Math.round(stats.totalTSS)} / 10,000 {tssLevelInfo.emoji}
            </div>
          </div>

          <div style={styles.progressItem}>
            <div style={styles.progressLabel}>
              <Trophy size={12} color="#ffd700" />
              STREAK MAX
            </div>
            <div style={styles.progressBarBg}>
              <div className="progress-bar" style={styles.progressBarFill("#ffd700", (stats.maxStreak / 30) * 100)} />
            </div>
            <div style={styles.progressValue}>
              {stats.maxStreak} jours{" "}
              {stats.maxStreak >= 21 ? "👑" : stats.maxStreak >= 14 ? "💎" : stats.maxStreak >= 7 ? "🥇" : "🔥"}
            </div>
          </div>

          <div style={styles.progressItem}>
            <div style={styles.progressLabel}>
              <Award size={12} color="#00f3ff" />
              SEMAINES
            </div>
            <div style={styles.progressBarBg}>
              <div
                className="progress-bar"
                style={styles.progressBarFill("#00f3ff", (stats.fullWeeksCount / 4) * 100)}
              />
            </div>
            <div style={styles.progressValue}>
              {Math.floor(stats.fullWeeksCount)} / 4 {Math.floor(stats.fullWeeksCount) >= 4 ? "🌟" : "⭐"}
            </div>
          </div>
        </div>

        <div style={styles.glassPanel}>
          <div style={styles.gridHeader}>
            {["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"].map((d) => (
              <div key={d} style={styles.gridHeaderCell}>
                {d}
              </div>
            ))}
          </div>
          <div style={styles.gridContainer}>
            {monthData.map((day, i) => {
              const isPlaceholder = day.dayNum === 0
const mainActivityForWeather = day.acts.length > 0
    ? day.acts.reduce((prev, current) => (prev.duration_s > current.duration_s) ? prev : current)
    : null;


              const avgBpm = day.acts.length > 0 
  ? day.acts.reduce((acc, a) => {
      // A. On récupère la valeur exacte de la BDD
      let hr = Number(a.avg_heartrate) || 0;

      return acc + hr;
    }, 0) / day.acts.length 
  : 0; // Si aucune activité, 0
              const pulseSpeed = avgBpm > 0 ? Math.max(0.3, 60 / avgBpm) : 2;
              const isToday =
                !isPlaceholder &&
                new Date().getDate() === day.dayNum &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year
              const tss = day.totalTSS
              const color = getTssColor(tss)

              const streakConfig = getStreakConfig(day.streakIndex)
              const showConnector = streakConfig && i % 7 !== 0
             const isFlipping = flippingCells.has(i)
const isClicking = clickingCells.has(i)

// Le pulse est actif si équipé ET qu'il y a une activité ce jour-là
const isPulseActive = day.acts.length > 0 && activeCardEffect?.id === "pulse";
const isReactorActive = isToday && activeTodayEffect?.id === "reactor_today";

const isSmartMode = activePassiveEffect?.id === "smart_analysis";
const smartData = isSmartMode ? getSmartCardStyle(day.acts) : null;
const isBlackHole = isFlipping && activeFlipEffect?.id === "black_hole";
const isShatter = isFlipping && activeFlipEffect?.id === "shatter";
const isFlashlight = activeHoverEffect?.id === "flashlight" && day.acts.length > 0;
const isVirtual = day.acts.some(a => 
  (a.type === 'VirtualRide') || 
  (a.name && (a.name.toLowerCase().includes('zwift') || a.name.toLowerCase().includes('mywoosh')))
)
let cellClasses = ""

if (isVirtual) cellClasses += " virtual-ride-stripes";

// --- PRIORITÉS D'AFFICHAGE ---
if (isReactorActive) {
    cellClasses += " today-reactor";
} 
else if (smartData) {
    cellClasses += ` ${smartData.class}`; // On ajoute la classe (ex: smart-climb)
}
else if (day.acts.length > 0 && activePassiveEffect?.cssClass && !isSmartMode) {
    cellClasses += ` ${activePassiveEffect.cssClass}`;
}
if (isFlipping) cellClasses += " flipping"
if (isClicking && activeClickEffect?.cssClass) cellClasses += ` ${activeClickEffect.cssClass}`
if (day.acts.length > 0 && activeCardEffect?.id === "pulse") cellClasses += " effect-pulse"
if (isBlackHole) cellClasses += " anim-blackhole";
if (isShatter) cellClasses += " anim-shatter";
if (isFlashlight) cellClasses += " stealth-mode";
if (activePassiveEffect?.id === "mercury_border" && day.acts.length > 0) cellClasses += " effect-mercury";
if (activePassiveEffect?.id === "prismatic" && day.acts.length > 0) cellClasses += " effect-prism";
if (day.acts.length > 0) {
   if (activePassiveEffect?.id === "mercury_border") cellClasses += " effect-mercury";
   else if (activePassiveEffect?.id === "divine_glow") cellClasses += " effect-divine";
   else if (activePassiveEffect?.id === "neon_frame") cellClasses += " effect-neon";
}

// SLOT HOVER (CSS only)
if (day.acts.length > 0 && activeHoverEffect?.id === "prismatic") cellClasses += " effect-prism";

const baseStyles = styles.dayCell(isToday, false, color, tss, streakConfig?.color || null);
const finalStyle: React.CSSProperties = { ...baseStyles };

if (smartData && smartData.variable) {
    // On fusionne les variables (ex: --climb-h) dans le style
    Object.assign(finalStyle, smartData.variable);
}

// B. Gestion du Réacteur
if (isReactorActive) {
    finalStyle.background = 'transparent';
    finalStyle.boxShadow = 'none';
    delete finalStyle.backgroundColor;
    delete finalStyle.border;
    delete finalStyle.borderColor;
}

// C. Gestion du Pulse
if (isPulseActive) {
    finalStyle.animationDuration = `${pulseSpeed}s`;
    if (isReactorActive) {
        finalStyle.borderColor = 'transparent';
        finalStyle.borderWidth = '0px';
    }
}

// D. Transitions
if (isClicking || isFlipping) {
    finalStyle.transition = 'none';
} else {
    finalStyle.transition = 'transform 0.2s ease, border-color 0.2s ease';
}

if (isPlaceholder) return <div key={`ph-${i}`} />

return (
    <div
      key={i}
      className={cellClasses}
      style={finalStyle}
      // ... tes event handlers (onMouseEnter, etc.) ...
      onMouseEnter={(e) => handleMouseEnter(e, day)} 
      onMouseMove={(e) => handleMouseMove(e, day.acts.length > 0)}
      onMouseLeave={(e) => {
        const target = e.currentTarget;
        // Reset standard
        target.style.transform = "translateY(0)";
        target.style.borderColor = isToday ? "#00f3ff" : tss > 0 ? `${color}40` : "rgba(255,255,255,0.05)";
        
        // FIX LAMPE TORCHE : On supprime le masque en sortant
        target.style.maskImage = "none";
        target.style.webkitMaskImage = "none";
}}
      onClick={(e) => handleCardClick(i, day.acts.length > 0, e)}
    >
      {showConnector && <div className={streakConfig!.className} />}
      {day.isFullWeek && streakConfig?.glowClass && <div className={streakConfig.glowClass} />}
      
      <div style={styles.dateNumber(isToday, day.acts.length > 0, color)}>
        {isPulseActive && (
           <span style={{ fontSize: '0.5rem', color: '#ef4444', marginLeft: '5px' }}>{Math.round(avgBpm)} bpm</span>
        )}
        <span className={isToday ? "today-number" : ""}>{day.dayNum}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {day.isFullWeek && streakConfig && (
            <span style={{ fontSize: "0.7rem" }}>{streakConfig.icon}</span>
          )}
          {tss > 0 && <span style={styles.tssBadge(color)}>{Math.round(tss)}</span>}
        </div>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden", flex: 1, position: 'relative', zIndex: 2 }}>
        {day.acts.map((act) => (
          <Link key={act.id} href={`/activities/${act.id}`} style={{ textDecoration: "none" }}>
            <div style={styles.activityRow}>
              <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span>
                {act.distance_km > 0 ? (
                  <b style={{ color: "#fff" }}>{Math.round(act.distance_km)}km</b>
                ) : (
                  <b style={{ color: "#fff" }}>{Math.round(act.duration_s / 60)}'</b>
                )}
              </span>
              <span style={{ fontSize: "0.6rem", color: "#888", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center" }}>
                {act.name}
                {/* --- ANCIEN EMPLACEMENT SUPPRIMÉ ICI --- */}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* --- NOUVEL EMPLACEMENT : GROS LOGO EN BAS À GAUCHE --- */}
      {mainActivityForWeather && (
          <ActivityWeatherIcon 
              activity={mainActivityForWeather}
              indexDelay={i}
              active={activePassiveEffect?.id === "weather_dynamic" || activeTodayEffect?.id === "weather_dynamic"} // Vérifie si le module est actif
              isBigMode={true} // ON ACTIVE LE MODE GROS LOGO
          />
      )}
    </div>
)
            })}
          </div>
        </div>
      </div>

      {/* 2. SIDEBAR ANALYTICS */}
      <div style={styles.sidebarSection}>
        {/* L'ŒIL DU COACH */}
        <div
          style={{
            ...styles.glassPanel,
            border: `1px solid ${feedback.color}60`,
            background: `linear-gradient(145deg, ${feedback.color}10 0%, rgba(20,20,30,0.9) 100%)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.4rem" }}>
            <FeedbackIcon size={18} color={feedback.color} />
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: feedback.color, textTransform: "uppercase" }}>
              {feedback.title}
            </span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#e0e0e0", fontStyle: "italic", lineHeight: "1.3", margin: 0 }}>
            "{feedback.text}"
          </p>
        </div>

        <div
          className={tssLevelClass}
          style={{
            ...styles.glassPanel,
            border: `2px solid ${tssLevelInfo.color}`,
            boxShadow: `0 0 20px ${tssLevelInfo.color}40`,
          }}
        >
          {stats.totalTSS >= 1000 && (
            <div
              style={{
                position: "absolute",
                top: "25px",
                rotate:'90deg',
                right: "-10px",
                background: tssLevelInfo.color,
                color: "#000",
                fontWeight: 900,
                fontSize: "0.6rem",
                padding: "3px 10px",
                borderRadius: "12px",
                zIndex: 10,
                boxShadow: `0 0 15px ${tssLevelInfo.color}`,
                border: "2px solid #fff",
                textTransform: "uppercase",
              }}
            >
              {tssLevelInfo.label} {tssLevelInfo.emoji}
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "0.75rem",
            }}
          >
            <div>
              <div style={styles.sidebarLabel}>CHARGE TOTALE</div>
              <div style={{ ...styles.highlightValue, color: stats.totalTSS >= 1000 ? "#fff" : "#d04fd7" }}>
                {Math.round(stats.totalTSS)}
              </div>
            </div>
            <div style={{ background: `${tssLevelInfo.color}30`, padding: "8px", borderRadius: "10px" }}>
              <Zap size={22} color={tssLevelInfo.color} />
            </div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#ccc", display: "flex", gap: "6px", alignItems: "center" }}>
            <Activity size={12} color={tssLevelInfo.color} />
            Moy: <b style={{ color: "#fff" }}>{stats.count > 0 ? Math.round(stats.totalTSS / stats.count) : 0} TSS</b> /
            sortie
          </div>
        </div>

        {/* LISTE COMPACTE STATS */}
        <div style={styles.glassPanel}>
          <h3
            style={{
              fontSize: "0.75rem",
              color: "#666",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1px",
              margin: "0 0 0.5rem 0",
            }}
          >
            RÉSUMÉ DU MOIS
          </h3>

          <div style={styles.compactStatRow}>
            <div style={styles.compactStatLabel}>
              <Activity size={12} /> Sorties
            </div>
            <div style={styles.compactStatValue}>{stats.count}</div>
          </div>
          <div style={styles.compactStatRow}>
            <div style={styles.compactStatLabel}>
              <Clock size={12} color="#00f3ff" /> Heures
            </div>
            <div style={styles.compactStatValue}>{(stats.totalTime / 3600).toFixed(1)} h</div>
          </div>
          <div style={styles.compactStatRow}>
            <div style={styles.compactStatLabel}>
              <TrendingUp size={12} color="#10b981" /> Distance
            </div>
            <div style={styles.compactStatValue}>{Math.round(stats.totalDist)} km</div>
          </div>
          <div style={styles.compactStatRow}>
            <div style={styles.compactStatLabel}>
              <Wind size={12} color="#00f3ff" /> Vit. Moy.
            </div>
            <div style={styles.compactStatValue}>{stats.avgSpeed.toFixed(1)} km/h</div>
          </div>
          <div style={styles.compactStatRow}>
            <div style={styles.compactStatLabel}>
              <Mountain size={12} color="#f59e0b" /> Dénivelé
            </div>
            <div style={styles.compactStatValue}>{Math.round(stats.totalElev)} m</div>
          </div>
          <div style={styles.compactStatRow}>
            <div style={styles.compactStatLabel}>
              <ArrowUpRight size={12} color="#00f3ff" /> Ratio D+
            </div>
            <div style={styles.compactStatValue}>
              <span style={{ color: "#00f3ff" }}>{stats.climbRatio}</span> m/km
            </div>
          </div>
          <div style={styles.compactStatRow}>
            <div style={styles.compactStatLabel}>
              <Flame size={12} color="#ef4444" /> Kcal
            </div>
            <div style={styles.compactStatValue}>{Math.round(stats.totalKcal).toLocaleString()}</div>
          </div>
        </div>

        {/* GRAPHIQUES */}
        <div style={styles.glassPanel}>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.65rem", color: "#aaa", fontWeight: 700, marginBottom: "3px" }}>
              INTENSITÉ HEBDO (TSS)
            </div>
            <div style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weeksData} margin={{ top: 12, right: 0, left: 0, bottom: 0 }}>
                  <Bar dataKey="tss" radius={[3, 3, 0, 0]}>
                    {stats.weeksData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.tss > 0 ? "#d04fd7" : "transparent"} />
                    ))}
                    <LabelList
                      dataKey="tss"
                      position="top"
                      fill="#fff"
                      fontSize={8}
                      fontWeight={700}
                      formatter={(val: number) => (val > 0 ? Math.round(val) : "")}
                    />
                  </Bar>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 8, fill: "#666" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.65rem", color: "#aaa", fontWeight: 700, marginBottom: "3px" }}>
              VOLUME CUMULÉ (KM)
            </div>
            <div style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.cumulativeData}>
                  <defs>
                    <linearGradient id="colorKm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00f3ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{
                      background: "#111",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      fontSize: "0.7rem",
                    }}
                    formatter={(value: number) => [`${value} km`, "Cumul"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="km"
                    stroke="#00f3ff"
                    fillOpacity={1}
                    fill="url(#colorKm)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}