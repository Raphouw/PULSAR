// Moteur de simulation cycliste ultra-avancé avec modèle physique complet, W', fatigue, et nutrition

import { getIntensityFactorForSegment, type PacingStrategyType } from "./simulation-strategies"

// ============ TYPES ============

export type UserProfile = {
  weight: number
  ftp: number
  wPrime: number // J (Joules)
  cp3?: number
  cp12?: number
  heightCm?: number
}

export type NutritionPoint = {
  segmentId: number
  distanceKm: number
  timeS: number
  type: "GEL" | "BAR" | "DRINK"
  calories: number
  reason: string
}

export type SimSegment = {
  id: number
  startKm: number
  endKm: number
  lengthM: number
  avgGradient: number
  type: "CLIMB" | "FLAT" | "DESCENT"
  avgPower: number
  avgSpeed: number
  duration: number
  wPrimeEnd: number
  wPrimePercent: number
  energyKcal: number
  fatigueLevel: number // 0-1 (1 = épuisé)
  points?: [number, number, number][]
}

export type SimulationConfig = {
  user: UserProfile
  bikeWeight: number
  cda: number
  crr: number
  rho: number
  windSpeedKmh: number
  windDirectionDeg: number
  temperature: number // Pour calcul densité air
  targetMode: "SPEED" | "POWER"
  targetValue: number
  strategy: PacingStrategyType
}

export type SimulationResult = {
  segments: SimSegment[]
  nutritionPoints: NutritionPoint[]
  summary: {
    totalTime: number
    avgSpeed: number
    avgPower: number
    normalizedPower: number
    tss: number
    totalWork: number
    wPrimeDepleted: boolean
    failurePointKm?: number
  }
}

// ============ CONSTANTES PHYSIQUES ============

const GRAVITY = 9.81 // m/s²
const AIR_DENSITY_BASE = 1.225 // kg/m³ à 15°C

// Ajustement densité de l'air selon température
function getAirDensity(tempC: number): number {
  return AIR_DENSITY_BASE * (288.15 / (tempC + 273.15))
}

// ============ GÉOMÉTRIE GPS ============

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δφ = toRad(lat2 - lat1)
  const Δλ = toRad(lon2 - lon1)

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1))
  const brng = toDeg(Math.atan2(y, x))
  return (brng + 360) % 360
}

// Composante du vent (vent de face positif, vent dans le dos négatif)
function getWindComponent(segmentBearing: number, windDirection: number, windSpeed: number): number {
  // Wind direction = d'où vient le vent
  // On veut savoir la composante face/dos
  const angleDiff = Math.abs(segmentBearing - windDirection)
  const effectiveAngle = angleDiff > 180 ? 360 - angleDiff : angleDiff

  // Composante face = windSpeed * cos(angle)
  return windSpeed * Math.cos(toRad(effectiveAngle)) * (angleDiff > 90 && angleDiff < 270 ? -1 : 1)
}

// ============ MODÈLE PHYSIQUE COMPLET ============

/**
 * Calcule la puissance nécessaire pour une vitesse donnée
 */
function calculateRequiredPower(
  speedMs: number,
  gradient: number,
  mass: number,
  cda: number,
  crr: number,
  rho: number,
  windComponentMs: number,
): number {
  const gradeRad = Math.atan(gradient / 100)

  // Force gravitationnelle (montée/descente)
  const forceGravity = mass * GRAVITY * Math.sin(gradeRad)

  // Force de roulement
  const forceRolling = mass * GRAVITY * crr * Math.cos(gradeRad)

  // Force aérodynamique (incluant le vent)
  const vAir = speedMs + windComponentMs
  const forceAero = 0.5 * rho * cda * vAir * Math.abs(vAir)

  // Puissance totale = somme des forces × vitesse
  const totalForce = forceGravity + forceRolling + forceAero
  const power = totalForce * speedMs

  return Math.max(0, power) // Pas de puissance négative
}

