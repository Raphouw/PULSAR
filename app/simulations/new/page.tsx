"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { useSession } from "next-auth/react"
import { Wind, Play, Save, Upload, Clock, Thermometer, Database, MapPin, User, Bike, X } from "lucide-react"
import {
  runUltraAdvancedSimulation,
  type SimSegment,
  type SimulationResult,
} from "../../../lib/advanced-simulation-engine"
import { PACING_STRATEGIES, type PacingStrategyType } from "../../../lib/simulation-strategies"
import { supabase } from "../../../lib/supabaseClient"

const AdvancedSimulationMap = dynamic(() => import("../components/AdvancedSimulationMap"), {
  ssr: false,
  loading: () => <div style={styles.mapPlaceholder}>Chargement Carte 3D...</div>,
})

const AdvancedChart = dynamic(() => import("../components/AdvancedChart"), { ssr: false })

// ============ HELPERS ============

const parseGpx = (gpxContent: any): [number, number, number][] => {
  // Cas 1: GeoJSON depuis BDD
  if (gpxContent && typeof gpxContent === "object" && gpxContent.geometry?.coordinates) {
    return gpxContent.geometry.coordinates.map((p: any) => [p[1], p[0], p[2] || 0])
  }
  
  // Cas 2: String XML
  if (typeof gpxContent === "string") {
    const points: [number, number, number][] = []
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(gpxContent, "text/xml")
    const trkpts = xmlDoc.getElementsByTagName("trkpt")

    for (let i = 0; i < trkpts.length; i++) {
      const pt = trkpts[i]
      points.push([
        Number.parseFloat(pt.getAttribute("lat") || "0"),
        Number.parseFloat(pt.getAttribute("lon") || "0"),
        Number.parseFloat(pt.getElementsByTagName("ele")[0]?.textContent || "0"),
      ])
    }
    return points
  }
  return []
}

