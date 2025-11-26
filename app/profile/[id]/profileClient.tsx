// Fichier : app/profile/[id]/ProfileClient.tsx
'use client';

import React, { useState } from 'react';
import { UserPlus, UserCheck, MapPin, Calendar, Trophy, Activity, Mountain, Clock } from 'lucide-react';
// 🔥 IMPORT CORRECT DU COMPOSANT PARTAGÉ
import ActivityCard from '../../../components/ActivityCard'; 
import LargeActivityCard from '../../../components/LargeActivityCard';

// Styles (Copie du style "Nuit Profonde")
const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem',
        color: '#fff',
        fontFamily: '"Inter", sans-serif',
    },
    headerCard: {
        background: 'linear-gradient(145deg, rgba(20, 20, 30, 0.8) 0%, rgba(10, 10, 15, 0.95) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '3rem',
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
        marginBottom: '3rem',
        position: 'relative' as const,
        overflow: 'hidden',
    },
    avatar: {
        width: '120px', height: '120px', borderRadius: '50%',
        border: '4px solid #d04fd7',
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: '#333',
        boxShadow: '0 0 30px rgba(208, 79, 215, 0.3)',
    },
    name: { fontSize: '2.5rem', fontWeight: 900, margin: 0, lineHeight: 1.1 },
    meta: { display: 'flex', gap: '1.5rem', color: '#aaa', marginTop: '0.5rem', fontSize: '0.9rem' },
    
    // Stats Row
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.5rem',
        marginBottom: '3rem',
    },
    statBox: {
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column' as const,
    },
    statLabel: { fontSize: '0.75rem', textTransform: 'uppercase' as const, color: '#888', fontWeight: 700, marginBottom: '0.5rem' },
    statValue: { fontSize: '1.8rem', fontWeight: 800, color: '#fff' },
    
    // Activités
    sectionTitle: { fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' },
    activitiesList: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '2rem', // Espace entre les grosses cartes
        maxWidth: '900px', // On limite la largeur pour que ce ne soit pas trop étiré sur grand écran
        margin: '0 auto', // Centré
    },
    
    // Bouton Action
    actionButton: (active: boolean) => ({
        padding: '10px 24px',
        borderRadius: '30px',
        border: active ? '1px solid #d04fd7' : 'none',
        background: active ? 'transparent' : '#d04fd7',
        color: active ? '#d04fd7' : '#000',
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px',
        marginLeft: 'auto', // Pousse le bouton à droite
        transition: 'all 0.2s',
    }),
};

export default function ProfileClient({ profile, activities, stats, isViewer, initialIsFollowing, viewerId }: any) {
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
    const [loadingAction, setLoadingAction] = useState(false);

    const handleFollowToggle = async () => {
        if (!viewerId) return;
        setLoadingAction(true);
        try {
            const action = isFollowing ? 'unfollow' : 'follow';
            const res = await fetch('/api/friends/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, targetUserId: profile.id }),
            });
            if (res.ok) setIsFollowing(!isFollowing);
        } catch (e) { console.error(e); }
        finally { setLoadingAction(false); }
    };

    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600);
        return `${h}h`;
    };

    return (
        <div style={styles.container}>
            
            {/* 1. HEADER PROFIL */}
            <div style={styles.headerCard}>
                <div style={{
                    ...styles.avatar,
                    backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '3rem',
                    fontWeight: 900,
                    color: '#fff',
                    background: profile.avatar_url ? '#333' : 'linear-gradient(135deg, #333 0%, #111 100%)', // Fond si pas d'image
                    textShadow: '0 0 10px rgba(255,255,255,0.5)'}} />
                
                <div>
                    <h1 style={styles.name}>{profile.name}</h1>
                    <div style={styles.meta}>
                        <span style={{display:'flex', alignItems:'center', gap:'6px'}}>
                            <Calendar size={14}/> Membre depuis {new Date(profile.created_at).getFullYear()}
                        </span>
                        {profile.ftp && (
                            <span style={{display:'flex', alignItems:'center', gap:'6px', color:'#f59e0b'}}>
                                <Trophy size={14}/> FTP: {profile.ftp}W
                            </span>
                        )}
                         {profile.weight && (
                            <span style={{display:'flex', alignItems:'center', gap:'6px', color:'#aaa'}}>
                                {profile.weight}kg
                            </span>
                        )}
                    </div>
                </div>

                {!isViewer && viewerId && (
                    <button 
                        onClick={handleFollowToggle} 
                        disabled={loadingAction}
                        style={styles.actionButton(isFollowing)}
                    >
                        {isFollowing ? <><UserCheck size={18}/> Abonné</> : <><UserPlus size={18}/> Suivre</>}
                    </button>
                )}
            </div>

            {/* 2. STATS GLOBALES */}
            <div style={styles.statsGrid}>
                <div style={styles.statBox}>
                    <div style={styles.statLabel}><Activity size={14} style={{display:'inline', marginRight:'6px'}}/> Sorties</div>
                    <div style={styles.statValue}>{stats.count}</div>
                </div>
                <div style={styles.statBox}>
                    <div style={styles.statLabel}><MapPin size={14} style={{display:'inline', marginRight:'6px'}}/> Distance Totale</div>
                    <div style={{...styles.statValue, color:'#00f3ff'}}>{(stats.totalDist).toFixed(0)} <small style={{fontSize:'0.5em'}}>km</small></div>
                </div>
                <div style={styles.statBox}>
                    <div style={styles.statLabel}><Mountain size={14} style={{display:'inline', marginRight:'6px'}}/> Dénivelé Cumulé</div>
                    <div style={{...styles.statValue, color:'#f59e0b'}}>{(stats.totalElev).toFixed(0)} <small style={{fontSize:'0.5em'}}>m</small></div>
                </div>
                <div style={styles.statBox}>
                    <div style={styles.statLabel}><Clock size={14} style={{display:'inline', marginRight:'6px'}}/> Temps Selle</div>
                    <div style={{...styles.statValue, color:'#d04fd7'}}>{formatTime(stats.totalTime)}</div>
                </div>
            </div>

            {/* 3. ACTIVITÉS RÉCENTES */}
            <div>
                <h2 style={styles.sectionTitle}>Dernières Sorties</h2>
                <div style={styles.activitiesList}>
                    {activities.length > 0 ? (
                        activities.map((activity: any) => (
                            <div key={activity.id}>
                                {/* 🔥 UTILISATION DE LA LARGE CARD */}
                                <LargeActivityCard activity={activity} />
                            </div>
                        ))
                    ) : (
                        <div style={{color:'#666', fontStyle:'italic', textAlign:'center', padding:'2rem'}}>Aucune activité récente visible.</div>
                    )}
                </div>
            </div>

        </div>
    );
}