/**
 * Résout la vitesse pour une puissance donnée (méthode Newton-Raphson améliorée)
 */
function solveSpeedForPower(
  power: number,
  gradient: number,
  mass: number,
  cda: number,
  crr: number,
  rho: number,
  windComponentMs: number,
): number {
  // Cas spécial : descente raide avec puissance faible/nulle
  if (gradient < -3 && power < 100) {
    // Vitesse terminale déterminée principalement par la gravité et l'aéro
    let v = 15 // Estimation initiale réaliste
    for (let i = 0; i < 25; i++) {
      const reqPower = calculateRequiredPower(v, gradient, mass, cda, crr, rho, windComponentMs)
      const error = Math.abs(reqPower - power)

      if (error < 2) break // Convergé

      // Ajustement adaptatif
      const derivative = mass * GRAVITY * 0.15 + rho * cda * v * Math.abs(v + windComponentMs)
      const delta = (reqPower - power) / Math.max(1, derivative)
      v -= delta * 0.3 // Amortissement fort pour stabilité

      // Limites réalistes en descente
      v = Math.max(5, Math.min(v, 80 / 3.6)) // 5-80 km/h
    }
    return v
  }

  // Cas général : méthode Newton-Raphson optimisée
  // Estimation initiale intelligente
  let v: number
  if (gradient > 5) {
    // Montée raide : vitesse faible
    v = Math.max(3, Math.sqrt(power / (mass * GRAVITY * Math.sin(Math.atan(gradient / 100)) + 50)))
  } else if (gradient < -2) {
    // Descente : vitesse élevée
    v = 10 + power / 100
  } else {
    // Plat : estimation standard
    v = Math.cbrt(power / (0.5 * rho * cda)) * 0.5
  }

  // Itérations Newton-Raphson
  for (let i = 0; i < 20; i++) {
    const reqPower = calculateRequiredPower(v, gradient, mass, cda, crr, rho, windComponentMs)
    const error = reqPower - power

    if (Math.abs(error) < 1) break // Convergé

    // Calcul de la dérivée (dP/dv)
    const gradeRad = Math.atan(gradient / 100)
    const vAir = v + windComponentMs
    const dPower_dv =
      (mass * GRAVITY * Math.sin(gradeRad) + mass * GRAVITY * crr * Math.cos(gradeRad)) +
      0.5 * rho * cda * (2 * vAir * Math.abs(vAir) + vAir * vAir / Math.max(0.1, Math.abs(vAir)))

    // Ajustement avec amortissement adaptatif
    const damping = Math.abs(error) > 50 ? 0.3 : 0.6
    const delta = error / Math.max(1, dPower_dv)
    v -= delta * damping

    // Limites physiques réalistes
    v = Math.max(1, Math.min(v, 25)) // 3.6-90 km/h
  }

  return v
}

// ============ MODÈLE DE FATIGUE MULTIDIMENSIONNEL ============

type FatigueState = {
  muscular: number // Fatigue musculaire locale (0-1)
  cardiovascular: number // Fatigue cardio/centrale (0-1)
  neural: number // Fatigue neurale (coordination) (0-1)
  glycogen: number // Réserves de glycogène (0-1, 1 = plein)
}

/**
 * Calcule la fatigue multidimensionnelle
 */