const formatTime = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return `${h}h${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
}

// ============ COMPOSANTS UI ============

const CyberSlider = ({ label, value, min, max, step, unit, onChange, color = "#00f3ff", icon }: any) => {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div style={{ marginBottom: "1.2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "center" }}>
        <label
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#aaa",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {icon}
          {label}
        </label>
        <div
          style={{
            background: "rgba(0,0,0,0.5)",
            padding: "4px 12px",
            borderRadius: "6px",
            border: `1px solid ${color}30`,
            backdropFilter: "blur(10px)",
          }}
        >
          <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fff", fontFamily: "monospace" }}>{value}</span>
          <span style={{ fontSize: "0.7rem", color: color, marginLeft: "4px", fontWeight: 600 }}>{unit}</span>
        </div>
      </div>

      <div style={{ position: "relative", height: "20px", display: "flex", alignItems: "center" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "6px",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "3px",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            width: `${percentage}%`,
            height: "6px",
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            borderRadius: "3px",
            boxShadow: `0 0 10px ${color}40`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number.parseFloat(e.target.value))}
          style={{
            width: "100%",
            height: "20px",
            background: "transparent",
            position: "relative",
            zIndex: 2,
            margin: 0,
            cursor: "pointer",
            WebkitAppearance: "none",
            appearance: "none",
          }}
        />
      </div>
    </div>
  )
}

// ============ PAGE PRINCIPALE ============

export default function AdvancedSimulationPage() {
  const { data: session } = useSession()
  
  // STATE BDD
  const [dbRoutes, setDbRoutes] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<{weight: number, ftp: number, wPrime: number} | null>(null)
  const [sourceMode, setSourceMode] = useState<"DB" | "UPLOAD">("DB")
  const [selectedRouteId, setSelectedRouteId] = useState<string>("")

  // STATE SIMULATION
  const [points, setPoints] = useState<[number, number, number][] | null>(null)
  const [routeName, setRouteName] = useState("")
  const [weatherData, setWeatherData] = useState<any>(null)

  // Config utilisateur
  const [userWeight, setUserWeight] = useState(70)
  const [userFtp, setUserFtp] = useState(250)
  const [userWPrime, setUserWPrime] = useState(20000)

  // Config simulation
  const [bikeWeight, setBikeWeight] = useState(8.0)
  const [cda, setCda] = useState(0.32)
  const [startHour, setStartHour] = useState(10)
  const [targetMode, setTargetMode] = useState<"POWER" | "SPEED">("POWER")
  const [targetValue, setTargetValue] = useState(250)
  const [strategy, setStrategy] = useState<PacingStrategyType>("RACE")

  // Résultats
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [focusedSegment, setFocusedSegment] = useState<SimSegment | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)

  // Chargement initial des données
  useEffect(() => {
    const initData = async () => {
      if (!session?.user?.email) return
      
      try {
        // ⚡ FIX: Cast 'any' pour éviter les erreurs 'never'
        const { data: userData } = await supabase
          .from("users")
          .select("id, weight, ftp, w_prime")
          .eq("email", session.user.email)
          .single()

        const user = userData as any;

        if (user) {
          const profile = {
            weight: user.weight || 70,
            ftp: user.ftp || 250,
            wPrime: user.w_prime || 20000
          }
          setUserProfile(profile)
          setUserWeight(profile.weight)
          setUserFtp(profile.ftp)
          setUserWPrime(profile.wPrime)

          const { data: routes } = await supabase
            .from("routes")
            .select("id, name, distance_km, elevation_gain_m, gpx_data")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })

          if (routes) {
            setDbRoutes(routes)
            if (routes.length > 0) handleSelectRoute(routes[0])
          }
        }
      } catch (err) {
        console.error("Erreur chargement initial:", err)
      }
    }
    initData()
  }, [session])

  useEffect(() => {
    if (points && points.length > 0) {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${points[0][0]}&longitude=${points[0][1]}&hourly=temperature_2m,windspeed_10m,winddirection_10m&timezone=auto`)
        .then((r) => r.json())
        .then((data) => { if (data.hourly) setWeatherData(data.hourly) })
    }
  }, [points])

  const weather = useMemo(() => {
    if (!weatherData) return { wind: 15, dir: 180, temp: 18 }
    const idx = Math.min(startHour, weatherData.temperature_2m.length - 1)
    return {
      wind: weatherData.windspeed_10m[idx] || 15,
      dir: weatherData.winddirection_10m[idx] || 180,
      temp: weatherData.temperature_2m[idx] || 18,
    }
  }, [weatherData, startHour])

  // Handlers
  const handleSelectRoute = (route: any) => {
    setSelectedRouteId(route.id)
    setRouteName(route.name)
    const parsedPoints = parseGpx(route.gpx_data)
    setPoints(parsedPoints)
    setResult(null)
    setFocusedSegment(null)
    setSourceMode("DB")
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setRouteName(file.name.replace(".gpx", ""))
    setSourceMode("UPLOAD")
    const text = await file.text()
    const parsedPoints = parseGpx(text)
    setPoints(parsedPoints)
    setResult(null)
    setFocusedSegment(null)
  }

  const handleSimulate = () => {
    if (!points) return

    setIsSimulating(true)
    setFocusedSegment(null)

    // Simulation dans un timeout pour ne pas bloquer l'UI
    setTimeout(() => {
      const simResult = runUltraAdvancedSimulation(points, {
        user: { weight: userWeight, ftp: userFtp, wPrime: userWPrime },
        bikeWeight,
        cda,
        crr: 0.004,
        rho: 1.225,
        windSpeedKmh: weather.wind,
        windDirectionDeg: weather.dir,
        temperature: weather.temp,
        targetMode,
        targetValue,
        strategy,
      })

      setResult(simResult)
      setIsSimulating(false)
    }, 600)
  }

  const handleSegmentClick = (seg: SimSegment) => {
    setFocusedSegment(seg.id === focusedSegment?.id ? null : seg)

    // Scroll vers le segment dans le tableau
    const el = document.getElementById(`seg-${seg.id}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  const handleSaveSimulation = async () => {
    if (!result || !session?.user?.email) return

   try {
      // 1. Récupérer l'ID utilisateur avec un cast explicite
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("id")
        .eq("email", session.user.email)
        .single()

      if (fetchError || !userData) {
        throw new Error("Utilisateur non trouvé")
      }

      // ⚡ FIX: On force le type 'any' sur l'objet user pour accéder à .id
      const user = userData as any;

      

      if (user) {
        const simulationData = {
          user_id: user.id,
          route_id: selectedRouteId || null,
          route_name: routeName,
          config: { 
            userWeight, 
            userFtp, 
            userWPrime, 
            bikeWeight, 
            cda, 
            strategy, 
            targetMode, 
            targetValue,
            startHour,
            weather
          },
          results: {
            totalTime: result.summary.totalTime,
            avgSpeed: result.summary.avgSpeed,
            avgPower: result.summary.avgPower,
            normalizedPower: result.summary.normalizedPower,
            totalWork: result.summary.totalWork,
            tss: result.summary.tss,
            segments: result.segments,
            nutritionPoints: result.nutritionPoints
          },
          created_at: new Date().toISOString()
        }

        const { error } = await (supabase.from("simulations") as any).insert([simulationData])
          .from("simulations")
          .insert([simulationData])

        if (error) throw error

        // Téléchargement local aussi
        const blob = new Blob([JSON.stringify(simulationData, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `simulation-${routeName}-${Date.now()}.json`
        a.click()
      }
    } catch (error) {
      console.error("Erreur sauvegarde:", error)
      // Fallback: téléchargement local uniquement
      const blob = new Blob([JSON.stringify({
        routeName,
        config: { userWeight, userFtp, userWPrime, bikeWeight, cda, strategy, targetMode, targetValue },
        result,
        timestamp: new Date().toISOString(),
      }, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `simulation-${routeName}-${Date.now()}.json`
      a.click()
    }
  }

  return (
    <div style={styles.container}>
      {/* Styles globaux */}
      <style jsx global>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: 3px solid #00f3ff;
          box-shadow: 0 0 10px #00f3ff80, 0 2px 4px rgba(0,0,0,0.3);
          transition: all 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 15px #00f3ff, 0 2px 8px rgba(0,0,0,0.5);
        }
        .segment-row {
          transition: all 0.2s ease;
        }
        .segment-row:hover {
          background: rgba(255,255,255,0.08) !important;
          transform: translateX(4px);
        }
        .segment-row.focused {
          background: rgba(0,243,255,0.15) !important;
          border-left: 3px solid #00f3ff !important;
        }
        .nutrition-badge {
          transition: transform 0.2s ease;
        }
        .nutrition-badge:hover {
          transform: scale(1.1);
        }
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 3px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: #111;
        }
        .route-item {
          transition: all 0.2s ease;
        }
        .route-item:hover {
          background: rgba(255,255,255,0.05) !important;
          border-color: #00f3ff40 !important;
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <span style={{ color: "#00f3ff" }}>SIMULATION</span> <span style={{ color: "#d04fd7" }}>ULTRA PRO</span>
          </h1>
          <p style={styles.subtitle}>Base de données • Modèle physique avancé • W' Balance • Fatigue • Nutrition</p>
        </div>
        {session?.user && (
          <div style={styles.userInfo}>
            <User size={16} />
            <span>{session.user.email}</span>
            {userProfile && (
              <div style={{ fontSize: "0.7rem", color: "#888", marginLeft: "12px" }}>
                {userProfile.weight}kg • FTP {userProfile.ftp}W • W' {userProfile.wPrime}J
              </div>
            )}
          </div>
        )}
        {result && (
          <button onClick={handleSaveSimulation} style={styles.saveBtn}>
            <Save size={18} />
            SAUVEGARDER (BDD)
          </button>
        )}
      </div>

      <div style={styles.grid}>
        {/* ========== COLONNE GAUCHE : Configuration ========== */}
        <div style={styles.leftCol}>
          {/* Sélection source */}
          <div style={styles.panel}>
            <div style={styles.panelTitle}>📁 SOURCE PARCOURS</div>
            <div style={styles.tabs}>
              <button
                onClick={() => setSourceMode("DB")}
                style={sourceMode === "DB" ? styles.tabActive : styles.tab}
              >
                <Database size={14} />
                BIBLIOTHÈQUE ({dbRoutes.length})
              </button>
              <button
                onClick={() => setSourceMode("UPLOAD")}
                style={sourceMode === "UPLOAD" ? styles.tabActive : styles.tab}
              >
                <Upload size={14} />
                IMPORT GPX
              </button>
            </div>

            {sourceMode === "DB" ? (
              <div className="custom-scroll" style={{ maxHeight: "200px", overflowY: "auto", marginTop: "12px" }}>
                {dbRoutes.length > 0 ? (
                  dbRoutes.map((route) => (
                    <div
                      key={route.id}
                      onClick={() => handleSelectRoute(route)}
                      className="route-item"
                      style={{
                        ...styles.routeItem,
                        ...(selectedRouteId === route.id ? styles.routeItemActive : {}),
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.85rem" }}>{route.name}</div>
                      <div style={{ fontSize: "0.7rem", color: "#888", display: "flex", gap: "8px", marginTop: "4px" }}>
                        <span>📏 {route.distance_km}km</span>
                        <span>⛰️ {route.elevation_gain_m}m D+</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "20px", color: "#666", fontSize: "0.8rem" }}>
                    Aucune route sauvegardée
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.uploadZone}>
                <input
                  type="file"
                  accept=".gpx"
                  onChange={handleUpload}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                />
                <Upload size={24} color="#666" />
                <div style={{ fontSize: "0.85rem", color: "#888", marginTop: "8px" }}>
                  {routeName || "Cliquez ou glissez un fichier GPX"}
                </div>
                {points && (
                  <div style={{ fontSize: "0.7rem", color: "#00f3ff", marginTop: "4px" }}>
                    ✓ {points.length} points chargés
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profil utilisateur */}
          <div style={styles.panel}>
            <div style={styles.panelTitle}>
              <User size={14} style={{ marginRight: "6px" }} />
              PROFIL ATHLÈTE
            </div>
            {userProfile ? (
              <div style={{ fontSize: "0.75rem", color: "#10b981", marginBottom: "12px", fontWeight: 600 }}>
                ✓ Profil chargé depuis la base de données
              </div>
            ) : (
              <div style={{ fontSize: "0.75rem", color: "#f59e0b", marginBottom: "12px", fontWeight: 600 }}>
                ⚠️ Connectez-vous pour charger votre profil
              </div>
            )}
            <CyberSlider
              label="POIDS"
              value={userWeight}
              min={50}
              max={100}
              step={1}
              unit="kg"
              onChange={setUserWeight}
              color="#10b981"
              icon="⚖️"
            />
            <CyberSlider
              label="FTP"
              value={userFtp}
              min={150}
              max={450}
              step={5}
              unit="W"
              onChange={setUserFtp}
              color="#f59e0b"
              icon="⚡"
            />
            <CyberSlider
              label="W' (W Prime)"
              value={userWPrime}
              min={10000}
              max={40000}
              step={1000}
              unit="J"
              onChange={setUserWPrime}
              color="#d04fd7"
              icon="💪"
            />
          </div>

          {/* Matériel */}
          <div style={styles.panel}>
            <div style={styles.panelTitle}>
              <Bike size={14} style={{ marginRight: "6px" }} />
              MATÉRIEL
            </div>
            <CyberSlider
              label="POIDS VÉLO"
              value={bikeWeight}
              min={6}
              max={12}
              step={0.1}
              unit="kg"
              onChange={setBikeWeight}
              color="#fff"
              icon="🚲"
            />
            <CyberSlider
              label="CdA AÉRO"
              value={cda}
              min={0.2}
              max={0.45}
              step={0.01}
              unit="m²"
              onChange={setCda}
              color="#888"
              icon="💨"
            />
          </div>

          {/* Stratégie */}
          <div style={styles.panel}>
            <div style={styles.panelTitle}>🎯 OBJECTIF</div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
              <button
                onClick={() => setTargetMode("POWER")}
                style={targetMode === "POWER" ? styles.modeActive : styles.modeBtn}
              >
                ⚡ WATTS
              </button>
              <button
                onClick={() => setTargetMode("SPEED")}
                style={targetMode === "SPEED" ? styles.modeActive : styles.modeBtn}
              >
                🚴 VITESSE
              </button>
            </div>

            <CyberSlider
              label={targetMode === "POWER" ? "PUISSANCE CIBLE" : "VITESSE CIBLE"}
              value={targetValue}
              min={targetMode === "POWER" ? 100 : 20}
              max={targetMode === "POWER" ? 450 : 50}
              step={1}
              unit={targetMode === "POWER" ? "W" : "km/h"}
              onChange={setTargetValue}
              color="#f59e0b"
              icon={targetMode === "POWER" ? "⚡" : "🚴"}
            />

            <div style={{ marginTop: "1rem" }}>
              <label
                style={{ fontSize: "0.75rem", color: "#aaa", fontWeight: 700, marginBottom: "8px", display: "block" }}
              >
                🏁 STRATÉGIE DE COURSE
              </label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as PacingStrategyType)}
                style={styles.select}
              >
                {Object.keys(PACING_STRATEGIES).map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Météo */}
          {points && (
            <div style={styles.panel}>
              <div style={styles.panelTitle}>🌤️ MÉTÉO</div>

              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{ fontSize: "0.75rem", color: "#aaa", fontWeight: 700, marginBottom: "8px", display: "block" }}
                >
                  <Clock size={12} style={{ display: "inline", marginRight: "4px" }} />
                  HEURE DE DÉPART
                </label>
                <input
                  type="range"
                  min="6"
                  max="20"
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#00f3ff" }}
                />
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: "#00f3ff",
                    marginTop: "8px",
                  }}
                >
                  {startHour}H00
                </div>
              </div>

              <div style={styles.weatherGrid}>
                <div style={styles.weatherBox}>
                  <Wind size={20} color="#3b82f6" />
                  <div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>{weather.wind.toFixed(1)}</div>
                    <div style={{ fontSize: "0.7rem", color: "#888" }}>km/h</div>
                  </div>
                </div>

                <div style={styles.weatherBox}>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      transform: `rotate(${weather.dir}deg)`,
                      transition: "transform 0.3s ease",
                    }}
                  >
                    ⬇️
                  </div>
                  <div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>{weather.dir}°</div>
                    <div style={{ fontSize: "0.7rem", color: "#888" }}>direction</div>
                  </div>
                </div>

                <div style={styles.weatherBox}>
                  <Thermometer size={20} color="#f59e0b" />
                  <div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>{weather.temp.toFixed(1)}°</div>
                    <div style={{ fontSize: "0.7rem", color: "#888" }}>Celsius</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bouton simulation */}
          <button
            onClick={handleSimulate}
            disabled={!points || isSimulating}
            style={!points || isSimulating ? styles.runBtnDisabled : styles.runBtn}
          >
            {isSimulating ? (
              <>⏳ CALCUL EN COURS...</>
            ) : (
              <>
                <Play size={20} fill="#000" />
                LANCER SIMULATION
              </>
            )}
          </button>
        </div>

        {/* ========== COLONNE DROITE : Résultats ========== */}
        <div style={styles.rightCol}>
          {/* Carte */}
          <div style={styles.mapCard}>
            <AdvancedSimulationMap
              points={points}
              segments={result?.segments || null}
              nutritionPoints={result?.nutritionPoints || []}
              focusedSegment={focusedSegment}
              onSegmentClick={handleSegmentClick}
            />
            {routeName && (
              <div style={styles.mapBadge}>
                <MapPin size={12} style={{ marginRight: "6px" }} />
                {routeName}
                {sourceMode === "DB" && <span style={{ marginLeft: "8px", color: "#00f3ff" }}>BDD</span>}
              </div>
            )}
          </div>

          {/* KPIs */}
          {result && (
            <>
              <div style={styles.kpiGrid}>
                <div style={styles.kpiCard}>
                  <div style={{ fontSize: "0.7rem", color: "#888", fontWeight: 700 }}>⏱️ TEMPS</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fff" }}>
                    {formatTime(result.summary.totalTime)}
                  </div>
                </div>

                <div style={styles.kpiCard}>
                  <div style={{ fontSize: "0.7rem", color: "#888", fontWeight: 700 }}>🚴 VITESSE MOY.</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#00f3ff" }}>
                    {result.summary.avgSpeed.toFixed(1)}
                    <span style={{ fontSize: "0.9rem", marginLeft: "4px" }}>km/h</span>
                  </div>
                </div>

                <div style={styles.kpiCard}>
                  <div style={{ fontSize: "0.7rem", color: "#888", fontWeight: 700 }}>⚡ PUISSANCE</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f59e0b" }}>
                    {Math.round(result.summary.avgPower)}
                    <span style={{ fontSize: "0.9rem", marginLeft: "4px" }}>W</span>
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "#666" }}>
                    NP: {Math.round(result.summary.normalizedPower)}W
                  </div>
                </div>

                <div style={styles.kpiCard}>
                  <div style={{ fontSize: "0.7rem", color: "#888", fontWeight: 700 }}>📊 TSS</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#d04fd7" }}>
                    {Math.round(result.summary.tss)}
                  </div>
                </div>

                <div style={styles.kpiCard}>
                  <div style={{ fontSize: "0.7rem", color: "#888", fontWeight: 700 }}>🔥 ÉNERGIE</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#ef4444" }}>
                    {Math.round(result.summary.totalWork)}
                    <span style={{ fontSize: "0.9rem", marginLeft: "4px" }}>kJ</span>
                  </div>
                </div>

                <div style={styles.kpiCard}>
                  <div style={{ fontSize: "0.7rem", color: "#888", fontWeight: 700 }}>🍔 NUTRITION</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#10b981" }}>
                    {result.nutritionPoints.length}
                    <span style={{ fontSize: "0.9rem", marginLeft: "4px" }}>pts</span>
                  </div>
                </div>
              </div>

              {/* Graphique */}
              <AdvancedChart segments={result.segments} maxWPrime={userWPrime} focusedSegment={focusedSegment} />

              {/* Tableau segments - VERSION FIXE AVEC SCROLL */}
              <div style={styles.tableCard}>
                <div
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "#111",
                    zIndex: 10,
                    padding: "12px",
                    borderBottom: "2px solid #00f3ff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 800, color: "#00f3ff" }}>
                    📊 SEGMENTS ({result.segments.length})
                  </h3>
                  {focusedSegment && (
                    <button
                      onClick={() => setFocusedSegment(null)}
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        border: "1px solid #666",
                        borderRadius: "6px",
                        padding: "4px 12px",
                        color: "#fff",
                        fontSize: "0.7rem",
                        cursor: "pointer",
                      }}
                    >
                      <X size={12} style={{ marginRight: "4px" }} />
                      Réinitialiser
                    </button>
                  )}
                </div>

                <div
                  className="custom-scroll"
                  style={{
                    height: "400px", // Hauteur fixe
                    overflowY: "auto",
                    overflowX: "hidden",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                    <thead
                      style={{
                        position: "sticky",
                        top: 0,
                        background: "#1a1a1a",
                        zIndex: 5,
                      }}
                    >
                      <tr>
                        <th style={styles.th}>#</th>
                        <th style={{ ...styles.th, textAlign: "left" }}>KM</th>
                        <th style={styles.th}>📐</th>
                        <th style={styles.th}>⚡W</th>
                        <th style={styles.th}>🚴</th>
                        <th style={styles.th}>⏱️</th>
                        <th style={styles.th}>💪W'</th>
                        <th style={styles.th}>😰</th>
                        <th style={styles.th}>🍔</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.segments.map((seg, idx) => {
                        const isFocused = focusedSegment?.id === seg.id
                        const nutriForSeg = result.nutritionPoints.filter((n) => n.segmentId === seg.id)

                        return (
                          <tr
                            key={seg.id}
                            id={`seg-${seg.id}`}
                            onClick={() => handleSegmentClick(seg)}
                            className={`segment-row ${isFocused ? "focused" : ""}`}
                            style={{
                              background: isFocused ? "rgba(0,243,255,0.1)" : idx % 2 === 0 ? "#0a0a0a" : "#111",
                              borderLeft: isFocused ? "3px solid #00f3ff" : "3px solid transparent",
                              cursor: "pointer",
                            }}
                          >
                            <td style={styles.td}>{idx + 1}</td>
                            <td style={styles.td}>
                              {seg.startKm.toFixed(1)}-{seg.endKm.toFixed(1)}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                color: seg.avgGradient > 3 ? "#ef4444" : seg.avgGradient < -2 ? "#3b82f6" : "#888",
                                fontWeight: 700,
                              }}
                            >
                              {seg.avgGradient > 0 ? "+" : ""}
                              {seg.avgGradient.toFixed(1)}%
                            </td>
                            <td style={{ ...styles.td, color: "#f59e0b", fontWeight: 800 }}>
                              {Math.round(seg.avgPower)}
                            </td>
                            <td style={{ ...styles.td, color: "#00f3ff" }}>{seg.avgSpeed.toFixed(1)}</td>
                            <td style={{ ...styles.td, fontFamily: "monospace", fontSize: "0.7rem" }}>
                              {Math.floor(seg.duration / 60)}:
                              {Math.round(seg.duration % 60)
                                .toString()
                                .padStart(2, "0")}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                color:
                                  seg.wPrimePercent < 20 ? "#ef4444" : seg.wPrimePercent < 50 ? "#f59e0b" : "#10b981",
                                fontWeight: 700,
                              }}
                            >
                              {seg.wPrimePercent.toFixed(0)}%
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                color:
                                  seg.fatigueLevel > 0.7 ? "#ef4444" : seg.fatigueLevel > 0.4 ? "#f59e0b" : "#10b981",
                              }}
                            >
                              {(seg.fatigueLevel * 100).toFixed(0)}%
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {nutriForSeg.length > 0 ? (
                                nutriForSeg.map((n, nIdx) => (
                                  <span
                                    key={nIdx}
                                    className="nutrition-badge"
                                    title={n.reason}
                                    style={{
                                      display: "inline-block",
                                      fontSize: "1rem",
                                      margin: "0 2px",
                                    }}
                                  >
                                    {n.type === "GEL" ? "🍯" : n.type === "BAR" ? "🍫" : "💧"}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: "#444", fontSize: "0.7rem" }}>-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Plan nutrition */}
              {result.nutritionPoints.length > 0 && (
                <div style={styles.nutritionPanel}>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#10b981", marginBottom: "12px" }}>
                    🍔 PLAN NUTRITION ({result.nutritionPoints.reduce((acc, n) => acc + n.calories, 0)} kcal)
                  </h3>
                  <div className="custom-scroll" style={{ maxHeight: "200px", overflowY: "auto", display: "grid", gap: "8px" }}>
                    {result.nutritionPoints.map((nutri, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          borderLeft: `4px solid ${nutri.type === "GEL" ? "#f59e0b" : nutri.type === "BAR" ? "#8b5cf6" : "#3b82f6"}`,
                          borderRadius: "6px",
                          padding: "10px 12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{ fontSize: "1.5rem" }}>
                            {nutri.type === "GEL" ? "🍯" : nutri.type === "BAR" ? "🍫" : "💧"}
                          </span>
                          <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}>{nutri.type}</div>
                            <div style={{ fontSize: "0.65rem", color: "#888" }}>{nutri.reason}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "0.7rem", color: "#00f3ff" }}>
                            📍 {nutri.distanceKm.toFixed(1)} km
                          </div>
                          <div style={{ fontSize: "0.65rem", color: "#888" }}>⏱️ {formatTime(nutri.timeS)}</div>
                          <div style={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: 700 }}>
                            🔥 {nutri.calories} kcal
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ STYLES ============

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(to bottom, #0a0a0a 0%, #000 100%)",
    color: "#fff",
    padding: "2rem",
    fontFamily: "system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,

  header: {
    marginBottom: "2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "2px solid rgba(0,243,255,0.2)",
    paddingBottom: "1.5rem",
    flexWrap: "wrap" as const,
    gap: "1rem",
  } as React.CSSProperties,

  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(255,255,255,0.05)",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    border: "1px solid rgba(255,255,255,0.1)",
  } as React.CSSProperties,

  title: {
    fontSize: "2.5rem",
    fontWeight: 900,
    margin: 0,
    letterSpacing: "-1px",
  } as React.CSSProperties,

  subtitle: {
    color: "#888",
    fontSize: "0.85rem",
    marginTop: "6px",
  } as React.CSSProperties,

  saveBtn: {
    background: "#10b981",
    color: "#000",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontWeight: 800,
    fontSize: "0.85rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 0 20px #10b98140",
    transition: "all 0.2s",
  } as React.CSSProperties,

  grid: {
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: "2rem",
    maxWidth: "1800px",
    margin: "0 auto",
  } as React.CSSProperties,

  leftCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.2rem",
  } as React.CSSProperties,

  rightCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.2rem",
  } as React.CSSProperties,

  panel: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "1.2rem",
    backdropFilter: "blur(10px)",
  } as React.CSSProperties,

  panelTitle: {
    fontSize: "0.8rem",
    fontWeight: 800,
    color: "#00f3ff",
    marginBottom: "1rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    display: "flex",
    alignItems: "center",
  } as React.CSSProperties,

  tabs: {
    display: "flex",
    background: "rgba(255,255,255,0.05)",
    padding: "4px",
    borderRadius: "8px",
    marginBottom: "12px",
  } as React.CSSProperties,

  tab: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#888",
    padding: "8px 12px",
    fontSize: "0.7rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    borderRadius: "6px",
  } as React.CSSProperties,

  tabActive: {
    flex: 1,
    background: "rgba(0,243,255,0.15)",
    border: "1px solid #00f3ff",
    color: "#00f3ff",
    padding: "8px 12px",
    fontSize: "0.7rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    borderRadius: "6px",
  } as React.CSSProperties,

  routeItem: {
    padding: "12px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "8px",
    marginBottom: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  routeItemActive: {
    background: "rgba(208, 79, 215, 0.1)",
    border: "1px solid #d04fd7",
  } as React.CSSProperties,

  uploadZone: {
    position: "relative" as const,
    border: "2px dashed rgba(255,255,255,0.2)",
    borderRadius: "8px",
    padding: "2rem",
    textAlign: "center" as const,
    cursor: "pointer",
    transition: "all 0.2s",
    background: "rgba(0,0,0,0.2)",
  } as React.CSSProperties,

  modeBtn: {
    flex: 1,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#888",
    padding: "10px",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "0.75rem",
    cursor: "pointer",
    transition: "all 0.2s",
  } as React.CSSProperties,

  modeActive: {
    flex: 1,
    background: "#00f3ff",
    border: "1px solid #00f3ff",
    color: "#000",
    padding: "10px",
    borderRadius: "8px",
    fontWeight: 800,
    fontSize: "0.75rem",
    cursor: "pointer",
    boxShadow: "0 0 15px #00f3ff40",
  } as React.CSSProperties,

  select: {
    width: "100%",
    background: "rgba(0,0,0,0.5)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,

  weatherGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
  } as React.CSSProperties,

  weatherBox: {
    background: "rgba(0,0,0,0.3)",
    borderRadius: "8px",
    padding: "12px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "8px",
    border: "1px solid rgba(255,255,255,0.05)",
  } as React.CSSProperties,

  runBtn: {
    background: "linear-gradient(135deg, #00f3ff 0%, #0099ff 100%)",
    color: "#000",
    border: "none",
    padding: "16px",
    borderRadius: "12px",
    fontWeight: 900,
    fontSize: "1rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    boxShadow: "0 4px 20px #00f3ff40",
    transition: "all 0.3s",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  } as React.CSSProperties,

  runBtnDisabled: {
    background: "rgba(255,255,255,0.1)",
    color: "#666",
    border: "none",
    padding: "16px",
    borderRadius: "12px",
    fontWeight: 900,
    fontSize: "1rem",
    cursor: "not-allowed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  } as React.CSSProperties,

  mapCard: {
    height: "500px",
    borderRadius: "12px",
    overflow: "hidden",
    position: "relative" as const,
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
  } as React.CSSProperties,

  mapPlaceholder: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#111",
    color: "#666",
  } as React.CSSProperties,

  mapBadge: {
    position: "absolute" as const,
    top: "1rem",
    left: "1rem",
    background: "rgba(0,0,0,0.8)",
    backdropFilter: "blur(10px)",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.2)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
  } as React.CSSProperties,

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
  } as React.CSSProperties,

  kpiCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "16px",
    textAlign: "center" as const,
  } as React.CSSProperties,

  tableCard: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    overflow: "hidden",
    height: "500px", // Hauteur totale fixe
    display: "flex",
    flexDirection: "column" as const,
  } as React.CSSProperties,

  th: {
    padding: "12px 8px",
    textAlign: "center" as const,
    fontSize: "0.7rem",
    fontWeight: 800,
    color: "#888",
    textTransform: "uppercase" as const,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  } as React.CSSProperties,

  td: {
    padding: "12px 8px",
    textAlign: "center" as const,
    fontSize: "0.75rem",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  } as React.CSSProperties,

  nutritionPanel: {
    background: "rgba(16,185,129,0.05)",
    border: "1px solid rgba(16,185,129,0.2)",
    borderRadius: "12px",
    padding: "1.2rem",
  } as React.CSSProperties,
}