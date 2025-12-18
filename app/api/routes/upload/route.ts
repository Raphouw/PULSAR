// Fichier : app/api/routes/upload/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient"; //.js retiré pour propreté
import { DOMParser } from "@xmldom/xmldom";
import toGeoJSON from "@mapbox/togeojson";
import polyline from '@mapbox/polyline'; 

// --- 1. ALGORITHMES PHYSIQUES ---

// Distance (Haversine)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; 
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Lissage des données d'altitude (Moyenne mobile simple)
function smoothElevations(elevations: number[], windowSize = 3): number[] {
    const smoothed: number[] = [];
    for (let i = 0; i < elevations.length; i++) {
        let sum = 0;
        let count = 0;
        // On prend les points autour de i
        for (let j = Math.max(0, i - Math.floor(windowSize / 2)); j <= Math.min(elevations.length - 1, i + Math.floor(windowSize / 2)); j++) {
            sum += elevations[j];
            count++;
        }
        smoothed.push(sum / count);
    }
    return smoothed;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const text = new TextDecoder("utf-8").decode(buffer);
    
    // --- 2. PARSING & VALIDATION ---
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(text, "application/xml");
    const geoJson = toGeoJSON.gpx(gpxDoc);

    // @ts-ignore
    const geometry = geoJson.features?.[0]?.geometry;
    if (!geometry || geometry.type !== "LineString") {
        return NextResponse.json({ error: "Format GPX invalide" }, { status: 400 });
    }

    const coords = geometry.coordinates; // [lon, lat, ele]
    
    // --- 3. ANALYSE DES DONNÉES ---
    
    // Préparation des données brutes
    const rawElevations: number[] = [];
    const pointsForEncoding: [number, number][] = []; // [Lat, Lon] pour Leaflet
    
    let totalDist = 0;

    for (let i = 0; i < coords.length; i++) {
        const [lon, lat, ele] = coords[i];
        
        // Stockage pour encodage
        pointsForEncoding.push([lat, lon]);
        
        // Stockage elevation brute (si dispo, sinon 0)
        rawElevations.push(ele || 0);

        // Calcul Distance cumulée
        if (i > 0) {
            const [prevLon, prevLat] = coords[i-1];
            totalDist += getDistance(prevLat, prevLon, lat, lon);
        }
    }

    // --- 4. CALCUL AVANCÉ D+ / D- (Refonte complète) ---
    
    // Etape A : Lissage du bruit GPS
    const smoothedElevations = smoothElevations(rawElevations, 3);
    
    let totalElePlus = 0;
    let totalEleMinus = 0;
    
    // Etape B : Algorithme à hystérésis (Seuil)
    const ELEVATION_THRESHOLD = 1.5; 
    let currentRefEle = smoothedElevations[0];

    for (let i = 1; i < smoothedElevations.length; i++) {
        const ele = smoothedElevations[i];
        const diff = ele - currentRefEle;

        if (diff > ELEVATION_THRESHOLD) {
            // Montée significative détectée
            totalElePlus += diff;
            currentRefEle = ele; // On remonte le point de référence
        } else if (diff < -ELEVATION_THRESHOLD) {
            // Descente significative détectée
            totalEleMinus += Math.abs(diff);
            currentRefEle = ele; // On descend le point de référence
        }
    }

    // --- 5. FINALISATION ---

    // @ts-ignore
    const encodedPolyline = polyline.encode(pointsForEncoding);
    const distanceKm = parseFloat((totalDist / 1000).toFixed(2));
    const elevationGain = Math.round(totalElePlus);
    const elevationLoss = Math.round(totalEleMinus);
    
    // Vérification doublons
    const { data: potentialDupesData } = await supabaseAdmin
        .from("routes")
        .select("id, distance_km, elevation_gain_m")
        // ⚡ FIX: Conversion Number pour ID si nécessaire, sinon string
        .eq("user_id", session.user.id) 
        .gte("distance_km", distanceKm - 0.1)
        .lte("distance_km", distanceKm + 0.1);

    // ⚡ FIX: Cast en any[] pour lire les propriétés
    const potentialDupes = (potentialDupesData || []) as any[];

    if (potentialDupes.length > 0) {
        for (const dupe of potentialDupes) {
             const eleDiff = Math.abs((dupe.elevation_gain_m || 0) - elevationGain);
             if (eleDiff < 50) { 
                return NextResponse.json({ error: "Doublon détecté", isDuplicate: true }, { status: 409 });
             }
        }
    }

    // Insertion
    // ⚡ FIX: Cast du builder en any pour l'insert
    const { data: routeData, error } = await (supabaseAdmin.from("routes") as any)
      .insert({
        user_id: session.user.id,
        name: file.name.replace(".gpx", ""),
        distance_km: distanceKm,
        elevation_gain_m: elevationGain,
        // Stockage enrichi dans le JSONB
        gpx_data: { 
            type: "Feature", 
            geometry: geometry,
            map_polyline: encodedPolyline,
            elevation_loss_m: elevationLoss 
        }
      })
      .select()
      .single();

    if (error) throw error;

    // ⚡ FIX: Cast du résultat
    const route = routeData as any;

    return NextResponse.json({ route });

  } catch (err: any) {
    console.error("Upload GPX Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}