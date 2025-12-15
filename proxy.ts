// Fichier : middleware.ts (ou proxy.ts selon ton setup)
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const path = req.nextUrl.pathname;
    
    const isOnboardingPage = path === "/onboarding";
    const isAdminPage = path.startsWith("/admin");

    // -----------------------------------------------------------------------
    // PROTECTION ADMIN : SEUL L'ID "1" PEUT PASSER
    // -----------------------------------------------------------------------
    if (isAdminPage) {
      if (!isAuth || String(token?.userId) !== "1") {
        // Si pas admin, on renvoie vers le dashboard
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // -----------------------------------------------------------------------
    // CAS 1 : L'utilisateur est connecté MAIS n'a pas fini l'inscription
    // -----------------------------------------------------------------------
    if (isAuth && token?.onboarding_completed === false) {
      if (!isOnboardingPage) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }
    }

    // -----------------------------------------------------------------------
    // CAS 2 : L'utilisateur a DÉJÀ fini l'inscription
    // -----------------------------------------------------------------------
    if (isAuth && token?.onboarding_completed === true) {
      if (isOnboardingPage) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, 
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|auth).*)",
  ],
};