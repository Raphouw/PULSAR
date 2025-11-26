// Fichier : app/routes/[id]/page.tsx
import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient.js";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import RouteDisplay from "./routeDisplay";

// 🔥 FIX 2 : Définir et exporter la structure Route
export type Route = {
  id: number;
  name: string;
  gpx_data: any; 
  distance_km: number;
  elevation_gain_m: number;
  updated_at: string;
  created_at: string;
  user_id: number; // bigint
  // Inclure tous les champs récupérés par 'select("*")'
};

export default async function RouteDetailsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  // @ts-ignore
  const resolvedParams = await params;

  // @ts-ignore
  if (!session || !session.user?.id) {
    redirect("/auth/signin");
  }

  // On récupère TOUT (*) pour avoir le gpx_data
  const { data: route, error } = await supabaseAdmin
    .from("routes")
    .select("*")
    .eq("id", resolvedParams.id)
    // @ts-ignore
    .eq("user_id", session.user.id) 
    .single();

  if (error || !route) {
    return (
        <div style={{ padding: "2rem", color: 'var(--text)' }}>
            <Link href="/routes" style={{color: 'var(--accent)'}}>&larr; Retour aux itinéraires</Link>
            <p style={{marginTop: '1rem'}}>Itinéraire introuvable ou supprimé.</p>
        </div>
    );
  }

  // 🔥 On doit forcer le cast ici car 'select("*")' est ambigu
  return (
    <div style={{ padding: "2rem", maxWidth: '1600px', margin: '0 auto' }}>
      <Link href="/routes" style={backLinkStyle}>&larr; Retour à la bibliothèque</Link>
      <RouteDisplay route={route as Route} /> 
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