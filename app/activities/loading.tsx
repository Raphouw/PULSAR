import React from 'react';

// -----------------------------------------------------------------------------
// COMPOSANT SKELETON CARD (Hautement fidèle au design original)
// -----------------------------------------------------------------------------
function SkeletonCard() {
  return (
    <div style={{ ...cardStyle, cursor: 'default' }} className="skeleton-anim">
      {/* Map Placeholder */}
      <div style={{ height: '160px', width: '100%', background: 'rgba(255, 255, 255, 0.03)' }} />
      
      <div style={{ padding: '1.5rem' }}>
        {/* Titre & Date Placeholder */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ height: '24px', width: '70%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '6px', marginBottom: '8px' }} />
          <div style={{ height: '14px', width: '40%', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '4px' }} />
        </div>
        
        {/* Badges Placeholder */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', height: '32px' }}>
          <div style={{ height: '26px', width: '75px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '20px' }} />
          <div style={{ height: '26px', width: '100px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '20px' }} />
        </div>
        
        {/* Ligne Stats 1 */}
        <div style={cardStatsLineStyle}>
          {[1, 2, 3].map(i => (
            <div key={`stat-row1-${i}`} style={statBoxInlineStyle}>
              <div style={{ height: '10px', width: '45px', background: 'rgba(255, 255, 255, 0.03)', margin: '0 auto 0.4rem', borderRadius: '4px' }} />
              <div style={{ height: '22px', width: '55px', background: 'rgba(255, 255, 255, 0.08)', margin: '0 auto', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
        
        {/* Ligne Stats 2 */}
        <div style={cardStatsLineStyle}>
          {[1, 2, 3].map(i => (
            <div key={`stat-row2-${i}`} style={statBoxInlineStyle}>
              <div style={{ height: '10px', width: '45px', background: 'rgba(255, 255, 255, 0.03)', margin: '0 auto 0.4rem', borderRadius: '4px' }} />
              <div style={{ height: '22px', width: '55px', background: 'rgba(255, 255, 255, 0.08)', margin: '0 auto', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PAGE LOADING PRINCIPALE
// -----------------------------------------------------------------------------
export default function LoadingActivities() {
  return (
    <div style={containerStyle}>
      {/* Injection de l'animation CSS */}
      <style>{`
        @keyframes shimmerSkeleton {
          0% { opacity: 0.4; }
          50% { opacity: 0.8; }
          100% { opacity: 0.4; }
        }
        .skeleton-anim {
          animation: shimmerSkeleton 1.5s infinite ease-in-out;
        }
      `}</style>

      {/* HEADER BANNER */}
      <div style={headerBannerStyle}>
        <div style={headerBannerContentStyle}>
          <h1 style={headerTitleStyle}>Toutes mes sorties</h1>
          <p style={headerSubtitleStyle}>Explorez votre historique complet d'entraînement</p>
        </div>
        
        {/* STATS HEADER SKELETONS */}
        <div style={statsHeaderGridStyle}>
          {['TOTAL SORTIES', 'DISTANCE TOTALE', 'DÉNIVELÉ CUMULÉ'].map((label, idx) => (
            <div key={idx} style={statHeaderCardStyle}>
              <div style={{ flex: 1 }}>
                <div style={statHeaderLabelStyle}>{label}</div>
                <div className="skeleton-anim" style={{ height: '32px', width: '60%', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px', marginTop: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FILTERS PLACEHOLDER */}
      <div style={filtersContainerStyle} className="skeleton-anim">
        <div style={searchAndSortRowStyle}>
          {/* Bouton Import Faux */}
          <div style={{ ...importButtonStyle, cursor: 'default' }}>
            <div style={{ height: '24px', width: '24px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px' }} />
          </div>

          {/* Barre de recherche Fausse */}
          <div style={searchWrapperStyle}>
            <div style={{ ...searchBarStyle, height: '55px', display: 'flex', alignItems: 'center' }}>
              <div style={{ height: '16px', width: '200px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px' }} />
            </div>
          </div>

          {/* Select Faux */}
          <div style={sortWrapperStyle}>
            <div style={{ ...sortSelectStyle, height: '55px' }} />
          </div>
        </div>

        {/* Multi-Filtres Faux */}
        <div style={multiFiltersRowStyle}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={filterGroupStyle}>
              <div style={{ height: '14px', width: '80px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', marginBottom: '0.75rem' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ height: '38px', width: '80px', background: 'rgba(14, 14, 20, 0.6)', borderRadius: '12px' }} />
                <div style={{ height: '38px', width: '90px', background: 'rgba(14, 14, 20, 0.6)', borderRadius: '12px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RESULT INFO SKELETON */}
      <div style={resultsInfoStyle}>
        <div className="skeleton-anim" style={{ height: '20px', width: '250px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '6px', margin: '0 auto' }} />
      </div>

      {/* GRID DES SKELETONS CARDS */}
      <div style={activityGridStyle}>
        {/* On affiche 6 cartes fantômes pour remplir l'écran */}
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// STYLES EXTRAITS DU COMPOSANT ORIGINAL
// -----------------------------------------------------------------------------
const containerStyle: React.CSSProperties = { maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem 2rem', minHeight: '100vh', width: '100%', overflowX: 'hidden' };
const headerBannerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, rgba(255, 107, 157, 0.15) 0%, rgba(208, 79, 215, 0.15) 50%, rgba(139, 92, 246, 0.15) 100%)', borderRadius: '24px', padding: '3rem 2rem', marginBottom: '2.5rem', border: '2px solid rgba(208, 79, 215, 0.2)', boxShadow: '0 8px 32px rgba(208, 79, 215, 0.1)' };
const headerBannerContentStyle: React.CSSProperties = { textAlign: 'center', marginBottom: '2.5rem' };
const headerTitleStyle: React.CSSProperties = { fontSize: '3.5rem', fontWeight: 900, margin: '0 0 0.75rem 0', background: 'linear-gradient(135deg, #ff6b9d 0%, #d04fd7 50%, #8b5cf6 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em', lineHeight: 1.1 };
const headerSubtitleStyle: React.CSSProperties = { fontSize: '1.2rem', color: '#c0c0c0', margin: 0, fontWeight: 500 };
const statsHeaderGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' };
const statHeaderCardStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'rgba(14, 14, 20, 0.6)', padding: '1.75rem', borderRadius: '16px', border: '2px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)' };
const statHeaderLabelStyle: React.CSSProperties = { fontSize: '0.7rem', color: '#a0a0a0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', fontWeight: 700 };
const filtersContainerStyle: React.CSSProperties = { marginBottom: '2rem', padding: '1.75rem', background: 'rgba(43, 43, 58, 0.4)', borderRadius: '20px', border: '2px solid rgba(255, 255, 255, 0.06)', display: 'flex', flexDirection: 'column', gap: '1.5rem' };
const searchAndSortRowStyle: React.CSSProperties = { display: 'flex', gap: '1rem', flexWrap: 'wrap' };
const searchWrapperStyle: React.CSSProperties = { flex: '1 1 300px' };
const searchBarStyle: React.CSSProperties = { width: '97%', background: 'rgba(14, 14, 20, 0.7)', border: '2px solid rgba(208, 79, 215, 0.2)', borderRadius: '14px' };
const sortWrapperStyle: React.CSSProperties = { flex: '0 1 250px' };
const sortSelectStyle: React.CSSProperties = { width: '100%', background: 'rgba(14, 14, 20, 0.9)', border: '2px solid rgba(208, 79, 215, 0.4)', borderRadius: '14px' };
const multiFiltersRowStyle: React.CSSProperties = { display: 'flex', gap: '1rem', flexWrap: 'wrap' };
const filterGroupStyle: React.CSSProperties = { flex: '1 1 250px' };
const importButtonStyle: React.CSSProperties = { height: '55px', width: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--secondary)', borderRadius: '12px', flexShrink: 0 };
const resultsInfoStyle: React.CSSProperties = { textAlign: 'center', marginBottom: '2rem' };
const activityGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem', marginBottom: '3rem', width: '100%', maxWidth: '100%', overflow: 'hidden' };
const cardStyle: React.CSSProperties = { marginTop: '10px', background: 'rgba(43, 43, 58, 0.5)', border: '2px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', overflow: 'hidden', height: '97%', width: '98%' };
const cardStatsLineStyle: React.CSSProperties = { display: 'flex', gap: '0.5rem', justifyContent: 'space-between' };
const statBoxInlineStyle: React.CSSProperties = { flex: 1, padding: '0.5rem 0.25rem', textAlign: 'center' };