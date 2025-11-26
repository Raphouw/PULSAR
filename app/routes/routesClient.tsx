// Fichier : app/routes/routesClient.tsx
'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Modal } from '../../components/ui/modal';

// Import dynamique de la MiniMap
const MiniMap = dynamic(() => import('../../components/ui/miniMap'), {
  ssr: false,
  loading: () => <div style={miniMapLoadingStyle}>Chargement...</div>,
});

type Route = {
  id: number;
  name: string;
  distance_km: number;
  elevation_gain_m: number;
  created_at: string;
  gpx_data?: string | {
    geometry?: { type: string; coordinates: number[][] };
    map_polyline?: string;
    elevation_loss_m?: number; 
  } | null;
};

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

// --- HELPER: EXTRACTION ROBUSTE DU POLYLINE ---
const getEncodedPolyline = (route: Route): string | null => {
    try {
        const data = route.gpx_data;
        if (typeof data === 'string' && data.length > 0) return data;
        if (data && typeof data === 'object' && data.map_polyline) return data.map_polyline;
        return null;
    } catch (e) {
        return null;
    }
};



// --- HELPER: TAGS & COULEURS NÉON ---
const getRouteTags = (route: Route) => {
    const tags: { label: string; color: string }[] = [];
    const ratio = route.distance_km > 0 ? route.elevation_gain_m / route.distance_km : 0;
    
    // On arrondit pour le check du "100" pile (tolérance 99.5 - 100.4)
    const isCentury = Math.round(route.distance_km) === 100;

    // 1. Tags Distance
    if (route.distance_km > 250) {
        tags.push({ label: "ULTRA", color: "#ff00ff" }); // Magenta
    } 
    else if (route.distance_km > 125 && route.distance_km <= 250) {
        tags.push({ label: "LONGUE", color: "#00ffff" }); // Cyan
    } 
    else if (isCentury) {
        tags.push({ label: "100 !!!", color: "#ffd700" }); // Or
    }
    else if (route.distance_km > 80 && route.distance_km <= 125) {
        tags.push({ label: "MOYENNE", color: "#39ff14" }); // Vert fluo
    } 
    else if (route.distance_km <= 80) {
        tags.push({ label: "COURTE", color: "#ff0080" }); // Rose fuchsia
    }

    // 2. Tags Relief
    if (ratio > 25) {
        tags.push({ label: "HAUTE MONTAGNE", color: "#ff073a" }); // Rouge néon
    } 
    else if (ratio > 15) {
        tags.push({ label: "MOYENNE MONTAGNE", color: "#ffaa00" }); // Orange fluo
    } 
    else if (ratio > 8 && route.distance_km > 50) {
        tags.push({ label: "VALLONNÉ", color: "#ffea00" }); // Jaune néon
    } 
    else if (ratio > 8 && route.distance_km <= 50) {
        tags.push({ label: "RYTHMÉ", color: "#00ff88" }); // Vert menthe
    } 
    else {
        tags.push({ label: "ROULANT", color: "#00ffbf" }); // Turquoise
    }

    // Note : Les tags "MURS" (>15%) et "PLAT" (<5%) ne sont pas inclus ici 
    // car ils nécessitent le calcul complet du GPX (analytics) qui est trop lourd 
    // à faire tourner pour chaque carte de la liste. Ils restent visibles dans le détail.

    return tags;
};

