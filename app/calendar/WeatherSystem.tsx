"use client"

import React, { useEffect, useState } from "react"
import "./weather.css"

// --- CONFIGURATION ---
const SIMULATION_MODE = false; 
const CYCLE_SPEED = 3000; // 3 secondes par changement pour voir la différence vite

type WeatherData = {
  wmoCode: number
  isDay: boolean
  temp: number
}

// --- LOGIQUE D'INTENSITÉ ---
const getRainIntensity = (code: number) => {
  // 1. PLUIE LÉGÈRE / BRUINE (30 gouttes)
  if ([51, 61, 80].includes(code)) {
    return { count: 30, speed: 1.0, opacity: 0.4, name: "Bruine Légère" };
  }
  
  // 2. PLUIE MODÉRÉE (150 gouttes)
  if ([53, 63, 81].includes(code)) {
    return { count: 150, speed: 0.8, opacity: 0.7, name: "Pluie Modérée" };
  }
  
  // 3. DÉLUGE / ORAGE (400 gouttes, très rapide)
  if ([55, 65, 82, 95, 96, 99].includes(code)) {
    return { count: 400, speed: 0.5, opacity: 1, name: "Déluge Violent" };
  }

  // Par défaut
  return { count: 80, speed: 0.8, opacity: 0.6, name: "Pluie Standard" };
}

const getWeatherType = (code: number) => {
  if (code === 0) return "CLEAR"
  if (code >= 1 && code <= 3) return "CLOUDY"
  if (code >= 45 && code <= 48) return "FOG"
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "RAIN"
  if (code >= 71 && code <= 77) return "SNOW"
  if (code >= 95) return "STORM"
  return "CLEAR"
}

// --- LISTE DE SIMULATION (Focus Pluie) ---
const SIM_TIMES = ["noon", "dusk", "deep-night", "dawn"]; // On fait tourner les heures
const SIM_WEATHERS = [
  { code: 0, name: "Grand Soleil" },
  { code: 51, name: "🌧️ TEST 1 : Bruine (30)" }, 
  { code: 63, name: "🌧️ TEST 2 : Pluie (150)" }, 
  { code: 95, name: "⛈️ TEST 3 : Déluge (400)" }, 
  { code: 45, name: "Brouillard" }
];

