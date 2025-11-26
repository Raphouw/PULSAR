import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabaseAdminClient.js";
import { redirect } from "next/navigation";
import RoutesClient from "./routesClient";

export const metadata = {
  title: "Bibliothèque d'itinéraires | Pulsar",
};

export default async function RoutesPage() {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || !session.user?.id) {
    redirect("/auth/signin");
  }

  // Récupérer les itinéraires existants
  const { data: routes, error } = await supabaseAdmin
    .from("routes")
    // 🔥 FIX ICI : Ajout de "gpx_data" dans la liste des colonnes sélectionnées
    .select("id, name, distance_km, elevation_gain_m, created_at, gpx_data")
    // @ts-ignore
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur chargement itinéraires:", error);
  }

  return (
    <div style={{ padding: "2rem", maxWidth: '1600px', margin: '0 auto' }}>
      <RoutesClient initialRoutes={routes || []} />
    </div>
  );
}