// Fichier : app/api/activities/upload/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient"; 
import { DOMParser } from '@xmldom/xmldom';
import polyline from '@mapbox/polyline';
// Assure-toi que cette fonction existe bien dans lib/physics, sinon copie-la
import { calculateMaxAveragePower } from "../../../../lib/physics";
import { scanActivityAgainstAllSegments } from "../../../../lib/segmentScanner"; // Mettre cet import tout en haut du fichier

// --- HELPERS PHYSIQUES LOCAUX ---

const getDist = (pt1: number[], pt2: number[]) => {
  const R = 6371e3; 
  const φ1 = pt1[1] * Math.PI/180;
  const φ2 = pt2[1] * Math.PI/180;
  const Δφ = (pt2[1]-pt1[1]) * Math.PI/180;
  const Δλ = (pt2[0]-pt1[0]) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const rollingAverage = (data: number[], windowSize: number) => {
    const result: number[] = []; 
    for (let i = 0; i < data.length; i++) {
        let sum = 0;
        let count = 0;
        for (let j = 0; j < windowSize; j++) {
            if (i - j >= 0) {
                sum += data[i - j];
                count++;
            }
        }
        result.push(sum / count);
    }
    return result;
};

const calculateNP = (watts: number[]) => {
    if (!watts || watts.length === 0) return null;
    const rolling30 = rollingAverage(watts, 30);
    const pow4 = rolling30.map(w => Math.pow(w, 4));
    const avgPow4 = pow4.reduce((a, b) => a + b, 0) / pow4.length;
    return Math.round(Math.pow(avgPow4, 0.25));
};

const getTagValue = (node: any, tagName: string): number | null => {
    let els = node.getElementsByTagName(tagName);
    if (els.length > 0) return parseFloat(els[0].textContent || "0");
    const allTags = node.getElementsByTagName("*");
    for (let i = 0; i < allTags.length; i++) {
        if (allTags[i].tagName.endsWith(`:${tagName}`) || allTags[i].tagName === tagName) {
            return parseFloat(allTags[i].textContent || "0");
        }
    }
    return null;
};

// --- ROUTE API ---
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const userId = session.user.id;

    // 1. Récupération Fichier (Compatible Next.js App Router)
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

    // 2. Profil utilisateur (pour FTP/Poids)
    const { data: userProfile } = await supabaseAdmin
        .from("users")
        .select("ftp, weight")
        .eq("id", userId)
        .single();
    
    const userFTP = userProfile?.ftp || 200;

    // 3. Parsing GPX
    const text = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    
    const trkpts = xmlDoc.getElementsByTagName("trkpt");
    if (trkpts.length === 0) {
        return NextResponse.json({ error: "GPX invalide (pas de points)" }, { status: 400 });
    }

    // --- EXTRACTION STREAMS ---
    const streams = {
        lat: [] as number[],
        lng: [] as number[],
        ele: [] as number[],
        time: [] as number[],
        watts: [] as number[],
        hr: [] as number[],
        cad: [] as number[],
        dist: [] as number[],
        relTime: [] as number[]
    };

    let totalDist = 0;
    let movingTime = 0;
    let totalElev = 0;
    let maxSpeed = 0;
    
    const speedBuffer: number[] = [];
    const SMOOTHING_WINDOW = 5;

    let sumWatts = 0;
    let countWatts = 0;
    
    const firstTimeNode = trkpts[0].getElementsByTagName("time")[0];
    const startTime = new Date(firstTimeNode?.textContent || new Date().toISOString()).getTime();
    
    // Init Point 0
    let prevLat = parseFloat(trkpts[0].getAttribute("lat") || "0");
    let prevLng = parseFloat(trkpts[0].getAttribute("lon") || "0");
    let prevEle = parseFloat(trkpts[0].getElementsByTagName("ele")[0]?.textContent || "0");
    let prevTime = startTime;

    // Variables pour le lissage D+ (Hysteresis)
    let refEle = prevEle; 
    const ELEV_THRESHOLD = 3.0; 

    streams.lat.push(prevLat);
    streams.lng.push(prevLng);
    streams.ele.push(prevEle);
    streams.time.push(startTime);
    streams.dist.push(0);
    streams.relTime.push(0);
    
    let w0 = getTagValue(trkpts[0], "power") || getTagValue(trkpts[0], "watts") || 0;
    streams.watts.push(w0);
    if(w0 > 0) { sumWatts += w0; countWatts++; }
    streams.hr.push(getTagValue(trkpts[0], "hr") || 0);
    streams.cad.push(getTagValue(trkpts[0], "cad") || 0);
    
    // Boucle sur les points
    for (let i = 1; i < trkpts.length; i++) {
        const pt = trkpts[i];
        
        const timeTag = pt.getElementsByTagName("time")[0];
        if (!timeTag) continue;
        const time = new Date(timeTag.textContent || "").getTime();
        const dt = (time - prevTime) / 1000; 

        if (dt <= 0) continue;

        const lat = parseFloat(pt.getAttribute("lat") || "0");
        const lng = parseFloat(pt.getAttribute("lon") || "0");
        const eleTag = pt.getElementsByTagName("ele")[0];
        const ele = eleTag ? parseFloat(eleTag.textContent || "0") : prevEle;

        const watts = getTagValue(pt, "power") || getTagValue(pt, "watts") || 0;
        const hr = getTagValue(pt, "hr") || getTagValue(pt, "heartrate") || 0;
        const cad = getTagValue(pt, "cad") || getTagValue(pt, "cadence") || 0;

        // Physique
        const dist = getDist([prevLng, prevLat], [lng, lat]);
        const speed = dist / dt; 

        if (speed < 42) { // Filtre aberrations > 150km/h
            totalDist += dist;
            if (speed > 0.5) movingTime += dt;

            speedBuffer.push(speed);
            if (speedBuffer.length > SMOOTHING_WINDOW) speedBuffer.shift();
            const smoothedSpeed = speedBuffer.reduce((a, b) => a + b, 0) / speedBuffer.length;
            if (smoothedSpeed > maxSpeed) maxSpeed = smoothedSpeed;
        }

        // Correction D+
        const diffEle = ele - refEle;
        if (diffEle > ELEV_THRESHOLD) {
            totalElev += diffEle;
            refEle = ele; 
        } else if (diffEle < -ELEV_THRESHOLD) {
            refEle = ele; 
        }

        // Ajout Streams
        streams.lat.push(lat);
        streams.lng.push(lng);
        streams.ele.push(ele);
        streams.time.push(time);
        streams.dist.push(parseFloat(totalDist.toFixed(1)));
        streams.relTime.push((time - startTime) / 1000);
        
        streams.watts.push(watts);
        if (watts > 0) { sumWatts += watts; countWatts++; }

        streams.hr.push(hr);
        streams.cad.push(cad);

        prevLat = lat; prevLng = lng; prevEle = ele; prevTime = time;
    }

    // --- 4. CALCULS AGRÉGÉS ---
    
    const totalDuration = (prevTime - startTime) / 1000;
    const activeDuration = (movingTime > totalDuration * 0.1) ? movingTime : totalDuration;
    
    const avgSpeed = activeDuration > 0 ? (totalDist / 1000) / (activeDuration / 3600) : 0;
    const avgPower = countWatts > 0 ? Math.round(sumWatts / countWatts) : null;
    const avgHr = streams.hr.some(h => h > 0) ? Math.round(streams.hr.reduce((a,b)=>a+b,0) / streams.hr.filter(h=>h>0).length) : null;
    const maxHr = streams.hr.some(h => h > 0) ? Math.max(...streams.hr) : null;
    // NP & TSS
    const np = countWatts > 0 ? calculateNP(streams.watts) : null;
    
    let tss: number | null = null;
    let intensityFactor: number | null = null;

    if (np && userFTP > 0) {
        intensityFactor = np / userFTP;
        tss = Math.round((activeDuration * np * intensityFactor) / (userFTP * 3600) * 100);
    }

    // --- 5. DÉTECTION DOUBLONS ---
    const timeMargin = 30 * 60 * 1000; 
    const minDate = new Date(startTime - timeMargin).toISOString();
    const maxDate = new Date(startTime + timeMargin).toISOString();

    const { data: duplicates } = await supabaseAdmin
        .from("activities")
        .select("id, distance_km")
        .eq("user_id", userId)
        .gte("start_time", minDate)
        .lte("start_time", maxDate);

    if (duplicates && duplicates.length > 0) {
        const isDuplicate = duplicates.some(d => Math.abs((d.distance_km || 0) - (totalDist / 1000)) < 1.0);
        if (isDuplicate) return NextResponse.json({ error: "Cette activité existe déjà." }, { status: 409 });
    }

    // --- 6. SAUVEGARDE ---
    const polylinePoints = streams.lat.map((lat, i) => [lat, streams.lng[i]]);
    // @ts-ignore
    const encodedPolyline = polyline.encode(polylinePoints);

    // Structure Streams optimisée (undefined si vide pour économiser BDD)
    const streamsDataBDD = {
        time: streams.relTime,
        distance: streams.dist,
        altitude: streams.ele,
        latlng: streams.lat.map((lat, i) => [lat, streams.lng[i]]),
        watts: countWatts > 0 ? streams.watts : undefined,
        heartrate: streams.hr.some(h => h > 0) ? streams.hr : undefined,
        cadence: streams.cad.some(c => c > 0) ? streams.cad : undefined,
    };

    const { data: activityData, error } = await supabaseAdmin
      .from("activities")
      .insert({
        user_id: userId,
        name: file.name.replace('.gpx', '').replace('.GPX', ''),
        type: 'Ride',
        strava_id: null, // C'est un upload manuel
        
        distance_km: parseFloat((totalDist / 1000).toFixed(2)),
        elevation_gain_m: Math.round(totalElev),
        duration_s: Math.round(activeDuration),
        start_time: new Date(startTime).toISOString(),
        
        avg_speed_kmh: parseFloat(avgSpeed.toFixed(1)),
        max_speed_kmh: parseFloat((maxSpeed * 3.6).toFixed(1)),
        
        avg_power_w: avgPower,
        avg_heartrate: avgHr, // 🔥 Stocké en dur !
        max_heart_rate: maxHr,
        np_w: np,
        tss: tss,
        intensity_factor: intensityFactor ? parseFloat(intensityFactor.toFixed(2)) : null,
        
        polyline: { polyline: encodedPolyline },
        streams_data: streamsDataBDD 
      })
      .select('id') // 🔥 On sélectionne l'ID explicitement
      .single();

    if (error) throw error;

    // 🔥 DÉCLENCHEMENT SEGMENT MATCHING (CORRIGÉ)
    // On utilise l'URL complète via NEXTAUTH_URL ou une URL relative si fetch interne supporté
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    fetch(`${baseUrl}/api/segments/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Utilisation de activityData.id
        body: JSON.stringify({ mode: 'activity', id: activityData.id }) 
    }).catch(err => console.error("Segment matching trigger failed", err));

    scanActivityAgainstAllSegments(activityData.id)
        .then(res => console.log(`Segments scannés pour l'activité ${activityData.id}: ${res.matchesFound} trouvés`))
        .catch(err => console.error("Erreur scan segments upload:", err));

    // --- 7. RECORDS (Power Curve) ---
    if (countWatts > 0) {
        const durations = [
            { s: 1, type: "P1s" }, { s: 5, type: "P5s" }, { s: 30, type: "P30s" },
            { s: 60, type: "P1m" }, { s: 180, type: "CP3" }, { s: 300, type: "CP5" },
            { s: 600, type: "CP10" }, { s: 720, type: "CP12" }, { s: 1200, type: "CP20" },
            { s: 1800, type: "CP30" }, { s: 3600, type: "CP60" }
        ];

        const recordsToInsert: any[] = [];
        for (const dur of durations) {
            const maxValue = calculateMaxAveragePower(streams.watts, streams.relTime, dur.s);
            if (maxValue !== null && maxValue > 0) {
                recordsToInsert.push({
                    user_id: userId,
                    activity_id: activityData.id,
                    type: dur.type,
                    duration_s: dur.s,
                    value: maxValue,
                    date_recorded: new Date(startTime).toISOString(),
                });
            }
        }
        if (recordsToInsert.length > 0) {
            await supabaseAdmin.from("records").insert(recordsToInsert);
        }
    }

    return NextResponse.json({ success: true, activityId: activityData.id });

  } catch (err: any) {
    console.error("Upload GPX Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}