// Fichier : app/events/admin/EventCreatorForm.tsx
"use client"

import type React from "react"
import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import {
  Plus,
  Trash2,
  MapPin,
  Calendar,
  Globe,
  AlertTriangle,
  Zap,
  LocateFixed,
  Link2,
  Star,
  Upload,
  Clock,
  Users,
  Navigation,
  Trophy, // 🔥 Ajout de Trophy
  Users2,
} from "lucide-react"

interface RaceResultForm {
    winner_name_m: string;
    winner_time_m: string;
    winner_name_f: string;
    winner_time_f: string;
}

// 🔥 NOUVELLE INTERFACE pour l'état étendu du formulaire
interface EventFormState {
  name: string
  description: string
  date_start: string
  date_end: string
  location: string
  country: string
  registration_url: string
  website_url: string
  image_url:string
  jersey_url: string
  start_time: string
  end_time: string
  series_id: string
  start_lat: number | null
  start_lon: number | null

  rating_global: number
  rating_quality_price: number

  routes: RouteForm[]
  history: HistoryForm[]
  
  // 🔥 Champs pour les résultats de l'événement ACTUEL
  results: RaceResultForm;
}

const MapClickPicker = dynamic(() => import("./MapClickPicker"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "400px",
        background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#666",
        border: "1px solid #d04fd720",
      }}
    >
      ⚡ Chargement de la carte interactive...
    </div>
  ),
})

const ROUTE_TYPE_COLORS: { [key: string]: string } = {
  "Gran Fondo": "#d04fd7",
  "Medio Fondo": "#00f3ff",
  "Petit Fondo": "#f59e0b",
  Ultra: "#ef4444",
  Course: "#00f3ff",
  Randonnée: "#10b981",
  Autre: "#ffffff",
  default: "#ffffff",
}

const ROUTE_TYPES = Object.keys(ROUTE_TYPE_COLORS).filter((k) => k !== "default")

interface RouteForm {
  tempId: number
  name: string
  type: string
  gpxFile: File | null
  gpxFileName: string
  distance_km: number
  elevation_gain_m: number
  price_eur: number
  participants_limit: number | null
  aid_stations_count: number
  start_time: string
  polyline?: string
}

interface HistoryForm {
  tempId: number
  year: number
  participants_count: number | null
  winner_name: string
  winner_time: string
  weather_condition: string
}

interface EventFormState {
  name: string
  description: string
  date_start: string
  date_end: string
  location: string
  country: string
  registration_url: string
  website_url: string
  jersey_url: string
  image_url:string
  start_time: string
  end_time: string
  series_id: string // 🔥 Ajout de series_id dans le modèle
  start_lat: number | null
  start_lon: number | null

  rating_global: number
  rating_quality_price: number

  routes: RouteForm[]
  history: HistoryForm[]
}

