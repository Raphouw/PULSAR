// Fichier : lib/simulation-strategies.ts

export type PacingStrategyType = "RACE" | "Z2_ENDURANCE" | "SWEETSPOT" | "CONSTANT" | "HILL_CLIMB"

export interface PacingFactor {
  uphill: number // Multiplicateur d'effort en montée (>3%)
  flat: number // Multiplicateur sur le plat
  downhill: number // Multiplicateur en descente (<-3%)
  steep: number // Multiplicateur murs (>8%)
  descend_limit: number // Pente à partir de laquelle on arrête de pédaler (ex: -5%)
}

export const PACING_STRATEGIES: Record<PacingStrategyType, PacingFactor> = {
  RACE: {
    uphill: 1.2, // On appuie fort
    steep: 1.4, // On attaque les murs
    flat: 0.95, // On gère sur le plat
    downhill: 0.1, // On récupère ou tuck
    descend_limit: -3,
  },
  Z2_ENDURANCE: {
    uphill: 1.05, // On lisse, pas d'a-coups
    steep: 1.05,
    flat: 0.7, // Zone 2 classique
    downhill: 0.6, // On continue de tourner les jambes pour le volume
    descend_limit: -6,
  },
  SWEETSPOT: {
    uphill: 0.95, // Juste sous le seuil
    steep: 1.0,
    flat: 0.88, // Tempo haut
    downhill: 0,
    descend_limit: -4,
  },
  HILL_CLIMB: {
    uphill: 1.3, // Tout pour la montée
    steep: 1.5,
    flat: 0.6, // Récup sur le plat
    downhill: 0,
    descend_limit: -2,
  },
  CONSTANT: {
    // Mode ISO-Power théorique
    uphill: 1,
    steep: 1,
    flat: 1,
    downhill: 1,
    descend_limit: -100, // On pédale tout le temps
  },
}

/**
 * Calcule le facteur d'intensité pour un segment donné selon la stratégie
 */
export function getIntensityFactorForSegment(gradient: number, strategy: PacingStrategyType): number {
  const pacing = PACING_STRATEGIES[strategy]

  if (gradient < pacing.descend_limit) return 0 // Roue libre
  if (gradient < -1) return pacing.downhill // Faux plat descendant
  if (gradient > 8) return pacing.steep // Mur
  if (gradient > 2) return pacing.uphill // Montée
  return pacing.flat // Plat
}