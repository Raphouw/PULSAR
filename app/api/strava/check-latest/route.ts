// Fichier : app/api/strava/check-latest/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { fetchNewStravaActivities, importActivities } from "../import/route";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { analyzeAndSaveActivity } from '../../../../lib/analysisEngine'; 

export const dynamic = 'force-dynamic';

async function getStravaStreams(activityId: number, accessToken: string) {
  try {
    const types = ['time', 'distance', 'latlng', 'altitude', 'watts', 'heartrate', 'cadence', 'temp'].join(',');
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=${types}&key_by_type=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error(`❌ Erreur streams ${activityId}:`, e);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const userId = session.user.id;
    if (!session.access_token) return NextResponse.json({ message: "Pas de token" });

    const newActivities = await fetchNewStravaActivities(userId, session.access_token);

    if (newActivities.length === 0) {
      return NextResponse.json({ success: true, imported: 0, message: "À jour.", hasStrava: true });
    }

    const importResult = await importActivities(userId, newActivities);

    const { data: userProfile } = await supabaseAdmin.from('users').select('weight, ftp').eq('id', userId).single();
    
    let analyzedCount = 0;
    let totalBrokenRecords: any[] = [];

    const analysisPromises = newActivities.map(async (stravaActivity: any) => {
        try {
            const { data: dbActivity } = await supabaseAdmin
                .from('activities').select('id').eq('strava_id', stravaActivity.id).single();

            if (!dbActivity) return;

            const rawStreams = await getStravaStreams(stravaActivity.id, session.access_token!);

            if (rawStreams) {
                const extract = (key: string): number[] => {
                    if (rawStreams[key]?.data) return rawStreams[key].data;
                    if (Array.isArray(rawStreams)) return rawStreams.find((s: any) => s.type === key)?.data || [];
                    return [];
                };
                const cleanStreams = {
                    time: extract('time'), distance: extract('distance'), altitude: extract('altitude'),
                    latlng: extract('latlng'), watts: extract('watts'), heartrate: extract('heartrate'),
                    cadence: extract('cadence'), temp: extract('temp'),
                };

                // --- CORRECTION TYPE ---
                let avgPower: number | null = null;
                
                if (cleanStreams.watts.length > 0) {
                    avgPower = Math.round(cleanStreams.watts.reduce((a, b) => a + b, 0) / cleanStreams.watts.length);
                }

                await supabaseAdmin.from('activities')
                    .update({ streams_data: cleanStreams, avg_power_w: avgPower })
                    .eq('id', dbActivity.id);

                const result = await analyzeAndSaveActivity(
                    dbActivity.id, 
                    stravaActivity.id, 
                    cleanStreams, 
                    userProfile?.weight || 75, 
                    userProfile?.ftp || 250
                );

                if (result.success) {
                    analyzedCount++;
                    if (result.brokenRecords?.length > 0) totalBrokenRecords.push(...result.brokenRecords);
                }
            }
        } catch (err) {
            console.error(`❌ Erreur analyse ${stravaActivity.name}:`, err);
        }
    });

    await Promise.all(analysisPromises);

    return NextResponse.json({ 
      ...importResult, 
      analyzed: analyzedCount,
      brokenRecords: totalBrokenRecords,
      message: `+${importResult.imported} activités.`,
      hasStrava: true 
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}