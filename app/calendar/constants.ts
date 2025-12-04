import { ShopEffect } from "./types";

export const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
]

export const PUNCHLINES = {
  ZERO: {
    PUNCH: [
      "Ton vélo demande si tu l'as oublié.",
      "Le repos c'est bien, mais là c'est trop.",
      "Ta chaîne rouille tranquillement.",
    ],
    MOTIV: ["Une sortie aujourd'hui change tout.", "Le retour sera satisfaisant.", "Reprends la route maintenant."],
    EGG: "Ton home-trainer est sur Leboncoin.",
  },
  LOW_VIBE: {
    PUNCH: ["Tu roules en mode économie d'énergie.", "C'est du roulage tranquille.", "Les watts se font discrets."],
    MOTIV: ["Continue, ça va revenir.", "La base se construit.", "Accroche-toi."],
    EGG: "Un KOM a tremblé 3 secondes.",
  },
  REGULAR: {
    PUNCH: ["Métronome humain efficace.", "Du solide sans chichi.", "Régularité suisse."],
    MOTIV: ["Continue, ça paie.", "Le FTP grimpe doucement.", "Excellent rythme."],
    EGG: "Un métronome t'admire.",
  },
  BIG_TSS: {
    PUNCH: ["TSS de fou furieux.", "Tu t'entraînes ou tu fuis?", "Vingegaard appellerait ça intense."],
    MOTIV: ["Gère la récup maintenant.", "Tu construis du moteur.", "Continue malin."],
    EGG: "Ton TSS repéré sur Mars.",
  },
  ELEV_HIGH: {
    PUNCH: ["Les marmottes te connaissent.", "Champion de l'altitude.", "Les cols tremblent."],
    MOTIV: ["Cuisses en titane garanties.", "VO2max en feu.", "Continue à grimper."],
    EGG: "Un chamois a ragequit.",
  },
  ELEV_LOW: {
    PUNCH: ["Le plat c'est ton royaume.", "Allergique aux côtes?", "Gravité = 1, Toi = 0."],
    MOTIV: ["Rouleur pur et dur.", "Aéro avant tout.", "Efficacité maximale."],
    EGG: "C'était ton D+ ou un dos d'âne?",
  },
  BIG_DIST: {
    PUNCH: ["Wahoo demande si t'es perdu.", "Ultra endurance activée.", "Forrest Gump mode vélo."],
    MOTIV: ["Endurance légendaire.", "Moteur hybride humain.", "Le mental en acier."],
    EGG: "Ton compteur veut un passeport.",
  },
  HIGH_WATTS: {
    PUNCH: ["Watt monster détecté.", "Tu alimentes une Tesla.", "FTP patrimoine UNESCO."],
    MOTIV: ["Puissance pure brute.", "Moteur terrifiant.", "Continue de pousser."],
    EGG: "On a cru que t'avais un moteur.",
  },
  HR_VIBE: {
    PUNCH: ["Zen absolu à vélo.", "Moine tibétain cycliste.", "Coma cycliste proche."],
    MOTIV: ["Le cœur se renforce.", "Zone rouge maîtrisée.", "Continue d'oser."],
    EGG: "FC comme un feu arrière USB.",
  },
  SPEED_VIBE: {
    PUNCH: ["Visite guidée à vélo.", "Documentaire faune & flore.", "Les moustiques s'accrochent."],
    MOTIV: ["Fusée en lycra.", "Machine sur le plat.", "Vitesse impressionnante."],
    EGG: "Un scooter a porté plainte.",
  },
  ALT_MAX: {
    PUNCH: ["Aucun chamois aperçu.", "Le trottoir = sommet.", "Randonnée fluviale."],
    MOTIV: ["Tu vas chercher l'altitude.", "Globules en formation.", "Mental béton armé."],
    EGG: "Un aigle a hoché la tête.",
  },
  VOLUME_MONTH: {
    PUNCH: ["Calendrier de l'Avent cycliste.", "Strava croit au changement de sport.", "Moustique > Toi en activité."],
    MOTIV: ["Rythme de guerrier.", "Discipline d'athlète.", "Fréquence incroyable."],
    EGG: "Ton garage propose la fidélité.",
  },
}

