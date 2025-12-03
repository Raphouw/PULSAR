// Fichier : app/simulations/components/SimulationMap.tsx
"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Polyline, useMap, LayersControl, Marker } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { SimSegment } from "../../../lib/simulation-engine"

// Icônes
const iconStart = L.divIcon({
  className: "",
  html: `<div style="width:12px;height:12px;background:#10b981;border:2px solid white;border-radius:50%;box-shadow:0 0 8px #10b981;"></div>`,
  iconAnchor: [6, 6],
})
const iconEnd = L.divIcon({
  className: "",
  html: `<div style="width:12px;height:12px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 0 8px #ef4444;"></div>`,
  iconAnchor: [6, 6],
})

const MAP_STYLES = [
  { id: "dark", label: "Sombre (Pulsar)", url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" },
  {
    id: "light",
    label: "Clair (Voyager)",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  },
  {
    id: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  },
  { id: "cyclo", label: "Cyclisme (Relief)", url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png" },
  {
    id: "topo",
    label: "Topographie",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  },
]

// Contrôleur de Zoom et Focus
const MapController = ({
  points,
  focusedSegment,
}: { points: [number, number][]; focusedSegment: SimSegment | null }) => {
  const map = useMap()

  useEffect(() => {
    if (focusedSegment && focusedSegment.points) {
      // Zoom sur le segment cliqué
      const segPoints = focusedSegment.points.map((p) => [p[0], p[1]] as [number, number])
      if (segPoints.length > 0) map.fitBounds(L.latLngBounds(segPoints), { padding: [50, 50], animate: true })
    } else if (points && points.length > 0) {
      // Zoom global initial
      map.fitBounds(L.latLngBounds(points), { padding: [20, 20], animate: false })
    }
  }, [map, points, focusedSegment])

  return null
}

interface Props {
  points: [number, number, number][] | null
  segments: SimSegment[] | null
  focusedSegment: SimSegment | null
  onSegmentClick: (seg: SimSegment) => void
}

export default function SimulationMap({ points, segments, focusedSegment, onSegmentClick }: Props) {
  if (!points || points.length === 0)
    return (
      <div
        style={{
          height: "100%",
          background: "#111",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#444",
        }}
      >
        Aucun tracé GPS
      </div>
    )

  const allLatLngs = points.map((p) => [p[0], p[1]] as [number, number])

  // Fonction couleur selon intensité (Watt ou Pente)
  const getSegmentColor = (seg: SimSegment) => {
    if (focusedSegment?.id === seg.id) return "#fff" // Blanc si sélectionné
    if (seg.avgPower > 300) return "#ef4444" // Rouge
    if (seg.avgPower > 200) return "#f59e0b" // Orange
    if (seg.avgPower > 150) return "#10b981" // Vert
    return "#3b82f6" // Bleu (Récup/Descente)
  }

  return (
    <MapContainer
      style={{ height: "100%", width: "100%", background: "#050505" }}
      center={allLatLngs[0]}
      zoom={13}
      scrollWheelZoom={true}
      zoomControl={false}
    >
      <LayersControl position="topright">
        {MAP_STYLES.map((style, idx) => (
          <LayersControl.BaseLayer key={style.id} checked={idx === 1} name={style.label}>
            <TileLayer url={style.url} attribution="&copy; OpenStreetMap & contributors" />
          </LayersControl.BaseLayer>
        ))}
      </LayersControl>

      <MapController points={allLatLngs} focusedSegment={focusedSegment} />

      {/* Si pas de segments calculés, on affiche la trace brute */}
      {!segments && <Polyline positions={allLatLngs} pathOptions={{ color: "#d04fd7", weight: 4 }} />}

      {/* Affichage des Segments Colorés */}
      {segments &&
        segments.map((seg, i) => {
          if (!seg.points || seg.points.length < 2) return null
          const positions = seg.points.map((p) => [p[0], p[1]] as [number, number])

          return (
            <Polyline
              key={i}
              positions={positions}
              eventHandlers={{ click: () => onSegmentClick(seg) }}
              pathOptions={{
                color: getSegmentColor(seg),
                weight: focusedSegment?.id === seg.id ? 8 : 5,
                opacity: focusedSegment?.id === seg.id ? 1 : 0.8,
              }}
            />
          )
        })}

      <Marker position={allLatLngs[0]} icon={iconStart} />
      <Marker position={allLatLngs[allLatLngs.length - 1]} icon={iconEnd} />
    </MapContainer>
  )
}
