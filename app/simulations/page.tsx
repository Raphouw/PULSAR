// Fichier : app/simulations/page.tsx
import type React from "react"
import Link from "next/link"
import { Plus, Activity } from "lucide-react"

export default function SimulationsDashboard() {
  return (
    <div style={containerStyle}>
      {/* HEADER */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>SIMULATIONS</h1>
        <p style={subtitleStyle}>Laboratoire prédictif de performance</p>
      </div>

      {/* ACTION PRINCIPALE */}
      <div style={actionAreaStyle}>
        <Link href="/simulations/new" style={{ textDecoration: "none" }}>
          <button style={createButtonStyle}>
            <Plus size={24} strokeWidth={3} />
            NOUVELLE SIMULATION
          </button>
        </Link>
      </div>

      {/* LISTE VIDE (PLACEHOLDER) */}
      <div style={emptyStateStyle}>
        <div style={iconCircleStyle}>
          <Activity size={32} color="#444" />
        </div>
        <h3 style={{ color: "#666", marginTop: "1rem" }}>Aucune simulation enregistrée</h3>
        <p style={{ color: "#444", fontSize: "0.9rem" }}>
          Configurez votre matériel et choisissez un parcours pour commencer.
        </p>
      </div>
    </div>
  )
}

// --- STYLES ---
const containerStyle: React.CSSProperties = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "3rem 2rem",
  minHeight: "100vh",
  color: "#fff",
}
const headerStyle: React.CSSProperties = {
  marginBottom: "3rem",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  paddingBottom: "1.5rem",
}
const titleStyle: React.CSSProperties = {
  fontSize: "3rem",
  fontWeight: 900,
  margin: 0,
  color: "#d04fd7",
  letterSpacing: "-1px",
}
const subtitleStyle: React.CSSProperties = {
  color: "#888",
  fontSize: "1.1rem",
  marginTop: "0.5rem",
}
const actionAreaStyle: React.CSSProperties = {
  marginBottom: "3rem",
}
const createButtonStyle: React.CSSProperties = {
  background: "#00f3ff",
  color: "#000",
  border: "none",
  padding: "1rem 2rem",
  borderRadius: "12px",
  fontWeight: 800,
  fontSize: "1rem",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  boxShadow: "0 0 20px rgba(0, 243, 255, 0.3)",
  transition: "transform 0.2s",
}
const emptyStateStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "2px dashed rgba(255,255,255,0.1)",
  borderRadius: "20px",
  padding: "4rem",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
}
const iconCircleStyle: React.CSSProperties = {
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.05)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}