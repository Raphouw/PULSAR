import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const segmentId = searchParams.get('segment_id');

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!segmentId) return NextResponse.json({ error: "Segment ID manquant" }, { status: 400 });

  try {
    // 1. TOP 50 GLOBAL
    const { data: rawGlobalData, error: globalError } = await supabaseAdmin
      .from('activity_segments')
      .select(`
        id,
        activity_id,
        duration_s,
        avg_power_w,
        avg_heartrate,
        rank_global,
        created_at,
        start_index,   
        end_index,     
        vam,           
        w_kg,          
        avg_speed_kmh, 
        users (
            name,
            id
        ),
        activities (
            start_time
        )
      `)
      .eq('segment_id', segmentId)
      .eq('is_pr', true)
      .order('duration_s', { ascending: true })
      .limit(50);

    if (globalError) throw globalError;

    const uniqueGlobalData: any[] = [];
    const seenUserIds = new Set();

    if (rawGlobalData) {
        for (const row of rawGlobalData) {
            // @ts-ignore
            const uId = row.users?.id;
            
            if (uId && !seenUserIds.has(uId)) {
                seenUserIds.add(uId);
                uniqueGlobalData.push(row);
            }
            if (uniqueGlobalData.length >= 10) break;
        }
    }

    // 2. TOP 5 PERSONNEL
    let personalData: any[] = [];
    if (userId) {
        const { data: perso, error: persoError } = await supabaseAdmin
        .from('activity_segments')
        .select(`
            id,
            activity_id,
            duration_s,
            avg_power_w,
            avg_heartrate,
            rank_personal,
            created_at,
            start_index,   
            end_index,     
            vam,           
            w_kg,          
            avg_speed_kmh, 
            activities (
                start_time
            )
        `)
        .eq('segment_id', segmentId)
        .eq('user_id', userId)
        .order('duration_s', { ascending: true })
        .limit(5);
        
        if (!persoError) personalData = perso || [];
    }

    return NextResponse.json({ 
        global: uniqueGlobalData, 
        personal: personalData 
    });

  } catch (err: any) {
    console.error("Leaderboard Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}