// --- COMPOSANT CARTE ---
const RouteCard = ({ route, onDelete }: { route: Route; onDelete: (id: number) => void }) => {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  
  const encodedPolyline = useMemo(() => getEncodedPolyline(route), [route]); 
  const tags = useMemo(() => getRouteTags(route), [route]);

  // Couleur principale basée sur le premier tag (Distance)
  const mainColor = tags[0]?.color || '#d04fd7';

  const elevationLoss = useMemo(() => {
      if (route.gpx_data && typeof route.gpx_data === 'object' && 'elevation_loss_m' in route.gpx_data) {
          return Math.round(route.gpx_data.elevation_loss_m || 0);
      }
      return 0;
  }, [route]);

  const handleCardClick = () => router.push(`/routes/${route.id}`);

  const handleSimulateClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      router.push(`/simulations/new?routeId=${route.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete(route.id);
  };

  return (
    <div 
      onClick={handleCardClick}
      style={{
        ...cardStyle,
        transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: isHovered 
            ? `0 20px 40px ${mainColor}20, 0 0 0 1px ${mainColor}60` 
            : '0 4px 15px rgba(0, 0, 0, 0.2)',
        borderTop: `4px solid ${mainColor}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
        {/* Bouton Supprimer */}
        {isHovered && (
            <button onClick={handleDeleteClick} style={deleteButtonStyle} title="Supprimer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        )}

        {/* Zone Carte */}
        <div style={{ position: 'relative', height: '200px', background: 'var(--secondary)' }}>
            {encodedPolyline ? (
                <MiniMap encodedPolyline={encodedPolyline} />
            ) : (
                <div style={miniMapPlaceholderStyle}>
                    <span style={{ fontSize: '2rem' }}>🗺️</span>
                    <span style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Aperçu non disponible</span>
                </div>
            )}
            
            {/* 🔥 NOUVEAU : BADGES TAGS (Z-INDEX 1000 pour passer au dessus de Leaflet) */}
            <div style={{
                position: 'absolute', 
                bottom: '12px', 
                left: '12px', 
                right: '12px', 
                zIndex: 1000, // <-- LE FIX EST ICI
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '6px',
                pointerEvents: 'none' // Pour ne pas bloquer les clics sur la map en dessous
            }}>
                {tags.map((tag, i) => (
                    <span key={i} style={{
                        background: 'rgba(0, 0, 0, 0.8)', 
                        backdropFilter: 'blur(4px)',
                        padding: '4px 8px', 
                        borderRadius: '6px',
                        border: `1px solid ${tag.color}`,
                        color: tag.color, 
                        fontSize: '0.65rem', 
                        fontWeight: 800, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px',
                        boxShadow: `0 0 15px ${tag.color}40` // Glow effect
                    }}>
                        {tag.label}
                    </span>
                ))}
            </div>
        </div>

        {/* Infos & Stats */}
        <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
                <h3 style={cardTitleStyle}>{route.name}</h3>
                <p style={cardDateStyle}>Ajouté le {new Date(route.created_at).toLocaleDateString()}</p>
            </div>
            
            <div style={cardStatsLineStyle}>
                <div style={statBoxInlineStyle}>
                    <div style={statLabelStyle}>DIST</div>
                    <div style={{...statValueStyle, color: '#10b981'}}>{route.distance_km.toFixed(1)}<small>km</small></div>
                </div>
                <div style={statBoxInlineStyle}>
                    <div style={statLabelStyle}>D+</div>
                    <div style={{...statValueStyle, color: '#f59e0b'}}>{route.elevation_gain_m.toFixed(0)}<small>m</small></div>
                </div>
                 <div style={statBoxInlineStyle}>
                    <div style={statLabelStyle}>D-</div>
                    <div style={{...statValueStyle, color: '#3b82f6'}}>{elevationLoss}<small>m</small></div>
                </div>
            </div>

            <button onClick={handleSimulateClick} style={simulateBigButtonStyle}>
                ⚡ SIMULER LE PARCOURS
            </button>
        </div>
    </div>
  );
};

// --- CLIENT PRINCIPAL ---
export default function RoutesClient({ initialRoutes }: { initialRoutes: Route[] }) {
  const router = useRouter();
  const [routes, setRoutes] = useState(initialRoutes);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mountain' | 'flat'>('all');
  
  const [isUploading, setIsUploading] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<number | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 21;

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      setRoutes(initialRoutes);
  }, [initialRoutes]);

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let success = 0;
    
    for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        try {
            const res = await fetch('/api/routes/upload', { method: 'POST', body: formData });
            if (res.status === 409) addToast(`Doublon ignoré : ${files[i].name}`, 'info');
            else if (!res.ok) throw new Error();
            else success++;
        } catch { addToast(`Erreur sur ${files[i].name}`, 'error'); }
    }

    if (success > 0) {
        addToast(`${success} parcours importés avec succès`, 'success');
        router.refresh(); 
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmDelete = async () => {
      if (!routeToDelete) return;
      try {
          const res = await fetch('/api/routes/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ routeId: routeToDelete })
          });

          if (!res.ok) throw new Error("Erreur suppression");
          
          setRoutes(prev => prev.filter(r => r.id !== routeToDelete));
          addToast("Itinéraire supprimé.", 'success');
      } catch (err) {
          addToast("Erreur lors de la suppression.", 'error');
      } finally {
          setRouteToDelete(null);
      }
  };

  const filteredRoutes = useMemo(() => {
      return routes.filter(r => {
          const matchesSearch = searchQuery ? r.name.toLowerCase().includes(searchQuery.toLowerCase()) : true;
          const ratio = r.elevation_gain_m / (r.distance_km || 1);
          
          if (filterType === 'mountain') return matchesSearch && ratio > 20;
          if (filterType === 'flat') return matchesSearch && ratio < 10;
          return matchesSearch;
      });
  }, [routes, searchQuery, filterType]);

  const totalKm = Math.round(filteredRoutes.reduce((acc, r) => acc + r.distance_km, 0));
  const totalEle = Math.round(filteredRoutes.reduce((acc, r) => acc + r.elevation_gain_m, 0));
  const totalRoutes = filteredRoutes.length;

  const totalPages = Math.ceil(filteredRoutes.length / itemsPerPage);
  const paginatedRoutes = filteredRoutes.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  const goToPage = (page: number) => {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={containerStyle}>
      <div style={headerBannerStyle}>
        <div style={headerBannerContentStyle}>
          <h1 style={headerTitleStyle}>Bibliothèque de Parcours</h1>
          <p style={headerSubtitleStyle}>Planifiez, Simulez, Conquérez.</p>
        </div>
        <div style={statsHeaderGridStyle}>
            <div style={statHeaderCardStyle}><div style={statHeaderLabelStyle}>PARCOURS VISIBLES</div><div style={{...statHeaderValueStyle, color: '#d04fd7'}}>{totalRoutes}</div></div>
            <div style={statHeaderCardStyle}><div style={statHeaderLabelStyle}>DISTANCE TOTALE</div><div style={{...statHeaderValueStyle, color: '#10b981'}}>{totalKm} <small style={{fontSize:'1rem'}}>km</small></div></div>
            <div style={statHeaderCardStyle}><div style={statHeaderLabelStyle}>D+ CUMULÉ</div><div style={{...statHeaderValueStyle, color: '#f59e0b'}}>{totalEle} <small style={{fontSize:'1rem'}}>m</small></div></div>
        </div>
      </div>

      <div style={toolbarStyle}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, flexWrap: 'wrap' }}>
            <input 
                type="text" placeholder="Rechercher..." value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                style={searchInputStyle}
            />
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '4px' }}>
                <button onClick={() => { setFilterType('all'); setCurrentPage(1); }} style={filterType === 'all' ? filterBtnActive : filterBtn}>Tous</button>
                <button onClick={() => { setFilterType('flat'); setCurrentPage(1); }} style={filterType === 'flat' ? filterBtnActive : filterBtn}>Plat</button>
                <button onClick={() => { setFilterType('mountain'); setCurrentPage(1); }} style={filterType === 'mountain' ? filterBtnActive : filterBtn}>Montagne</button>
            </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
            <input type="file" accept='.gpx' multiple onChange={handleFileUpload} style={{ display: 'none' }} ref={fileInputRef} />
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} style={secondaryButtonStyle}>
                {isUploading ? '⏳' : '📂 Import GPX'}
            </button>
        </div>
      </div>

      <div style={gridStyle}>
          {paginatedRoutes.map(route => (
              <RouteCard key={route.id} route={route} onDelete={setRouteToDelete} />
          ))}
      </div>

      {filteredRoutes.length === 0 && (
          <div style={emptyStateStyle}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏔️</div>
              <h3>Aucun parcours trouvé</h3>
          </div>
      )}

      {totalPages > 1 && (
        <div style={paginationContainerStyle}>
             <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={{...paginationButtonStyle, opacity: currentPage === 1 ? 0.5 : 1}}>Précédent</button>
             <div style={pageInfoStyle}>Page <span style={{color: 'var(--text)', fontWeight: 'bold'}}>{currentPage}</span> / {totalPages}</div>
             <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} style={{...paginationButtonStyle, opacity: currentPage === totalPages ? 0.5 : 1}}>Suivant</button>
        </div>
      )}

      <Modal isOpen={!!routeToDelete} onClose={() => setRouteToDelete(null)} title="Supprimer">
         <div style={{ color: 'var(--text)' }}>
            <p>Supprimer définitivement ce parcours ?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button onClick={() => setRouteToDelete(null)} style={cancelButtonStyle}>Annuler</button>
                <button onClick={confirmDelete} style={deleteConfirmButtonStyle}>Supprimer</button>
            </div>
         </div>
      </Modal>

      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {toasts.map(t => (
              <div key={t.id} style={{
                  padding: '12px 20px', borderRadius: '8px', color: '#fff',
                  background: t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : '#3b82f6',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)', animation: 'slideIn 0.3s ease-out'
              }}>
                  {t.message}
              </div>
          ))}
      </div>
    </div>
  );
}