function calculateAdvancedFatigue(
  timeAtZone: { z1: number; z2: number; z3: number; z4: number; z5: number },
  totalTime: number,
  workDone: number, // kJ
): FatigueState {
  // 1. Fatigue musculaire (efforts intenses répétés)
  const highIntensityTime = timeAtZone.z4 + timeAtZone.z5
  const muscularFatigue = Math.min(1, (highIntensityTime / 3600) * 0.4 + (timeAtZone.z5 / 1800) * 0.6)

  // 2. Fatigue cardiovasculaire (durée totale + intensité moyenne)
  const avgIntensity =
    (timeAtZone.z1 * 0.5 + timeAtZone.z2 * 0.65 + timeAtZone.z3 * 0.82 + timeAtZone.z4 * 0.97 + timeAtZone.z5 * 1.15) /
    Math.max(1, totalTime)
  const cardioFatigue = Math.min(1, (totalTime / 3600) * avgIntensity * 0.15)

  // 3. Fatigue neurale (durée totale)
  const neuralFatigue = Math.min(1, totalTime / (5 * 3600))

  // 4. Épuisement glycogène (travail total)
  const maxGlycogenKj = 2000 // ~500g glycogène musculaire
  const glycogenRemaining = Math.max(0, 1 - workDone / maxGlycogenKj)

  return {
    muscular: muscularFatigue,
    cardiovascular: cardioFatigue,
    neural: neuralFatigue,
    glycogen: glycogenRemaining,
  }
}

/**
 * Applique la fatigue à la puissance disponible selon le type de segment
 */
function applyFatigueToSegment(
  basePower: number,
  fatigue: FatigueState,
  segmentType: "CLIMB" | "FLAT" | "DESCENT",
  positionInSegment: number, // 0-1
): number {
  // En montée : fatigue musculaire +++, cardio ++
  if (segmentType === "CLIMB") {
    const muscularImpact = 1 - fatigue.muscular * 0.35
    const cardioImpact = 1 - fatigue.cardiovascular * 0.25
    const glycogenImpact = 0.8 + fatigue.glycogen * 0.2
    // Plus fatigué vers la fin de la montée
    const climbFatigue = 1 - positionInSegment * 0.15
    return basePower * muscularImpact * cardioImpact * glycogenImpact * climbFatigue
  }

  // Sur le plat : cardio ++, neural +
  if (segmentType === "FLAT") {
    const cardioImpact = 1 - fatigue.cardiovascular * 0.3
    const neuralImpact = 1 - fatigue.neural * 0.2
    const glycogenImpact = 0.85 + fatigue.glycogen * 0.15
    return basePower * cardioImpact * neuralImpact * glycogenImpact
  }

  // En descente : quasi pas d'effort
  return basePower * 0.3
}

function getPowerZone(power: number, ftp: number): string {
  if (power < ftp * 0.55) return "z1"
  if (power < ftp * 0.75) return "z2"
  if (power < ftp * 0.9) return "z3"
  if (power < ftp * 1.05) return "z4"
  return "z5"
}

// ============ MODÈLE W' (W Prime) SCIENTIFIQUE ============

/**
 * Modèle de récupération W' basé sur Skiba et al. (2015)
 */
function updateWPrime(currentWPrime: number, maxWPrime: number, power: number, cp: number, duration: number): number {
  if (power > cp) {
    // Dépense de W' : W' = W' - (P - CP) × t
    const expenditure = (power - cp) * duration
    return Math.max(0, currentWPrime - expenditure)
  } else {
    // Régénération de W' : modèle exponentiel DCP (differential critical power)
    const deficit = maxWPrime - currentWPrime
    if (deficit < 1) return maxWPrime

    // Tau de récupération dépend de l'intensité de récupération
    const recoveryIntensity = power / cp // 0-1
    const tau = 546 * Math.exp(-0.01 * (cp - power)) + 316 // Formule Skiba

    // Récupération exponentielle
    const recovery = deficit * (1 - Math.exp(-duration / tau))
    return Math.min(maxWPrime, currentWPrime + recovery)
  }
}

/**
 * Calcule l'impact de W' sur la puissance disponible
 */
function getWPrimeImpact(wPrimePercent: number): number {
  if (wPrimePercent > 0.5) return 1.0 // Aucun impact
  if (wPrimePercent > 0.3) return 0.95 // Léger impact
  if (wPrimePercent > 0.15) return 0.85 // Impact modéré
  return 0.7 // Impact sévère
}

// ============ DISTRIBUTION INTELLIGENTE DE PUISSANCE ============

