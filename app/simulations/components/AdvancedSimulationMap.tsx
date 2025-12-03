"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Polyline, useMap, Marker, Popup, Tooltip } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { SimSegment, NutritionPoint } from "../../../lib/advanced-simulation-engine"

// Icônes
const iconStart = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;background:#10b981;border:3px solid white;border-radius:50%;box-shadow:0 0 12px #10b981;"></div>`,
  iconAnchor: [7, 7],
})

const iconEnd = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 0 12px #ef4444;"></div>`,
  iconAnchor: [7, 7],
})

const getNutritionIcon = (type: string) => {
  const colors = { GEL: "#f59e0b", BAR: "#8b5cf6", DRINK: "#3b82f6" }
  const symbols = { GEL: "🍯", BAR: "🍫", DRINK: "💧" }
  return L.divIcon({
    className: "",
    html: `<div style="
      width:28px;
      height:28px;
      background:${colors[type as keyof typeof colors]};
      border:2px solid white;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:14px;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      cursor:pointer;
      transition:transform 0.2s;
    " class="nutrition-marker">${symbols[type as keyof typeof symbols]}</div>`,
    iconAnchor: [14, 14],
  })
}

// Contrôleur de vue
const MapController = ({
  points,
  focusedSegment,
}: {
  points: [number, number][]
  focusedSegment: SimSegment | null
}) => {
  const map = useMap()

  useEffect(() => {
    if (focusedSegment?.points && focusedSegment.points.length > 0) {
      const segPoints = focusedSegment.points.map((p) => [p[0], p[1]] as [number, number])
      map.fitBounds(L.latLngBounds(segPoints), { padding: [50, 50], animate: true, duration: 0.5 })
    } else if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30], animate: false })
    }
  }, [map, points, focusedSegment])

  return null
}

interface Props {
  points: [number, number, number][] | null
  segments: SimSegment[] | null
  nutritionPoints: NutritionPoint[]
  focusedSegment: SimSegment | null
  onSegmentClick: (seg: SimSegment) => void
}

export default function AdvancedSimulationMap({
  points,
  segments,
  nutritionPoints,
  focusedSegment,
  onSegmentClick,
}: Props) {
  if (!points || points.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontSize: "0.9rem",
          borderRadius: "12px",
        }}
      >
        📍 Chargez un parcours GPX
      </div>
    )
  }

  const allLatLngs = points.map((p) => [p[0], p[1]] as [number, number])

  // Couleur selon puissance et fatigue
  const getSegmentColor = (seg: SimSegment) => {
    if (focusedSegment?.id === seg.id) return "#ffffff"

    // Dégradé basé sur l'intensité et la fatigue
    const intensity = seg.avgPower / 250 // Normalisation
    const fatigueBlend = seg.fatigueLevel * 0.5

    if (seg.type === "DESCENT") return "#3b82f6"
    if (intensity > 1.3 + fatigueBlend) return "#ef4444" // Rouge si haute intensité
    if (intensity > 1.0) return "#f59e0b" // Orange
    if (intensity > 0.7) return "#10b981" // Vert
    return "#6366f1" // Indigo (récup)
  }

  return (
    <MapContainer
      style={{ height: "100%", width: "100%", background: "#0a0a0a", borderRadius: "12px" }}
      center={allLatLngs[0]}
      zoom={13}
      scrollWheelZoom={true}
      zoomControl={false}
    >
      {/* Fond de carte sombre par défaut */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />

      <MapController points={allLatLngs} focusedSegment={focusedSegment} />

      {/* Tracé brut si pas de simulation */}
      {!segments && <Polyline positions={allLatLngs} pathOptions={{ color: "#8b5cf6", weight: 4, opacity: 0.8 }} />}

      {/* Segments simulés */}
      {segments?.map((seg) => {
        if (!seg.points || seg.points.length < 2) return null
        const positions = seg.points.map((p) => [p[0], p[1]] as [number, number])

        return (
          <Polyline
            key={seg.id}
            positions={positions}
            eventHandlers={{
              click: () => onSegmentClick(seg),
              mouseover: (e) => {
                e.target.setStyle({ weight: 8, opacity: 1 })
              },
              mouseout: (e) => {
                if (focusedSegment?.id !== seg.id) {
                  e.target.setStyle({ weight: 5, opacity: 0.85 })
                }
              },
            }}
            pathOptions={{
              color: getSegmentColor(seg),
              weight: focusedSegment?.id === seg.id ? 9 : 5,
              opacity: focusedSegment?.id === seg.id ? 1 : 0.85,
              lineCap: "round",
              lineJoin: "round",
            }}
          >
            <Tooltip sticky>
              <div style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                <div>
                  📏 {seg.lengthM.toFixed(0)}m • ⛰️ {seg.avgGradient.toFixed(1)}%
                </div>
                <div>
                  ⚡ {Math.round(seg.avgPower)}W • 🚴 {seg.avgSpeed.toFixed(1)} km/h
                </div>
                <div>
                  💪 W': {seg.wPrimePercent.toFixed(0)}% • 😰 Fatigue: {(seg.fatigueLevel * 100).toFixed(0)}%
                </div>
              </div>
            </Tooltip>
          </Polyline>
        )
      })}

      {/* Points de nutrition */}
      {nutritionPoints.map((nutri, idx) => {
        const segment = segments?.find((s) => s.id === nutri.segmentId)
        if (!segment?.points || segment.points.length === 0) return null

        // Position au milieu du segment
        const midPoint = segment.points[Math.floor(segment.points.length / 2)]

        return (
          <Marker key={idx} position={[midPoint[0], midPoint[1]]} icon={getNutritionIcon(nutri.type)}>
            <Popup>
              <div style={{ fontSize: "0.8rem", minWidth: "180px" }}>
                <div style={{ fontWeight: 700, marginBottom: "4px", color: "#111" }}>
                  {nutri.type === "GEL" ? "🍯 Gel Énergétique" : nutri.type === "BAR" ? "🍫 Barre" : "💧 Boisson"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#555" }}>
                  📍 {nutri.distanceKm.toFixed(1)} km
                  <br />
                  ⏱️ {Math.floor(nutri.timeS / 60)}min {Math.round(nutri.timeS % 60)}s<br />🔥 {nutri.calories} kcal
                  <br />💡 {nutri.reason}
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}

      {/* Marqueurs départ/arrivée */}
      <Marker position={allLatLngs[0]} icon={iconStart}>
        <Popup>
          <strong>🚩 DÉPART</strong>
        </Popup>
      </Marker>
      <Marker position={allLatLngs[allLatLngs.length - 1]} icon={iconEnd}>
        <Popup>
          <strong>🏁 ARRIVÉE</strong>
        </Popup>
      </Marker>

      <style jsx global>{`
        .nutrition-marker:hover {
          transform: scale(1.2);
        }
      `}</style>
    </MapContainer>
  )
}
