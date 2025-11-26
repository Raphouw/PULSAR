// Fichier : app/friends/SocialFeed.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw } from 'lucide-react';
// 🔥 REMPLACEMENT : On utilise la LargeActivityCard
import LargeActivityCard from '../../components/LargeActivityCard'; 

export default function SocialFeed() {
  const [activities, setActivities] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const loadActivities = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/friends/feed?page=${pageNum}`);
      const data = await res.json();
      
      if (data.activities.length === 0) {
        setHasMore(false);
      } else {
        setActivities(prev => pageNum === 0 ? data.activities : [...prev, ...data.activities]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities(0);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadActivities(nextPage);
  };

  // --- LOADING STATE ---
  if (loading && activities.length === 0) {
      return (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#00f3ff' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem auto' }} />
              <div>Connexion au flux neural...</div>
          </div>
      );
  }

  // --- EMPTY STATE ---
  if (activities.length === 0) {
      return (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#666', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
              Le flux est vide. Abonnez-vous à des athlètes pour voir leurs exploits ici !
          </div>
      );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {activities.map((activity) => (
        <div key={activity.id} style={{ marginBottom: '3rem', animation: 'fadeIn 0.5s ease' }}>
            
            {/* HEADER DE L'ACTIVITÉ (Auteur) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', paddingLeft: '4px' }}>
                <Link href={`/profile/${activity.user.id}`}>
                    <div style={{ 
                        width: '42px', height: '42px', borderRadius: '50%', 
                        backgroundImage: activity.user.avatar_url ? `url(${activity.user.avatar_url})` : 'none',
                        backgroundSize: 'cover', backgroundColor: '#333',
                        border: '2px solid #d04fd7', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 'bold'
                    }}>
                        {!activity.user.avatar_url && activity.user.name?.charAt(0)}
                    </div>
                </Link>
                <div>
                    <Link href={`/profile/${activity.user.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '1rem', cursor: 'pointer', lineHeight: 1.2 }}>
                            {activity.user.name}
                        </div>
                    </Link>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>
                        {new Date(activity.start_time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>

            {/* 🔥 CARTE LARGE (Correction du rendu) */}
            {/* Plus besoin de div avec height fixe, la LargeCard gère sa hauteur */}
            <LargeActivityCard activity={activity} />

        </div>
      ))}

      {/* BOUTON LOAD MORE */}
      {hasMore && (
          <div style={{ textAlign: 'center', marginTop: '2rem', paddingBottom: '2rem' }}>
              <button 
                onClick={handleLoadMore} 
                disabled={loading}
                style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', padding: '12px 30px', borderRadius: '30px',
                    cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '10px',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                  {loading ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18}/>}
                  {loading ? 'Chargement...' : 'Charger plus d\'activités'}
              </button>
          </div>
      )}
    </div>
  );
}