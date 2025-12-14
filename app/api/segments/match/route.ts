// Fichier : app/api/segments/match/route.ts

import { NextResponse } from "next/server";
import { scanActivityAgainstAllSegments } from "../../../../lib/segmentScanner";

// ⏱️ Timeout max pour Vercel (plan pro)
export const maxDuration = 60;

/**
 * API unique et clean pour le matching de segments
 * 👉 UNE SEULE source de vérité : lib/segmentScanner.ts
 * 👉 Aucun upsert partiel ici (évite les NULL destructeurs)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, id } = body;

    // -------------------------------------------------
    // CAS 1 : Import / rescan d'une activité complète
    // -------------------------------------------------
    if (mode === "activity") {
      if (typeof id !== "number") {
        return NextResponse.json(
          { error: "Invalid activity id" },
          { status: 400 }
        );
      }

      const result = await scanActivityAgainstAllSegments(id);
      return NextResponse.json(result);
    }

    // -------------------------------------------------
    // Mode inconnu
    // -------------------------------------------------
    return NextResponse.json(
      { error: "Mode invalide" },
      { status: 400 }
    );

  } catch (error: any) {
    console.error("[segments/match]", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
