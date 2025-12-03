"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Tabs, Tab } from "../../components/ui/tabs"
import { TabsList, Tabs1 } from "./tabs"
import {
  Bike,
  Calendar,
  TrendingUp,
  Wind,
  Mountain,
  Zap,
  Settings,
  Trophy,
  Plus,
  X,
  Save,
  Gauge,
  Activity,
  Wrench,
  Edit,
  Trash2,
} from "lucide-react"

// --- 1. TYPES ---

type UserProfile = {
  id: string
  name: string
  email: string
  weight: number
  ftp: number
  max_heart_rate?: number
  resting_heart_rate?: number
  avatar_url: string | null
  created_at: string
  w_prime?: number
  vo2max?: number
  cp3?: number
  cp12?: number
  tte?: number
}

type BikeType =
  | "Aero"
  | "Grimpeur"
  | "Endurance"
  | "Gravel"
  | "TT"
  | "CLM"
  | "VTT"
  | "Cyclocross"
  | "Piste"
  | "Randonneuse"
  | "BMX"
  | "Fixie"

type BikeData = {
  id: number
  name: string
  brand: string
  model: string
  type: BikeType
  colorHex: string
  weightKg: number
  purchaseDate: string
  retirementDate?: string
  totalKm: number
  groupset: string
  wheels?: string
  frameMaterial?: string
  frameSize?: string
  specs?: { aero: number; weight: number; comfort: number }
  maintenance?: {
    chain: number
    tires: number
    pads: number
    lastService?: string
    nextService?: string
  }
  monthlyKm?: { month: string; km: number }[]
}

const MOCK_PROFILE: UserProfile = {
  id: "1",
  name: "Alex Cycliste",
  email: "alex@cycling.pro",
  weight: 72,
  ftp: 320,
  max_heart_rate: 190,
  resting_heart_rate: 45,
  avatar_url: null,
  created_at: "2022-01-01",
  w_prime: 18000,
  vo2max: 65,
  cp3: 380,
  cp12: 340,
  tte: 3600,
}

const INITIAL_BIKES: BikeData[] = [
  {
    id: 1,
    name: "Le Chrono",
    brand: "Canyon",
    model: "Speedmax CFR",
    type: "CLM",
    colorHex: "#00f3ff",
    weightKg: 8.2,
    purchaseDate: "2023-01-15",
    retirementDate: "2024-06-01",
    totalKm: 4500,
    groupset: "SRAM Red AXS",
    wheels: "Zipp 808",
    frameMaterial: "Carbon",
    frameSize: "56cm",
    specs: { aero: 100, weight: 60, comfort: 20 },
    maintenance: { chain: 80, tires: 90, pads: 100, lastService: "2024-05-01", nextService: "2024-07-01" },
    monthlyKm: [
      { month: "2023-01", km: 150 },
      { month: "2023-02", km: 200 },
      { month: "2023-03", km: 280 },
      { month: "2023-04", km: 350 },
      { month: "2023-05", km: 420 },
      { month: "2023-06", km: 380 },
      { month: "2023-07", km: 450 },
      { month: "2023-08", km: 400 },
      { month: "2023-09", km: 320 },
      { month: "2023-10", km: 290 },
      { month: "2023-11", km: 250 },
      { month: "2023-12", km: 180 },
      { month: "2024-01", km: 160 },
      { month: "2024-02", km: 210 },
      { month: "2024-03", km: 240 },
      { month: "2024-04", km: 200 },
      { month: "2024-05", km: 230 },
    ],
  },
  {
    id: 2,
    name: "Tarmac SL8",
    brand: "Specialized",
    model: "S-Works",
    type: "Aero",
    colorHex: "#ff003c",
    weightKg: 6.8,
    purchaseDate: "2024-03-10",
    totalKm: 12500,
    groupset: "Dura-Ace Di2",
    wheels: "Roval Rapide CLX",
    frameMaterial: "Carbon",
    frameSize: "54cm",
    specs: { aero: 90, weight: 90, comfort: 60 },
    maintenance: { chain: 45, tires: 60, pads: 80, lastService: "2024-11-15", nextService: "2025-01-15" },
    monthlyKm: [
      { month: "2024-03", km: 200 },
      { month: "2024-04", km: 580 },
      { month: "2024-05", km: 720 },
      { month: "2024-06", km: 850 },
      { month: "2024-07", km: 920 },
      { month: "2024-08", km: 1100 },
      { month: "2024-09", km: 980 },
      { month: "2024-10", km: 1050 },
      { month: "2024-11", km: 1200 },
    ],
  },
  {
    id: 3,
    name: "Grizl",
    brand: "Canyon",
    model: "CF SLX",
    type: "Gravel",
    colorHex: "#10b981",
    weightKg: 8.9,
    purchaseDate: "2022-06-01",
    retirementDate: "2023-02-01",
    totalKm: 3200,
    groupset: "GRX Di2",
    wheels: "DT Swiss G1800",
    frameMaterial: "Carbon",
    frameSize: "M",
    specs: { aero: 40, weight: 50, comfort: 95 },
    maintenance: { chain: 10, tires: 20, pads: 30, lastService: "2023-01-10" },
    monthlyKm: [
      { month: "2022-06", km: 180 },
      { month: "2022-07", km: 250 },
      { month: "2022-08", km: 320 },
      { month: "2022-09", km: 380 },
      { month: "2022-10", km: 420 },
      { month: "2022-11", km: 350 },
      { month: "2022-12", km: 280 },
      { month: "2023-01", km: 220 },
    ],
  },
]

const NEON_COLORS = [
  "#ff003c",
  "#00f3ff",
  "#d04fd7",
  "#10b981",
  "#f59e0b",
  "#ffffff",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
]

// --- 3. HELPERS ---

const getPowerZones = (ftp: number) => [
  { name: "Z1 - Récupération", min: 0, max: Math.round(ftp * 0.55), color: "#a0a0a0" },
  { name: "Z2 - Endurance", min: Math.round(ftp * 0.56), max: Math.round(ftp * 0.75), color: "#3b82f6" },
  { name: "Z3 - Tempo", min: Math.round(ftp * 0.76), max: Math.round(ftp * 0.9), color: "#10b981" },
  { name: "Z4 - Seuil (FTP)", min: Math.round(ftp * 0.91), max: Math.round(ftp * 1.05), color: "#f59e0b" },
  { name: "Z5 - VO2 Max", min: Math.round(ftp * 1.06), max: Math.round(ftp * 1.2), color: "#ef4444" },
  { name: "Z6 - Anaérobie", min: Math.round(ftp * 1.21), max: Math.round(ftp * 1.5), color: "#d04fd7" },
  { name: "Z7 - Neuromusculaire", min: Math.round(ftp * 1.5), max: 9999, color: "#8b5cf6" },
]

