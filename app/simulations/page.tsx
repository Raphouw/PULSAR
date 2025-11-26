// Fichier : app/simulations/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "../../lib/supabaseAdminClient"; // Vérifiez l'extension .js ou .ts selon votre config
import SimulationsClient from "./simulationClient";

export default async function SimulationsPage() {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || !session.user?.id) {
    redirect("/auth/signin");
  }

  // Récupérer les itinéraires disponibles
  // CORRECTION ICI : Suppression de 'polyline' dans le select
  const { data: routes, error } = await supabaseAdmin
    .from("routes")
    .select("id, name, distance_km, elevation_gain_m, gpx_data") // <-- 'polyline' retiré
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur chargement routes:", error);
  }

  // On passe aussi le profil utilisateur par défaut pour pré-remplir le poids/FTP
  const { data: userProfile } = await supabaseAdmin
    .from("users")
    .select("weight, ftp, name")
    // @ts-ignore
    .eq("id", session.user.id)
    .single();

  // Transformation des données pour le client
  // Le client attend une prop 'polyline', on doit l'extraire du JSON 'gpx_data' si elle existe
  const formattedRoutes = routes?.map((r: any) => ({
    ...r,
    // On tente de récupérer la polyline stockée dans le JSON gpx_data
    // Selon votre structure : gpx_data.map_polyline ou gpx_data.polyline
    polyline: r.gpx_data?.map_polyline || r.gpx_data?.polyline || null 
  })) || [];

  return (
    <SimulationsClient 
      routes={formattedRoutes} 
      userProfile={userProfile || { weight: 75, ftp: 200 }}
    />
  );
}