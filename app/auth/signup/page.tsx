// Fichier : app/auth/signup/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import StravaButton from '../../../components/auth/StravaButton'; // 1. Import du bouton

// Injection des styles globaux (Animation Spinner)
const globalStyles = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = globalStyles;
  document.head.appendChild(styleSheet);
}

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const { data: session, status } = useSession();

  // --- Fonctions utilitaires ---
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  // Rediriger si l'utilisateur est déjà connecté
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name || !email || !password || !confirmPassword) {
      setError("Tous les champs sont obligatoires.");
      setLoading(false);
      return;
    }

    if (!isValidEmail(email)) {
      setError("Veuillez entrer une adresse email valide.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de l'inscription.");
      }

      router.push('/auth/signin?message=Inscription réussie ! Connectez-vous.');

    } catch (err: any) {
      console.error("Erreur inscription:", err);
      setError(err.message); 
    } finally {
      setLoading(false);
    }
  };

  // --- Rendu conditionnel initial ---
  if (status === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}><div style={loadingStyle}>Vérification de la session...</div></div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}><div style={loadingStyle}>Redirection vers le dashboard...</div></div>
      </div>
    );
  }

  // --- Rendu principal ---
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Créer un compte PULSAR</h1>
        <p style={subtitleStyle}>Rejoignez la communauté des athlètes !</p>

        {/* 2. Intégration du bouton Strava */}
        <StravaButton isSignup={true} />

        {/* 3. Séparateur Visuel */}
        <div style={dividerContainerStyle}>
            <div style={dividerLineStyle}></div>
            <span style={dividerTextStyle}>OU</span>
            <div style={dividerLineStyle}></div>
        </div>

        {/* ZONE D'ERREUR */}
        {error && (
          <div style={errorBannerStyle}>⚠️ {error}</div>
        )}

        {/* FORMULAIRE CLASSIQUE */}
        <form onSubmit={handleSignUp} style={formStyle}>
          <div style={inputContainerStyle}>
            <input
              type="text"
              placeholder="Nom/Pseudo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              required
              disabled={loading}
            />
          </div>

          <div style={inputContainerStyle}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div style={inputContainerStyle}>
            <div style={passwordInputContainer}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe (min 6 caractères)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{...inputStyle, paddingRight: '2.5rem'}}
                required
                autoComplete="new-password"
                disabled={loading}
              />
              <button type="button" onClick={togglePasswordVisibility} style={eyeButtonStyle} disabled={loading}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div style={inputContainerStyle}>
            <div style={passwordInputContainer}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{...inputStyle, paddingRight: '2.5rem'}}
                required
                autoComplete="new-password"
                disabled={loading}
              />
              <button type="button" onClick={toggleConfirmPasswordVisibility} style={eyeButtonStyle} disabled={loading}>
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            style={loading ? { ...submitButtonStyle, ...disabledButtonStyle } : submitButtonStyle} 
            disabled={loading}
          >
            {loading ? (
              <div style={buttonContentStyle}>
                <div style={spinnerStyle}></div>
                Inscription en cours...
              </div>
            ) : (
              "S'inscrire"
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={footerStyle}>
          <span style={footerTextStyle}>Déjà un compte ?</span>
          <Link 
            href="/auth/signin" 
            style={loading ? { ...linkStyle, ...disabledLinkStyle } : linkStyle}
            onClick={(e) => loading && e.preventDefault()}
          >
            Connectez-vous
          </Link>
        </div>

        <div style={securityInfoStyle}>
          <p style={securityTextStyle}>🔒 Vos données sont sécurisées et cryptées</p>
        </div>
      </div>
    </div>
  );
}

// --- Styles (Mise à jour avec les styles du séparateur) ---

const containerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%',
  background: 'var(--background, #F1FAEE)', padding: '1rem',
};
const cardStyle: React.CSSProperties = {
  width: '100%', maxWidth: '420px', padding: '2.5rem',
  background: 'var(--surface, #A8DADC)', borderRadius: '16px',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)', border: '1px solid var(--secondary, #1D3557)',
};
const titleStyle: React.CSSProperties = {
  color: 'var(--accent, #F77F00)', fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem',
};
const subtitleStyle: React.CSSProperties = {
  color: 'var(--text-secondary, #3A3A3A)', textAlign: 'center', marginBottom: '2rem', fontSize: '0.95rem',
};
// --- STYLES DU SÉPARATEUR AJOUTÉS ---
const dividerContainerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', margin: '1.5rem 0', gap: '1rem'
};
const dividerLineStyle: React.CSSProperties = {
  flex: 1, height: '1px', background: 'var(--secondary, #1D3557)', opacity: 0.5
};
const dividerTextStyle: React.CSSProperties = {
  color: 'var(--text-secondary, #3A3A3A)', fontSize: '0.8rem', fontWeight: 600
};
// -------------------------------------
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1.2rem' };
const inputContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const inputStyle: React.CSSProperties = {
  padding: '1rem', background: 'var(--secondary, #1D3557)', border: '1px solid var(--secondary, #1D3557)',
  borderRadius: '10px', color: 'var(--text, #0B090A)', fontSize: '1rem', outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s', width: '100%', boxSizing: 'border-box',
};
const passwordInputContainer: React.CSSProperties = { position: 'relative', width: '100%' };
const eyeButtonStyle: React.CSSProperties = {
  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem',
  borderRadius: '4px', color: 'var(--text-secondary, #3A3A3A)', transition: 'color 0.2s',
};
const submitButtonStyle: React.CSSProperties = {
  padding: '1rem', background: 'var(--accent, #F77F00)', color: 'var(--text, #0B090A)',
  border: 'none', borderRadius: '10px', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
  transition: 'all 0.2s', marginTop: '0.5rem', width: '100%',
};
const disabledButtonStyle: React.CSSProperties = { opacity: 0.6, cursor: 'not-allowed' };
const buttonContentStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' };
const spinnerStyle: React.CSSProperties = {
  width: '16px', height: '16px', border: '2px solid transparent',
  borderTop: '2px solid var(--text, #0B090A)', borderRadius: '50%', animation: 'spin 1s linear infinite',
};
const footerStyle: React.CSSProperties = { textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary, #3A3A3A)', fontSize: '0.9rem' };
const footerTextStyle: React.CSSProperties = { marginRight: '0.5rem' };
const linkStyle: React.CSSProperties = { color: 'var(--accent, #F77F00)', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' };
const disabledLinkStyle: React.CSSProperties = { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' };
const errorBannerStyle: React.CSSProperties = {
  background: 'rgba(230, 57, 70, 0.15)', border: '1px solid #E63946', color: '#E63946',
  padding: '0.8rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', fontWeight: 500,
};
const loadingStyle: React.CSSProperties = { textAlign: 'center', padding: '2rem', color: 'var(--text, #0B090A)', fontSize: '1.1rem', fontWeight: 500 };
const securityInfoStyle: React.CSSProperties = {
  marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--secondary, #1D3557)', textAlign: 'center',
};
const securityTextStyle: React.CSSProperties = { color: 'var(--text-secondary, #3A3A3A)', fontSize: '0.8rem', margin: 0 };