import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "./../../lib/supabaseAdminClient.js";
import { redirect } from "next/navigation";
import ActivityClient from "./activityClient";
import { ActivityCardData } from '../../types/next-auth.d';

const ACTIVITIES_PER_PAGE = 50000;

async function getActivities(userId: string, page: number): Promise<{ activities: ActivityCardData[], totalActivities: number }> {
  const startIndex = (page - 1) * ACTIVITIES_PER_PAGE;
  const endIndex = startIndex + ACTIVITIES_PER_PAGE - 1;

  const activitiesPromise = supabaseAdmin
    .from("activities")
    .select(
      "id, name, distance_km, elevation_gain_m, start_time, avg_speed_kmh, avg_power_w, tss, polyline, duration_s, type"
    )
    .eq("user_id", userId)
    .order("start_time", { ascending: false })
    .range(startIndex, endIndex);

  const countPromise = supabaseAdmin
    .from("activities")
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const [activitiesRes, countRes] = await Promise.all([activitiesPromise, countPromise]);

  if (activitiesRes.error) {
    console.error("Erreur de récupération des activités:", activitiesRes.error.message);
    return { activities: [], totalActivities: 0 };
  }

  return {
    activities: (activitiesRes.data as ActivityCardData[]) || [],
    totalActivities: countRes.count ?? 0,
  };
}

// 🔥 CORRECTION : Redirection vers signin au lieu de "/"
export default async function ActivitiesPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { searchParams } = props;

  const resolved = await searchParams;
  const pageParam = resolved.page;
  const currentPage = parseInt(pageParam as string) || 1;

  const session = await getServerSession(authOptions);
  
  // 🔥 CORRECTION ICI : Rediriger vers /auth/signin au lieu de "/"
  if (!session || !session.user?.id) {
    redirect("/auth/signin");
  }

  const { activities, totalActivities } = await getActivities(session.user.id, currentPage);
  const totalPages = Math.ceil(totalActivities / ACTIVITIES_PER_PAGE);

  return (
    <ActivityClient
      initialActivities={activities}
      session={session}
      currentPage={currentPage}
      totalPages={totalPages}
    />
  );
}