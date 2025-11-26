// Fichier : app/routes/[id]/page.tsx
import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient"; // Correction .js retiré pour propreté TS
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

  // On récupère TOUT (*) pour avoir le gpx_data
  const { data: route, error } = await supabaseAdmin
    .from("routes")
    .select("*")
    .eq("id", id) // Utilisation de l'ID extrait
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