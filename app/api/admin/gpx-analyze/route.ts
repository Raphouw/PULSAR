// Fichier : app/api/admin/gpx-analyze/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth'; 
import GpxParser from 'gpxparser';
import polyline from '@mapbox/polyline';

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const isAdmin = userId === '1' || userId === '2';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    // 2. LECTURE DIRECTE DU TEXTE (Bye bye FormData parser error!)
    // On attend du texte brut, pas du multipart
    const gpxContent = await req.text();

    if (!gpxContent || gpxContent.trim().length === 0) {
      return NextResponse.json({ error: 'Contenu GPX vide.' }, { status: 400 });
    }

    // 3. PARSING
    const gpx = new GpxParser();
    gpx.parse(gpxContent);

    if ((!gpx.tracks || gpx.tracks.length === 0) && (!gpx.routes || gpx.routes.length === 0)) {
       return NextResponse.json({ error: 'Fichier GPX invalide (pas de trace).' }, { status: 400 });
    }

    const track = (gpx.tracks && gpx.tracks.length > 0) ? gpx.tracks[0] : gpx.routes[0];
    const points = track.points;

    if (!points || points.length === 0) {
      return NextResponse.json({ error: 'Aucun point GPS trouvé.' }, { status: 400 });
    }

    // 4. CALCULS
    const distanceKm = track.distance.total / 1000;
    const elevationGain = track.elevation.pos;
    const startLat = points[0].lat;
    const startLon = points[0].lon;

    // 5. ENCODAGE POLYLINE
    // Subsampling pour performance (1 point sur ~2000 total)
    const rawCoordinates = points.map(p => [p.lat, p.lon] as [number, number]);
    let simplifiedCoordinates = rawCoordinates;
    
    if (rawCoordinates.length > 5000) {
        const step = Math.ceil(rawCoordinates.length / 2000);
        simplifiedCoordinates = rawCoordinates.filter((_, index) => index % step === 0);
    }

    const encodedPolyline = polyline.encode(simplifiedCoordinates);

    return NextResponse.json({
      success: true,
      data: {
        distance_km: parseFloat(distanceKm.toFixed(2)),
        elevation_gain_m: Math.round(elevationGain),
        start_lat: startLat,
        start_lon: startLon,
        polyline: encodedPolyline,
      }
    });

  } catch (error: any) {
    console.error('Erreur API GPX Analyze:', error);
    return NextResponse.json({ error: `Erreur serveur: ${error.message}` }, { status: 500 });
  }
}