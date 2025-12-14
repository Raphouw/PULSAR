// Fichier : app/api/routing/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coordinates = searchParams.get('coords');

  if (!coordinates) {
    return NextResponse.json({ error: 'Coordonnées manquantes' }, { status: 400 });
  }

  // URL OSRM (Demo Server)
  const osrmUrl = `https://router.project-osrm.org/route/v1/bike/${coordinates}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(osrmUrl, {
      headers: {
        // Important: Certains serveurs bloquent les requêtes sans User-Agent
        'User-Agent': 'PulsarApp/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur OSRM distante:', response.status, errorText);
      throw new Error(`OSRM Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('Erreur Proxy Routing Serveur:', error.message);
    return NextResponse.json({ error: 'Echec du calcul d\'itinéraire', details: error.message }, { status: 500 });
  }
}