const getHeartRateZones = (fcMax: number, fcRest: number) => {
  const hrr = fcMax - fcRest
  const calc = (pct: number) => Math.round(hrr * pct + fcRest)
  return [
    { name: "Z1 - Récup", min: fcRest, max: calc(0.6), color: "#a0a0a0" },
    { name: "Z2 - Endurance", min: calc(0.6) + 1, max: calc(0.7), color: "#3b82f6" },
    { name: "Z3 - Aérobie", min: calc(0.7) + 1, max: calc(0.8), color: "#10b981" },
    { name: "Z4 - Seuil", min: calc(0.8) + 1, max: calc(0.9), color: "#f59e0b" },
    { name: "Z5 - Max", min: calc(0.9) + 1, max: fcMax, color: "#ef4444" },
  ]
}

const getBikeIcon = (type: string, color: string, size = 18) => {
  if (type === "CLM" || type === "TT") return <Zap size={size} color={color} />
  if (type === "Grimpeur") return <Mountain size={size} color={color} />
  if (type === "Gravel" || type === "Cyclocross") return <TrendingUp size={size} color={color} />
  if (type === "Endurance" || type === "Randonneuse") return <Activity size={size} color={color} />
  if (type === "VTT") return <Mountain size={size} color={color} />
  if (type === "Piste" || type === "Fixie") return <Gauge size={size} color={color} />
  return <Wind size={size} color={color} />
}

// --- 4. SOUS-COMPOSANTS UI ---

const InputCard = ({ label, value, unit, onChange, isEditing, color = "var(--text)" }: any) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(val === "" ? 0 : Number.parseFloat(val))
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "12px",
        padding: "1.2rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        transition: "all 0.3s ease",
      }}
    >
      <label
        style={{
          fontSize: "0.75rem",
          color: "#888",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </label>
      {isEditing ? (
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
          <input
            type="number"
            value={value || ""}
            onChange={handleChange}
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              padding: "0.5rem",
              color: "#fff",
              fontSize: "1.5rem",
              fontWeight: 700,
              width: "100%",
              outline: "none",
            }}
            placeholder="0"
          />
          <span style={{ fontSize: "0.9rem", color: "#666", fontWeight: 600 }}>{unit}</span>
        </div>
      ) : (
        <div
          style={{ fontSize: "2rem", fontWeight: 800, color, display: "flex", alignItems: "baseline", gap: "0.3rem" }}
        >
          {value} <span style={{ fontSize: "0.9rem", color: "#666", fontWeight: 600 }}>{unit}</span>
        </div>
      )}
    </div>
  )
}

const ZoneRow = ({ zone, index, isLast }: any) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0.8rem 0.5rem",
      borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
      background: index % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
      <div style={{ width: "12px", height: "12px", borderRadius: "4px", background: zone.color }}></div>
      <span style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.9rem" }}>{zone.name}</span>
    </div>
    <div style={{ fontWeight: "bold", fontSize: "0.9rem", color: "var(--text)" }}>
      {zone.max === 9999 ? `> ${zone.min}` : `${zone.min} - ${zone.max}`}
    </div>
  </div>
)

const GlassModal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(8px)",
        background: "rgba(0,0,0,0.7)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "90%",
          maxWidth: "700px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#0a0a0f",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
          padding: "0",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "1.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(90deg, rgba(255,255,255,0.03), transparent)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#666", cursor: "pointer", padding: "0.5rem" }}
          >
            <X size={24} />
          </button>
        </div>
        <div style={{ padding: "2rem" }}>{children}</div>
      </div>
    </div>
  )
}

