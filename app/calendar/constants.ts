import { ShopEffect } from "./types";

export const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]

export const PUNCHLINES = {
  ZERO: {
    PUNCH: ["Ton vélo demande si tu l'as oublié.", "Le repos c'est bien, mais là c'est trop.", "Ta chaîne rouille tranquillement."],
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
  // --- 1. TRAIL (Plaisir Immédiat / Avancé) ---
  { id: "bubbles", slot: "TRAIL", name: "Bulles", description: "Des bulles s'élèvent doucement.", price: 60, preview: "🫧", colors: ["#00f3ff", "#ffffff"], requiresActivity: true },
  { id: "snow", slot: "TRAIL", name: "Blizzard", description: "Flocons de neige tombants.", price: 70, preview: "❄️", colors: ["#fff", "#a5f3fc"], requiresActivity: true },
  { id: "leaf_trail", slot: "TRAIL", name: "Feuilles d'Automne", description: "Feuilles tombantes derrière le curseur.", price: 80, preview: "🍂", colors: ["#8B4513", "#D2691E", "#FFD700"], requiresActivity: true },
  { id: "firetrail", slot: "TRAIL", name: "Traînée de Feu", description: "Des flammes suivent votre curseur.", price: 90, preview: "🔥", colors: ["#ff4500", "#ffa500"], requiresActivity: true },
  { id: "lightning", slot: "TRAIL", name: "Haute Tension", description: "Arcs électriques erratiques.", price: 100, preview: "⚡", colors: ["#fff", "#ffff00"], requiresActivity: true },
  { id: "sparks_trail", slot: "TRAIL", name: "Étincelles", description: "Traînée d'étincelles orange/jaune.", price: 120, preview: "✨", colors: ["#ffa500", "#ffff00"], requiresActivity: true },
  { id: "matrix", slot: "TRAIL", name: "Matrix", description: "Pluie de code binaire.", price: 150, preview: "01", colors: ["#00ff00", "#003300"], requiresActivity: true },
  { id: "reindeer_trail", slot: "TRAIL", name: "Traîneau du Père Noël", description: "Traînée avec empreintes de rennes.", price: 350, preview: "🦌", colors: ["#8B4513", "#D2691E"], requiresActivity: true },
  { id: "magic_dust", slot: "TRAIL", name: "Poussière d'Étoile", description: "La magie de Noël suit votre souris.", price: 400, preview: "✨", colors: ["#ffd700", "#ff0000", "#fff"], requiresActivity: true },
  { id: "power_up_trail", slot: "TRAIL", name: "Power Ups", description: "Plume, Van et Aéro tombent de votre souris.", price: 600, preview: "🪶", colors: ["#0099ff", "#ff6600", "#cc00ff"], requiresActivity: false },
  { id: "sakura_trail", slot: "TRAIL", name: "Sillage Sakura", description: "Des fleurs naissent sous votre souris.", price: 850, preview: "🍃", colors: ["#ffb7b2", "#ff69b4"], requiresActivity: true },
  { id: "comet_trail", slot: "TRAIL", name: "Comète", description: "Une vraie comète avec sa traînée.", price: 950, preview: "☄️", colors: ["#00ffff", "#ffffff"], requiresActivity: false },
  { id: "tiny_herd_trail", slot: "TRAIL", name: "Troupeau Galopant", description: "File de moutons avec animations individuelles", price: 1200, preview: "🐑🐑🐑", colors: ["#ffffff"], requiresActivity: true },
  { id: "ghost_peloton", slot: "TRAIL", name: "Peloton Fantôme", description: "Des âmes cyclistes vous suivent.", price: 2500, preview: "👻", colors: ["rgba(255,255,255,0.4)"], requiresActivity: false },

  // --- 2. INTERACTION (Plaisir Immédiat / Avancé / Pro) ---
  { id: "leaf_storm", slot: "INTERACTION", name: "Vent d'Automne", description: "Une bourrasque de feuilles.", price: 400, preview: "🍂", colors: ["#d35400"], cssClass: "anim-shake-leaf", requiresActivity: true },
  { id: "camera_flash", slot: "INTERACTION", name: "Photo Finish", description: "Flash aveuglant de la victoire.", price: 500, preview: "📸", colors: ["#fff"], cssClass: "anim-flash", requiresActivity: true },
  { id: "bell_ring", slot: "INTERACTION", name: "Sonnette", description: "Son de sonnette + onde sonore.", price: 750, preview: "🔔", colors: ["#ffd700"], cssClass: "anim-bell", requiresActivity: true },
  { id: "boing_click", slot: "INTERACTION", name: "Super Rebond", description: "Effet élastique ultra-dynamique", price: 800, preview: "🏈", colors: ["#ffffff"], cssClass: "anim-boing", requiresActivity: true },
  { id: "polar_click", slot: "INTERACTION", name: "Onde Polaire", description: "Choc thermique.", price: 950, preview: "❄️", colors: ["#00ffcc"], cssClass: "anim-polar", requiresActivity: true },
  { id: "confetti", slot: "INTERACTION", name: "Fête", description: "Canon à confettis.", price: 1000, preview: "🎉", colors: ["#d04fd7", "#00f3ff", "#ffd700", "#ef4444"], requiresActivity: true },
  { id: "warp_click", slot: "INTERACTION", name: "Warp Speed", description: "Passage en hyperespace.", price: 1200, preview: "🚀", colors: ["#fff"], cssClass: "anim-warp", requiresActivity: true },
  { id: "explosion", slot: "INTERACTION", name: "Supernova", description: "Explosion stellaire.", price: 1500, preview: "💥", colors: ["#ff0000", "#ffff00", "#ffffff"], requiresActivity: true },
  { id: "shatter", slot: "INTERACTION", name: "Bris de Glace", description: "Explosion de verre.", price: 1800, preview: "🔨", colors: ["#a5f3fc"], cssClass: "anim-shatter", requiresActivity: true },
  { id: "black_hole", slot: "INTERACTION", name: "Trou Noir", description: "Implosion massive.", price: 4000, preview: "⚫", colors: ["#000", "#4b0082"], cssClass: "anim-blackhole", requiresActivity: true },
  { id: "lactic_burn", slot: "INTERACTION", name: "Brûlure Lactique", description: "Flash toxique à l'impact.", price: 4200, preview: "🧪", colors: ["#adff2f", "#32cd32"], cssClass: "anim-acid", requiresActivity: true },
  { id: "gear_shift", slot: "INTERACTION", name: "Changement de Vitesse", description: "Effet mécanique de dérailleur.", price: 4500, preview: "⚙️", colors: ["#333", "#888"], cssClass: "anim-gear", requiresActivity: true },
  { id: "water_drop", slot: "INTERACTION", name: "Goutte d'Eau", description: "Onde pure et zen.", price: 5000, preview: "💧", colors: ["#00bfff"], cssClass: "anim-ripple", requiresActivity: true },


  // --- 3. HOVER (Avancé / Pro) ---
  { id: "glitch_mode", slot: "HOVER", name: "Cyber Glitch", description: "Interférences numériques au survol.", price: 400, preview: "📺", colors: ["#00f3ff"], cssClass: "effect-glitch", requiresActivity: true },
  { id: "sparkle_hover", slot: "HOVER", name: "Paillettes", description: "Étincelles magiques au survol.", price: 550, preview: "🌟", colors: ["#ffd700", "#fff"], cssClass: "effect-sparkle", requiresActivity: true },
  { id: "wind_effect", slot: "HOVER", name: "Effet Vent", description: "Rafales de vent au survol.", price: 600, preview: "💨", colors: ["#a5f3fc"], cssClass: "effect-wind", requiresActivity: true },
  { id: "jelly_hover", slot: "HOVER", name: "Jelly", description: "Texture gélatineuse au survol.", price: 800, preview: "🍮", colors: ["#d04fd7"], cssClass: "effect-rubber", requiresActivity: true },
  { id: "draft_effect", slot: "HOVER", name: "Effet d'Aspiration", description: "Simulation d'aspiration dans la roue.", price: 1000, preview: "🌀", colors: ["#333", "#666"], cssClass: "effect-draft", requiresActivity: true },
  { id: "nebula_hover", slot: "HOVER", name: "Nébuleuse", description: "Gaz interstellaire vivant au survol.", price: 1400, preview: "🌫️", colors: ["#8b5cf6", "#00c8ff"], cssClass: "hover-nebula", requiresActivity: true },
  { id: "carbon_hover", slot: "HOVER", name: "Full Carbon", description: "Texture fibre de carbone tressée au survol.", price: 1800, preview: "🏁", colors: ["#222"], cssClass: "hover-carbon", requiresActivity: true },
  { id: "flashlight", slot: "HOVER", name: "Lampe Torche", description: "Révélez les détails dans le noir.", price: 2000, preview: "🔦", colors: ["#fff"], cssClass: "stealth-mode", requiresActivity: true },
  { id: "kom_hunter", slot: "HOVER", name: "Maillot à Pois", description: "Devenez le roi de la montagne au survol.", price: 3000, preview: "🔴", colors: ["#fff", "#f00"], cssClass: "hover-kom", requiresActivity: true },
  { id: "sakura_wind", slot: "HOVER", name: "Brise de Pétales", description: "Pluie florale en arrière-plan.", price: 3500, preview: "🌸", colors: ["#ffc0cb"], cssClass: "hover-sakura", requiresActivity: true },
  { id: "softness_hover", slot: "HOVER", name: "Tonte Éclair", description: "Animation complète de tonte et repousse", price: 4000, preview: "✂️", colors: ["#ffb6c1", "#ffccd5"], cssClass: "hover-softness", requiresActivity: true },
  { id: "prismatic", slot: "HOVER", name: "Prisme", description: "Reflets diamant réactifs.", price: 6000, preview: "💎", colors: ["#fff", "#00ffff", "#ff00ff"], cssClass: "effect-prism", requiresActivity: true },

  // --- 4. FRAME (Avancé / Pro / Légendaire) ---
  { id: "magma_border", slot: "FRAME", name: "Magma", description: "Bordure en fusion constante.", price: 450, preview: "🌋", colors: ["#ef4444", "#f59e0b"], cssClass: "effect-magma", requiresActivity: true },
  { id: "shiny_card", slot: "FRAME", name: "Holographique", description: "Finition rare 'Carte à collectionner'.", price: 500, preview: "✨", colors: ["#fff"], cssClass: "effect-holo", requiresActivity: true },
  { id: "candy_cane", slot: "FRAME", name: "Sucre d'Orge", description: "Bordure rayée rouge et blanche.", price: 700, preview: "🍬", colors: ["#ff0000", "#fff"], cssClass: "effect-candy", requiresActivity: true },
  { id: "wooly_frame", slot: "FRAME", name: "Laine Vierge", description: "Bordure ultra-douce avec flocons de laine", price: 900, preview: "☁️", colors: ["#f8f8ff"], cssClass: "frame-wooly", requiresActivity: true },
  { id: "forest_frame", slot: "FRAME", name: "Racines", description: "Cadre en bois vivant.", price: 1000, preview: "🪵", colors: ["#3e2723", "#1b5e20"], cssClass: "frame-forest", requiresActivity: true },
  { id: "chain_link", slot: "FRAME", name: "Chaîne de Vélo", description: "Bordure en maillons de chaîne animés.", price: 1400, preview: "⛓️", colors: ["#aaa", "#ddd"], cssClass: "effect-chain", requiresActivity: true },
  { id: "carbon_fiber", slot: "FRAME", name: "Fibre de Carbone", description: "Texture haut de gamme comme les cadres pros.", price: 2000, preview: "🏍️", colors: ["#222", "#444"], cssClass: "frame-carbon", requiresActivity: true },
  { id: "neon_frame", slot: "FRAME", name: "Cadre Néon", description: "Bordure lumineuse cybernétique.", price: 2200, preview: "🟣", colors: ["#d04fd7", "#00f3ff"], cssClass: "effect-neon", requiresActivity: true },
  { id: "sakura_frame", slot: "FRAME", name: "Hanami", description: "Cadre rose pâle apaisant.", price: 2500, preview: "🌸", colors: ["#ffb7b2"], cssClass: "frame-sakura", requiresActivity: true },
  { id: "cosmic_orbit", slot: "FRAME", name: "Orbite", description: "Juste un contour... et un satellite.", price: 3500, preview: "🪐", colors: ["#00f3ff", "#0b0d17"], cssClass: "frame-orbit", requiresActivity: true },
  { id: "team_sky", slot: "FRAME", name: "Équipe Sky", description: "Bordure bleue signature Team Sky.", price: 4000, preview: "💙", colors: ["#00a8e8", "#0056b3"], cssClass: "effect-sky", requiresActivity: true },
  { id: "aurora_frame", slot: "FRAME", name: "Borealis", description: "Bordure de plasma mouvant.", price: 4500, preview: "🌌", colors: ["#10b981", "#8b5cf6"], cssClass: "frame-aurora", requiresActivity: true },
  { id: "pulse", slot: "FRAME", name: "Cardio", description: "Battement synchronisé au cœur.", price: 5000, preview: "❤️", colors: ["#ef4444"], cssClass: "effect-pulse", requiresActivity: true },
  { id: "divine_glow", slot: "FRAME", name: "Aura Divine", description: "Pulsation dorée sacrée.", price: 6500, preview: "🌞", colors: ["#ffd700"], cssClass: "effect-divine", requiresActivity: true },
  { id: "world_champ", slot: "FRAME", name: "Champion du Monde", description: "Les bandes arc-en-ciel légendaires.", price: 12000, preview: "🌈", colors: ["#0055A4", "#EF3340", "#000", "#FFD700", "#009639"], cssClass: "effect-rainbow", requiresActivity: true },

  // --- 5. TODAY (Avancé / Pro / Mythique) ---
  { id: "snow_globe", slot: "TODAY", name: "Boule à Neige", description: "Transforme le jour J en sphère hivernale.", price: 900, preview: "🔮", colors: ["#fff", "#a5f3fc"], cssClass: "today-snowglobe", requiresActivity: false },
  { id: "gift_today", slot: "TODAY", name: "Cadeau du Jour", description: "Case spéciale avec ruban cadeau.", price: 1500, preview: "🎁", colors: ["#ff0000", "#00ff00"], cssClass: "today-gift", requiresActivity: false },
  { id: "start_line", slot: "TODAY", name: "Ligne de Départ", description: "Transforme la case en départ de course.", price: 1800, preview: "🏁", colors: ["#00ff00"], cssClass: "today-start", requiresActivity: false },
  { id: "reactor_today", slot: "TODAY", name: "Réacteur ARC", description: "Transforme la case d'aujourd'hui.", price: 4000, preview: "☢️", colors: ["#00f3ff"], cssClass: "today-reactor", requiresActivity: false },
  { id: "yellow_jersey", slot: "TODAY", name: "Maillot Jaune", description: "L'aura du leader sur la case du jour.", price: 6000, preview: "💛", colors: ["#ffd700"], cssClass: "today-yellow", requiresActivity: false },
  { id: "golden_fleece_today", slot: "TODAY", name: "Toison d'Or Royale", description: "Mouton doré avec couronne et paillettes", price: 8000, preview: "🐑", colors: ["#ffd700"], cssClass: "today-golden-fleece", requiresActivity: false },
  { id: "king_road", slot: "TODAY", name: "Empereur du Bitume", description: "La couronne du leader.", price: 10000, preview: "👑", colors: ["#ffd700"], cssClass: "today-king", requiresActivity: false },
  { id: "hand_of_god", slot: "TODAY", name: "Main de Dieu", description: "Les piliers de la création.", price: 15000, preview: "✋", colors: ["#ff4500", "#4b0082"], cssClass: "today-hand-god", requiresActivity: false },

  // --- 6. AMBIANCE (Pro / Légendaire) ---
  { id: "hell_north", slot: "AMBIANCE", name: "L'Enfer du Nord", description: "Pavés légendaires, boue et gloire.", price: 2000, preview: "🪨", colors: ["#333", "#555"], cssClass: "ambiance-paris-roubaix", requiresActivity: true },
  { id: "night_ride", slot: "AMBIANCE", name: "Nocturne", description: "Mode nuit avec éclairage de vélo.", price: 2200, preview: "🌙", colors: ["#000", "#1a1a2e"], requiresActivity: true },
  { id: "forest_night", slot: "AMBIANCE", name: "Nuit en Forêt", description: "Obscurité et lucioles.", price: 3000, preview: "🌲", colors: ["#051005"], cssClass: "ambiance-forest", requiresActivity: true },
  { id: "smart_analysis", slot: "AMBIANCE", name: "Tactical Visor", description: "Analyse automatique (Grimpeur/Sprinteur).", price: 4000, preview: "🧠", colors: ["#ff4500", "#10b981", "#00f3ff"], requiresActivity: true },
  { id: "velodrome", slot: "AMBIANCE", name: "Vélodrome", description: "Ambiance de piste avec ligne de sprints.", price: 4500, preview: "🏟️", colors: ["#c0c0c0", "#333"], requiresActivity: true },
  { id: "weather_dynamic", slot: "AMBIANCE", name: "Météo Live", description: "Le fond change selon l'heure.", price: 5000, preview: "🌤️", colors: ["#87ceeb", "#1a1a2e"], requiresActivity: false },
  { id: "counting_dreams", slot: "AMBIANCE", name: "Rêverie Nocturne", description: "Ciel étoilé avec moutons sauteurs synchronisés", price: 5500, preview: "🐑", colors: ["#4a69bd"], cssClass: "ambiance-dreams", requiresActivity: true },
  { id: "synthwave_grid", slot: "AMBIANCE", name: "Synthwave 80s", description: "Sunset & Grid.", price: 6000, preview: "👾", colors: ["#ff00ff", "#00ffff"], requiresActivity: false },
  { id: "milky_way", slot: "AMBIANCE", name: "Voie Lactée", description: "Une fenêtre ouverte sur l'univers.", price: 7500, preview: "🌌", colors: ["#050508", "#222"], cssClass: "ambiance-milkyway", requiresActivity: true },
  { id: "aurora_sky", slot: "AMBIANCE", name: "Ciel Polaire", description: "Aurores boréales dynamiques.", price: 9000, preview: "✨", colors: ["#10b981"], cssClass: "ambiance-aurora", requiresActivity: true },
  
  // --- 7. AURA (Mythique) ---
  { id: "endurance_shield_aura", slot: "AURA", name: "Bouclier d'Endurance", description: "Aura dorée pour les sorties supérieures à 150 TSS.", price: 5000, preview: "🛡️", colors: ["#ffd700", "#ff8c00"], cssClass: "aura-endurance-shield", requiresActivity: true },
  { id: "speed_warp_aura", slot: "AURA", name: "Warp Vitesse", description: "Halo de cyan pulsant récompensant la haute vitesse.", price: 7500, preview: "🚀", colors: ["#00f3ff", "#ffffff"], cssClass: "aura-speed-warp", requiresActivity: true },
  
  // --- 8. SPECIAL (Vide pour l'instant) ---
];