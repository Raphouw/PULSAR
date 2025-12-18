import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient"; 
import { redirect } from "next/navigation";
import Link from "next/link";
import RouteDisplay from "./routeDisplay";

// Définir la structure Route
export type Route = {
  id: number;
  name: string;
  gpx_data: any; 
  distance_km: number;
  elevation_gain_m: number;
  updated_at: string;
  created_at: string;
  user_id: number; 
};

export type UserProfile = {
  weight: number;
  ftp: number;
  bike_weight?: number;
};

export default async function RouteDetailsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.id) {
    redirect("/auth/signin");
  }

  // ⚡ FIX: Conversion de l'ID utilisateur pour la requête
  const userId = Number(session.user.id);

  // 1. Récupération de la route
  // ⚡ FIX: Cast en 'any' pour éviter le type 'never' sur les colonnes gpx_data, etc.
  const { data: routeData, error: routeError } = await supabaseAdmin
    .from("routes")
    .select("*")
    .eq("id", id) 
    .eq("user_id", userId) 
    .single();

  // 2. Récupération des infos physiques
  const { data: userDataRaw, error: userError } = await supabaseAdmin
    .from("users")
    .select("weight, ftp")
    .eq("id", userId)
    .single();

  const userData = userDataRaw as any;

  if (routeError || !routeData) {
    return (
        <div style={{ padding: "2rem", color: 'white', background: '#000', minHeight: '100vh' }}>
            <Link href="/routes" style={{color: '#d04fd7'}}>&larr; Retour aux itinéraires</Link>
            <p style={{marginTop: '1rem'}}>Itinéraire introuvable ou accès refusé.</p>
        </div>
    );
  }

  // Valeurs par défaut pour l'algorithme de prédiction de performance
  const userProfile: UserProfile = {
    weight: userData?.weight || 75,
    ftp: userData?.ftp || 250,
    bike_weight: 8 
  };

  return (
    <div style={{ padding: "2rem", maxWidth: '1600px', margin: '0 auto' }}>
      <Link href="/routes" style={backLinkStyle}>&larr; Retour à la bibliothèque</Link>
      
      

      <RouteDisplay route={routeData as any} userProfile={userProfile} /> 
    </div>
  );
}

const backLinkStyle: React.CSSProperties = {
    display: 'inline-block',
    marginBottom: '1.5rem',
    color: '#888',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
};