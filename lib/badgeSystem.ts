import { ActivityCardData } from '../types/next-auth';

export interface Badge {
  label: string;
  color: string;
  icon?: string;
  category: 'distance' | 'elevation' | 'special' | 'HT' | 'intensity';
}

// -----------------------------------------------------------------------------
// 🎨 PALETTE NEON SOFT UNIFIÉE
// -----------------------------------------------------------------------------
const COLORS = {
  // ---- INTENSITÉ (Récup → Intense) ----
  INT_RECUP: '#1FFFE0',      // Cyan néon vif mais lisible
  INT_Z2: '#2BFF88',         // Vert néon franc
  INT_TEMPO: '#FFE066',      // Jaune punchy
  INT_SWEETSPOT: '#FF9F0A',  // Orange néon chaud
  INT_INTENSE: '#FF2D2D',    // Rouge néon saturé maîtrisé

  // ---- DISTANCE (Courte → Ultra) ----
  DIST_SHORT: '#33FFF3',     // Cyan éclatant
  DIST_MEDIUM: '#33FFB5',    // Vert-cyan pop
  DIST_LONG: '#FFB000',      // Orange endurance vif
  DIST_ULTRA: '#B86BFF',     // Violet néon prestige

  // ---- DÉNIVELÉ (Plat → Montagne) ----
  ELEV_FLAT: '#32FF9C',      // Vert clair lumineux
  ELEV_ROLLING: '#FFD23F',   // Jaune-or néon
  ELEV_MOUNTAIN: '#FF7B00',  // Orange montagne saturé

  // ---- HOME TRAINER ----
  HT: '#A855F7',             // Violet néon tech assumé

  // ---- RECORDS / SPECIAL ----
  SPEC_POWER: '#FF3D00',     // Rouge-orangé explosif
  SPEC_TSS: '#8B5CF6',       // Violet néon mental
  SPEC_SPEED: '#1BFFC2',     // Vert vitesse ultra clean
  SPEC_DISTANCE: '#1FB6FF',  // Bleu néon performance
  SPEC_ELEV: '#FF8A00',      // Orange grimpe agressif
};

// -----------------------------------------------------------------------------
// 🔍 HELPER : DÉTECTION HOME TRAINER / VIRTUEL
// -----------------------------------------------------------------------------
const isActivityVirtual = (activity: Partial<ActivityCardData> | any): boolean => {
  return (
    activity.type === 'VirtualRide' ||
    (activity.name &&
      (activity.name.toLowerCase().includes('zwift') ||
        activity.name.toLowerCase().includes('virtual')))
  );
};

// -----------------------------------------------------------------------------
// 🔥 1. INTENSITÉ (TSS / h)
// -----------------------------------------------------------------------------
const getIntensityBadge = (
  tss: number,
  durationSeconds: number
): Badge | null => {
  // Ignore si trop court
  if (!durationSeconds || durationSeconds < 180) return null;

  const durationHours = durationSeconds / 3600;
  const tssPerHour = tss / durationHours;

  if (tssPerHour >= 90)
    return { label: 'Intense', color: COLORS.INT_INTENSE, category: 'intensity' };
  if (tssPerHour >= 70)
    return { label: 'SweetSpot', color: COLORS.INT_SWEETSPOT, category: 'intensity' };
  if (tssPerHour >= 55)
    return { label: 'Tempo', color: COLORS.INT_TEMPO, category: 'intensity' };
  if (tssPerHour >= 40)
    return { label: 'Z2', color: COLORS.INT_Z2, category: 'intensity' };

  return { label: 'Récup', color: COLORS.INT_RECUP, category: 'intensity' };
};

