// Fichier : app/lib/segmentTags.ts

// Structure des tags manuels
export type TagDefinition = {
    label: string;
    value: string;
    color: string;
    description: string;
};

// Liste des tags additionnels prédéfinis (manuels)
export const PREDEFINED_SEGMENT_TAGS: TagDefinition[] = [
    { label: "Vue Magnifique", value: "VUE_MAGNIFIQUE", color: "#6AA84F", description: "Vaut le détour pour le panorama." },
    { label: "Virages Mythiques", value: "VIRAGES_MYTHIQUES", color: "#00f3ff", description: "Multiples lacets célèbres ou techniques." },
    { label: "Référence TDF", value: "REF_TDF", color: "#d04fd7", description: "Segment utilisé ou rendu célèbre par le Tour de France." },
    { label: "Joyau Caché", value: "JOYAU_CACHE", color: "#FF9900", description: "Ascension peu connue des masses, mais de grande qualité." },
    { label: "Final Cruel", value: "FINAL_CRUEL", color: "#ef4444", description: "Pente brutale dans le dernier kilomètre." },
    { label: "Col Légendaire", value: "COL_LEGENDAIRE", color: "#8B5CF6", description: "Col historique ou très réputé parmi les cyclistes." },
    { label: "Pente Infernale", value: "PENTE_INFERNALE", color: "#DC2626", description: "Rampes très raides et soutenues, exigeantes physiquement." },
    { label: "Route Pavée", value: "ROUTE_PAVEE", color: "#8B4513", description: "Section en pavés ou revêtement irrégulier." },
    { label: "Approche Technique", value: "APPROCHE_TECHNIQUE", color: "#F59E0B", description: "Montée avec enchaînements serrés, chicanes ou descentes techniques avant/ après." },
    { label: "Accessible", value: "COL_ACCESSIBLE", color: "#60A5FA", description: "Montée relativement facile, adaptée à un large public." },
    { label: "Haute Altitude", value: "HAUTE_ALTITUDE", color: "#9333EA", description: "Col situé à haute altitude, conditions météo changeantes." },
    { label: "Boucle mythique", value: "MYTHICAL_BOUCLE", color: "#e621a7ff", description: "Boucle de région bien connue des touristes" },

];

// Couleur spécifique pour les Boucles Mythiques
export const MYTHIC_LOOP_COLOR = '#00f3ff';