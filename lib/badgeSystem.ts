import { ActivityCardData } from '../types/next-auth'; 

export interface Badge {
  label: string;
  color: string;
  icon?: string;
  category: 'distance' | 'elevation' | 'special' | 'HT' | 'intensity';
}

const COLORS = {
    CYAN: '#00F5FF',
    MINT: '#00FF8F',
    ORANGE_VIF: '#ff9d00ff',
    MAGENTA: '#FF00E0',
    LIME: '#00FFBF',
    AMBER: '#ffa200ff',
    PINK: '#FF0066',
    PURPLE_NEON: '#C900FF',
    RED: '#FF0033',
    SWEETSPOT: '#ff8400ff',
    TEMPO: '#FFB800',
    GREEN_Z2: '#00FF88',
    RECUP: '#00fff7ff'
};

// --- HELPER DÉTECTION ZWIFT ---
const isActivityVirtual = (activity: Partial<ActivityCardData> | any): boolean => {
    return activity.type === 'VirtualRide' || 
           (activity.name && (activity.name.toLowerCase().includes('zwift') || activity.name.toLowerCase().includes('virtual')));
};

// --- 1. INTENSITÉ (TSS/h) ---
const getIntensityBadge = (tss: number, durationSeconds: number): Badge | null => {
    // Si durée absente ou < 3 min, on ignore
    if (!durationSeconds || durationSeconds < 180) return null; 

    const durationHours = durationSeconds / 3600;
    const tssPerHour = tss / durationHours;

    if (tssPerHour >= 90) return { label: 'Intense', color: COLORS.RED, category: 'intensity' };
    if (tssPerHour >= 70) return { label: 'SweetSpot', color: COLORS.SWEETSPOT, category: 'intensity' };
    if (tssPerHour >= 55) return { label: 'Tempo', color: COLORS.TEMPO, category: 'intensity' };
    if (tssPerHour >= 40) return { label: 'Z2', color: COLORS.GREEN_Z2, category: 'intensity' };
    
    return { label: 'Récup', color: COLORS.RECUP, category: 'intensity' };
};

// --- 2. GÉNÉRATEUR STANDARD ---
export const generateActivityBadges = (activity: Partial<ActivityCardData> | any): Badge[] => {
    const badges: Badge[] = [];
    const isVirtual = isActivityVirtual(activity);
    
    // Badge Type (Seulement si HT)
    if (isVirtual) {
        badges.push({ label: 'Home Trainer', color: COLORS.PURPLE_NEON, category: 'HT' });
    } 
    
    // Badges Terrain (Seulement si Extérieur)
    if (!isVirtual) {
        if (activity.distance_km) {
            if (activity.distance_km < 50) badges.push({ label: 'Courte', color: COLORS.CYAN, category: 'distance' });
            else if (activity.distance_km < 100) badges.push({ label: 'Moyenne', color: COLORS.MINT, category: 'distance' });
            else if (activity.distance_km < 250) badges.push({ label: 'Longue', color: COLORS.ORANGE_VIF, category: 'distance' });
            else badges.push({ label: 'Ultra', color: COLORS.MAGENTA, category: 'distance' });
        }
        
        if (activity.elevation_gain_m && activity.distance_km) {
            const ratio = activity.elevation_gain_m / activity.distance_km;
            if (ratio < 10) badges.push({ label: 'Plate', color: COLORS.LIME, category: 'elevation' });
            else if (ratio < 20) badges.push({ label: 'Accidentée', color: COLORS.AMBER, category: 'elevation' });
            else badges.push({ label: 'Montagne', color: COLORS.PINK, category: 'elevation' });
        }
    }

    // Badge Intensité (POUR TOUT LE MONDE)
    const intensityBadge = getIntensityBadge(activity.tss ?? 0, activity.duration_s ?? 0);
    if (intensityBadge) {
        badges.push(intensityBadge);
    }

    return badges;
};

// --- 3. DÉTECTEUR DE RECORDS (AVEC FILTRE VIRTUEL) ---
export const detectRecordBadges = (activity: ActivityCardData, allActivities: ActivityCardData[]): Badge[] => {
    const badges: Badge[] = [];
    if (!allActivities || allActivities.length === 0) return badges;

    // Seuils
    const MIN_WATTS = 200;      
    const MIN_SPEED = 28;       
    const MIN_DIST = 150;       
    const MIN_ELEV = 1500;      
    const MIN_TSS = 250; 

    // Calcul des Max
    // Pour la puissance et le TSS, on prend tout le monde (HT inclus)
    const longRides = allActivities.filter(a => (a.duration_s ?? 0) >= 3600);
    const maxPower = Math.max(...longRides.map(a => a.avg_power_w ?? 0));
    const maxTSS = Math.max(...allActivities.map(a => a.tss ?? 0));

    // Pour Vitesse / Distance / Dénivelé, on ne compare qu'avec les sorties RÉELLES
    const realRides = allActivities.filter(a => !isActivityVirtual(a));
    const maxSpeed = Math.max(...realRides.map(a => a.avg_speed_kmh ?? 0));
    const maxDist = Math.max(...realRides.map(a => a.distance_km ?? 0));
    const maxElev = Math.max(...realRides.map(a => a.elevation_gain_m ?? 0));

    // --- ATTRIBUTION ---

    // ⚡ Watt Max (Valide pour tous)
    if ((activity.avg_power_w ?? 0) >= maxPower && maxPower > MIN_WATTS && (activity.duration_s ?? 0) >= 3600) 
        badges.push({ label: 'Watt Max', color: '#FF3C00', icon: '⚡', category: 'special' });
    
    // 💪 Tu stresses ? (Valide pour tous)
    if ((activity.tss ?? 0) >= maxTSS && maxTSS > MIN_TSS)
        badges.push({ label: 'Tu stresses ?', color: '#7c3aed', icon: '💪', category: 'special' });

    // ⛔ LES SUIVANTS SONT INTERDITS AU HOME TRAINER VIA LE FILTRE isVirtual
    const isVirtual = isActivityVirtual(activity);
    
    if (!isVirtual) {
        // 🚀 Fusée
        if ((activity.avg_speed_kmh ?? 0) >= maxSpeed && maxSpeed > MIN_SPEED)
            badges.push({ label: 'Fusée', color: '#00FF87', icon: '🚀', category: 'special' });

        // 🏆 ULTRAA
        if ((activity.distance_km ?? 0) >= maxDist && maxDist > MIN_DIST)
            badges.push({ label: 'ULTRAA', color: '#00B4D8', icon: '🏆', category: 'special' });

        // ⛰️ Grimpette
        if ((activity.elevation_gain_m ?? 0) >= maxElev && maxElev > MIN_ELEV)
            badges.push({ label: 'Grimpette', color: '#F77F00', icon: '⛰️', category: 'special' });
    }

    return badges;
};

export const SPECIAL_BADGES_MAP = new Map<string, Badge>([
  ['power', { label: 'Watt Max', color: '#FF3C00', icon: '⚡', category: 'special' }],
  ['speed', { label: 'Fusée', color: '#00FF87', icon: '🚀', category: 'special' }],
  ['distance', { label: 'ULTRAA', color: '#00B4D8', icon: '🏆', category: 'special' }],
  ['elevation', { label: 'Grimpette', color: '#F77F00', icon: '⛰️', category: 'special' }],
  ['tss', { label: 'Tu stresses ?', color: '#7c3aed', icon: '💪', category: 'special' }],
]);