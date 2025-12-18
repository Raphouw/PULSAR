// Fichier : app/api/events/weather/fetch/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseAdminClient';

export async function POST(req: Request) {
  try {
    const { eventId, latitude, longitude, date } = await req.json();

    if (!eventId || !latitude || !longitude || !date) {
      return NextResponse.json({ status: 'error', message: 'Paramètres manquants' }, { status: 400 });
    }
    
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
        return NextResponse.json({ status: 'error', message: 'Coordonnées de l événement sont invalides.' }, { status: 400 });
    }
    const simpleDate = date.split('T')[0];
    
    // 1. Appel Open-Meteo API
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto&start_date=${simpleDate}&end_date=${simpleDate}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Gère les erreurs de date hors limites de l'API externe
        if (errorData.reason && (errorData.reason.includes('Date') || errorData.reason.includes('forecast'))) {
            return NextResponse.json({ status: 'unavailable', reason: errorData.reason });
        }
        return NextResponse.json({ status: 'unavailable', reason: `Erreur HTTP ${response.status} ou API hors limites.` });
    }

    const data = await response.json();

    if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
         return NextResponse.json({ status: 'unavailable' });
    }

    // 2. Formatage
    const weatherData = {
        tempMax: data.daily.temperature_2m_max[0],
        tempMin: data.daily.temperature_2m_min[0],
        windSpeed: data.daily.wind_speed_10m_max[0],
        rain: data.daily.precipitation_sum[0],
        code: data.daily.weather_code[0]
    };

    // 🔥 ÉTAPE CRITIQUE : ARCHIVAGE DE LA MÉTÉO DANS LA BDD
    // ⚡ FIX: On cast le builder en any pour débloquer l'update
    const { error: updateError } = await (supabaseAdmin.from('events') as any)
        .update({ final_weather_json: weatherData }) // Stocke l'objet JSON formaté
        .eq('id', eventId);
        
    if (updateError) {
        console.error("Erreur d'archivage météo BDD:", updateError);
        // On continue même en cas d'erreur BDD, pour ne pas casser l'affichage en direct
    }

    return NextResponse.json({ status: 'success', weatherData });

  } catch (error: any) {
    console.error('Weather API Error:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}