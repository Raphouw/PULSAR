import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient"; 
import { redirect } from "next/navigation";
import Link from "next/link";
import RouteDisplay from "./routeDisplay";

// Définir et exporter la structure Route
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
  bike_weight?: number; // Optionnel si pas en BDD, on mettra une valeur par défaut
};

// ✅ CORRECTION NEXT.JS 15 : Params est une Promise
export default async function RouteDetailsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // ✅ On await les params proprement
  const { id } = await params;
  
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.id) {
    redirect("/auth/signin");
  }

  // 1. On récupère la route
  const { data: route, error: routeError } = await supabaseAdmin
    .from("routes")
    .select("*")
    .eq("id", id) 
    .eq("user_id", session.user.id) 
    .single();

  // 2. On récupère les infos physiques du User (Poids, FTP) pour l'algo de braquet
  const { data: userData, error: userError } = await supabaseAdmin
    .from("users")
    .select("weight, ftp")
    .eq("id", session.user.id)
    .single();

  if (routeError || !route) {
    return (
        <div style={{ padding: "2rem", color: 'var(--text)' }}>
            <Link href="/routes" style={{color: 'var(--accent)'}}>&larr; Retour aux itinéraires</Link>
            <p style={{marginTop: '1rem'}}>Itinéraire introuvable ou supprimé.</p>
        </div>
    );
  }

  // Valeurs par défaut si le profil n'est pas complet
  const userProfile: UserProfile = {
    weight: userData?.weight || 75,
    ftp: userData?.ftp || 250,
    bike_weight: 8 // Poids vélo arbitraire si pas en BDD
  };

  return (
    <div style={{ padding: "2rem", maxWidth: '1600px', margin: '0 auto' }}>
      <Link href="/routes" style={backLinkStyle}>&larr; Retour à la bibliothèque</Link>
      <RouteDisplay route={route as Route} userProfile={userProfile} /> 
    </div>
  );
}

const backLinkStyle: React.CSSProperties = {
    display: 'inline-block',
    marginBottom: '1.5rem',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
};