const styles = {
  pageContainer: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)",
    padding: "2rem",
  } as React.CSSProperties,

  formContainer: {
    maxWidth: "1400px",
    margin: "0 auto",
  } as React.CSSProperties,

  header: {
    background: "linear-gradient(135deg, rgba(208, 79, 215, 0.1) 0%, rgba(0, 243, 255, 0.1) 100%)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(208, 79, 215, 0.3)",
    borderRadius: "16px",
    padding: "2rem",
    marginBottom: "2rem",
    boxShadow: "0 8px 32px rgba(208, 79, 215, 0.15)",
  } as React.CSSProperties,

  title: {
    fontSize: "2.5rem",
    fontWeight: 900,
    background: "linear-gradient(135deg, #d04fd7 0%, #00f3ff 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    marginBottom: "0.5rem",
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  subtitle: {
    color: "#aaa",
    fontSize: "0.95rem",
  } as React.CSSProperties,

  sectionCard: {
    background: "rgba(20, 20, 30, 0.6)",
    backdropFilter: "blur(15px)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "16px",
    padding: "2rem",
    marginBottom: "1.5rem",
    transition: "all 0.3s ease",
  } as React.CSSProperties,

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "#fff",
    margin: 0,
  } as React.CSSProperties,

  iconWrapper: (color: string) =>
    ({
      width: "40px",
      height: "40px",
      borderRadius: "10px",
      background: `${color}15`,
      border: `1px solid ${color}30`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: color,
    }) as React.CSSProperties,

  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1.5rem",
    marginBottom: "1.5rem",
  } as React.CSSProperties,

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1.5rem",
    marginBottom: "1.5rem",
  } as React.CSSProperties,

  grid4: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr",
    gap: "1rem",
    marginBottom: "1.5rem",
    alignItems: "start",
  } as React.CSSProperties,

  inputWrapper: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
  } as React.CSSProperties,

  label: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  } as React.CSSProperties,

  input: {
    width: "90%",
    height: "48px",
    padding: "0 16px",
    background: "rgba(10, 10, 20, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "0.95rem",
    transition: "all 0.2s ease",
    outline: "none",
  } as React.CSSProperties,

  textarea: {
    width: "95%",
    minHeight: "100px",
    padding: "16px",
    background: "rgba(10, 10, 20, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "0.95rem",
    transition: "all 0.2s ease",
    outline: "none",
    resize: "vertical" as const,
    fontFamily: "inherit",
  } as React.CSSProperties,

  select: {
    width: "100%",
    height: "48px",
    padding: "0 16px",
    background: "rgba(10, 10, 20, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "0.95rem",
    cursor: "pointer",
    outline: "none",
  } as React.CSSProperties,

  statBox: (color: string) =>
    ({
      background: `${color}08`,
      border: `1px solid ${color}25`,
      borderRadius: "10px",
      padding: "0.75rem",
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.25rem",
      justifyContent: "center",
      height: "1.45rem",
      minHeight: "auto",
      marginTop: "1.45rem",
      marginLeft: '2rem',
      width:'18rem'
    }) as React.CSSProperties,

  statLabel: {
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  } as React.CSSProperties,

  statValue: (color: string) =>
    ({
      fontSize: "1.5rem",
      fontWeight: "700",
      color: color,
      lineHeight: "1.2",
      whiteSpace: "nowrap",
    }) as React.CSSProperties,

  routeCard: (color: string) =>
    ({
      background: `linear-gradient(135deg, ${color}08 0%, rgba(20, 20, 30, 0.6) 100%)`,
      backdropFilter: "blur(10px)",
      border: `1px solid ${color}30`,
      borderRadius: "16px",
      padding: "2rem",
      marginBottom: "1.5rem",
      position: "relative" as const,
      boxShadow: `0 4px 24px ${color}10`,
    }) as React.CSSProperties,

  routeHeader: (color: string) =>
    ({
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "1.5rem",
      paddingBottom: "1rem",
      borderBottom: `1px solid ${color}20`,
    }) as React.CSSProperties,

  routeBadge: (color: string) =>
    ({
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      background: `${color}20`,
      border: `1px solid ${color}40`,
      borderRadius: "8px",
      color: color,
      fontSize: "0.85rem",
      fontWeight: 700,
    }) as React.CSSProperties,

  deleteButton: {
    position: "absolute" as const,
    top: "1rem",
    right: "1rem",
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#ef4444",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  button: (color: string, variant: "solid" | "outline" = "solid") =>
    ({
      padding: "14px 28px",
      background: variant === "solid" ? color : "transparent",
      color: variant === "solid" ? "#000" : color,
      border: variant === "solid" ? "none" : `2px solid ${color}`,
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: "0.95rem",
      transition: "all 0.3s ease",
      boxShadow: variant === "solid" ? `0 4px 20px ${color}40` : "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      outline: "none",
    }) as React.CSSProperties,

  divider: {
    height: "1px",
    background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)",
    margin: "1.5rem 0",
  } as React.CSSProperties,

  mapContainer: {
    height: "400px",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid rgba(0, 243, 255, 0.2)",
    boxShadow: "0 4px 24px rgba(0, 243, 255, 0.1)",
  } as React.CSSProperties,

  hint: {
    fontSize: "0.85rem",
    color: "#666",
    fontStyle: "italic" as const,
    marginTop: "0.5rem",
  } as React.CSSProperties,

  errorBanner: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "12px",
    padding: "1rem 1.5rem",
    marginBottom: "1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "#ef4444",
  } as React.CSSProperties,

  fileLabel: {
    width: "100%",
    height: "48px",
    padding: "0 16px",
    background: "rgba(10, 10, 20, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "0.95rem",
    transition: "all 0.2s ease",
    outline: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,
}