const BikeIllustration = ({ type, color, size = 100 }: { type: string; color: string; size?: number }) => {
  const strokeWidth = 2.5

  const paths: Record<string, React.ReactNode> = {
    Aero: (
      <>
        <path
          d="M25 75 L45 75 L70 35 L40 35 L25 75"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M70 35 L85 75 L60 75" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <circle cx="25" cy="75" r="22" stroke={color} strokeWidth="3" fill="none" opacity="0.3" />
        <circle cx="85" cy="75" r="22" stroke={color} strokeWidth="3" fill="none" opacity="0.3" />
        <circle cx="25" cy="75" r="18" stroke={color} strokeWidth="1" fill="none" opacity="0.6" />
        <circle cx="85" cy="75" r="18" stroke={color} strokeWidth="1" fill="none" opacity="0.6" />
        <path
          d="M40 35 L40 25 L58 25"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path d="M45 75 L55 55" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <circle cx="55" cy="55" r="3" fill={color} opacity="0.8" />
      </>
    ),
    Grimpeur: (
      <>
        <path
          d="M25 75 L48 75 L68 38 L42 38 L25 75"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M68 38 L85 75" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <circle cx="25" cy="75" r="21" stroke={color} strokeWidth="2" fill="none" opacity="0.4" />
        <circle cx="85" cy="75" r="21" stroke={color} strokeWidth="2" fill="none" opacity="0.4" />
        <circle cx="25" cy="75" r="17" stroke={color} strokeWidth="1" fill="none" opacity="0.6" />
        <circle cx="85" cy="75" r="17" stroke={color} strokeWidth="1" fill="none" opacity="0.6" />
        <path
          d="M42 38 L42 28 L52 28"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path d="M48 75 L52 62" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      </>
    ),
    TT: (
      <>
        <path
          d="M25 75 L45 75 L75 42 L35 42 L25 75"
          fill={color}
          fillOpacity="0.15"
          stroke={color}
          strokeWidth={strokeWidth + 0.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M75 42 L85 75" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <circle cx="25" cy="75" r="23" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="2.5" />
        <circle cx="85" cy="75" r="23" stroke={color} strokeWidth="2.5" fill="none" opacity="0.4" />
        <path
          d="M35 42 L35 38 L62 38 L65 42"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <path d="M45 75 L58 60" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        <circle cx="58" cy="60" r="2.5" fill={color} opacity="0.9" />
      </>
    ),
    CLM: (
      <>
        <path
          d="M25 75 L45 75 L75 42 L35 42 L25 75"
          fill={color}
          fillOpacity="0.15"
          stroke={color}
          strokeWidth={strokeWidth + 0.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M75 42 L85 75" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <circle cx="25" cy="75" r="23" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="2.5" />
        <circle cx="85" cy="75" r="23" stroke={color} strokeWidth="2.5" fill="none" opacity="0.4" />
        <path
          d="M35 42 L35 38 L62 38 L65 42"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <path d="M45 75 L58 60" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        <circle cx="58" cy="60" r="2.5" fill={color} opacity="0.9" />
      </>
    ),
    Gravel: (
      <>
        <path
          d="M25 75 L45 75 L65 40 L35 35 L25 75"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M65 40 L85 75" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <circle cx="25" cy="75" r="24" stroke={color} strokeWidth="4" strokeDasharray="3 2" fill="none" opacity="0.5" />
        <circle cx="85" cy="75" r="24" stroke={color} strokeWidth="4" strokeDasharray="3 2" fill="none" opacity="0.5" />
        <circle cx="25" cy="75" r="19" stroke={color} strokeWidth="1.5" fill="none" opacity="0.7" />
        <circle cx="85" cy="75" r="19" stroke={color} strokeWidth="1.5" fill="none" opacity="0.7" />
        <path
          d="M35 35 L35 28 L50 30"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path d="M45 75 L52 58" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      </>
    ),
    VTT: (
      <>
        <path
          d="M25 75 L40 75 L55 50 L30 45 L25 75"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 0.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M55 50 L85 75" fill="none" stroke={color} strokeWidth={strokeWidth + 0.5} strokeLinecap="round" />
        <path d="M85 75 L75 55" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
        <circle cx="25" cy="75" r="22" stroke={color} strokeWidth="5" fill="none" opacity="0.4" />
        <circle cx="85" cy="75" r="22" stroke={color} strokeWidth="5" fill="none" opacity="0.4" />
        <circle
          cx="25"
          cy="75"
          r="17"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="4 2"
          fill="none"
          opacity="0.6"
        />
        <circle
          cx="85"
          cy="75"
          r="17"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="4 2"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M30 45 L30 35 L50 35"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path d="M40 75 L48 62" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      </>
    ),
    Cyclocross: (
      <>
        <path
          d="M25 75 L44 75 L64 42 L36 38 L25 75"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M64 42 L85 75" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <circle
          cx="25"
          cy="75"
          r="23"
          stroke={color}
          strokeWidth="3.5"
          strokeDasharray="2 1.5"
          fill="none"
          opacity="0.5"
        />
        <circle
          cx="85"
          cy="75"
          r="23"
          stroke={color}
          strokeWidth="3.5"
          strokeDasharray="2 1.5"
          fill="none"
          opacity="0.5"
        />
        <path
          d="M36 38 L36 30 L52 32"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        <circle cx="25" cy="75" r="18" stroke={color} strokeWidth="1" fill="none" opacity="0.7" />
        <circle cx="85" cy="75" r="18" stroke={color} strokeWidth="1" fill="none" opacity="0.7" />
      </>
    ),
    Piste: (
      <>
        <path
          d="M25 75 L46 75 L68 40 L42 40 L25 75"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M68 40 L85 75" fill="none" stroke={color} strokeWidth={strokeWidth + 1} strokeLinecap="round" />
        <circle cx="25" cy="75" r="20" stroke={color} strokeWidth="2" fill="none" opacity="0.6" />
        <circle cx="85" cy="75" r="20" stroke={color} strokeWidth="2" fill="none" opacity="0.6" />
        <path d="M42 40 L42 32 L54 32" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <path d="M46 75 L54 58 L85 75" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" />
        <circle cx="54" cy="58" r="8" stroke={color} strokeWidth="1.5" fill="none" opacity="0.5" />
      </>
    ),
    Fixie: (
      <>
        <path
          d="M25 75 L46 75 L68 42 L42 42 L25 75"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M68 42 L85 75" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <circle cx="25" cy="75" r="21" stroke={color} strokeWidth="2.5" fill="none" opacity="0.5" />
        <circle cx="85" cy="75" r="21" stroke={color} strokeWidth="2.5" fill="none" opacity="0.5" />
        <path
          d="M42 42 L42 34 L56 34"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        <circle cx="25" cy="75" r="17" stroke={color} strokeWidth="1" fill="none" opacity="0.7" />
        <circle cx="85" cy="75" r="17" stroke={color} strokeWidth="1" fill="none" opacity="0.7" />
      </>
    ),
    Endurance: (
      <>
        <path
          d="M25 75 L46 75 L66 40 L40 40 L25 75"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M66 40 L85 75" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <circle cx="25" cy="75" r="22" stroke={color} strokeWidth="2.5" fill="none" opacity="0.4" />
        <circle cx="85" cy="75" r="22" stroke={color} strokeWidth="2.5" fill="none" opacity="0.4" />
        <path
          d="M40 40 L40 30 L54 30"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        <circle cx="25" cy="75" r="18" stroke={color} strokeWidth="1" fill="none" opacity="0.6" />
        <circle cx="85" cy="75" r="18" stroke={color} strokeWidth="1" fill="none" opacity="0.6" />
        <path d="M46 75 L53 58" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      </>
    ),
    Randonneuse: (
      <>
        <path
          d="M25 75 L44 75 L62 45 L38 43 L25 75"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M62 45 L85 75" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <circle cx="25" cy="75" r="23" stroke={color} strokeWidth="3" fill="none" opacity="0.4" />
        <circle cx="85" cy="75" r="23" stroke={color} strokeWidth="3" fill="none" opacity="0.4" />
        <path
          d="M38 43 L38 35 L48 36"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        <rect x="46" y="35" width="8" height="6" fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" rx="1" />
        <path d="M44 75 L50 60" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      </>
    ),
    default: (
      <path
        d="M25 75 L45 75 L70 35 L40 35 L25 75 M70 35 L85 75"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    ),
  }

  const selectedPath = paths[type] || paths["default"]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: `drop-shadow(0 0 10px ${color}70)` }}
    >
      {selectedPath}
    </svg>
  )
}