type PowerEnvelope = {
  descent: { min: number; max: number }
  flat: { min: number; max: number }
  climb: { min: number; max: number }
}

/**
 * Calcule l'enveloppe de puissance réaliste selon le terrain
 */
function calculatePowerEnvelope(ftp: number, targetPower: number): PowerEnvelope {
  return {
    descent: {
      min: 0,
      max: Math.min(50, targetPower * 0.3), // Très peu d'effort en descente
    },
    flat: {
      min: targetPower * 0.85,
      max: targetPower * 1.15,
    },
    climb: {
      min: targetPower * 1.1,
      max: Math.min(ftp * 1.3, targetPower * 1.5), // Limité par physiologie
    },
  }
}

/**
 * Distribue intelligemment la puissance pour atteindre une moyenne cible
 */
function distributePowerAcrossSegments(
  segments: SimSegment[],
  targetAvgPower: number,
  ftp: number,
  wPrime: number,
): number[] {
  const envelope = calculatePowerEnvelope(ftp, targetAvgPower)
  const targetPowers: number[] = []

  // 1. Classification des segments
  const descentSegments = segments.filter((s) => s.type === "DESCENT")
  const flatSegments = segments.filter((s) => s.type === "FLAT")
  const climbSegments = segments.filter((s) => s.type === "CLIMB")

  // 2. Calcul des durées estimées (approximation initiale)
  const totalTime = segments.reduce((acc, s) => {
    // Estimation vitesse selon type
    let estimatedSpeed: number
    if (s.type === "DESCENT") estimatedSpeed = 50 // km/h
    else if (s.type === "FLAT") estimatedSpeed = 35
    else estimatedSpeed = 20 - Math.abs(s.avgGradient) * 1.5
    estimatedSpeed = Math.max(10, estimatedSpeed)

    return acc + (s.lengthM / 1000 / estimatedSpeed) * 3600
  }, 0)

  const descentTime = descentSegments.reduce((acc, s) => acc + (s.lengthM / 1000 / 50) * 3600, 0)
  const flatTime = flatSegments.reduce((acc, s) => acc + (s.lengthM / 1000 / 35) * 3600, 0)
  const climbTime = climbSegments.reduce(
    (acc, s) => acc + (s.lengthM / 1000 / Math.max(10, 20 - Math.abs(s.avgGradient) * 1.5)) * 3600,
    0,
  )

  // 3. Calcul du travail nécessaire
  const targetWork = targetAvgPower * totalTime

  // 4. Attribution descentes (puissance minimale)
  const descentPower = 20 // W en moyenne en descente
  const descentWork = descentPower * descentTime

  // 5. Reste à répartir entre plat et montées
  const remainingWork = targetWork - descentWork

  // 6. Stratégie : montées = effort soutenu, plat = modulation
  const climbPowerRatio = 1.3 // Les montées sont à 130% de la moyenne restante
  const flatPowerRatio = 0.9 // Le plat est à 90%

  // Résolution : climbPower × climbTime + flatPower × flatTime = remainingWork
  // avec climbPower = climbPowerRatio × basePower et flatPower = flatPowerRatio × basePower
  const basePower = remainingWork / (climbPowerRatio * climbTime + flatPowerRatio * flatTime)

  const avgClimbPower = Math.min(ftp * 1.2, basePower * climbPowerRatio)
  const avgFlatPower = basePower * flatPowerRatio

  // 7. Attribution par segment avec variation réaliste
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    let power: number

    if (seg.type === "DESCENT") {
      // Descente : très peu de puissance (coasting + freinage aéro)
      const steepness = Math.abs(seg.avgGradient)
      power = steepness > 5 ? 10 : 30 // Descentes raides = quasi 0W
    } else if (seg.type === "CLIMB") {
      // Montée : fort au début, faible à la fin
      const climbIndex = climbSegments.findIndex((s) => s.id === seg.id)
      const totalClimbs = climbSegments.length
      const positionInClimbs = climbIndex / Math.max(1, totalClimbs - 1)

      // Modulation selon la pente
      const gradientFactor = 1 + Math.min(0.3, seg.avgGradient / 10) // +30% max pour pentes raides

      // Modulation selon position dans les montées (frais au début)
      const freshnessFactor = 1 - positionInClimbs * 0.15 // -15% sur les dernières montées

      // Variation intra-montée (fort au début)
      const intraMountainVariation = 1.1 // On attaque 10% plus fort au début

      power = avgClimbPower * gradientFactor * freshnessFactor * intraMountainVariation
      power = Math.min(ftp * 1.3, power) // Limite physiologique
    } else {
      // Plat : autour de la moyenne avec légère baisse dans la durée
      const flatIndex = flatSegments.findIndex((s) => s.id === seg.id)
      const totalFlats = flatSegments.length
      const positionInFlats = flatIndex / Math.max(1, totalFlats - 1)

      // Baisse progressive (frais au début)
      const temporalFactor = 1 - positionInFlats * 0.1 // -10% vers la fin

      power = avgFlatPower * temporalFactor
    }

    targetPowers.push(power)
  }

  return targetPowers
}

