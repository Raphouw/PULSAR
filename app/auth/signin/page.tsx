// Fichier : app/auth/signin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import StravaButton from '../../../components/auth/StravaButton';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Gestion des erreurs renvoyées par NextAuth (ex: OAuthAccountNotLinked)
  useEffect(() => {
    const errorParam = searchParams?.get('error');
    if (errorParam === 'OAuthAccountNotLinked') {
      setError("Cet email est déjà utilisé par un autre compte. Connectez-vous avec vos identifiants classiques puis liez Strava depuis le dashboard.");
    } else if (errorParam === 'CredentialsSignin') {
      setError("Identifiants incorrects.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("Email ou mot de passe invalide.");
      setIsLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div style={pageContainerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
           <h1 style={titleStyle}>PULSAR</h1>
           <p style={subtitleStyle}>Identification</p>
        </div>

        {/* Bouton Strava (Mis en avant) */}
        <StravaButton />

        <div style={dividerContainerStyle}>
            <div style={dividerLineStyle}></div>
            <span style={dividerTextStyle}>OU</span>
            <div style={dividerLineStyle}></div>
        </div>

        {/* Formulaire Classique */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={errorStyle}>{error}</div>}
          
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="Cycling@pulsar.app"
              required
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            style={submitButtonStyle}
          >
            {isLoading ? 'Authentification...' : 'Connexion'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Nouvel utilisateur ? <Link href="/auth/signup" style={linkStyle}>Créer un compte</Link>
        </div>
      </div>
    </div>
  );
}

// --- Styles ---
const pageContainerStyle: React.CSSProperties = {
  minHeight: '96vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--background)', padding: '1rem'
};
const cardStyle: React.CSSProperties = {
  width: '100%', maxWidth: '400px', background: 'var(--surface)',
  padding: '2.5rem', borderRadius: '20px', border: '1px solid var(--secondary)',
  boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
};
const titleStyle: React.CSSProperties = {
  fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '2px',
  background: 'linear-gradient(90deg, #d04fd7, #ff3c00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
};
const subtitleStyle: React.CSSProperties = {
  color: 'var(--text-secondary)', marginTop: '0.5rem', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px'
};
const dividerContainerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', margin: '1.5rem 0', gap: '1rem'
};
const dividerLineStyle: React.CSSProperties = {
  flex: 1, height: '1px', background: 'var(--secondary)'
};
const dividerTextStyle: React.CSSProperties = {
  color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600
};
const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.5rem' };
const labelStyle: React.CSSProperties = { fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600 };
const inputStyle: React.CSSProperties = {
  padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--secondary)',
  background: 'rgba(0,0,0,0.2)', color: 'var(--text)', outline: 'none', fontSize: '1rem'
};
const submitButtonStyle: React.CSSProperties = {
  padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--text-secondary)',
  background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontWeight: 600,
  marginTop: '0.5rem', transition: 'all 0.2s'
};
const errorStyle: React.CSSProperties = {
  background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.8rem',
  borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center'
};
const linkStyle: React.CSSProperties = { color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 };