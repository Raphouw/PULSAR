//app/api/activities/missing-streams/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient.js";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // On regarde si "force=true" est passé dans l'URL (optionnel)
  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get('force') === 'true';

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  let query = supabaseAdmin
    .from("activities")
    .select("id, strava_id, name, start_time")
    .eq("user_id", session.user.id)
    .gte("start_time", ninetyDaysAgo.toISOString())
    .not("strava_id", "is", null)
    .order("start_time", { ascending: false });

  // 🔥 MODIFICATION : Par défaut, on ne prend QUE ce qui manque (streams_data est NULL)
  // Si forceRefresh est false (défaut), on filtre.
  if (!forceRefresh) {
    query = query.is("streams_data", null);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    count: data.length, 
    activities: data 
  });
}