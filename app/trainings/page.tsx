// Fichier : app/training/page.tsx
import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { redirect } from 'next/navigation';

export default async function trainingPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div style={containerStyle}>
      
      {/* HEADER */}
      <div style={headerStyle}>
        <div style={iconContainerStyle}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
             <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
             <rect x="9" y="3" width="6" height="4" rx="2" />
             <path d="M9 14h6" />
             <path d="M9 18h6" />
             <path d="M9 10h2" />
          </svg>
        </div>
        <h1 style={titleStyle}>Entraînements</h1>
        <p style={subtitleStyle}>Visualisation & créations/strcturation des entrainements</p>
      </div>

      {/* ZONE DE CONSTRUCTION */}
      <div style={constructionCardStyle}>
        <div style={pulseCircleStyle}>
            <div style={innerCircleStyle}></div>
        </div>
        
        <h2 style={statusTitleStyle}>MODULE EN DÉVELOPPEMENT</h2>
        <p style={statusTextStyle}>
            Les ingénieurs travaillent sur le moteur de planification structurée.
        </p>

        <div style={featuresGridStyle}>
            <div style={featureItemStyle}>
                <span style={checkStyle}>⚡</span> Création de blocs (Z2, PMA, Seuil)
            </div>
            <div style={featureItemStyle}>
                <span style={checkStyle}>📅</span> Calendrier interactif
            </div>
            <div style={featureItemStyle}>
                <span style={checkStyle}>🔄</span> Import / Export (.zwo, .mrc)
            </div>
            <div style={featureItemStyle}>
                <span style={checkStyle}>🤖</span> Générateur IA
            </div>
        </div>

        <div style={progressBarContainerStyle}>
            <div style={progressBarFillStyle}></div>
        </div>
        <div style={progressTextStyle}>Système chargé à 45%</div>
      </div>

    </div>
  );
}

// --- STYLES ---
const containerStyle: React.CSSProperties = {
  padding: '2rem',
  maxWidth: '1200px',
  margin: '0 auto',
  minHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '3rem',
};

const iconContainerStyle: React.CSSProperties = {
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  background: 'rgba(208, 79, 215, 0.1)',
  border: '1px solid rgba(208, 79, 215, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 1.5rem auto',
  color: '#d04fd7',
  boxShadow: '0 0 30px rgba(208, 79, 215, 0.2)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '2.5rem',
  fontWeight: 800,
  margin: '0 0 0.5rem 0',
  background: 'linear-gradient(135deg, #fff 0%, #a0a0a0 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const subtitleStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '1.1rem',
  margin: 0,
};

const constructionCardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--secondary)',
  borderRadius: '24px',
  padding: '3rem',
  textAlign: 'center',
  maxWidth: '600px',
  width: '100%',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
};

const pulseCircleStyle: React.CSSProperties = {
  width: '12px',
  height: '12px',
  background: 'rgba(255, 107, 0, 0.2)',
  borderRadius: '50%',
  margin: '0 auto 1.5rem auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'pulse 2s infinite',
};

const innerCircleStyle: React.CSSProperties = {
  width: '6px',
  height: '6px',
  background: '#ff6b00',
  borderRadius: '50%',
};

const statusTitleStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 700,
  letterSpacing: '2px',
  color: '#ff6b00',
  marginBottom: '1rem',
  textTransform: 'uppercase',
};

const statusTextStyle: React.CSSProperties = {
  color: 'var(--text)',
  fontSize: '1.2rem',
  marginBottom: '2rem',
  lineHeight: 1.5,
};

const featuresGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
  textAlign: 'left',
  background: 'rgba(0,0,0,0.2)',
  padding: '1.5rem',
  borderRadius: '12px',
  marginBottom: '2rem',
};

const featureItemStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '0.9rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const checkStyle: React.CSSProperties = {
  opacity: 0.7,
};

const progressBarContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  background: 'var(--secondary)',
  borderRadius: '2px',
  overflow: 'hidden',
  marginBottom: '0.5rem',
};

const progressBarFillStyle: React.CSSProperties = {
  width: '45%',
  height: '100%',
  background: 'linear-gradient(90deg, #d04fd7, #ff6b00)',
  boxShadow: '0 0 10px rgba(208, 79, 215, 0.5)',
};

const progressTextStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  fontFamily: 'monospace',
};