const KmHeatmap = ({ monthlyKm, color }: { monthlyKm: { month: string; km: number }[]; color: string }) => {
  if (!monthlyKm || monthlyKm.length === 0) return null

  const maxKm = Math.max(...monthlyKm.map((m) => m.km))

  return (
    <div style={{ marginTop: "1rem" }}>
      <div
        style={{
          fontSize: "0.75rem",
          color: "#888",
          fontWeight: 600,
          marginBottom: "0.5rem",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Activité mensuelle
      </div>
      <div style={{ display: "flex", gap: "2px", flexWrap: "wrap" }}>
        {monthlyKm.map((data, idx) => {
          const intensity = data.km / maxKm
          const opacity = 0.2 + intensity * 0.8
          return (
            <div
              key={idx}
              title={`${data.month}: ${data.km}km`}
              style={{
                width: "16px",
                height: "16px",
                background: color,
                opacity,
                borderRadius: "2px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.3)"
                e.currentTarget.style.opacity = "1"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)"
                e.currentTarget.style.opacity = String(opacity)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

const GarageTimeline = ({ bikes, onBikeClick }: { bikes: BikeData[]; onBikeClick: (b: BikeData) => void }) => {
  const [hoveredBikeId, setHoveredBikeId] = useState<number | null>(null)

  const dates = bikes.flatMap((b) => [
    new Date(b.purchaseDate).getTime(),
    b.retirementDate ? new Date(b.retirementDate).getTime() : Date.now(),
  ])
  const minDate = Math.min(...dates)
  const maxDate = Date.now()
  const totalDuration = maxDate - minDate

  const paddingTime = totalDuration * 0.1
  const startScale = minDate - paddingTime
  const endScale = maxDate + paddingTime
  const scaleDuration = endScale - startScale

  const getPos = (dateStr: string) =>
    ((new Date(dateStr ? dateStr : Date.now()).getTime() - startScale) / scaleDuration) * 100

  const heatmapBackground = useMemo(() => {
    const steps = 60
    let gradientString = "linear-gradient(90deg"
    for (let i = 0; i <= steps; i++) {
      const pct = i * (100 / steps)
      const timeAtPct = startScale + scaleDuration * (pct / 100)
      let totalKm = 0
      let activeCount = 0

      bikes.forEach((b) => {
        const start = new Date(b.purchaseDate).getTime()
        const end = b.retirementDate ? new Date(b.retirementDate).getTime() : Date.now()
        if (timeAtPct >= start && timeAtPct <= end) {
          activeCount++
          // Calculer les km pour ce mois
          const date = new Date(timeAtPct)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          const monthData = b.monthlyKm?.find((m) => m.month === monthKey)
          if (monthData) totalKm += monthData.km
        }
      })

      let color = "rgba(10,10,20,0.5)"
      if (totalKm > 0) {
        const intensity = Math.min(totalKm / 1000, 1)
        const r = Math.round(0 + intensity * 255)
        const g = Math.round(243 + intensity * 12)
        const b = Math.round(255)
        const alpha = 0.1 + intensity * 0.4
        color = `rgba(${r}, ${g}, ${b}, ${alpha})`
      }
      if (activeCount === 0) color = "rgba(255,255,255,0.02)"

      gradientString += `, ${color} ${pct}%`
    }
    gradientString += ")"
    return gradientString
  }, [bikes, startScale, scaleDuration])

  const startYear = new Date(minDate).getFullYear()
  const endYear = new Date(maxDate).getFullYear()
  const years = Array.from({ length: endYear - startYear + 2 }, (_, i) => startYear + i)

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "450px",
        overflowX: "auto",
        overflowY: "hidden",
        padding: "20px 0",
        marginTop: "2rem",
      }}
    >
      <div style={{ minWidth: "1000px", height: "100%", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            left: "0",
            right: "0",
            height: "8px",
            background: heatmapBackground,
            borderRadius: "4px",
            zIndex: 0,
            boxShadow: "0 0 20px rgba(0,243,255,0.3)",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: "-6px",
              top: "-6px",
              width: "0",
              height: "0",
              borderTop: "10px solid transparent",
              borderBottom: "10px solid transparent",
              borderLeft: "12px solid rgba(0,243,255,0.6)",
            }}
          />
        </div>

        {/* YEARS */}
        {years.map((year) => {
          const pos = getPos(`${year}-01-01`)
          if (pos < 0 || pos > 100) return null
          return (
            <div
              key={year}
              style={{
                position: "absolute",
                left: `${pos}%`,
                bottom: "35px",
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ width: "1px", height: "15px", background: "rgba(255,255,255,0.2)", marginBottom: "5px" }} />
              <span style={{ color: "#888", fontSize: "0.7rem", fontWeight: 700, fontFamily: "monospace" }}>
                {year}
              </span>
            </div>
          )
        })}

        {/* BIKES */}
        {bikes.map((bike, index) => {
          const startPos = getPos(bike.purchaseDate)
          const endPos = getPos(bike.retirementDate || new Date().toISOString())
          const centerPos = (startPos + endPos) / 2
          const isActive = !bike.retirementDate
          const isHovered = hoveredBikeId === bike.id
          const isDimmed = hoveredBikeId !== null && hoveredBikeId !== bike.id

          const verticalOffset = index % 2 === 0 ? "180px" : "280px"
          const durationWidthPercent = endPos - startPos

          return (
            <React.Fragment key={bike.id}>
              {/* 1. BARRE DE DURÉE */}
              <div
                style={{
                  position: "absolute",
                  left: `${startPos}%`,
                  bottom: "56px",
                  width: `${durationWidthPercent}%`,
                  height: "12px",
                  background: `linear-gradient(90deg, ${bike.colorHex}00, ${bike.colorHex}, ${bike.colorHex}00)`,
                  borderRadius: "6px",
                  opacity: isHovered ? 1 : 0,
                  boxShadow: `0 0 20px ${bike.colorHex}`,
                  transition: "opacity 0.3s ease",
                  zIndex: 5,
                }}
              />

              {/* 2. CONNECTEUR */}
              <div
                style={{
                  position: "absolute",
                  left: `${centerPos}%`,
                  bottom: "60px",
                  height: `calc(${verticalOffset} - 60px)`,
                  width: "2px",
                  background: `linear-gradient(to top, ${bike.colorHex}, transparent)`,
                  opacity: isHovered ? 1 : 0.3,
                  transition: "all 0.3s",
                  transform: `translateX(-50%) scaleY(${isHovered ? 1 : 0.8})`,
                  transformOrigin: "bottom",
                  zIndex: 2,
                }}
              />

              {/* 3. CARTE FLOTTANTE AMÉLIORÉE */}
              <div
                onMouseEnter={() => setHoveredBikeId(bike.id)}
                onMouseLeave={() => setHoveredBikeId(null)}
                onClick={() => onBikeClick(bike)}
                style={{
                  position: "absolute",
                  left: `${centerPos}%`,
                  bottom: verticalOffset,
                  transform: `translateX(-50%) scale(${isHovered ? 1.08 : 1})`,
                  zIndex: isHovered ? 20 : 10,
                  transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  opacity: isDimmed ? 0.25 : 1,
                  filter: isDimmed ? "blur(2px) grayscale(100%)" : "none",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "240px",
                    background: "rgba(10, 10, 20, 0.95)",
                    backdropFilter: "blur(16px)",
                    border: `1px solid ${isHovered ? bike.colorHex : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "18px",
                    padding: "18px",
                    boxShadow: isHovered ? `0 20px 40px -10px ${bike.colorHex}60` : "0 8px 20px rgba(0,0,0,0.6)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Badge Status */}
                  <div
                    style={{
                      position: "absolute",
                      top: "12px",
                      right: "12px",
                      background: isActive ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isActive ? "#10b981" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: "20px",
                      padding: "4px 10px",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: isActive ? "#10b981" : "#666",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {isActive ? "● ACTIF" : "RETRAITÉ"}
                  </div>

                  {/* Illustration Vélo */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginBottom: "12px",
                      marginTop: "8px",
                      transform: "scaleX(-1)",
                    }}
                  >
                    <BikeIllustration type={bike.type} color={bike.colorHex} size={90} />
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "#888",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                      }}
                    >
                      {bike.brand}
                    </div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#fff", marginBottom: "4px" }}>
                      {bike.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#666", fontStyle: "italic" }}>{bike.model}</div>
                  </div>

                  {/* Stats Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      marginTop: "14px",
                      padding: "12px",
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: "12px",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{ fontSize: "0.65rem", color: "#888", marginBottom: "2px", textTransform: "uppercase" }}
                      >
                        Type
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: bike.colorHex,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                      >
                        {getBikeIcon(bike.type, bike.colorHex, 14)}
                        {bike.type}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{ fontSize: "0.65rem", color: "#888", marginBottom: "2px", textTransform: "uppercase" }}
                      >
                        Poids
                      </div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>{bike.weightKg} kg</div>
                    </div>
                    <div style={{ textAlign: "center", gridColumn: "1 / -1" }}>
                      <div
                        style={{ fontSize: "0.65rem", color: "#888", marginBottom: "2px", textTransform: "uppercase" }}
                      >
                        Total
                      </div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: bike.colorHex }}>
                        {bike.totalKm.toLocaleString()} <span style={{ fontSize: "0.7rem", color: "#666" }}>km</span>
                      </div>
                    </div>
                  </div>

                  {bike.monthlyKm && <KmHeatmap monthlyKm={bike.monthlyKm} color={bike.colorHex} />}

                  {/* Groupset Badge */}
                  <div
                    style={{
                      marginTop: "12px",
                      textAlign: "center",
                      padding: "8px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      color: "#aaa",
                      fontWeight: 600,
                    }}
                  >
                    {bike.groupset}
                  </div>
                </div>
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

const BikeFormModal = ({ isOpen, onClose, onSave, editBike }: any) => {
  const [formData, setFormData] = useState<Partial<BikeData>>(
    editBike || {
      name: "",
      brand: "",
      model: "",
      type: "Aero",
      colorHex: "#00f3ff",
      weightKg: 7.5,
      purchaseDate: new Date().toISOString().split("T")[0],
      totalKm: 0,
      groupset: "",
      wheels: "",
      frameMaterial: "Carbon",
      frameSize: "56cm",
      specs: { aero: 50, weight: 50, comfort: 50 },
      maintenance: { chain: 100, tires: 100, pads: 100 },
    },
  )

  const handleSubmit = () => {
    onSave({ ...formData, id: editBike?.id || Date.now() })
    onClose()
  }

  if (!isOpen) return null

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title={editBike ? "Modifier le vélo" : "Ajouter un vélo"}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Identification */}
        <div>
          <h4
            style={{
              color: "#00f3ff",
              fontSize: "0.8rem",
              fontWeight: 700,
              marginBottom: "1rem",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            ● Identification
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#888",
                  marginBottom: "0.5rem",
                  fontWeight: 600,
                }}
              >
                Nom du vélo
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "0.7rem",
                  color: "#fff",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
                placeholder="Ex: Le Chrono"
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#888",
                  marginBottom: "0.5rem",
                  fontWeight: 600,
                }}
              >
                Marque
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "0.7rem",
                  color: "#fff",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
                placeholder="Ex: Canyon"
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#888",
                  marginBottom: "0.5rem",
                  fontWeight: 600,
                }}
              >
                Modèle
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "0.7rem",
                  color: "#fff",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
                placeholder="Ex: Speedmax CFR"
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#888",
                  marginBottom: "0.5rem",
                  fontWeight: 600,
                }}
              >
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as BikeType })}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "0.7rem",
                  color: "#fff",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              >
                <option value="Aero">Aero</option>
                <option value="Grimpeur">Grimpeur</option>
                <option value="Endurance">Endurance</option>
                <option value="Gravel">Gravel</option>
                <option value="TT">TT</option>
                <option value="CLM">CLM</option>
                <option value="VTT">VTT</option>
                <option value="Cyclocross">Cyclocross</option>
                <option value="Piste">Piste</option>
                <option value="Fixie">Fixie</option>
                <option value="Randonneuse">Randonneuse</option>
              </select>
            </div>
          </div>
        </div>

        {/* Caractéristiques */}
        <div>
          <h4
            style={{
              color: "#ff003c",
              fontSize: "0.8rem",
              fontWeight: 700,
              marginBottom: "1rem",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            ● Caractéristiques
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#888",
                  marginBottom: "0.5rem",
                  fontWeight: 600,
                }}
              >
                Poids (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weightKg}
                onChange={(e) => setFormData({ ...formData, weightKg: Number.parseFloat(e.target.value) })}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "0.7rem",
                  color: "#fff",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#888",
                  marginBottom: "0.5rem",
                  fontWeight: 600,
                }}
              >
                Matériau
              </label>
              <select
                value={formData.frameMaterial}
                onChange={(e) => setFormData({ ...formData, frameMaterial: e.target.value })}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "0.7rem",
                  color: "#fff",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              >
                <option value="Carbon">Carbon</option>
                <option value="Aluminium">Aluminium</option>
                <option value="Acier">Acier</option>
                <option value="Titane">Titane</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#888",
                  marginBottom: "0.5rem",
                  fontWeight: 600,
                }}
              >
                Taille
              </label>
              <input
                type="text"
                value={formData.frameSize}
                onChange={(e) => setFormData({ ...formData, frameSize: e.target.value })}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "0.7rem",
                  color: "#fff",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
                placeholder="Ex: 56cm"
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#888",
                  marginBottom: "0.5rem",
                  fontWeight: 600,
                }}
              >
                Groupe
              </label>
              <input
                type="text"
                value={formData.groupset}
                onChange={(e) => setFormData({ ...formData, groupset: e.target.value })}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "0.7rem",
                  color: "#fff",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
                placeholder="Ex: SRAM Red AXS"
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#888",
                  marginBottom: "0.5rem",
                  fontWeight: 600,
                }}
              >
                Roues
              </label>
              <input
                type="text"
                value={formData.wheels}
                onChange={(e) => setFormData({ ...formData, wheels: e.target.value })}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "0.7rem",
                  color: "#fff",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
                placeholder="Ex: Zipp 808"
              />
            </div>
          </div>
        </div>

        {/* Couleur et Dates */}
        <div>
          <h4
            style={{
              color: "#10b981",
              fontSize: "0.8rem",
              fontWeight: 700,
              marginBottom: "1rem",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            ● Visuel & Dates
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#888",
                  marginBottom: "0.5rem",
                  fontWeight: 600,
                }}
              >
                Couleur
              </label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {NEON_COLORS.map((color) => (
                  <div
                    key={color}
                    onClick={() => setFormData({ ...formData, colorHex: color })}
                    style={{
                      width: "32px",
                      height: "32px",
                      background: color,
                      borderRadius: "6px",
                      cursor: "pointer",
                      border: formData.colorHex === color ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)",
                      boxShadow: formData.colorHex === color ? `0 0 10px ${color}` : "none",
                      transition: "all 0.2s ease",
                    }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#888",
                  marginBottom: "0.5rem",
                  fontWeight: 600,
                }}
              >
                Date d'achat
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "0.7rem",
                  color: "#fff",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* Preview du vélo */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "1.5rem",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "12px",
          }}
        >
          <div style={{ transform: "scaleX(-1)" }}>
            <BikeIllustration type={formData.type || "Aero"} color={formData.colorHex || "#00f3ff"} size={120} />
          </div>
        </div>

        {/* Boutons d'action */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              padding: "0.8rem 1.5rem",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            style={{
              background: "linear-gradient(135deg, #00f3ff, #d04fd7)",
              border: "none",
              borderRadius: "10px",
              padding: "0.8rem 2rem",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "0.9rem",
              boxShadow: "0 5px 15px rgba(0,243,255,0.3)",
            }}
          >
            <Save size={16} style={{ marginRight: "0.5rem", display: "inline-block", verticalAlign: "middle" }} />
            Sauvegarder
          </button>
        </div>
      </div>
    </GlassModal>
  )
}

const GarageStats = ({ bikes }: { bikes: BikeData[] }) => {
  const activeBikes = bikes.filter((b) => !b.retirementDate)
  const totalKm = bikes.reduce((sum, b) => sum + b.totalKm, 0)
  const avgKmPerBike = totalKm / bikes.length
  const mostUsedBike = bikes.reduce((max, b) => (b.totalKm > max.totalKm ? b : max), bikes[0])

  // Calcul de la moyenne de km par mois
  const allMonthlyData = bikes.flatMap((b) => b.monthlyKm || [])
  const avgKmPerMonth =
    allMonthlyData.length > 0 ? allMonthlyData.reduce((sum, m) => sum + m.km, 0) / allMonthlyData.length : 0

  // Vélo le plus récent
  const newestBike = bikes.reduce(
    (newest, b) => (new Date(b.purchaseDate) > new Date(newest.purchaseDate) ? b : newest),
    bikes[0],
  )

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem",
        marginTop: "2rem",
      }}
    >
      <div
        style={{
          background: "rgba(0,243,255,0.1)",
          border: "1px solid rgba(0,243,255,0.3)",
          borderRadius: "16px",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Bike size={18} color="#00f3ff" />
          <span style={{ fontSize: "0.75rem", color: "#00f3ff", fontWeight: 600, textTransform: "uppercase" }}>
            Vélos actifs
          </span>
        </div>
        <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#fff" }}>{activeBikes.length}</div>
        <div style={{ fontSize: "0.75rem", color: "#666" }}>sur {bikes.length} total</div>
      </div>

      <div
        style={{
          background: "rgba(255,0,60,0.1)",
          border: "1px solid rgba(255,0,60,0.3)",
          borderRadius: "16px",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <TrendingUp size={18} color="#ff003c" />
          <span style={{ fontSize: "0.75rem", color: "#ff003c", fontWeight: 600, textTransform: "uppercase" }}>
            Total km
          </span>
        </div>
        <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#fff" }}>{totalKm.toLocaleString()}</div>
        <div style={{ fontSize: "0.75rem", color: "#666" }}>km parcourus</div>
      </div>

      <div
        style={{
          background: "rgba(16,185,129,0.1)",
          border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: "16px",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Activity size={18} color="#10b981" />
          <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600, textTransform: "uppercase" }}>
            Moy. / mois
          </span>
        </div>
        <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#fff" }}>{Math.round(avgKmPerMonth)}</div>
        <div style={{ fontSize: "0.75rem", color: "#666" }}>km par mois</div>
      </div>

      <div
        style={{
          background: "rgba(245,158,11,0.1)",
          border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: "16px",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Trophy size={18} color="#f59e0b" />
          <span style={{ fontSize: "0.75rem", color: "#f59e0b", fontWeight: 600, textTransform: "uppercase" }}>
            Plus utilisé
          </span>
        </div>
        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", marginBottom: "0.2rem" }}>
          {mostUsedBike.name}
        </div>
        <div style={{ fontSize: "0.75rem", color: "#666" }}>{mostUsedBike.totalKm.toLocaleString()} km</div>
      </div>
    </div>
  )
}

// --- 7. COMPOSANT PRINCIPAL ---

export default function ProfileClient({ profile: initialProfile }: { profile?: UserProfile }) {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile>(initialProfile || MOCK_PROFILE)
  const [isEditing, setIsEditing] = useState(false)
  const [bikes, setBikes] = useState<BikeData[]>(INITIAL_BIKES)
  const [selectedBike, setSelectedBike] = useState<BikeData | null>(null)
  const [isAddingBike, setIsAddingBike] = useState(false)

  const powerZones = getPowerZones(profile.ftp)
  const heartRateZones =
    profile.max_heart_rate && profile.resting_heart_rate
      ? getHeartRateZones(profile.max_heart_rate, profile.resting_heart_rate)
      : []

  const handleSave = () => {
    console.log("[v0] Saving profile:", profile)
    setIsEditing(false)
  }

  const handleAddBike = (bikeData: BikeData) => {
    setBikes([...bikes, bikeData])
    setIsAddingBike(false)
  }

  const handleEditBike = (bikeData: BikeData) => {
    setBikes(bikes.map((b) => (b.id === bikeData.id ? bikeData : b)))
    setSelectedBike(null)
  }

  const handleDeleteBike = (bikeId: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce vélo ?")) {
      setBikes(bikes.filter((b) => b.id !== bikeId))
      setSelectedBike(null)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", padding: "2rem" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "3rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1
              style={{
                fontSize: "3rem",
                fontWeight: 900,
                margin: 0,
                background: "linear-gradient(135deg, #00f3ff, #d04fd7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-1px",
              }}
            >
              {profile.name}
            </h1>
            <p style={{ color: "#666", fontSize: "1rem", margin: "0.5rem 0 0 0" }}>{profile.email}</p>
          </div>
          <button
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            style={{
              background: isEditing ? "linear-gradient(135deg, #10b981, #14b8a6)" : "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              padding: "1rem 2rem",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.95rem",
              transition: "all 0.3s ease",
            }}
          >
            {isEditing ? (
              <>
                <Save size={18} /> Sauvegarder
              </>
            ) : (
              <>
                <Edit size={18} /> Modifier
              </>
            )}
          </button>
        </div>

        <Tabs defaultValue="garage">
          <Tab value="config">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Settings size={18} />
              Configuration
            </div>
          </Tab>
          <Tab value="zones">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Gauge size={18} />
              Zones
            </div>
          </Tab>
          <Tab value="garage">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Wrench size={18} />
              Garage
            </div>
          </Tab>
          <Tab value="stats">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Trophy size={18} />
              Statistiques
            </div>
          </Tab>
        </Tabs>

        {/* TAB: Configuration */}
        <Tabs.Panel value="config">
          <div style={{ marginTop: "2rem" }}>
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}
            >
              <InputCard
                label="Poids"
                value={profile.weight}
                unit="kg"
                onChange={(v: number) => setProfile({ ...profile, weight: v })}
                isEditing={isEditing}
                color="#00f3ff"
              />
              <InputCard
                label="FTP"
                value={profile.ftp}
                unit="W"
                onChange={(v: number) => setProfile({ ...profile, ftp: v })}
                isEditing={isEditing}
                color="#ff003c"
              />
              <InputCard
                label="W'"
                value={profile.w_prime}
                unit="J"
                onChange={(v: number) => setProfile({ ...profile, w_prime: v })}
                isEditing={isEditing}
                color="#d04fd7"
              />
              <InputCard
                label="VO2 Max"
                value={profile.vo2max}
                unit="ml/kg/min"
                onChange={(v: number) => setProfile({ ...profile, vo2max: v })}
                isEditing={isEditing}
                color="#10b981"
              />
              <InputCard
                label="FC Max"
                value={profile.max_heart_rate}
                unit="bpm"
                onChange={(v: number) => setProfile({ ...profile, max_heart_rate: v })}
                isEditing={isEditing}
                color="#ef4444"
              />
              <InputCard
                label="FC Repos"
                value={profile.resting_heart_rate}
                unit="bpm"
                onChange={(v: number) => setProfile({ ...profile, resting_heart_rate: v })}
                isEditing={isEditing}
                color="#a0a0a0"
              />
            </div>
          </div>
        

        {/* TAB: Zones */}
        <Tabs1.Panel value="zones">
          <div
            style={{
              marginTop: "2rem",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
              gap: "2rem",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "20px",
                padding: "2rem",
              }}
            >
              <h3
                style={{
                  margin: "0 0 1.5rem 0",
                  fontSize: "1.3rem",
                  fontWeight: 800,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Zap size={22} color="#ff003c" />
                Zones de Puissance
              </h3>
              <div>
                {powerZones.map((zone, i) => (
                  <ZoneRow key={i} zone={zone} index={i} isLast={i === powerZones.length - 1} />
                ))}
              </div>
            </div>

            {heartRateZones.length > 0 && (
              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "20px",
                  padding: "2rem",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 1.5rem 0",
                    fontSize: "1.3rem",
                    fontWeight: 800,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Activity size={22} color="#ef4444" />
                  Zones Cardiaques
                </h3>
                <div>
                  {heartRateZones.map((zone, i) => (
                    <ZoneRow key={i} zone={zone} index={i} isLast={i === heartRateZones.length - 1} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Tabs1.Panel>

        <Tabs1.Panel value="garage">
          <div style={{ marginTop: "2rem" }}>
            {/* Header avec bouton d'ajout */}
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}
            >
              <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: 0, color: "#fff" }}>Mon Garage</h2>
              <button
                onClick={() => setIsAddingBike(true)}
                style={{
                  background: "linear-gradient(135deg, #00f3ff, #d04fd7)",
                  border: "none",
                  borderRadius: "12px",
                  padding: "0.8rem 1.5rem",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.9rem",
                  boxShadow: "0 5px 15px rgba(0,243,255,0.3)",
                }}
              >
                <Plus size={18} />
                Ajouter un vélo
              </button>
            </div>

            <GarageStats bikes={bikes} />

            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "20px",
                padding: "2rem",
                marginTop: "2rem",
              }}
            >
              <h3
                style={{
                  margin: "0 0 1rem 0",
                  fontSize: "1.3rem",
                  fontWeight: 800,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Calendar size={22} color="#00f3ff" />
                Historique des vélos
              </h3>
              <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "1rem" }}>
                La densité de couleur sur la timeline représente le volume de kilomètres parcourus chaque mois
              </p>
              <GarageTimeline bikes={bikes} onBikeClick={(bike) => setSelectedBike(bike)} />
            </div>

            {/* Liste des vélos */}
            <div
              style={{
                marginTop: "2rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {bikes.map((bike) => {
                const isActive = !bike.retirementDate
                const avgMaintenance = bike.maintenance
                  ? (bike.maintenance.chain + bike.maintenance.tires + bike.maintenance.pads) / 3
                  : 0

                return (
                  <div
                    key={bike.id}
                    style={{
                      background: "rgba(10,10,20,0.9)",
                      border: `1px solid ${bike.colorHex}30`,
                      borderRadius: "18px",
                      padding: "1.5rem",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      position: "relative",
                    }}
                    onClick={() => setSelectedBike(bike)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-5px)"
                      e.currentTarget.style.boxShadow = `0 15px 30px -5px ${bike.colorHex}40`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)"
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  >
                    {/* Badge Status */}
                    <div
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        background: isActive ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${isActive ? "#10b981" : "rgba(255,255,255,0.1)"}`,
                        borderRadius: "20px",
                        padding: "4px 10px",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: isActive ? "#10b981" : "#666",
                        textTransform: "uppercase",
                      }}
                    >
                      {isActive ? "● ACTIF" : "RETRAITÉ"}
                    </div>

                    {/* Illustration */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        marginBottom: "1rem",
                        transform: "scaleX(-1)",
                      }}
                    >
                      <BikeIllustration type={bike.type} color={bike.colorHex} size={100} />
                    </div>

                    {/* Info */}
                    <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.7rem", color: "#888", fontWeight: 700, textTransform: "uppercase" }}>
                        {bike.brand}
                      </div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff" }}>{bike.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#666" }}>{bike.model}</div>
                    </div>

                    {/* Stats */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "1rem",
                        background: "rgba(0,0,0,0.3)",
                        borderRadius: "12px",
                        marginBottom: "1rem",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: "0.65rem",
                            color: "#888",
                            marginBottom: "0.2rem",
                            textTransform: "uppercase",
                          }}
                        >
                          Type
                        </div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: bike.colorHex,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                          }}
                        >
                          {getBikeIcon(bike.type, bike.colorHex, 14)}
                          {bike.type}
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: "0.65rem",
                            color: "#888",
                            marginBottom: "0.2rem",
                            textTransform: "uppercase",
                          }}
                        >
                          Poids
                        </div>
                        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff" }}>{bike.weightKg} kg</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: "0.65rem",
                            color: "#888",
                            marginBottom: "0.2rem",
                            textTransform: "uppercase",
                          }}
                        >
                          Total
                        </div>
                        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: bike.colorHex }}>
                          {bike.totalKm.toLocaleString()} km
                        </div>
                      </div>
                    </div>

                    {/* Maintenance */}
                    {bike.maintenance && (
                      <div style={{ marginTop: "1rem" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <span
                            style={{ fontSize: "0.7rem", color: "#888", fontWeight: 600, textTransform: "uppercase" }}
                          >
                            Maintenance
                          </span>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              color: avgMaintenance > 70 ? "#10b981" : avgMaintenance > 40 ? "#f59e0b" : "#ef4444",
                            }}
                          >
                            {Math.round(avgMaintenance)}%
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                height: "4px",
                                background: "rgba(255,255,255,0.1)",
                                borderRadius: "2px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${bike.maintenance.chain}%`,
                                  background: bike.maintenance.chain > 50 ? "#10b981" : "#ef4444",
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                            <div
                              style={{ fontSize: "0.65rem", color: "#666", marginTop: "0.2rem", textAlign: "center" }}
                            >
                              Chaîne
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                height: "4px",
                                background: "rgba(255,255,255,0.1)",
                                borderRadius: "2px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${bike.maintenance.tires}%`,
                                  background: bike.maintenance.tires > 50 ? "#10b981" : "#ef4444",
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                            <div
                              style={{ fontSize: "0.65rem", color: "#666", marginTop: "0.2rem", textAlign: "center" }}
                            >
                              Pneus
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                height: "4px",
                                background: "rgba(255,255,255,0.1)",
                                borderRadius: "2px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${bike.maintenance.pads}%`,
                                  background: bike.maintenance.pads > 50 ? "#10b981" : "#ef4444",
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                            <div
                              style={{ fontSize: "0.65rem", color: "#666", marginTop: "0.2rem", textAlign: "center" }}
                            >
                              Plaquettes
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </Tabs1.Panel>

        {/* TAB: Stats */}
        <Tabs1.Panel value="stats">
          <div
            style={{
              marginTop: "2rem",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1.5rem",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "16px",
                padding: "1.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#888",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                }}
              >
                W/kg
              </div>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#00f3ff" }}>
                {(profile.ftp / profile.weight).toFixed(2)}
              </div>
            </div>
            {profile.cp3 && (
              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "16px",
                  padding: "1.5rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#888",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    textTransform: "uppercase",
                  }}
                >
                  CP 3 min
                </div>
                <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#ff003c" }}>
                  {profile.cp3} <span style={{ fontSize: "1rem", color: "#666" }}>W</span>
                </div>
              </div>
            )}
            {profile.cp12 && (
              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "16px",
                  padding: "1.5rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#888",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    textTransform: "uppercase",
                  }}
                >
                  CP 12 min
                </div>
                <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#d04fd7" }}>
                  {profile.cp12} <span style={{ fontSize: "1rem", color: "#666" }}>W</span>
                </div>
              </div>
            )}
          </div>
        </Tabs1.Panel>
      </div>

      <BikeFormModal isOpen={isAddingBike} onClose={() => setIsAddingBike(false)} onSave={handleAddBike} />

      <GlassModal isOpen={selectedBike !== null} onClose={() => setSelectedBike(null)} title={selectedBike?.name || ""}>
        {selectedBike && (
          <div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem", transform: "scaleX(-1)" }}>
              <BikeIllustration type={selectedBike.type} color={selectedBike.colorHex} size={140} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#888", marginBottom: "0.3rem", textTransform: "uppercase" }}>
                  Marque
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>{selectedBike.brand}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#888", marginBottom: "0.3rem", textTransform: "uppercase" }}>
                  Modèle
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>{selectedBike.model}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#888", marginBottom: "0.3rem", textTransform: "uppercase" }}>
                  Type
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: selectedBike.colorHex }}>
                  {selectedBike.type}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#888", marginBottom: "0.3rem", textTransform: "uppercase" }}>
                  Poids
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>{selectedBike.weightKg} kg</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#888", marginBottom: "0.3rem", textTransform: "uppercase" }}>
                  Groupe
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>{selectedBike.groupset}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#888", marginBottom: "0.3rem", textTransform: "uppercase" }}>
                  Roues
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>
                  {selectedBike.wheels || "Non spécifié"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#888", marginBottom: "0.3rem", textTransform: "uppercase" }}>
                  Matériau
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>
                  {selectedBike.frameMaterial || "Non spécifié"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#888", marginBottom: "0.3rem", textTransform: "uppercase" }}>
                  Taille
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>
                  {selectedBike.frameSize || "Non spécifié"}
                </div>
              </div>
            </div>

            <div
              style={{ background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "1rem", marginBottom: "1.5rem" }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#888",
                  marginBottom: "0.5rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                Kilomètres totaux
              </div>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, color: selectedBike.colorHex }}>
                {selectedBike.totalKm.toLocaleString()} <span style={{ fontSize: "1rem", color: "#666" }}>km</span>
              </div>
            </div>

            {selectedBike.monthlyKm && <KmHeatmap monthlyKm={selectedBike.monthlyKm} color={selectedBike.colorHex} />}

            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
              <button
                onClick={() => {
                  setIsAddingBike(true)
                  setSelectedBike(null)
                }}
                style={{
                  flex: 1,
                  background: "rgba(0,243,255,0.1)",
                  border: "1px solid rgba(0,243,255,0.3)",
                  borderRadius: "10px",
                  padding: "0.8rem",
                  color: "#00f3ff",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <Edit size={16} />
                Modifier
              </button>
              <button
                onClick={() => handleDeleteBike(selectedBike.id)}
                style={{
                  flex: 1,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "10px",
                  padding: "0.8rem",
                  color: "#ef4444",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <Trash2 size={16} />
                Supprimer
              </button>
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  )

}
} 