// ============ SEGMENTATION INTELLIGENTE ============

export function intelligentSegmentation(points: [number, number, number][]): SimSegment[] {
  const segments: SimSegment[] = []
  if (points.length < 2) return []

  let currentStartIdx = 0
  let distAcc = 0
  let elevAcc = 0

  // Paramètres de découpage optimisés
  const MAX_SEGMENT_LENGTH = 800 // 800m max pour granularité fine
  const MIN_SEGMENT_LENGTH = 150 // 150m min pour éviter micro-segments

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const segDist = getDistance(prev[0], prev[1], curr[0], curr[1])
    const elevDiff = curr[2] - prev[2]

    distAcc += segDist
    elevAcc += elevDiff

    const currentGradient = distAcc > 0 ? (elevAcc / distAcc) * 100 : 0
    const nextGradient = getPendingGradient(points, i)

    // Critères de découpage intelligents
    const shouldCut =
      distAcc >= MAX_SEGMENT_LENGTH || // Coupe forcée à 800m
      (distAcc >= MIN_SEGMENT_LENGTH && Math.abs(currentGradient - nextGradient) > 2.0) || // Changement de pente
      (distAcc >= MIN_SEGMENT_LENGTH &&
        ((currentGradient > 3 && nextGradient < 1) || // Sortie de montée
          (currentGradient < -2 && nextGradient > -1) || // Sortie de descente
          (Math.abs(currentGradient) < 2 && Math.abs(nextGradient) > 3))) || // Entrée montée/descente
      i === points.length - 1 // Fin du parcours

    if (shouldCut) {
      const segmentPoints = points.slice(currentStartIdx, i + 1)
      const avgGradient = distAcc > 0 ? (elevAcc / distAcc) * 100 : 0

      // Classification terrain
      let type: "CLIMB" | "FLAT" | "DESCENT" = "FLAT"
      if (avgGradient > 2.5) type = "CLIMB"
      else if (avgGradient < -2.5) type = "DESCENT"

      segments.push({
        id: segments.length + 1,
        startKm: 0, // Sera recalculé
        endKm: 0, // Sera recalculé
        lengthM: distAcc,
        avgGradient: Number.parseFloat(avgGradient.toFixed(2)),
        type,
        avgPower: 0,
        avgSpeed: 0,
        duration: 0,
        wPrimeEnd: 0,
        wPrimePercent: 0,
        energyKcal: 0,
        fatigueLevel: 0,
        points: segmentPoints,
      })

      currentStartIdx = i
      distAcc = 0
      elevAcc = 0
    }
  }

  // Recalcul des distances cumulées
  let runningKm = 0
  return segments.map((s) => {
    const start = runningKm
    runningKm += s.lengthM / 1000
    return { ...s, startKm: Number.parseFloat(start.toFixed(3)), endKm: Number.parseFloat(runningKm.toFixed(3)) }
  })
}

