// Fichier : app/components/layout/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';
import { useSession } from 'next-auth/react';

// --- ICÔNES SVG PRO (Inchangées) ---
const Icons = {
  Dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
  ),
  Activity: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
  ),
  Calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
  ),
  Events: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="m13 16 2 2 4-4"></path></svg>
  ),
  Training: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  ),
  TrainingPlan: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="2" />
      <path d="M9 14h6" />
      <path d="M9 18h6" />
      <path d="M9 10h2" />
    </svg>
  ),
  Simulation: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h5l3 5 5-11 4 8h3"></path><path d="M12 2v2"></path><path d="M12 22v-2"></path></svg>
  ),
  Route: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
  ),
  Segment: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"></path></svg>
  ),
  Friends: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
  ),
  Compare: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"></path><path d="M21 3l-7 7"></path><path d="M8 21H3v-5"></path><path d="M3 21l7-7"></path></svg>
  ),
  Profile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
  ),
  Map: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
  ),
  Algo: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
  ),
  World: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
  ),
};

// Organisation des liens
const groups = [
  {
    title: "Performance",
    links: [
      { href: '/dashboard', label: 'Dashboard', icon: Icons.Dashboard },
      { href: '/activities', label: 'Activités', icon: Icons.Activity },
      { href: '/calendar', label: 'Calendrier', icon: Icons.Calendar },
      { href: '/entrainements', label: 'Entrainements ', icon: Icons.Training },
    ]
  },
  {
    title: "Planification",
    links: [
      { href: '/training-plan', label: "Plan d'entraînement", icon: Icons.TrainingPlan },
      { href: '/simulations', label: 'Simulations', icon: Icons.Simulation },
      { href: '/comparaisons', label: 'Comparaisons', icon: Icons.Compare },
      { href: '/routes', label: 'Itinéraires', icon: Icons.Route },
      { href: '/segments', label: 'Montées & Cols', icon: Icons.Segment },
      { href: '/carte', label: 'Carte Globale', icon: Icons.Map },
    ]
  },
  {
    title: "Social & Données",
    links: [
      { href: '/friends', label: 'Communauté', icon: Icons.Friends },
      { href: '/world', label: 'Arbre-Monde', icon: Icons.World },
      { href: '/events', label: 'Événements', icon: Icons.Events },
      { href: '/profildata', label: 'Mon Profil', icon: Icons.Profile },
      { href: '/algo', label: 'Algorithmes', icon: Icons.Algo },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  // 🔥 VÉRIFICATION DU LOCK (Basé sur la session)
  // Si onboarding_completed est FALSE, on verrouille.
  const isLocked = session?.user?.onboarding_completed === false;

  return (
    <nav 
        // 🔥 APPLICATION DU STYLE DE VERROUILLAGE
        style={{
            ...navStyle,
            ...(isLocked ? {
                opacity: 0.3,           // Rendre transparent/grisé
                pointerEvents: 'none',  // Empêcher tout clic
                filter: 'grayscale(100%)', // Optionnel : Tout en gris
                transition: 'all 0.5s ease' // Transition douce
            } : {})
        }}
    >
      {/* LOGO ÉLABORÉ */}
      <div style={headerStyle}>
        <div style={logoWrapperStyle}>
           <div style={logoGlowStyle} />
           
           <span style={logoTextStyle}>PULSAR</span>
           
        </div>
        <div style={versionStyle}>DEV</div>
      </div>

      {/* LISTE DES LIENS */}
      <div style={scrollAreaStyle}>
        {groups.map((group, index) => (
          <div key={index} style={groupContainerStyle}>
            <div style={groupHeaderStyle}>
               <span style={groupTitleStyle}>{group.title}</span>
               <div style={groupLineStyle}></div>
            </div>
            
            <ul style={ulStyle}>
              {group.links.map((link) => {
                const isActive = pathname?.startsWith(link.href) ?? false;
                const isHovered = hoveredLink === link.href;

                return (
                  <li key={link.href} style={{ marginBottom: '2px' }}>
                    <Link
                      href={link.href}
                      style={getLinkStyle(isActive, isHovered)}
                      onMouseEnter={() => setHoveredLink(link.href)}
                      onMouseLeave={() => setHoveredLink(null)}
                    >
                      {/* Indicateur actif */}
                      {isActive && <div style={activeIndicatorStyle} />}
                      
                      {/* Icône */}
                      <span style={{ 
                        marginRight: '12px', 
                        display: 'flex', 
                        color: isActive ? '#d04fd7' : 'var(--text-secondary)',
                        transition: 'color 0.2s'
                      }}>
                        {link.icon}
                      </span>
                      
                      {/* Texte */}
                      <span style={{ fontWeight: isActive ? 600 : 400 }}>
                        {link.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* PIED DE PAGE (USER) */}
      {session?.user && (
        <div style={footerStyle}>
          <div style={avatarPlaceholderStyle}>
              
             0{session.user.name?.charAt(0) || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={userNameStyle}>{session.user.name}</div>
            <div style={userRoleStyle}>Athlète</div>
          </div>
        </div>
      )}
    </nav>
  );
}

// --- STYLES PRO (Inchangés) ---

const navStyle: React.CSSProperties = {
  width: 'var(--sidebar-width)',
  height: '100vh',
  position: 'fixed',
  top: 0,
  left: 0,
  background: 'var(--background)',
  borderRight: '1px solid var(--secondary)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 50,
};

const headerStyle: React.CSSProperties = {
  padding: '2rem 1.5rem 1rem 1.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
};

const logoWrapperStyle: React.CSSProperties = {
  position: 'relative',
};

const logoTextStyle: React.CSSProperties = {
  fontSize: '1.8rem',
  fontWeight: 900,
  letterSpacing: '-1px',
  fontFamily: 'system-ui, sans-serif',
  background: 'linear-gradient(135deg, #d04fd7 0%, #d70f9bff 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  filter: 'drop-shadow(0 0 15px rgba(208, 79, 215, 0.3))', 
};

const logoGlowStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '120%',
  height: '120%',
  background: 'radial-gradient(circle, rgba(208, 79, 215, 0.2) 0%, transparent 70%)',
  filter: 'blur(15px)',
  zIndex: -1
};

const versionStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  color: 'var(--text-secondary)',
  fontWeight: '600',
  background: 'rgba(255,255,255,0.05)',
  padding: '2px 6px',
  borderRadius: '4px',
  border: '1px solid rgba(255,255,255,0.05)'
};

const scrollAreaStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '1rem 1rem',
  scrollbarWidth: 'none', 
  msOverflowStyle: 'none',
};

const groupContainerStyle: React.CSSProperties = {
  marginBottom: '2rem',
};

const groupHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '0.8rem',
    paddingLeft: '0.8rem'
};

const groupTitleStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  fontWeight: 700,
  letterSpacing: '1px',
  opacity: 0.7,
};

const groupLineStyle: React.CSSProperties = {
    flex: 1,
    height: '1px',
    background: 'var(--secondary)',
    marginLeft: '10px',
    opacity: 0.5
};

const ulStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

const getLinkStyle = (isActive: boolean, isHovered: boolean): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '0.65rem 0.8rem',
    color: isActive ? '#fff' : 'var(--text-secondary)',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
  };

  if (isActive) {
    return {
      ...baseStyle,
      background: 'rgba(208, 79, 215, 0.08)',
    };
  }

  if (isHovered) {
    return {
      ...baseStyle,
      background: 'var(--surface)',
      color: 'var(--text)',
    };
  }

  return baseStyle;
};

const activeIndicatorStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: '15%',
  height: '70%',
  width: '3px',
  background: '#d04fd7',
  borderRadius: '0 4px 4px 0',
  boxShadow: '0 0 8px rgba(208, 79, 215, 0.5)'
};

const footerStyle: React.CSSProperties = {
  padding: '1rem 1.5rem',
  borderTop: '1px solid var(--secondary)',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: 'var(--surface)',
};

const avatarPlaceholderStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #d04fd7 0%, #8b5cf6 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontWeight: 'bold',
  fontSize: '0.8rem',
  flexShrink: 0,
};

const userNameStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--text)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const userRoleStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--text-secondary)',
};