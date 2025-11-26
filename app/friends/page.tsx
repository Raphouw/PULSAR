// Fichier : app/friends/page.tsx
import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";
import { redirect } from "next/navigation";
import FriendsClient from './friendsClient';

// Type pour mapper la réponse de jointure Supabase
type FriendJoinResult = {
    id: number;
    friend_id: string;
    user_id: string;
    status: string;
    // La table jointe 'users' via friend_id ou user_id
    friend_details?: { id: string, name: string, email: string, avatar_url: string };
    user_details?: { id: string, name: string, email: string, avatar_url: string };
};

export default async function FriendsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) redirect('/auth/signin');

  const myId = String(session.user.id);

  // 1. Récupérer "Qui JE suis" (Mes abonnements + Mes blocages)
  // On joint la table 'users' sur la colonne 'friend_id' pour avoir les infos des gens que je suis
  const { data: myActionsData } = await supabaseAdmin
    .from('friends')
    .select(`
        id, status, friend_id,
        friend_details:users!friend_id(id, name, email, avatar_url)
    `)
    .eq('user_id', myId);

  // 2. Récupérer "Qui ME suit" (Mes abonnés)
  // On joint la table 'users' sur la colonne 'user_id' pour avoir les infos des gens qui me suivent
  // On filtre uniquement 'following', car je ne veux pas savoir qui m'a bloqué (et je ne peux pas le voir)
  const { data: myFollowersData } = await supabaseAdmin
    .from('friends')
    .select(`
        id, status, user_id,
        user_details:users!user_id(id, name, email, avatar_url)
    `)
    .eq('friend_id', myId)
    .eq('status', 'following');


  // 3. Formater les données pour le Client
  const following: any[] = [];
  const blocked: any[] = [];
  const followers: any[] = [];

  // Traitement de mes actions
  if (myActionsData) {
      (myActionsData as any[]).forEach(row => {
          const friend = row.friend_details;
          if (!friend) return; // Sécurité

          const friendObj = { ...friend, relationId: row.id };

          if (row.status === 'following') {
              following.push(friendObj);
          } else if (row.status === 'blocked') {
              blocked.push(friendObj);
          }
      });
  }

  // Traitement de mes abonnés
  if (myFollowersData) {
      (myFollowersData as any[]).forEach(row => {
          const user = row.user_details;
          if (!user) return;
          
          // Je ne l'ajoute dans mes followers que si je ne l'ai pas bloqué moi-même
          const isBlockedByMe = blocked.some(b => b.id === user.id);
          if (!isBlockedByMe) {
              followers.push({ ...user, relationId: row.id });
          }
      });
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
       <h1 style={{ 
          marginBottom: '2rem', 
          fontSize: '2.5rem', 
          background: 'linear-gradient(90deg, #fff 0%, #d04fd7 100%)', // Style Neon Pulsar
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 900,
          textAlign: 'center'
        }}>
        CENTRE SOCIAL
      </h1>
      
      <FriendsClient 
        initialFollowing={following} 
        initialFollowers={followers} 
        initialBlocked={blocked}
      />
    </div>
  );
}