export default function WeatherSystem({ active }: { active: boolean }) {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [timePhase, setTimePhase] = useState("noon")
  const [sunPos, setSunPos] = useState({ x: 50, y: 20 })
  const [simStep, setSimStep] = useState(0);

  // 1. BOUCLE
  useEffect(() => {
    if (!active || !SIMULATION_MODE) return;
    const interval = setInterval(() => setSimStep((prev) => prev + 1), CYCLE_SPEED);
    return () => clearInterval(interval);
  }, [active]);

  // 2. APPLIQUER SIMULATION (CORRIGÉ)
  useEffect(() => {
    if (!SIMULATION_MODE) return;
    
    // CORRECTION : On change la météo à CHAQUE étape en même temps que l'heure
    // (Plus besoin d'attendre la fin de la journée)
    const index = simStep % SIM_WEATHERS.length;
    const timeIndex = simStep % SIM_TIMES.length;

    const weatherObj = SIM_WEATHERS[index];
    const phase = SIM_TIMES[timeIndex];

    const isDay = phase !== "deep-night" && phase !== "dusk" && phase !== "dawn"; 
    
    // Soleil qui bouge un peu pour le fun
    setSunPos({ x: 20 + (index * 15) % 80, y: 20 });

    setTimePhase(phase);
    setWeather({ wmoCode: weatherObj.code, isDay: isDay, temp: 20 });
  }, [simStep]);

  // 3. LOGIQUE RÉELLE (GPS) - Inchangée
  useEffect(() => {
    if (!active || SIMULATION_MODE) return
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      })
    }
  }, [active])

  useEffect(() => {
    if (!coords || !active || SIMULATION_MODE) return
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=weather_code,is_day,temperature_2m&daily=sunrise,sunset&timezone=auto`
        )
        const data = await res.json()
        setWeather({
          wmoCode: data.current.weather_code,
          isDay: data.current.is_day === 1,
          temp: data.current.temperature_2m
        })
        
        // Logique Phase Réelle (Gardée telle quelle)
        const now = new Date()
        const sunrise = new Date(data.daily.sunrise[0])
        const sunset = new Date(data.daily.sunset[0])
        const currentMins = now.getHours() * 60 + now.getMinutes()
        const sunriseMins = sunrise.getHours() * 60 + sunrise.getMinutes()
        const sunsetMins = sunset.getHours() * 60 + sunset.getMinutes()

        let phase = "deep-night"
        if (currentMins >= sunriseMins - 60 && currentMins < sunriseMins) phase = "dawn"
        else if (currentMins >= sunriseMins && currentMins < sunriseMins + 120) phase = "morning"
        else if (currentMins >= sunriseMins + 120 && currentMins < sunsetMins - 180) phase = "noon"
        else if (currentMins >= sunsetMins - 180 && currentMins < sunsetMins - 60) phase = "afternoon"
        else if (currentMins >= sunsetMins - 60 && currentMins < sunsetMins) phase = "golden"
        else if (currentMins >= sunsetMins && currentMins < sunsetMins + 60) phase = "dusk"
        else phase = "deep-night"
        
        if (currentMins > sunriseMins && currentMins < sunsetMins) {
           const dayDuration = sunsetMins - sunriseMins;
           const progress = (currentMins - sunriseMins) / dayDuration;
           setSunPos({ x: progress * 100, y: 20 + Math.abs(progress - 0.5) * 50 });
        }

        setTimePhase(phase)
      } catch (e) { console.error("Erreur Météo", e) }
    }
    fetchWeather()
    const interval = setInterval(fetchWeather, 600000)
    return () => clearInterval(interval)
  }, [coords, active])


  if (!active || !weather) return null

  const type = getWeatherType(weather.wmoCode)
  const isRaining = type === "RAIN" || type === "STORM"
  const isSnowing = type === "SNOW"
  const isCloudy = type === "CLOUDY" || isRaining || isSnowing
  const isStorm = type === "STORM"
  const isFog = type === "FOG"
  
  // CALCUL DES INTENSITÉS
  const rainConfig = getRainIntensity(weather.wmoCode);

  let skyClass = `sky-${timePhase}`
  if (isRaining) skyClass = "sky-gray"
  if (isStorm) skyClass = "sky-storm"
  const isOvercast = isRaining || isStorm || (isSnowing && !weather.isDay);

  const debugName = SIMULATION_MODE 
    ? SIM_WEATHERS.find(w => w.code === weather.wmoCode)?.name 
    : rainConfig.name;

  return (
    <div className="weather-container">
      
      {SIMULATION_MODE && (
        <div style={{
            position: 'absolute', bottom: 20, right: 20, 
            background: 'rgba(0,0,0,0.8)', color: '#00f3ff', 
            padding: '10px 20px', borderRadius: '8px', 
            fontFamily: 'monospace', zIndex: 9999, border: '1px solid #333'
        }}>
            <div style={{fontSize:'0.8rem', color:'#888'}}>SIMULATION</div>
            <div style={{fontWeight:'bold', color: '#fff'}}>{debugName}</div>
            <div style={{fontSize:'0.9rem'}}>{timePhase.toUpperCase()}</div>
        </div>
      )}

      {/* 1. CIEL */}
      <div className={`layer-sky ${skyClass}`} />

      {/* 2. ASTRES */}
      <div className="layer-celestial" style={{ opacity: isOvercast ? 0.3 : 1 }}>
        {weather.isDay && !isStorm && !isRaining ? (
           <div className="celestial-sun" style={{ left: `${sunPos.x}%`, top: `${sunPos.y}%` } as React.CSSProperties} />
        ) : !isRaining && !isStorm && (timePhase === 'deep-night' || timePhase === 'dusk' || timePhase === 'dawn') ? (
           <div className="celestial-moon" />
        ) : null}
      </div>

      {/* 3. NUAGES */}
      {(isCloudy || isRaining || isStorm) && (
        <div className="layer-clouds" style={{ opacity: 1 }}>
            <div className="clouds-light" style={{ opacity: isOvercast ? 0.2 : 0.4 }} />
            {(isRaining || isStorm) && (
                <>
                 <div className="cloud-shape cloud-dark" style={{ top: '-10%', left: '-10%', width: '120vw', height: '50vh', filter:'blur(60px)', opacity: 0.9 }} />
                 <div className="cloud-shape cloud-dark" style={{ top: '30%', left: '60%', width: '400px', height: '120px', animationDuration: '55s' }} />
                </>
            )}
            {type === "CLOUDY" && !isRaining && (
                 <>
                  <div className="cloud-shape" style={{ top: '20%', left: '20%', width: '250px', height: '80px', animationDuration: '60s' }} />
                  <div className="cloud-shape" style={{ top: '40%', left: '70%', width: '300px', height: '90px', animationDuration: '70s' }} />
                 </>
            )}
        </div>
      )}

      {/* 4. COUCHE "OVERCAST" */}
      <div className={`layer-overcast ${isOvercast ? 'active' : ''}`} />

      {/* 5. PRÉCIPITATIONS DYNAMIQUES */}
      {isRaining && (
          <div 
            className="layer-precip" 
            // IMPORTANT : LA CLÉ UNIQUE FORCE LA RECRÉATION DES GOUTTES QUAND L'INTENSITÉ CHANGE
            key={`rain-${weather.wmoCode}`} 
          >
            {Array.from({ length: rainConfig.count }).map((_, i) => (
                <div key={i} className="rain" style={{ 
                    left: `${Math.random() * 100}%`, 
                    animationDuration: `${(0.4 + Math.random() * 0.4) * rainConfig.speed}s`, 
                    animationDelay: `${Math.random()}s`,
                    opacity: 0.3 + Math.random() * rainConfig.opacity,
                    height: `${100 + Math.random() * 50}px` 
                }} />
            ))}
          </div>
      )}
      
      {isSnowing && (
          <div className="layer-precip">
             {Array.from({ length: 80 }).map((_, i) => (
                <div key={i} className="snow" style={{ 
                    left: `${Math.random() * 100}%`, 
                    animationDuration: `${5 + Math.random() * 5}s`,
                    animationDelay: `${Math.random()}s`
                }} />
            ))}
          </div>
      )}

      <div className={`layer-fog ${isFog ? 'active' : ''}`} />
      {isStorm && <div className="lightning-flash" />}
      
    </div>
  )
}