export default function EventCreatorForm({ eventIdToEdit }: { eventIdToEdit?: number }) {
  const router = useRouter()

  const [formData, setFormData] = useState<EventFormState>({
    name: "",
    description: "",
    date_start: "",
    date_end: "",
    location: "",
    country: "",
    registration_url: "",
    website_url: "",
    jersey_url: "",
    image_url:"",
    start_lat: 46.2,
    start_lon: 6.1,
    rating_global: 5,
    rating_quality_price: 5,
    routes: [],
    history: [],
    start_time: "08:00", 
    end_time: "",
    series_id: "",
    // 🔥 Initialisation des résultats
    results: {
        winner_name_m: '',
        winner_time_m: '00:00:00',
        winner_name_f: '',
        winner_time_f: '00:00:00',
    }
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditMode = !!eventIdToEdit

  const isPast = useMemo(() => {
    if (!formData.date_start) return false;
    const today = new Date();
    // On compare la date de début seule (sans heure)
    return new Date(formData.date_start) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }, [formData.date_start]);

  const handleMapClick = useCallback(({ lat, lon }: { lat: number; lon: number }) => {
    setFormData((prev) => ({
      ...prev,
      start_lat: lat,
      start_lon: lon,
    }))
  }, [])

  const addRoute = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      routes: [
        ...prev.routes,
        {
          tempId: Date.now(),
          name: `Parcours ${prev.routes.length + 1}`,
          type: "Gran Fondo",
          gpxFile: null,
          gpxFileName: "",
          distance_km: 0,
          elevation_gain_m: 0,
          price_eur: 0,
          participants_limit: null,
          aid_stations_count: 0,
          start_time: "08:00",
        },
      ],
    }))
  }, [])

  const removeRoute = useCallback((tempId: number) => {
    setFormData((prev) => ({
      ...prev,
      routes: prev.routes.filter((r) => r.tempId !== tempId),
    }))
  }, [])

  const addHistoryEntry = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      history: [
        ...prev.history,
        {
          tempId: Date.now(),
          year: new Date().getFullYear() - (prev.history.length + 1),
          participants_count: null,
          winner_name: "",
          winner_time: "00:00:00",
          weather_condition: "",
        },
      ],
    }))
  }, [])

  const removeHistoryEntry = useCallback((tempId: number) => {
    setFormData((prev) => ({
      ...prev,
      history: prev.history.filter((h) => h.tempId !== tempId),
    }))
  }, [])

  const handleGpxFileChange = async (e: React.ChangeEvent<HTMLInputElement>, tempId: number) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      // 1. Lire le contenu du fichier en texte brut
      const gpxContent = await file.text(); 
      
      // 2. Appel à l'API d'analyse avec le contenu texte
      const res = await fetch("/api/admin/gpx-analyze", { // 🔥 URL corrigée
        method: "POST",
        headers: {
            "Content-Type": "text/plain", // 🔥 Indiquer que nous envoyons du texte brut
        },
        body: gpxContent, // 🔥 Envoi du contenu brut du fichier
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Échec de l'analyse GPX")
      }

      const { data: analyzedData } = await res.json() // Renommé 'data' pour clarifier le destructuring

      setFormData((prev) => ({
        ...prev,
        routes: prev.routes.map((r) =>
          r.tempId === tempId
            ? {
                ...r,
                gpxFile: file,
                gpxFileName: file.name,
                distance_km: analyzedData.distance_km,
                elevation_gain_m: analyzedData.elevation_gain_m,
                polyline: analyzedData.polyline, // Ajout de la polyline
              }
            : r,
        ),
        // Si c'est la première route, on ajuste le point de départ de l'événement
        start_lat: prev.start_lat === null || prev.start_lat === 46.2 ? analyzedData.start_lat : prev.start_lat,
        start_lon: prev.start_lon === null || prev.start_lon === 6.1 ? analyzedData.start_lon : prev.start_lon,
      }))
    } catch (err: any) {
      console.error(err)
      setError(`Erreur lors de l'analyse du GPX: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

 const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!formData.name || formData.routes.length === 0 || !formData.date_start || !formData.start_time) {
      setError("Nom, Date de Début, Heure de Début et au moins un parcours sont requis.")
      setLoading(false)
      return
    }

    try {
      // 1. Préparation des données pour l'API
      const processedRoutes = await Promise.all(
        formData.routes.map(async (route) => {
          // ... (logique GPX/URL/Polyline) ...
          let finalGpxUrl: string | null = null
          if (route.gpxFile) {
            finalGpxUrl = `https://supabase.storage/v1/object/public/event-gpx/${route.gpxFile.name.replace(/\s/g, '_')}`
          }
          const { gpxFile, tempId, gpxFileName, ...rest } = route // On retire les props internes au formulaire
          return {
            ...rest,
            gpx_url: finalGpxUrl,
            polyline: (route as any).polyline || null,
            start_time: route.start_time
          }
        }),
      )

      const payload = {
        eventData: {
          ...formData,
          routes: processedRoutes,
          history: formData.history.map(({ tempId, ...rest }) => rest),
          // 🔥 Les résultats sont envoyés au même niveau que les autres champs
          // Ils seront gérés dans l'API Route comme des colonnes directes.
          ...formData.results, 
          // On retire le champ "results" de l'objet principal car on l'a étalé
          results: undefined 
        },
      }
        
      // 2. Appel à l'API Route (NON SIMULÉ)
      // 🔥 LOGIQUE DE ROUTAGE ET MÉTHODE ADAPTÉE AU MODE ÉDITION
      const apiEndpoint = isEditMode ? `/api/events/${eventIdToEdit}` : "/api/events"
      const res = await fetch(apiEndpoint, {
        method: isEditMode ? 'PUT' : 'POST', // Utilisation de PUT pour l'édition
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || `Erreur serveur lors de la ${isEditMode ? 'modification' : 'création'}`)
      }
      
      const result = await res.json();

      alert(`Événement ${isEditMode ? "mis à jour" : "créé"} avec succès! ID: ${result.eventId || eventIdToEdit}`)
      router.push("/events") // Redirection après succès
    } catch (err: any) {
      console.error("Erreur soumission formulaire:", err)
      setError(`Échec de l'opération: ${err.message || "Erreur inconnue"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.pageContainer}>
      <div style={styles.formContainer}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>
            {isEditMode ? `⚡ ÉDITION ÉVÉNEMENT #${eventIdToEdit}` : "✨ NOUVEL ÉVÉNEMENT PULSAR"}
          </h1>
          <p style={styles.subtitle}>
            {isEditMode
              ? "Modifiez les détails de cet événement"
              : "Créez un nouvel événement cyclosportif avec tous ses détails"}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={styles.errorBanner}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* SECTION 1: Informations Générales */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.iconWrapper("#00f3ff")}>
                <Globe size={20} />
              </div>
              <h2 style={styles.sectionTitle}>Informations Générales</h2>
            </div>

            <div style={styles.grid2}>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Nom de l'événement *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  style={styles.input}
                  placeholder="Ex: L'Étape du Tour 2025"
                  required
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>ID Série (Liaison historique)</label>
                <input
                  type="text"
                  value={formData.series_id}
                  onChange={(e) => setFormData((p) => ({ ...p, series_id: e.target.value }))}
                  style={styles.input}
                  placeholder="Ex: EDT, PRX"
                />
              </div>
            </div>

            <div style={styles.inputWrapper}>
              <label style={styles.label}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                style={styles.textarea}
                placeholder="Décrivez l'événement, son ambiance, ses particularités..."
              />
            </div>

            <div style={styles.divider} />

            <div style={styles.grid3}>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>
                  <MapPin size={12} /> Pays
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                  style={styles.input}
                  placeholder="Ex: France"
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>
                  <Navigation size={12} /> Ville/Lieu
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                  style={styles.input}
                  placeholder="Ex: Megève"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Dates et Horaires */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.iconWrapper("#d04fd7")}>
                <Calendar size={20} />
              </div>
              <h2 style={styles.sectionTitle}>Dates & Horaires</h2>
            </div>

            <div style={styles.grid4}>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Date Début *</label>
                <input
                  type="date"
                  value={formData.date_start}
                  onChange={(e) => setFormData((p) => ({ ...p, date_start: e.target.value }))}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Date Fin</label>
                <input
                  type="date"
                  value={formData.date_end}
                  onChange={(e) => setFormData((p) => ({ ...p, date_end: e.target.value }))}
                  style={styles.input}
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>
                  <Clock size={12} /> Heure Début *
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData((p) => ({ ...p, start_time: e.target.value }))}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>
                  <Clock size={12} /> Heure Fin Estimée
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData((p) => ({ ...p, end_time: e.target.value }))}
                  style={styles.input}
                />
              </div>
            </div>

            
          {isPast && (
                <div style={{marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)'}}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', color: '#10b981' }}>
                        <Trophy size={20} />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>RÉSULTATS ÉDITION TERMINÉE</h3>
                    </div>
                    
                    <div style={{...styles.grid2, marginBottom: '1rem'}}>
                        {/* Vainqueur Homme */}
                        <div style={styles.inputWrapper}>
                            <label style={styles.label}>
                                <Users2 size={12} /> Vainqueur Homme
                            </label>
                            <input
                                type="text"
                                value={formData.results.winner_name_m}
                                onChange={(e) =>
                                    setFormData((p) => ({ ...p, results: { ...p.results, winner_name_m: e.target.value } }))
                                }
                                style={styles.input}
                                placeholder="Nom du vainqueur"
                            />
                        </div>
                        <div style={styles.inputWrapper}>
                            <label style={styles.label}>⏱️ Temps Vainqueur (H)</label>
                            <input
                                type="text"
                                value={formData.results.winner_time_m}
                                onChange={(e) =>
                                    setFormData((p) => ({ ...p, results: { ...p.results, winner_time_m: e.target.value } }))
                                }
                                style={styles.input}
                                placeholder="HH:MM:SS"
                            />
                        </div>
                    </div>
                    
                    <div style={styles.grid2}>
                        {/* Vainqueure Femme */}
                        <div style={styles.inputWrapper}>
                            <label style={styles.label}>
                                <Users2 size={12} /> Vainqueure Femme
                            </label>
                            <input
                                type="text"
                                value={formData.results.winner_name_f}
                                onChange={(e) =>
                                    setFormData((p) => ({ ...p, results: { ...p.results, winner_name_f: e.target.value } }))
                                }
                                style={styles.input}
                                placeholder="Nom de la vainqueure"
                            />
                        </div>
                        <div style={styles.inputWrapper}>
                            <label style={styles.label}>⏱️ Temps Vainqueure (F)</label>
                            <input
                                type="text"
                                value={formData.results.winner_time_f}
                                onChange={(e) =>
                                    setFormData((p) => ({ ...p, results: { ...p.results, winner_time_f: e.target.value } }))
                                }
                                style={styles.input}
                                placeholder="HH:MM:SS"
                            />
                        </div>
                    </div>
                </div>
            )}
            
          </div>

          {/* SECTION 3: Liens Web */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.iconWrapper("#f59e0b")}>
                <Link2 size={20} />
              </div>
              <h2 style={styles.sectionTitle}>Liens & Ressources</h2>
            </div>

            <div style={styles.grid3}>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>🎫 URL Inscription</label>
                <input
                  type="url"
                  value={formData.registration_url}
                  onChange={(e) => setFormData((p) => ({ ...p, registration_url: e.target.value }))}
                  style={styles.input}
                  placeholder="https://..."
                />
              </div>

              
              <div style={styles.inputWrapper}>
                <label style={styles.label}>🖼️ URL Image d'événement</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData((p) => ({ ...p, image_url: e.target.value }))}
                  style={styles.input}
                  placeholder="https://..."
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>🌐 Site Web Officiel</label>
                <input
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData((p) => ({ ...p, website_url: e.target.value }))}
                  style={styles.input}
                  placeholder="https://..."
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>👕 URL Maillot</label>
                <input
                  type="url"
                  value={formData.jersey_url}
                  onChange={(e) => setFormData((p) => ({ ...p, jersey_url: e.target.value }))}
                  style={styles.input}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Localisation & Carte */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.iconWrapper("#00f3ff")}>
                <LocateFixed size={20} />
              </div>
              <h2 style={styles.sectionTitle}>Point de Départ (Météo)</h2>
            </div>

            <div style={styles.grid2}>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.start_lat ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, start_lat: Number.parseFloat(e.target.value) || null }))}
                  style={styles.input}
                  placeholder="Ex: 45.9015"
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.start_lon ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, start_lon: Number.parseFloat(e.target.value) || null }))}
                  style={styles.input}
                  placeholder="Ex: 6.1294"
                />
              </div>
            </div>

            <div style={styles.mapContainer}>
              <MapClickPicker lat={formData.start_lat} lon={formData.start_lon} onMapClick={handleMapClick} />
            </div>
            <p style={styles.hint}>
              💡 Cliquez sur la carte pour définir le point de départ exact (utilisé pour les prévisions météo)
            </p>
          </div>

          {/* SECTION 5: Notes & Ratings */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.iconWrapper("#d04fd7")}>
                <Star size={20} />
              </div>
              <h2 style={styles.sectionTitle}>Évaluations PULSAR</h2>
            </div>

            <div style={styles.grid2}>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>⭐ Note Globale (/10)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.rating_global}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, rating_global: Number.parseFloat(e.target.value) || 0 }))
                  }
                  style={styles.input}
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>💰 Qualité/Prix (/10)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.rating_quality_price}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, rating_quality_price: Number.parseFloat(e.target.value) || 0 }))
                  }
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          {/* SECTION 6: Parcours */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.iconWrapper("#00f3ff")}>
                <Zap size={20} />
              </div>
              <h2 style={styles.sectionTitle}>Parcours ({formData.routes.length})</h2>
            </div>

            {formData.routes.length === 0 && (
              <p style={styles.hint}>Aucun parcours ajouté. Cliquez sur le bouton ci-dessous pour en ajouter un.</p>
            )}

            {formData.routes.map((route, index) => {
              const routeColor = ROUTE_TYPE_COLORS[route.type] || ROUTE_TYPE_COLORS.default

              return (
                <div key={route.tempId} style={styles.routeCard(routeColor)}>
                  <button
                    type="button"
                    onClick={() => removeRoute(route.tempId)}
                    style={styles.deleteButton}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"
                      e.currentTarget.style.transform = "scale(1.1)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"
                      e.currentTarget.style.transform = "scale(1)"
                    }}
                  >
                    <Trash2 size={18} />
                  </button>

                  <div style={styles.routeHeader(routeColor)}>
                    <div style={styles.routeBadge(routeColor)}>
                      <Zap size={16} />
                      Parcours #{index + 1}
                    </div>
                  </div>

                  {/* Ligne 1: Nom, Type, Prix */}
                  <div style={styles.grid3}>
                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>Nom du Parcours *</label>
                      <input
                        type="text"
                        value={route.name}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            routes: p.routes.map((r) =>
                              r.tempId === route.tempId ? { ...r, name: e.target.value } : r,
                            ),
                          }))
                        }
                        style={styles.input}
                        required
                      />
                    </div>

                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>Type de Parcours</label>
                      <select
                        value={route.type}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            routes: p.routes.map((r) =>
                              r.tempId === route.tempId ? { ...r, type: e.target.value } : r,
                            ),
                          }))
                        }
                        style={styles.select}
                      >
                        {ROUTE_TYPES.map((type) => (
                          <option key={type} value={type} style={{ background: "#1a1a2e" }}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>💶 Prix (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={route.price_eur}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            routes: p.routes.map((r) =>
                              r.tempId === route.tempId
                                ? { ...r, price_eur: Number.parseFloat(e.target.value) || 0 }
                                : r,
                            ),
                          }))
                        }
                        style={styles.input}
                      />
                    </div>
                  </div>

                  <div style={styles.divider} />

                  {/* Ligne 2: Upload GPX + Stats déduites */}
                  <div style={styles.grid4}>
                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>
                        <Upload size={12} /> Fichier GPX
                      </label>
                      <input
                        type="file"
                        accept=".gpx"
                        onChange={(e) => handleGpxFileChange(e, route.tempId)}
                        style={{ display: "none" }}
                        id={`gpx-${route.tempId}`}
                      />
                      <label htmlFor={`gpx-${route.tempId}`} style={styles.fileLabel}>
                        Choisir un fichier
                      </label>
                      {route.gpxFileName ? (
                        <div style={styles.hint}>✓ {route.gpxFileName}</div>
                      ) : (
                        <div style={styles.hint}>Aucun fichier choisi</div>
                      )}
                    </div>

                    <div style={styles.statBox("#00f3ff")}>
                      <div style={styles.statLabel}>Distance (km)</div>
                      <div style={styles.statValue("#00f3ff")}>{route.distance_km.toFixed(1)}</div>
                    </div>

                    <div style={styles.statBox("#f59e0b")}>
                      <div style={styles.statLabel}>Dénivelé (m)</div>
                      <div style={styles.statValue("#f59e0b")}>{Math.round(route.elevation_gain_m)}</div>
                    </div>

                    <div style={styles.statBox("#d04fd7")}>
                      <div style={styles.statLabel}>Prix</div>
                      <div style={styles.statValue("#d04fd7")}>{route.price_eur.toFixed(0)}€</div>
                    </div>
                  </div>

                  <div style={styles.divider} />

                  {/* Ligne 3: Détails logistiques */}
                  <div style={styles.grid3}>
                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>
                        <Clock size={12} /> Heure Départ
                      </label>
                      <input
                        type="time"
                        value={route.start_time}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            routes: p.routes.map((r) =>
                              r.tempId === route.tempId ? { ...r, start_time: e.target.value } : r,
                            ),
                          }))
                        }
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>
                        <Users size={12} /> Limite Participants
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={route.participants_limit ?? ""}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            routes: p.routes.map((r) =>
                              r.tempId === route.tempId
                                ? { ...r, participants_limit: Number.parseInt(e.target.value) || null }
                                : r,
                            ),
                          }))
                        }
                        style={styles.input}
                        placeholder="Illimité"
                      />
                    </div>

                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>🥤 Nb Ravitaillements</label>
                      <input
                        type="number"
                        step="1"
                        value={route.aid_stations_count}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            routes: p.routes.map((r) =>
                              r.tempId === route.tempId
                                ? { ...r, aid_stations_count: Number.parseInt(e.target.value) || 0 }
                                : r,
                            ),
                          }))
                        }
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>
              )
            })}

            <button
              type="button"
              onClick={addRoute}
              style={styles.button("#00f3ff", "outline")}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#00f3ff"
                e.currentTarget.style.color = "#000"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "#00f3ff"
              }}
            >
              <Plus size={18} />
              Ajouter un Parcours
            </button>
          </div>

          

          {/* Bouton de soumission */}
          <button
            type="submit"
            style={{ ...styles.button("#d04fd7", "solid"), width: "100%", padding: "18px" }}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-2px)"
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(208, 79, 215, 0.6)"
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(208, 79, 215, 0.4)"
            }}
          >
            {loading
              ? "⏳ Traitement en cours..."
              : isEditMode
                ? "✅ SAUVEGARDER LES MODIFICATIONS"
                : "✨ CRÉER L'ÉVÉNEMENT"}
          </button>
        </form>
      </div>
    </div>
  )
}
