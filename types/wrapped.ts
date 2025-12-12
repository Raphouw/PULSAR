export interface PowerCurvePoint {
  duration: number;
  watts: number;
  wkg: number;
}

export interface ZoneDistribution {
  zone: string;
  percent: number;
  timeSeconds: number;
}

export interface PMCDataPoint {
  date: string; // "2025-01-01"
  ctl: number;  // Fitness
  atl: number;  // Fatigue
  tsb: number;  // Forme
}

export interface ZoneData {
  zone: string;
  label: string;
  timeSeconds: number;
  percent: number;
  color: string;
  // 🔥 NOUVEAU
  kcal: number; 
}

export interface BestEffort {
  label: string;
  duration: number;
  value: number;
  wkg: number;
  date: string; // On a besoin de la date !
}

export interface MonthlyProgress {
  month: string;
  avgPower: number;
  maxPower: number;
  fitness: number;
  efficiency: number; // 🔥 Ratio Pmoy / FCmoy
}

export interface RawActivity {
  id: number;
  start_time: string; // timestamp without time zone
  duration_s: number;
  distance_km: number | null; // Peut être null en BDD
  elevation_gain_m: number | null;
  avg_power_w: number | null;
  max_speed_kmh: number | null;
  tss: number | null;
  avg_heartrate: number | null;
  np_w?: number;
  type?: string;
}

export interface RawRecord {
  duration_s: number;
  value: number;
  date_recorded: string;
  type?: string;
  // 👇 La relation avec activities
  activities?: {
    start_time: string;
  } | null;
}

export interface UserProfile {
  id: number; // BigInt dans ta BDD
  weight: number;
  ftp: number;
  height: number;
}

export interface HeatmapPoint {
  date: string;
  tss: number;
  intensity: number; // 0 à 1 pour la couleur
}

export interface MonsterRide {
  name: string;
  date: string;
  distance: number;
  elevation: number;
  duration: number;
  tss: number;
  if: number;
  vi: number;
  calories: number;
  avgPower: number;
}

export interface ResilienceData {
  enduranceRatio: number; // CP60 / CP20
  fatigueResistance: number; // Score sur 100
  decayRate: 'STABLE' | 'MODERATE' | 'AGGRESSIVE';
  durabilityRank: string; // "ULTRA-ENDURANCE", "PUNCHEUR", etc.
}

export interface SlopePerformance {
  gradientRange: string;
  avgWatts: number;
  avgWkg: number;
  efficiencyScore: number;
  vam: number;           // 🔥 Vitesse Ascensionnelle Moyenne
  tteSeconds: number;    // 🔥 Time To Exhaustion
}

export interface AeroData {
  estimatedCdA: number;     // ex: 0.38 (standard pour un grand gabarit)
  optimalCdA: number;        // ex: 0.32 (position agressive)
  wattsAt40kmh: number;      // Watts nécessaires pour rouler à 40km/h
  potentialSavings: number;  // Watts économisables
  aeroRank: string;          // "PARPAING", "MÉTÉORE", etc.
}

export interface BiomechData {
  avgCadence: number;
  cadenceStyle: 'GRINDER' | 'NEUTRAL' | 'SPINNER';
  torqueEfficiency: number; // Score simulé d'efficacité
  legLengthFactor: number;   // Impact de tes 1m92 sur le bras de levier
  recommendedCrank: string;  // Recommandation manivelles (ex: 175mm)
}

export interface TerrainProfile {
  climbingRatio: number;
  flatSpeedPotency: number;
  climbingPotency: number;
  sprintPotency: number;      // 🔥 Nouveau : Explosion brute
  specialization: 'PURE_CLIMBER' | 'ROULEUR' | 'PUNCHER' | 'SPRINTER' | 'ALL_ROUNDER';
  terrainVerdict: string;
}

export interface TerritoryStats {
  indoorPercent: number;    // % de Home Trainer
  outdoorPercent: number;   // % de sorties réelles
  explorationScore: number; // Score de diversité des sorties
  maxRadius: number;        // Ta sortie la plus longue (symbole de ton empreinte)
  avgDistance: number;
}

export interface RobustnessData {
  efficiencyDegradation: number; // % de perte d'efficience après 2000kJ
  durabilityScore: number;       // Note sur 100
  powerRetention: number;        // % de puissance maintenue en fin de sortie
  verdict: string;
}

export interface ProComparison {
  metric: string;
  userValue: number;
  proValue: number;
  unit: string;
  percentile: number; // ex: 85 (tu es meilleur que 85% des gens, ou à 85% du niveau pro)
}

export interface ProjectionScenario {
  ftp: number;
  wkg: number;
  label: string;
}

