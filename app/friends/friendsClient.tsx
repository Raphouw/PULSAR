// Fichier : app/friends/friendsClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; 
import { Search, UserCheck, UserPlus, Ban, Users, UserX, Activity } from 'lucide-react';
// 🔥 IMPORT DU COMPOSANT DE FLUX
import SocialFeed from './SocialFeed'; 

// --- SOUS-COMPOSANT : BOUTON D'ONGLET ---
const TabButton = ({ active, onClick, children, icon: Icon }: any) => (
    <button 
        onClick={onClick}
        style={{
            flex: 1, 
            padding: '1rem', 
            background: active ? 'rgba(208, 79, 215, 0.1)' : 'transparent',
            border: 'none', 
            borderBottom: active ? '2px solid #d04fd7' : '1px solid #333',
            color: active ? '#d04fd7' : '#888', 
            fontWeight: 700, 
            cursor: 'pointer',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
        }}
    >
        {Icon && <Icon size={16} />} {children}
    </button>
);

// --- TYPES ---
type FriendUser = {
  id: string;
  name: string;
  email?: string;
  avatar_url: string | null;
  relationId?: number;
};

// --- COMPOSANT PRINCIPAL ---
export default function FriendsClient({ 
  initialFollowing, initialFollowers, initialBlocked 
}: { 
  initialFollowing: FriendUser[], initialFollowers: FriendUser[], initialBlocked: FriendUser[] 
}) {
  const router = useRouter();
  
  // 🔥 ETAT INITIAL : 'feed'
  const [activeTab, setActiveTab] = useState<'feed' | 'following' | 'followers' | 'search' | 'blocked'>('feed');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // --- LOGIQUE DE RECHERCHE (Debounce) ---
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    
    const delayFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.users || []);
      } catch (e) { console.error(e); } 
      finally { setIsSearching(false); }
    }, 400);
    
    return () => clearTimeout(delayFn);
  }, [searchQuery]);

  // --- LOGIQUE D'ACTION (Suivre/Bloquer) ---
  const handleAction = async (action: 'follow' | 'unfollow' | 'block' | 'unblock', targetUserId: string) => {
    setLoadingAction(targetUserId);
    try {
      const res = await fetch('/api/friends/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetUserId }),
      });
      if (!res.ok) throw new Error("Action failed");
      
      router.refresh(); // Rafraichir les données serveur (page.tsx)
      
    } catch (err: any) { alert("Erreur: " + err.message); } 
    finally { setLoadingAction(null); }
  };

  // Checkers pour l'UI
  const isFollowing = (uid: string) => initialFollowing.some(f => f.id === uid);
  const isBlocked = (uid: string) => initialBlocked.some(f => f.id === uid);

  // --- COMPOSANT CARTE UTILISATEUR ---
  const UserCard = ({ user, type }: { user: FriendUser, type: 'following' | 'follower' | 'search' | 'blocked' }) => {
    const iFollow = isFollowing(user.id);
    const iBlocked = isBlocked(user.id);

    return (
      <div style={cardStyle}>
        
        {/* 🔥 ZONE GAUCHE : LIEN VERS LE PROFIL */}
        <Link href={`/profile/${user.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, cursor: 'pointer' }}>
            <div style={{ 
                width: '45px', height: '45px', borderRadius: '50%', 
                backgroundImage: user.avatar_url ? `url(${user.avatar_url})` : 'none',
                backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#888', fontWeight: 'bold', border: '1px solid #444'
            }}>
                {!user.avatar_url && user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
                <div style={{ fontWeight: 'bold', color: '#fff', transition: 'color 0.2s' }}>
                    {user.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>{user.email || 'Athlète Pulsar'}</div>
            </div>
        </Link>

        {/* ZONE DROITE : BOUTONS D'ACTION */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          
          {/* Onglet Recherche */}
          {type === 'search' && (
             iBlocked ? <span style={statusBadgeStyle}>Bloqué</span> :
             iFollow ? (
                <button disabled style={disabledButtonStyle}><UserCheck size={14}/> Suivi</button>
             ) : (
                <button onClick={() => handleAction('follow', user.id)} disabled={loadingAction === user.id} style={primaryButtonStyle}>
                    <UserPlus size={14}/> Suivre
                </button>
             )
          )}

          {/* Onglet Following */}
          {type === 'following' && (
            <button onClick={() => handleAction('unfollow', user.id)} disabled={loadingAction === user.id} style={secondaryButtonStyle}>
                Ne plus suivre
            </button>
          )}

          {/* Onglet Followers */}
          {type === 'follower' && (
             <>
                {!iFollow && (
                    <button onClick={() => handleAction('follow', user.id)} disabled={loadingAction === user.id} style={primaryButtonStyle}>
                        Suivre en retour
                    </button>
                )}
                <button onClick={() => {if(confirm('Bloquer ?')) handleAction('block', user.id)}} disabled={loadingAction === user.id} style={dangerIconStyle} title="Bloquer">
                    <Ban size={16} />
                </button>
             </>
          )}

          {/* Onglet Bloqués */}
          {type === 'blocked' && (
             <button onClick={() => handleAction('unblock', user.id)} disabled={loadingAction === user.id} style={secondaryButtonStyle}>
                Débloquer
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: 'rgba(20,20,30,0.6)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
      
      {/* BARRE DE NAVIGATION */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', overflowX: 'auto' }}>
        <TabButton active={activeTab === 'feed'} onClick={() => setActiveTab('feed')} icon={Activity}>Flux</TabButton>
        <TabButton active={activeTab === 'following'} onClick={() => setActiveTab('following')} icon={UserCheck}>Abonnements ({initialFollowing.length})</TabButton>
        <TabButton active={activeTab === 'followers'} onClick={() => setActiveTab('followers')} icon={Users}>Abonnés ({initialFollowers.length})</TabButton>
        <TabButton active={activeTab === 'search'} onClick={() => setActiveTab('search')} icon={Search}>Rechercher</TabButton>
        {initialBlocked.length > 0 && (
            <TabButton active={activeTab === 'blocked'} onClick={() => setActiveTab('blocked')} icon={UserX}>Bloqués</TabButton>
        )}
      </div>

      <div style={{ padding: '2rem' }}>
        
        {/* 1. FLUX D'ACTIVITÉ */}
        {activeTab === 'feed' && (
            <SocialFeed />
        )}

        {/* 2. RECHERCHE */}
        {activeTab === 'search' && (
            <div style={{ maxWidth: '600px', margin: '0 auto 2rem auto' }}>
                <div style={{position: 'relative'}}>
                    <Search size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color:'#666'}} />
                    <input 
                        type="text" placeholder="Rechercher un athlète..." 
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        style={searchInputStyle}
                    />
                </div>
                {isSearching && <div style={{textAlign:'center', color:'#666', marginTop:'1rem'}}>Recherche en cours...</div>}
                <div style={gridStyle}>
                    {searchResults.map(u => <UserCard key={u.id} user={u} type="search" />)}
                </div>
                {searchResults.length === 0 && searchQuery.length > 1 && !isSearching && <Empty msg="Aucun résultat." />}
            </div>
        )}

        {/* 3. LISTES */}
        {activeTab === 'following' && (
            <div style={gridStyle}>
                {initialFollowing.length > 0 ? initialFollowing.map(u => <UserCard key={u.id} user={u} type="following" />) : <Empty msg="Vous ne suivez personne." />}
            </div>
        )}
        {activeTab === 'followers' && (
            <div style={gridStyle}>
                {initialFollowers.length > 0 ? initialFollowers.map(u => <UserCard key={u.id} user={u} type="follower" />) : <Empty msg="Aucun abonné pour le moment." />}
            </div>
        )}
        {activeTab === 'blocked' && (
            <div style={gridStyle}>
                {initialBlocked.map(u => <UserCard key={u.id} user={u} type="blocked" />)}
            </div>
        )}
      </div>
    </div>
  );
}

// Petit helper UI
const Empty = ({msg}: {msg:string}) => <div style={{textAlign:'center', padding:'2rem', color:'#666', fontStyle:'italic', gridColumn:'1/-1'}}>{msg}</div>;

// --- STYLES CSS-IN-JS ---
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem', marginTop: '1rem' };
const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' };
const primaryButtonStyle: React.CSSProperties = { background: '#d04fd7', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display:'flex', alignItems:'center', gap:'6px' };
const secondaryButtonStyle: React.CSSProperties = { background: 'transparent', color: '#aaa', border: '1px solid #444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' };
const disabledButtonStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', color: '#555', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'default', fontSize: '0.8rem', display:'flex', alignItems:'center', gap:'6px' };
const dangerIconStyle: React.CSSProperties = { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px', borderRadius: '6px', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' };
const searchInputStyle: React.CSSProperties = { width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff', fontSize: '1rem', outline: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };
const statusBadgeStyle: React.CSSProperties = { fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '4px 8px', borderRadius: '4px' };