// Helper pour détecter changement de pente à venir
function getPendingGradient(points: [number, number, number][], idx: number): number {
  if (idx >= points.length - 4) return 0
  const lookAhead = points.slice(idx, Math.min(idx + 6, points.length))
  if (lookAhead.length < 2) return 0

  const dist = lookAhead.reduce(
    (acc, p, i) => (i === 0 ? 0 : acc + getDistance(lookAhead[i - 1][0], lookAhead[i - 1][1], p[0], p[1])),
    0,
  )
  const elev = lookAhead[lookAhead.length - 1][2] - lookAhead[0][2]
  return dist > 10 ? (elev / dist) * 100 : 0
}

// ============ RECOMMANDATIONS NUTRITION AVANCÉES ============

function generateNutritionPlan(segments: SimSegment[], ftp: number): NutritionPoint[] {
  const nutrition: NutritionPoint[] = []
  let timeElapsed = 0
  let lastGelTime = -1800 // Commence 30min avant (on suppose qu'on a mangé avant)
  let lastBarTime = -3600 // 1h avant
  let lastDrinkTime = -600 // 10min avant
  let cumulativeEnergy = 0

  for (const seg of segments) {
    timeElapsed += seg.duration
    cumulativeEnergy += seg.energyKcal

    const timeSinceLastGel = timeElapsed - lastGelTime
    const timeSinceLastBar = timeElapsed - lastBarTime
    const timeSinceLastDrink = timeElapsed - lastDrinkTime

    const intensityRatio = seg.avgPower / ftp
    const isHighIntensity = intensityRatio > 0.85
    const isModerateIntensity = intensityRatio > 0.7 && intensityRatio <= 0.85

    // Conditions favorables à l'alimentation
    const canEatSolid = seg.avgGradient > -3 && intensityRatio < 1.15 && seg.type !== "DESCENT"
    const canDrink = seg.avgGradient > -5 && intensityRatio < 1.25

    // STRATÉGIE 1 : Gels énergétiques (rapides, 100 kcal)
    // - Tous les 20-25 min en intensité modérée/haute
    // - Tous les 30-35 min en intensité faible
    const gelInterval = isHighIntensity ? 1200 : isModerateIntensity ? 1500 : 2000

    if (canEatSolid && timeSinceLastGel >= gelInterval) {
      nutrition.push({
        segmentId: seg.id,
        distanceKm: Number.parseFloat(seg.startKm.toFixed(2)),
        timeS: Math.floor(timeElapsed),
        type: "GEL",
        calories: 100,
        reason: `${formatTime(timeElapsed)} - Maintien glycogène (${Math.floor(intensityRatio * 100)}% FTP)`,
      })
      lastGelTime = timeElapsed
    }

    // STRATÉGIE 2 : Barres énergétiques (lentes, 200-250 kcal)
    // - Tous les 45-60 min
    // - Priorité sur sections moins intenses
    const barInterval = 2700 // 45 min

    if (canEatSolid && timeSinceLastBar >= barInterval && !isHighIntensity) {
      nutrition.push({
        segmentId: seg.id,
        distanceKm: Number.parseFloat(seg.startKm.toFixed(2)),
        timeS: Math.floor(timeElapsed),
        type: "BAR",
        calories: 220,
        reason: `${formatTime(timeElapsed)} - Recharge solide (endurance)`,
      })
      lastBarTime = timeElapsed
      lastGelTime = timeElapsed // Pas de gel juste après une barre
    }

    // STRATÉGIE 3 : Boisson énergétique (hydratation + glucides, 60-80 kcal)
    // - Toutes les 10-15 min selon intensité
    // - Critique en haute intensité
    const drinkInterval = isHighIntensity ? 600 : 900

    if (canDrink && timeSinceLastDrink >= drinkInterval) {
      const drinkCal = isHighIntensity ? 70 : 60
      nutrition.push({
        segmentId: seg.id,
        distanceKm: Number.parseFloat(seg.startKm.toFixed(2)),
        timeS: Math.floor(timeElapsed),
        type: "DRINK",
        calories: drinkCal,
        reason: `${formatTime(timeElapsed)} - Hydratation${isHighIntensity ? " haute intensité" : ""}`,
      })
      lastDrinkTime = timeElapsed
    }

    // STRATÉGIE 4 : Alimentation préventive avant montées importantes
    // Si grosse montée à venir et >20min depuis dernier apport
    if (seg.type === "FLAT" && timeSinceLastGel > 1200) {
      // Check si montée à venir dans les 2 prochains segments
      const segIndex = segments.findIndex((s) => s.id === seg.id)
      const nextSegs = segments.slice(segIndex + 1, segIndex + 3)
      const hasClimbAhead = nextSegs.some((s) => s.type === "CLIMB" && s.lengthM > 500)

      if (hasClimbAhead && canEatSolid) {
        nutrition.push({
          segmentId: seg.id,
          distanceKm: Number.parseFloat(seg.startKm.toFixed(2)),
          timeS: Math.floor(timeElapsed),
          type: "GEL",
          calories: 100,
          reason: `${formatTime(timeElapsed)} - Préparation montée`,
        })
        lastGelTime = timeElapsed
      }
    }
  }

  return nutrition
}