// -----------------------------------------------------------------------------
// 🏷️ 2. GÉNÉRATEUR PRINCIPAL DE BADGES
// -----------------------------------------------------------------------------
export const generateActivityBadges = (
  activity: Partial<ActivityCardData> | any
): Badge[] => {
  const badges: Badge[] = [];
  const isVirtual = isActivityVirtual(activity);

  // --- HOME TRAINER ---
  if (isVirtual) {
    badges.push({
      label: 'Home Trainer',
      color: COLORS.HT,
      category: 'HT',
    });
  }

  // --- DISTANCE & DÉNIVELÉ (EXTÉRIEUR UNIQUEMENT) ---
  if (!isVirtual) {
    if (activity.distance_km) {
      if (activity.distance_km < 50)
        badges.push({ label: 'Courte', color: COLORS.DIST_SHORT, category: 'distance' });
      else if (activity.distance_km < 100)
        badges.push({ label: 'Moyenne', color: COLORS.DIST_MEDIUM, category: 'distance' });
      else if (activity.distance_km < 250)
        badges.push({ label: 'Longue', color: COLORS.DIST_LONG, category: 'distance' });
      else
        badges.push({ label: 'Ultra', color: COLORS.DIST_ULTRA, category: 'distance' });
    }

    if (activity.elevation_gain_m && activity.distance_km) {
      const ratio = activity.elevation_gain_m / activity.distance_km;

      if (ratio < 10)
        badges.push({ label: 'Plate', color: COLORS.ELEV_FLAT, category: 'elevation' });
      else if (ratio < 20)
        badges.push({ label: 'Accidentée', color: COLORS.ELEV_ROLLING, category: 'elevation' });
      else
        badges.push({ label: 'Montagne', color: COLORS.ELEV_MOUNTAIN, category: 'elevation' });
    }
  }

  // --- INTENSITÉ (TOUS TYPES) ---
  const intensityBadge = getIntensityBadge(activity.tss ?? 0, activity.duration_s ?? 0);
  if (intensityBadge) badges.push(intensityBadge);

  return badges;
};

// -----------------------------------------------------------------------------
// 🏆 3. DÉTECTION DE RECORDS
// -----------------------------------------------------------------------------
export const detectRecordBadges = (
  activity: ActivityCardData,
  allActivities: ActivityCardData[]
): Badge[] => {
  const badges: Badge[] = [];
  if (!allActivities || allActivities.length === 0) return badges;

  // --- SEUILS MINIMAUX ---
  const MIN_WATTS = 200;
  const MIN_SPEED = 28;
  const MIN_DIST = 150;
  const MIN_ELEV = 1500;
  const MIN_TSS = 250;

  // --- CALCUL DES MAX ---
  const longRides = allActivities.filter(a => (a.duration_s ?? 0) >= 3600);
  const maxPower = Math.max(...longRides.map(a => a.avg_power_w ?? 0));
  const maxTSS = Math.max(...allActivities.map(a => a.tss ?? 0));

  const realRides = allActivities.filter(a => !isActivityVirtual(a));
  const maxSpeed = Math.max(...realRides.map(a => a.avg_speed_kmh ?? 0));
  const maxDist = Math.max(...realRides.map(a => a.distance_km ?? 0));
  const maxElev = Math.max(...realRides.map(a => a.elevation_gain_m ?? 0));

  // --- ATTRIBUTION ---
  if ((activity.avg_power_w ?? 0) >= maxPower && maxPower > MIN_WATTS && (activity.duration_s ?? 0) >= 3600)
    badges.push({ label: 'Watt Max', color: COLORS.SPEC_POWER, icon: '⚡', category: 'special' });

  if ((activity.tss ?? 0) >= maxTSS && maxTSS > MIN_TSS)
    badges.push({ label: 'Tu stresses ?', color: COLORS.SPEC_TSS, icon: '💪', category: 'special' });

  const isVirtual = isActivityVirtual(activity);

  if (!isVirtual) {
    if ((activity.avg_speed_kmh ?? 0) >= maxSpeed && maxSpeed > MIN_SPEED)
      badges.push({ label: 'Fusée', color: COLORS.SPEC_SPEED, icon: '🚀', category: 'special' });

    if ((activity.distance_km ?? 0) >= maxDist && maxDist > MIN_DIST)
      badges.push({ label: 'ULTRAA', color: COLORS.SPEC_DISTANCE, icon: '🏆', category: 'special' });

    if ((activity.elevation_gain_m ?? 0) >= maxElev && maxElev > MIN_ELEV)
      badges.push({ label: 'Grimpette', color: COLORS.SPEC_ELEV, icon: '⛰️', category: 'special' });
  }

  return badges;
};

// -----------------------------------------------------------------------------
// 🗺️ MAP DES BADGES SPÉCIAUX
// -----------------------------------------------------------------------------
export const SPECIAL_BADGES_MAP = new Map<string, Badge>([
  ['power', { label: 'Watt Max', color: COLORS.SPEC_POWER, icon: '⚡', category: 'special' }],
  ['speed', { label: 'Fusée', color: COLORS.SPEC_SPEED, icon: '🚀', category: 'special' }],
  ['distance', { label: 'ULTRAA', color: COLORS.SPEC_DISTANCE, icon: '🏆', category: 'special' }],
  ['elevation', { label: 'Grimpette', color: COLORS.SPEC_ELEV, icon: '⛰️', category: 'special' }],
  ['tss', { label: 'Tu stresses ?', color: COLORS.SPEC_TSS, icon: '💪', category: 'special' }],
]);
