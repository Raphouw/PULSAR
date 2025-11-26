// Fichier : middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    // Récupération du token et du statut
    const token = req.nextauth.token;
    const isAuth = !!token;
    const path = req.nextUrl.pathname;
    
    // Est-ce qu'on est sur la page d'onboarding ?
    const isOnboardingPage = path === "/onboarding";

    // -----------------------------------------------------------------------
    // CAS 1 : L'utilisateur est connecté MAIS n'a pas fini l'inscription
    // -----------------------------------------------------------------------
    // On vérifie explicitement que c'est FALSE (pour éviter les bugs si undefined)
    if (isAuth && token?.onboarding_completed === false) {
      
      // S'il n'est PAS sur la page d'onboarding, on le force à y aller
      if (!isOnboardingPage) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }
    }

    // -----------------------------------------------------------------------
    // CAS 2 : L'utilisateur a DÉJÀ fini l'inscription
    // -----------------------------------------------------------------------
    if (isAuth && token?.onboarding_completed === true) {
      
      // S'il essaie de retourner sur l'onboarding pour s'amuser, on le renvoie au dashboard
      if (isOnboardingPage) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Cette fonction détermine si le middleware doit laisser passer ou non.
      // Si elle renvoie false, NextAuth redirige vers la page de login.
      authorized: ({ token }) => !!token, 
    },
  }
);

// 🔥 CONFIGURATION CRUCIALE POUR ÉVITER LA BOUCLE INFINIE 🔥
export const config = {
  matcher: [
    /*
     * Cette expression régulière compliquée dit :
     * "Applique le middleware sur TOUTES les pages du site, SAUF..."
     * - /api (les routes backend)
     * - /_next/static (les fichiers JS/CSS générés)
     * - /_next/image (les images optimisées)
     * - /favicon.ico (l'icône du site)
     * - /auth (Toutes les pages d'authentification : signin, error, etc.) <--- C'est ça qui sauve la mise !
     */
    "/((?!api|_next/static|_next/image|favicon.ico|auth).*)",
  ],
};