export interface TargetMetric {
  name: string;
  value: number;
  unit: string;
  icon: string;
}

export interface DomainPoint {
  lat: number;
  lng: number;
  radius: number; // Le rayon qui s'agrandit pour l'indoor
}

export interface DomainData {
  paths: [number, number][][]; // Un tableau de tracés (chaque tracé est un tableau de [lat, lng])
  virtualCore: {
    lat: number;
    lng: number;
    radius: number; // Le rayon dynamique pour l'indoor
  };
  totalAreaKm2: number;
}

export interface WrappedStats {
  year: number;
  userName: string;
  userWeight: number;
  userHeight: number;
  ftp: number;
  bestEfforts: BestEffort[];

  // SLIDE 1 : BOOT UP
  phenotype: {
    name: string;
    cp3: number;
    cp12: number;
    cp20: number;
    pmax: number;
    wkgThreshold: number;
    enduranceIndex: number;
    totalLoad: number;
    peakPeriod: { start: string, end: string } | null;
    profileType: 'POLARIZED' | 'PYRAMIDAL' | 'THRESHOLD' | 'HIIT';
    vo2maxAbs: number;    // mL/kg/min (estimé)
    riderLevel: string;   // "ELITE", "PRO", etc.
    totalWorkkJ: number;  // Énergie totale
  };

  domain: DomainData;

  summary: {
    title: string;
    score: number;
    highlight: string;
    specialty: string;
  };

  projection: {
    scenarios: ProjectionScenario[];
    targets: TargetMetric[];
    focusArea: string;
  };

  comparison: {
    radar: ProComparison[];
    overallRank: string; // "WORLD TOUR READY", "ELITE AMATEUR", etc.
    analysis: string;
  };

  evolution: {
    monthly: MonthlyProgress[];
    efficiencyGain: number; // % d'amélioration de l'efficience
    peakMonth: string;
    fitnessGrowth: number;
  };

  robustness: RobustnessData;

  territories: TerritoryStats;

  terrain: TerrainProfile;

  biomech: BiomechData;

  aero: AeroData;


  segPower: {
    performances: SlopePerformance[];
    dominantTerrain: string; // "GRIMPEUR", "ROULEUR", "PUNCHEUR DES MURS"
    bestSlope: string;
  };

  monsterRide: MonsterRide | null;

  resilience: ResilienceData;

 heatmap: {
      points: HeatmapPoint[];
      totalTSS: number;
      bestMonth: { name: string; value: number }; // Objet au lieu de string
      streak: number;
      avgTSSPerRide: number; // 🔥 Nouveau
      avgWeeklyTSS: number;  // 🔥 Nouveau
  };

    pmc: {
    data: PMCDataPoint[];
    maxCTL: number;       // Pic de Fitness
    minTSB: number;       // Plus grosse fatigue
    trainingLoadScore: number; // Score de consistance
    profile: string;      // "SOLIDE", "ERRATIQUE", "PROGRESSIF"
  };
  

  

  // SLIDE 2 : DNA
  powerDNA: {
    neuromuscular: number; // 0-100
    anaerobic: number;
    vo2max: number;
    glycolytic: number;
    oxidative: number;
  };

  // SLIDE 3 : CP HYPERCURVE
  cpCurve: {
    points: PowerCurvePoint[];
    wPrime: number;
    criticalPower: number;
    // 🔥 NOUVEAUX CHAMPS
    wkgCP: number;        // W/kg au CP
    matches: number;      // Nombre d'attaques possibles
    ftpToCpRatio: number; // % du FTP par rapport au CP
  };
  

  // SLIDE 6 : TIME IN ZONE
  tiz: {
      zones: ZoneData[];
      distributionType: 'POLARIZED' | 'PYRAMIDAL' | 'THRESHOLD' | 'HIIT';
      mainZone: string;
      usedFtp: number; // 🔥 Pour afficher la ref
  };

  // SLIDE 12 : AERO ESTIMATOR (Simulé via algo physique)
  

  // SLIDE 20 : EGO DOPA
  superPower: {
    label: string;
    value: string;
    percentile: number;
    rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  };

  // ... Autres données pour les slides 4-19 (on complètera au fur et à mesure)
  count: number;
  totalDistance: number;
  totalElevation: number;

  pacing: {
    avgVI: number;           // Index de Variabilité Moyen (ex: 1.08)
    archetype: string;       // "MÉTRONOME", "PUNCHEUR", etc.
    pacingScore: number;     // Note sur 100
    perfectRide: {           // La sortie la plus régulière > 1h
       date: string;
       name: string; // "Sortie du 12 Juillet"
       vi: number;
       dist: number;
    } | null;
  };
}