'use client';

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface LikeButtonProps {
  activityId: number;
  initialLiked: boolean;
  initialCount: number;
}

export default function LikeButton({ activityId, initialLiked, initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isAnimating, setIsAnimating] = useState(false);

  // Déclenchement du like
  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); // Empêche d'ouvrir la carte si on clique sur le cœur
    e.stopPropagation();

    // Optimistic UI (On met à jour avant la réponse serveur pour la réactivité)
    const newLiked = !liked;
    setLiked(newLiked);
    setCount(prev => newLiked ? prev + 1 : prev - 1);
    
    if (newLiked) {
        setIsAnimating(true);
        // Reset l'animation après qu'elle soit finie
        setTimeout(() => setIsAnimating(false), 600);
    }

    // Appel API silencieux
    try {
        await fetch('/api/activities/like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId })
        });
    } catch (err) {
        // Rollback si erreur (optionnel)
        console.error("Erreur like", err);
    }
  };

  return (
    <button 
        onClick={toggleLike}
        style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            position: 'relative', outline: 'none'
        }}
        className="group"
    >
        {/* STYLE ET ANIMATION CSS INLINE */}
        <style jsx>{`
            @keyframes pulse-neon {
                0% { box-shadow: 0 0 0 0 rgba(208, 79, 215, 0.7); transform: scale(1); }
                50% { box-shadow: 0 0 0 15px rgba(208, 79, 215, 0); transform: scale(1.4); }
                100% { box-shadow: 0 0 0 0 rgba(208, 79, 215, 0); transform: scale(1); }
            }
            @keyframes particles {
                0% { opacity: 1; transform: scale(0.5); }
                100% { opacity: 0; transform: scale(2); }
            }
            .animating-heart {
                animation: pulse-neon 0.6s cubic-bezier(0.17, 0.67, 0.83, 0.67);
            }
            .particles-ring {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 40px; height: 40px; border-radius: 50%;
                border: 2px solid #d04fd7; opacity: 0; pointer-events: none;
            }
            .animating-ring {
                animation: particles 0.6s ease-out;
            }
        `}</style>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* L'anneau de choc (Shockwave) */}
            <div className={isAnimating ? "particles-ring animating-ring" : ""} />
            
            <Heart 
                size={24} 
                // Si liké : Rempli + Couleur Néon. Sinon : Contour gris
                fill={liked ? "#d04fd7" : "transparent"} 
                color={liked ? "#d04fd7" : "#888"}
                strokeWidth={liked ? 0 : 2} // On enlève le contour si rempli pour un look plus "flat neon"
                className={isAnimating ? "animating-heart" : ""}
                style={{ 
                    transition: 'all 0.2s ease',
                    filter: liked ? 'drop-shadow(0 0 8px rgba(208, 79, 215, 0.6))' : 'none'
                }}
            />
        </div>

        {/* COMPTEUR */}
        <span style={{ 
            fontSize: '0.9rem', fontWeight: 700, 
            color: liked ? '#d04fd7' : '#666',
            transition: 'color 0.3s'
        }}>
            {count > 0 ? count : ''}
        </span>
    </button>
  );
}