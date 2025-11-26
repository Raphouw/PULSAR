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
{ id: "neon_frame", name: "Cadre Néon", description: "Bordure lumineuse cybernétique.", price: 3500, type: "passive", preview: "🟣", colors: ["#d04fd7", "#00f3ff"], owned: false, cssClass: "effect-neon" },
  { id: "mercury_border", name: "Mercure T-1000", description: "Bordure en métal liquide mouvant.", price: 20000, type: "passive", preview: "💧", colors: ["#silver", "#ffffff"], owned: false, cssClass: "effect-mercury" },
  { id: "divine_glow", name: "Aura Divine", description: "Pulsation dorée sacrée.", price: 20000, type: "passive", preview: "🌞", colors: ["#ffd700"], owned: false, cssClass: "effect-divine" },
  {
    id: "shiny_card",
    name: "Holographique",
    description: "Finition rare 'Carte à collectionner'.",
    price: 100,
    type: "passive",
    preview: "✨",
    colors: ["#fff"],
    owned: false,
    cssClass: "effect-holo"
  },
   {
    id: "magma_border",
    name: "Magma",
    description: "Bordure en fusion constante.",
    price: 80,
    type: "passive",
    preview: "🌋",
    colors: ["#ef4444", "#f59e0b"],
    owned: false,
    cssClass: "effect-magma"
  },
  {
    id: "glitch_mode",
    name: "Cyber Glitch",
    description: "La carte tremble au survol.",
    price: 50,
    type: "passive",
    preview: "📺",
    colors: ["#00f3ff"],
    owned: false,
    cssClass: "effect-glitch"
  },
  
  // --- SLOT FOND (Passifs Ambiance) ---
  { id: "weather_dynamic", name: "Météo Live", description: "Le fond change selon l'heure.", price: 50000, type: "passive", preview: "🌤️", colors: ["#87ceeb", "#1a1a2e"], owned: false },
  { id: "smart_analysis", name: "Tactical Visor", description: "Analyse la stat dominante (IA).", price: 30000, type: "passive", preview: "🧠", colors: ["#ff4500", "#10b981", "#00f3ff"], owned: false },
  
  // --- SPÉCIAL ---
  { id: "reactor_today", name: "Réacteur ARC", description: "Transforme la case d'aujourd'hui.", price: 50000, type: "passive", preview: "☢️", colors: ["#00f3ff"], owned: false },
  { id: "pulse", name: "Cardio", description: "Battement synchronisé.", price: 15000, type: "card", preview: "❤️", colors: ["#ef4444"], owned: false },

  // --- SLOT HOVER (Survol) ---
  { id: "prismatic", name: "Prisme", description: "Reflets diamant réactifs.", price: 40000, type: "hover", preview: "💎", colors: ["#fff", "#00ffff", "#ff00ff"], owned: false, cssClass: "effect-prism" },
  { id: "flashlight", name: "Lampe Torche", description: "Révélez les détails dans le noir.", price: 15000, type: "hover", preview: "🔦", colors: ["#fff"], owned: false },
  {
    id: "firetrail",
    name: "Traînée de Feu",
    description: "Des flammes suivent votre curseur.",
    price: 75,
    type: "hover",
    preview: "🔥",
    colors: ["#ff4500", "#ffa500"],
    owned: false,
  },

   {
    id: "snow",
    name: "Blizzard",
    description: "Flocons de neige tombants.",
    price: 60,
    type: "hover",
    preview: "❄️",
    colors: ["#fff", "#a5f3fc"],
    owned: false,
  },

   {
    id: "matrix",
    name: "Matrix",
    description: "Pluie de code binaire.",
    price: 120,
    type: "hover",
    preview: "01",
    colors: ["#00ff00", "#003300"],
    owned: false,
  },
   {
    id: "bubbles",
    name: "Bulles",
    description: "Des bulles s'élèvent doucement.",
    price: 55,
    type: "hover",
    preview: "🫧",
    colors: ["#00f3ff", "#ffffff"],
    owned: false,
  },
    {
    id: "lightning",
    name: "Haute Tension",
    description: "Arcs électriques erratiques.",
    price: 90,
    type: "hover",
    preview: "⚡",
    colors: ["#fff", "#ffff00"],
    owned: false,
  },

  // --- SLOT CLIC (Interaction) ---
  { id: "shatter", name: "Bris de Glace", description: "Explosion de verre.", price: 12000, type: "flip", preview: "🔨", colors: ["#a5f3fc"], owned: false },
  { id: "black_hole", name: "Trou Noir", description: "Implosion massive.", price: 25000, type: "flip", preview: "⚫", colors: ["#000", "#4b0082"], owned: false },
  { id: "explosion", name: "Supernova", description: "Explosion stellaire.", price: 12000, type: "flip", preview: "💥", colors: ["#ff0000", "#ffff00", "#ffffff"], owned: false },
  { id: "confetti", name: "Fête", description: "Canon à confettis.", price: 8000, type: "flip", preview: "🎉", colors: ["#d04fd7", "#00f3ff", "#ffd700", "#ef4444"], owned: false },
  { id: "rubber_click", name: "Jelly", description: "Rebond élastique.", price: 4500, type: "click", preview: "🍮", colors: ["#d04fd7"], owned: false, cssClass: "effect-rubber" },
  { id: "shockwave_click", name: "Onde de Choc", description: "Impact puissant.", price: 8000, type: "click", preview: "🌊", colors: ["#00f3ff"], owned: false, cssClass: "effect-shockwave" },

]