export const SHOP_EFFECTS: ShopEffect[] = [
  // --- SLOT: FRAME (Bordures & Apparence de la case) ---
  // Une seule bordure à la fois !
  { 
    id: "neon_frame", 
    slot: "FRAME",
    name: "Cadre Néon", 
    description: "Bordure lumineuse cybernétique.", 
    price: 350, 
    preview: "🟣", 
    colors: ["#d04fd7", "#00f3ff"], 
    cssClass: "effect-neon",
    requiresActivity: true 
  },
  { 
    id: "mercury_border", 
    slot: "FRAME",
    name: "Mercure T-1000", 
    description: "Bordure en métal liquide mouvant.", 
    price: 2000, 
    preview: "💧", 
    colors: ["#silver", "#ffffff"], 
    cssClass: "effect-mercury",
    requiresActivity: true 
  },
  { 
    id: "magma_border", 
    slot: "FRAME",
    name: "Magma", 
    description: "Bordure en fusion constante.", 
    price: 80, 
    preview: "🌋", 
    colors: ["#ef4444", "#f59e0b"], 
    cssClass: "effect-magma",
    requiresActivity: true 
  },
  { 
    id: "divine_glow", 
    slot: "FRAME",
    name: "Aura Divine", 
    description: "Pulsation dorée sacrée.", 
    price: 2000, 
    preview: "🌞", 
    colors: ["#ffd700"], 
    cssClass: "effect-divine",
    requiresActivity: true 
  },
  {
    id: "pulse",
    slot: "FRAME", // J'ai déplacé Pulse en FRAME car c'est un effet visuel permanent
    name: "Cardio",
    description: "Battement synchronisé au cœur.",
    price: 1500,
    preview: "❤️",
    colors: ["#ef4444"],
    cssClass: "effect-pulse",
    requiresActivity: true
  },
  {
    id: "glitch_mode",
    slot: "FRAME",
    name: "Cyber Glitch",
    description: "La carte tremble au survol.",
    price: 50,
    preview: "📺",
    colors: ["#00f3ff"],
    cssClass: "effect-glitch",
    requiresActivity: true
  },
  {
    id: "shiny_card",
    slot: "FRAME",
    name: "Holographique",
    description: "Finition rare 'Carte à collectionner'.",
    price: 100,
    preview: "✨",
    colors: ["#fff"],
    cssClass: "effect-holo",
    requiresActivity: true
  },

  // --- SLOT: HOVER (Survol Souris) ---
  // Un seul effet de curseur/survol à la fois
  { 
    id: "prismatic", 
    slot: "HOVER",
    name: "Prisme", 
    description: "Reflets diamant réactifs.", 
    price: 4000, 
    preview: "💎", 
    colors: ["#fff", "#00ffff", "#ff00ff"], 
    cssClass: "effect-prism",
    requiresActivity: true 
  },
  { 
    id: "flashlight", 
    slot: "HOVER",
    name: "Lampe Torche", 
    description: "Révélez les détails dans le noir.", 
    price: 1500, 
    preview: "🔦", 
    colors: ["#fff"], 
    cssClass: "stealth-mode", // Attention, flashlight utilise une logique JS + CSS
    requiresActivity: true 
  },
  {
    id: "firetrail",
    slot: "HOVER",
    name: "Traînée de Feu",
    description: "Des flammes suivent votre curseur.",
    price: 75,
    preview: "🔥",
    colors: ["#ff4500", "#ffa500"],
    requiresActivity: true
  },
  {
    id: "snow",
    slot: "HOVER",
    name: "Blizzard",
    description: "Flocons de neige tombants.",
    price: 60,
    preview: "❄️",
    colors: ["#fff", "#a5f3fc"],
    requiresActivity: true
  },
  {
    id: "lightning",
    slot: "HOVER",
    name: "Haute Tension",
    description: "Arcs électriques erratiques.",
    price: 90,
    preview: "⚡",
    colors: ["#fff", "#ffff00"],
    requiresActivity: true
  },
  {
    id: "bubbles",
    slot: "HOVER",
    name: "Bulles",
    description: "Des bulles s'élèvent doucement.",
    price: 55,
    preview: "🫧",
    colors: ["#00f3ff", "#ffffff"],
    requiresActivity: true
  },
  {
    id: "matrix",
    slot: "HOVER",
    name: "Matrix",
    description: "Pluie de code binaire.",
    price: 120,
    preview: "01",
    colors: ["#00ff00", "#003300"],
    requiresActivity: true
  },

  // --- SLOT: INTERACTION (Clic) ---
  // Un seul effet de clic à la fois
  { 
    id: "shatter", 
    slot: "INTERACTION",
    name: "Bris de Glace", 
    description: "Explosion de verre.", 
    price: 1200, 
    preview: "🔨", 
    colors: ["#a5f3fc"],
    requiresActivity: true 
  },
  { 
    id: "black_hole", 
    slot: "INTERACTION",
    name: "Trou Noir", 
    description: "Implosion massive.", 
    price: 2500, 
    preview: "⚫", 
    colors: ["#000", "#4b0082"],
    requiresActivity: true 
  },
  { 
    id: "explosion", 
    slot: "INTERACTION",
    name: "Supernova", 
    description: "Explosion stellaire.", 
    price: 1200, 
    preview: "💥", 
    colors: ["#ff0000", "#ffff00", "#ffffff"],
    requiresActivity: true 
  },
  { 
    id: "confetti", 
    slot: "INTERACTION",
    name: "Fête", 
    description: "Canon à confettis.", 
    price: 800, 
    preview: "🎉", 
    colors: ["#d04fd7", "#00f3ff", "#ffd700", "#ef4444"],
    requiresActivity: true 
  },
  { 
    id: "rubber_click", 
    slot: "INTERACTION",
    name: "Jelly", 
    description: "Rebond élastique.", 
    price: 450, 
    preview: "🍮", 
    colors: ["#d04fd7"], 
    cssClass: "effect-rubber",
    requiresActivity: true 
  },
  { 
    id: "shockwave_click", 
    slot: "INTERACTION",
    name: "Onde de Choc", 
    description: "Impact puissant.", 
    price: 800, 
    preview: "🌊", 
    colors: ["#00f3ff"], 
    cssClass: "effect-shockwave",
    requiresActivity: true 
  },

  // --- SLOT: AMBIANCE (Passifs globaux) ---
  { 
    id: "weather_dynamic", 
    slot: "AMBIANCE",
    name: "Météo Live", 
    description: "Le fond change selon l'heure.", 
    price: 5000, 
    preview: "🌤️", 
    colors: ["#87ceeb", "#1a1a2e"],
    requiresActivity: false 
  },
  { 
    id: "smart_analysis", 
    slot: "AMBIANCE",
    name: "Tactical Visor", 
    description: "Analyse automatique (Grimpeur/Sprinteur).", 
    price: 3000, 
    preview: "🧠", 
    colors: ["#ff4500", "#10b981", "#00f3ff"],
    requiresActivity: true 
  },

  // --- SLOT: TODAY (Unique) ---
  { 
    id: "reactor_today", 
    slot: "TODAY",
    name: "Réacteur ARC", 
    description: "Transforme la case d'aujourd'hui.", 
    price: 5000, 
    preview: "☢️", 
    colors: ["#00f3ff"], 
    cssClass: "today-reactor",
    requiresActivity: false 
  },
];