// --- STYLES ---
const miniMapLoadingStyle: React.CSSProperties = { height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' };
const miniMapPlaceholderStyle: React.CSSProperties = { ...miniMapLoadingStyle, flexDirection: 'column', color: 'var(--text-secondary)' };
const cardStyle: React.CSSProperties = { background: 'var(--surface)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--secondary)', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' };
const deleteButtonStyle: React.CSSProperties = { position: 'absolute', top: '10px', left: '10px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10000, boxShadow: '0 4px 10px rgba(0,0,0,0.3)' };

const containerStyle: React.CSSProperties = { maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem 4rem', minHeight: '100vh' };
const headerBannerStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #2E1035 0%, #120F1D 100%)', 
  borderRadius: '24px', padding: '3rem 2rem', marginBottom: '2rem',
  border: '1px solid rgba(255, 100, 200, 0.15)', 
  boxShadow: '0 20px 50px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden'
};
const headerBannerContentStyle: React.CSSProperties = { textAlign: 'center', marginBottom: '3rem', position: 'relative', zIndex: 2 };
const headerTitleStyle: React.CSSProperties = {
  fontSize: '3.2rem', fontWeight: 900, margin: '0 0 0.5rem 0',
  background: 'linear-gradient(90deg, #ff6b9d 0%, #d04fd7 50%, #8b5cf6 100%)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px'
};
const headerSubtitleStyle: React.CSSProperties = { fontSize: '1.1rem', color: '#c0b0c5', margin: 0 };
const statsHeaderGridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 2
};
const statHeaderCardStyle: React.CSSProperties = {
  textAlign: 'center', padding: '1.5rem', background: 'rgba(15, 12, 20, 0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(5px)'
};
const statHeaderLabelStyle: React.CSSProperties = { fontSize: '0.65rem', color: '#a0a0a0', fontWeight: 700, marginBottom: '0.8rem', letterSpacing: '1.5px', textTransform: 'uppercase' };
const statHeaderValueStyle: React.CSSProperties = { fontSize: '2rem', fontWeight: 900, lineHeight: 1 };
const toolbarStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem',
    background: 'var(--surface)', padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--secondary)'
};
const searchInputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--secondary)', color: 'var(--text)',
    padding: '0.8rem 1.2rem', borderRadius: '10px', fontSize: '0.95rem', flex: 1, minWidth: '250px'
};
const filterBtn: React.CSSProperties = {
    background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '0.6rem 1.2rem',
    cursor: 'pointer', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s'
};
const filterBtnActive: React.CSSProperties = {
    ...filterBtn, background: 'var(--surface)', color: 'var(--text)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
};
const secondaryButtonStyle: React.CSSProperties = {
    background: 'var(--accent)', color: 'white', border: 'none', padding: '0.8rem 1.5rem',
    borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
};
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' };
const cardTitleStyle: React.CSSProperties = { fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.2rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const cardDateStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 };
const cardStatsLineStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '10px', gap: '4px' };
const statBoxInlineStyle: React.CSSProperties = { textAlign: 'center', flex: 1 };
const statLabelStyle: React.CSSProperties = { fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 };
const statValueStyle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 800, color: '#fff' };

const simulateBigButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.8rem',
    background: 'linear-gradient(135deg, #d04fd7 0%, #8b5cf6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 800,
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(208, 79, 215, 0.3)',
    transition: 'all 0.2s ease',
};

const emptyStateStyle: React.CSSProperties = { textAlign: 'center', padding: '4rem', gridColumn: '1 / -1', background: 'var(--surface)', borderRadius: '16px', border: '2px dashed var(--secondary)' };
const deleteConfirmButtonStyle: React.CSSProperties = { padding: '0.6rem 1.2rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const cancelButtonStyle: React.CSSProperties = { padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid var(--text-secondary)', color: 'var(--text)', borderRadius: '8px', cursor: 'pointer' };
const paginationContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem 0', gap: '1.5rem', marginTop: '1rem' };
const paginationButtonStyle: React.CSSProperties = { padding: '0.6rem 1.2rem', background: 'var(--surface)', border: '1px solid var(--secondary)', color: 'var(--text)', borderRadius: '8px', fontWeight: 600 };
const pageInfoStyle: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: '0.9rem' };