// Helper pour formater le temps
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}min`
}

// ============ MOTEUR PRINCIPAL ULTRA-RÉALISTE ============

export function runUltraAdvancedSimulation(
  points: [number, number, number][],
  config: SimulationConfig,
): SimulationResult {
  // 1. Segmentation intelligente
  const segments = intelligentSegmentation(points)

  // 2. Calcul physique
  const totalMass = config.user.weight + config.bikeWeight
  const airDensity = getAirDensity(config.temperature)

  // 3. Détermination de la puissance cible
  let targetAvgPower = config.targetMode === "POWER" ? config.targetValue : config.user.ftp * 0.85

  // 4. BOUCLE D'OPTIMISATION pour convergence
  for (let iteration = 0; iteration < 5; iteration++) {
    // A. Distribution intelligente de la puissance
    const targetPowers = distributePowerAcrossSegments(segments, targetAvgPower, config.user.ftp, config.user.wPrime)

    // B. Simulation segment par segment
    let currentWPrime = config.user.wPrime
    let totalTime = 0
    let totalDistance = 0
    let workDone = 0 // kJ
    const timeAtZone = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      let basePower = targetPowers[i]

      // C. Calcul de la fatigue multidimensionnelle
      const fatigueState = calculateAdvancedFatigue(timeAtZone, totalTime, workDone / 1000)

      // D. Position relative dans le segment (pour fatigue intra-segment)
      const segmentIndex = i
      const totalSegments = segments.length
      const positionInRide = segmentIndex / Math.max(1, totalSegments - 1)

      // E. Ajustement selon fatigue
      let adjustedPower = applyFatigueToSegment(basePower, fatigueState, seg.type, positionInRide)

      // F. Ajustement selon W' restant
      const wPrimePercent = currentWPrime / config.user.wPrime
      const wPrimeImpact = getWPrimeImpact(wPrimePercent)
      adjustedPower *= wPrimeImpact

      // G. Contrainte de stratégie (pacing)
      const strategyFactor = getIntensityFactorForSegment(seg.avgGradient, config.strategy)
      adjustedPower *= strategyFactor

      // H. Limites physiologiques absolues
      adjustedPower = Math.max(0, Math.min(adjustedPower, config.user.ftp * 1.5))

      // I. Calcul du vent pour ce segment
      let windComponent = 0
      if (seg.points && seg.points.length >= 2) {
        const bearing = getBearing(
          seg.points[0][0],
          seg.points[0][1],
          seg.points[seg.points.length - 1][0],
          seg.points[seg.points.length - 1][1],
        )
        windComponent = getWindComponent(bearing, config.windDirectionDeg, config.windSpeedKmh / 3.6)
      }

      // J. Résolution vitesse selon puissance
      let speedMs: number
      if (seg.type === "DESCENT" && seg.avgGradient < -3) {
        // En descente raide : vitesse quasi déterminée par la gravité
        speedMs = solveSpeedForPower(
          adjustedPower * 0.5,
          seg.avgGradient,
          totalMass,
          config.cda,
          config.crr,
          airDensity,
          windComponent,
        )
      } else {
        speedMs = solveSpeedForPower(
          adjustedPower,
          seg.avgGradient,
          totalMass,
          config.cda,
          config.crr,
          airDensity,
          windComponent,
        )
      }

      // K. Durée et mise à jour W'
      const duration = seg.lengthM / speedMs
      currentWPrime = updateWPrime(currentWPrime, config.user.wPrime, adjustedPower, config.user.ftp, duration)

      // L. Tracking de zone
      const zone = getPowerZone(adjustedPower, config.user.ftp)
      timeAtZone[zone as keyof typeof timeAtZone] += duration

      // M. Travail total
      workDone += (adjustedPower * duration) / 1000 // kJ

      // N. Sauvegarde des résultats
      seg.avgPower = adjustedPower
      seg.avgSpeed = speedMs * 3.6
      seg.duration = duration
      seg.wPrimeEnd = Math.max(0, currentWPrime)
      seg.wPrimePercent = (seg.wPrimeEnd / config.user.wPrime) * 100
      seg.energyKcal = ((adjustedPower * duration) / 1000) * 1.1 // Efficacité ~22%
      seg.fatigueLevel = (fatigueState.muscular + fatigueState.cardiovascular + fatigueState.neural) / 3

      totalTime += duration
      totalDistance += seg.lengthM
    }

    // O. Vérification convergence (mode vitesse uniquement)
    if (config.targetMode === "SPEED") {
      const avgSpeed = totalDistance / 1000 / (totalTime / 3600)
      const speedError = config.targetValue - avgSpeed

      if (Math.abs(speedError) < 0.2) {
        break // Convergé
      }

      // Ajustement pour prochaine itération
      targetAvgPower *= 1 + (speedError / config.targetValue) * 0.4
      targetAvgPower = Math.max(100, Math.min(targetAvgPower, config.user.ftp * 1.3))
    } else {
      // Mode puissance : une seule itération suffit
      break
    }
  }

  // 5. Calcul des métriques finales
  const totalTime = segments.reduce((a, s) => a + s.duration, 0)
  const totalWork = segments.reduce((a, s) => a + (s.avgPower * s.duration) / 1000, 0) // kJ
  const totalDist = segments.reduce((a, s) => a + s.lengthM, 0) / 1000
  const avgPower = (totalWork * 1000) / totalTime

  // Normalized Power (NP) - Formule exacte
  const np = Math.pow(
    segments.reduce((sum, s) => sum + Math.pow(s.avgPower, 4) * s.duration, 0) / totalTime,
    0.25,
  )

  // TSS (Training Stress Score)
  const intensityFactor = np / config.user.ftp
  const tss = ((totalTime * np * intensityFactor) / (config.user.ftp * 3600)) * 100

  // 6. Plan de nutrition
  const nutritionPoints = generateNutritionPlan(segments, config.user.ftp)

  return {
    segments,
    nutritionPoints,
    summary: {
      totalTime,
      avgSpeed: totalDist / (totalTime / 3600),
      avgPower,
      normalizedPower: np,
      tss,
      totalWork: totalWork * 0.239006, // kJ -> kcal
      wPrimeDepleted: segments.some((s) => s.wPrimeEnd <= 100),
      failurePointKm: segments.find((s) => s.wPrimeEnd <= 100)?.startKm,
    },
  }
}