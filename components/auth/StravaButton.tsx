// Fichier : app/components/auth/StravaButton.tsx
'use client';

import { signIn } from 'next-auth/react';
import React, { useState } from 'react';

export default function StravaButton({ isSignup = false }: { isSignup?: boolean }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    // Redirection vers le dashboard après connexion
    await signIn('strava', { callbackUrl: '/dashboard' });
  };

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={isLoading}
      style={stravaButtonStyle}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {isLoading ? (
        <span style={loaderStyle}>Connexion...</span>
      ) : (
        <>
          <svg role="img" viewBox="0 0 24 24" height="20" width="20" fill="currentColor" style={{ marginRight: '12px' }}>
             <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          {isSignup ? "S'inscrire avec Strava" : "Continuer avec Strava"}
        </>
      )}
    </button>
  );
}

// --- Styles ---
const stravaButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.8rem',
  backgroundColor: '#FC4C02', // Strava Orange
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.95rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  boxShadow: '0 4px 15px rgba(252, 76, 2, 0.3)',
  position: 'relative',
  overflow: 'hidden',
};

const loaderStyle: React.CSSProperties = {
  animation: 'pulse 1.5s infinite',
};