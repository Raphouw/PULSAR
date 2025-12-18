// Fichier : lib/auth.ts
import { NextAuthOptions, User, Account, Profile } from "next-auth";
import { JWT } from "next-auth/jwt";
import StravaProvider, { StravaProfile } from "next-auth/providers/strava";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdminClient"; 
import bcrypt from "bcrypt";

// --- TYPES ---

interface StravaRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// --- HELPERS ---

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = "https://www.strava.com/oauth/token";
    const payload = {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const refreshedTokens: StravaRefreshResponse = await res.json();

    if (!res.ok) {
      throw refreshedTokens;
    }

    // Mise à jour en BDD pour garder la synchro
    if (token.strava_id) {
        const expiresAtISO = new Date(refreshedTokens.expires_at * 1000).toISOString();
        
        // ⚡ FIX: Cast du builder en any pour éviter l'erreur "never" sur l'update
        await (supabase.from("users") as any)
        .update({
            strava_access_token: refreshedTokens.access_token,
            strava_refresh_token: refreshedTokens.refresh_token,
            strava_token_expires_at: expiresAtISO,
        })
        .eq("strava_id", Number(token.strava_id)); 
    }

    return {
      ...token,
      access_token: refreshedTokens.access_token,
      expires_at: refreshedTokens.expires_at,
      refresh_token: refreshedTokens.refresh_token ?? token.refresh_token,
    };
  } catch (error) {
    console.error("[Auth] RefreshAccessTokenError", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

// --- CONFIGURATION ---

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email & Mot de passe",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        // Appel typé : "user" aura la structure exacte de la DB
        const { data: userData, error } = await supabase
          .from("users")
          .select("id, name, email, password_hash, strava_id, onboarding_completed, weight, ftp")
          .eq("email", credentials.email)
          .single();

        // ⚡ FIX: Cast du user en any
        const user = userData as any;

        if (error || !user || !user.password_hash) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) return null;

        // On retourne un objet User conforme à NextAuth (tout en string pour les ID)
        return {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          strava_id: user.strava_id,
          onboarding_completed: user.onboarding_completed ?? false,
          weight: user.weight,
          ftp: user.ftp,
        };
      },
    }),
    StravaProvider({
      clientId: process.env.STRAVA_CLIENT_ID!,
      clientSecret: process.env.STRAVA_CLIENT_SECRET!,
      authorization: { params: { scope: "read,activity:read_all" } },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 jours
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/auth/signin', error: '/auth/signin' },

  callbacks: {
    async jwt({ token, user, account, profile, trigger, session }) {
      
      // 1. Mise à jour manuelle (via update())
      if (trigger === "update" && session) {
        if (typeof session.onboarding_completed === 'boolean') token.onboarding_completed = session.onboarding_completed;
        if (typeof session.weight === 'number') token.weight = session.weight;
        if (typeof session.ftp === 'number') token.ftp = session.ftp;
        return token;
      }

      // 2. Connexion Initiale (Credentials ou Strava)
      if (user) {
        // Initialisation commune
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
        token.onboarding_completed = user.onboarding_completed;
        token.weight = user.weight;
        token.ftp = user.ftp;
        
        // Spécifique Strava
        if (account && account.provider === "strava") {
            token.strava_id = account.providerAccountId;
            token.access_token = account.access_token;
            token.refresh_token = account.refresh_token;
            token.expires_at = account.expires_at;

            // Logique de synchro DB Strava
            await syncStravaUser(account, profile as StravaProfile, token);
        }
        return token;
      } 

      // 3. Réhydratation (Rechargement de page si token incomplet)
      if (!token.userId && token.email) {
        const { data: dbUserData } = await supabase
          .from("users")
          .select("id, strava_id, name, onboarding_completed, weight, ftp")
          .eq("email", token.email)
          .single();
          
        // ⚡ FIX: Cast du user en any
        const dbUser = dbUserData as any;

        if (dbUser) {
          token.userId = dbUser.id.toString();
          token.strava_id = dbUser.strava_id;
          token.name = dbUser.name;
          token.onboarding_completed = dbUser.onboarding_completed ?? false;
          token.weight = dbUser.weight;
          token.ftp = dbUser.ftp;
        }
      }

      // 4. Vérification expiration Token Strava
      if (token.access_token && token.expires_at) {
        // S'il reste moins de 5 min (300s)
        if (Date.now() / 1000 > token.expires_at - 300) {
          return refreshAccessToken(token);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
          session.user.id = token.userId;
          session.user.strava_id = token.strava_id;
          session.user.name = token.name;
          session.user.email = token.email;
          session.user.onboarding_completed = token.onboarding_completed;
          session.user.weight = token.weight;
          session.user.ftp = token.ftp;
          
          session.access_token = token.access_token;
          session.error = token.error;
          session.justConnectedStrava = token.justConnectedStrava;
      }
      return session;
    },
  },
};

// --- LOGIQUE SYNCHRO STRAVA ---

async function syncStravaUser(account: Account, profile: StravaProfile, token: JWT) {
    console.log(">>> [JWT] Sync Strava. ID:", account.providerAccountId);

    const expiresAtISO = new Date((account.expires_at ?? 0) * 1000).toISOString();
    const stravaData = {
      strava_id: Number(account.providerAccountId), // Cast important pour la DB
      strava_access_token: account.access_token,
      strava_refresh_token: account.refresh_token,
      strava_token_expires_at: expiresAtISO,
    };

    const userEmail = profile.email || `${account.providerAccountId}@strava.com`;
    let dbUserId: string | undefined;

    try {
        // A. Recherche par STRAVA ID
        let { data: existingUserData } = await supabase
            .from("users")
            .select("id, email, strava_id, onboarding_completed, weight, ftp")
            .eq("strava_id", stravaData.strava_id)
            .single();

        // ⚡ FIX: Cast
        let existingUser = existingUserData as any;

        // B. Recherche par EMAIL si pas trouvé
        if (!existingUser && profile.email) {
            const { data: emailUserData } = await supabase
                .from("users")
                .select("id, email, strava_id, onboarding_completed, weight, ftp")
                .eq("email", profile.email)
                .single();
            
            // ⚡ FIX: Cast
            const emailUser = emailUserData as any;

            if (emailUser && !emailUser.strava_id) {
                existingUser = emailUser;
                console.log(">>> [JWT] Fusion de compte détectée.");
            }
        }

        if (existingUser) {
            // UPDATE
            dbUserId = existingUser.id.toString();
            token.onboarding_completed = existingUser.onboarding_completed ?? false;
            token.weight = existingUser.weight;
            token.ftp = existingUser.ftp;

            // ⚡ FIX: Cast builder update
            await (supabase.from("users") as any)
                .update(stravaData)
                .eq("id", existingUser.id);
        } else {
            // INSERT
            console.log(">>> [JWT] Création user Strava...");
            const userName = (profile as any).username || (profile as any).firstname || 'Athlète Strava';
            
            // ⚡ FIX: Cast builder insert
            const { data: newUserData } = await (supabase.from("users") as any)
                .insert({
                    ...stravaData,
                    name: userName,
                    email: userEmail,
                    onboarding_completed: false,
                    // Valeurs par défaut physiologiques
                    weight: 75,
                    ftp: 200
                })
                .select("id, weight, ftp")
                .single();
            
            const newUser = newUserData as any;

            if (newUser) {
                dbUserId = newUser.id.toString();
                token.justConnectedStrava = true;
                token.onboarding_completed = false;
                token.weight = newUser.weight;
                token.ftp = newUser.ftp;
            }
        }

        if (dbUserId) {
            token.userId = dbUserId;
        }

    } catch (err) {
        console.error(">>> [JWT] Erreur critique sync Strava:", err);
    }
}