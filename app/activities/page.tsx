//fichier app/activities/page.tsx

import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "./../../lib/supabaseAdminClient";
import { redirect } from "next/navigation";
import ActivityClient from "./activityClient";
import { ActivityCardData } from '../../types/next-auth.d';

const ACTIVITIES_PER_PAGE = 50000;

async function getActivities(userId: string | number, page: number): Promise<{ activities: ActivityCardData[], totalActivities: number }> {
  const startIndex = (page - 1) * ACTIVITIES_PER_PAGE;
  const endIndex = startIndex + ACTIVITIES_PER_PAGE - 1;
  
  // ⚡ FIX: Conversion de l'ID en nombre pour la cohérence BDD
  const dbUserId = Number(userId);

  // 🚀 OPTIMISATION : Syntaxe Promise.all plus directe et propre
  const [activitiesRes, countRes] = await Promise.all([
    supabaseAdmin
      .from("activities")
      .select("id, name, distance_km, elevation_gain_m, start_time, avg_speed_kmh, avg_power_w, tss, polyline, duration_s, type")
      .eq("user_id", dbUserId)
      .order("start_time", { ascending: false })
      .range(startIndex, endIndex),
    supabaseAdmin
      .from("activities")
      .select('id', { count: 'exact', head: true })
      .eq('user_id', dbUserId)
  ]);

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
  // 🚀 OPTIMISATION : Parallélisation racine (Session + SearchParams)
  const [resolvedParams, session] = await Promise.all([
    props.searchParams,
    getServerSession(authOptions)
  ]);

  if (!session) {
    redirect("/auth/signin");
  }

  // ⚡ FIX : Fallback email cohérent avec le reste de l'application
  let userId: string | number | undefined = session.user?.id;
  
  if (!userId && session.user?.email) {
    const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single();
    if (userData) userId = (userData as any).id;
  }

  // 🔥 CORRECTION ICI : Rediriger vers /auth/signin au lieu de "/"
  if (!userId) {
    redirect("/auth/signin");
  }

  const pageParam = resolvedParams.page;
  const currentPage = parseInt(pageParam as string) || 1;

  const { activities, totalActivities } = await getActivities(userId, currentPage);
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