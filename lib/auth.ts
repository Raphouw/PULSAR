// Fichier : lib/auth.ts
import { NextAuthOptions } from "next-auth";
import StravaProvider from "next-auth/providers/strava";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabaseAdmin as supabase } from "./supabaseAdminClient.js";
import bcrypt from "bcrypt";

// -----------------------------------------------------------------
// 1. HELPER REFRESH TOKEN (Inchangé)
// -----------------------------------------------------------------
async function refreshAccessToken(token: any) {
  try {
    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: token.refresh_token,
      }),
    });

    const refreshedTokens = await res.json();
    if (!res.ok) throw refreshedTokens;

    const expiresAtISO = new Date(refreshedTokens.expires_at * 1000).toISOString();

    await supabase
      .from("users")
      .update({
        strava_access_token: refreshedTokens.access_token,
        strava_refresh_token: refreshedTokens.refresh_token,
        strava_token_expires_at: expiresAtISO,
      })
      .eq("strava_id", token.strava_id);

    return {
      ...token,
      access_token: refreshedTokens.access_token,
      expires_at: refreshedTokens.expires_at,
      refresh_token: refreshedTokens.refresh_token ?? token.refresh_token,
    };
  } catch (error) {
    console.error("[Refresh Token] Erreur:", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

// -----------------------------------------------------------------
// 2. PROVIDER CREDENTIALS
// -----------------------------------------------------------------
const credentialsProvider = CredentialsProvider({
  name: "Email & Mot de passe",
  credentials: {
    email: { label: "Email", type: "text" },
    password: { label: "Mot de passe", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials.password) return null;

    // 🔥 MODIF : On sélectionne onboarding_completed
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, password_hash, strava_id, onboarding_completed")
      .eq("email", credentials.email)
      .single();

    if (error || !user || !user.password_hash) return null;

    const isValid = await bcrypt.compare(credentials.password, user.password_hash);
    if (!isValid) return null;

    return {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      strava_id: user.strava_id,
      onboarding_completed: user.onboarding_completed ?? false, // 🔥 MODIF
    };
  },
});

// -----------------------------------------------------------------
// 3. PROVIDER STRAVA
// -----------------------------------------------------------------
const stravaProvider = StravaProvider({
  clientId: process.env.STRAVA_CLIENT_ID as string,
  clientSecret: process.env.STRAVA_CLIENT_SECRET as string,
  authorization: { params: { scope: "read,activity:read_all" } },
});

// -----------------------------------------------------------------
// 4. CONFIGURATION NEXT-AUTH
// -----------------------------------------------------------------
export const authOptions: NextAuthOptions = {
  providers: [credentialsProvider, stravaProvider],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/auth/signin', error: '/auth/signin' },

  callbacks: {
    // -----------------------------------------------------------------
    // CALLBACK JWT
    // -----------------------------------------------------------------
    async jwt({ token, user, account, profile, trigger, session }) {

      // 🔥 MODIF : Gestion de la mise à jour manuelle (post-onboarding)
      if (trigger === "update" && session?.onboarding_completed !== undefined) {
        token.onboarding_completed = session.onboarding_completed;
      }

      // CAS 1: CONNEXION CREDENTIALS (PREMIÈRE FOIS)
      if (user && !account) {
        token.userId = user.id;
        token.strava_id = user.strava_id;
        token.email = user.email;
        token.name = user.name;
        // 🔥 MODIF
        token.onboarding_completed = user.onboarding_completed;
        return token;
      }

      // CAS 2: CONNEXION STRAVA
      if (account && profile && account.provider === "strava") {
        console.log(">>> [JWT] Début Auth Strava. ID:", account.providerAccountId);

        const expiresAtISO = new Date((account.expires_at ?? 0) * 1000).toISOString();
        const stravaData = {
          strava_id: account.providerAccountId,
          strava_access_token: account.access_token,
          strava_refresh_token: account.refresh_token,
          strava_token_expires_at: expiresAtISO,
        };

        const userEmail = profile.email || `${account.providerAccountId}@strava.com`;
        let userId: string | undefined;
        let isOnboardingCompleted = false; // Par défaut pour Strava

        try {
          // A. On cherche d'abord par STRAVA ID
          // 🔥 MODIF : Ajout de onboarding_completed dans le select
          let { data: existingUser, error: searchError } = await supabase
            .from("users")
            .select("id, email, strava_id, onboarding_completed")
            .eq("strava_id", account.providerAccountId)
            .single();

          if (searchError && searchError.code !== 'PGRST116') {
            console.error(">>> [JWT] Erreur recherche par ID:", searchError);
          }

          // B. Si pas trouvé par ID, on essaie par EMAIL
          if (!existingUser && profile.email) {
            // 🔥 MODIF : Ajout de onboarding_completed dans le select
            const { data: emailUser, error: emailError } = await supabase
              .from("users")
              .select("id, email, strava_id, onboarding_completed")
              .eq("email", profile.email)
              .single();

            if (emailUser && !emailUser.strava_id) {
              existingUser = emailUser;
              console.log(">>> [JWT] Fusion détectée avec compte email existant.");
            }
          }

          if (existingUser) {
            // --- MISE À JOUR UTILISATEUR EXISTANT ---
            userId = existingUser.id.toString();
            isOnboardingCompleted = existingUser.onboarding_completed ?? false; // 🔥 MODIF

            const { error: updateError } = await supabase.from("users").update(stravaData).eq("id", userId);
            if (updateError) console.error(">>> [JWT] Erreur Update:", updateError);

          } else {
            // --- CRÉATION NOUVEL UTILISATEUR ---
            console.log(">>> [JWT] Création nouvel utilisateur...");
            const userName = (profile as any).username || (profile as any).firstname || 'Athlète Strava';

            const insertPayload = {
              ...stravaData,
              name: userName,
              email: userEmail,
              onboarding_completed: false // <-- IMPORTANT
            };

            const { data: newUser, error: insertError } = await supabase
              .from("users")
              .insert(insertPayload)
              .select("id")
              .single();

            if (insertError) {
              console.error(">>> [JWT] ❌ ERREUR INSERTION:", JSON.stringify(insertError, null, 2));
            }

            if (newUser) {
              userId = newUser.id.toString();
              isOnboardingCompleted = false; // Nouveau user = onboarding à faire
            }
          }

          // Mise à jour du Token
          if (userId) {
            token.userId = userId;
            token.strava_id = account.providerAccountId;
            token.justConnectedStrava = true;
            token.name = (profile as any).username ?? 'Athlète Strava';
            token.email = userEmail;
            token.onboarding_completed = isOnboardingCompleted; // 🔥 MODIF
          }

        } catch (err) {
          console.error(">>> [JWT] 💥 Exception non gérée:", err);
        }

        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token;
        token.expires_at = account.expires_at;

        return token;
      }

      // CAS 3: REHYDRATATION DU TOKEN (Si user id manquant)
      if (!token.userId && token.email) {
        // 🔥 MODIF : Ajout de onboarding_completed
        const { data: user } = await supabase
          .from("users")
          .select("id, strava_id, name, onboarding_completed")
          .eq("email", token.email)
          .single();
        if (user) {
          token.userId = user.id.toString();
          token.strava_id = user.strava_id;
          token.name = user.name;
          token.onboarding_completed = user.onboarding_completed ?? false; // 🔥 MODIF
        }
      }

      // CAS 4: REFRESH TOKEN AUTO
      if (token.access_token && token.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        if (now > (token.expires_at - 300)) {
          return refreshAccessToken(token);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      session.user.strava_id = token.strava_id;
      session.user.name = token.name;
      session.user.email = token.email;

      // 🔥 MODIF : On passe l'info à la session (utilisé par le middleware et le front)
      // Note: Il faut tricher avec "as any" si tu n'as pas encore fait le fichier de types
      (session.user as any).onboarding_completed = token.onboarding_completed;

      session.access_token = token.access_token;
      session.refresh_token = token.refresh_token;
      session.expires_at = token.expires_at;

      if (token.justConnectedStrava) session.justConnectedStrava = true;
      if (token.error) session.error = token.error;

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};