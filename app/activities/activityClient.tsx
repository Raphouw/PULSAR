'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Session } from 'next-auth';
import { ActivityCardData } from '../../types/next-auth.d'; 
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Modal } from '../../components/ui/modal'; // 🔥 Import du Modal

const MiniMap = dynamic(() => import('../../components/ui/miniMap'), {
  ssr: false,
  loading: () => <div style={miniMapLoadingStyle}>Chargement...</div>,
});

interface Badge {
  label: string;
  color: string;
  icon?: string;
  category: 'distance' | 'elevation' | 'special' | 'HT' | 'intensity';
}

interface FilterOptions {
  distances: Set<'short' | 'medium' | 'long' | 'ultra'>;
  terrains: Set<'flat' | 'hilly' | 'mountain'>;
  Home_trainer: Set<'HT'>;
  IntensityHT: Set<'Recup' | 'Z2' | 'Tempo'| 'SS' | 'Intense'>;
  specialBadge: 'all' | 'power' | 'speed' | 'distance' | 'elevation' | 'tss';
}

function ActivityCard({ activity, specialBadges, onDelete }: { activity: ActivityCardData; specialBadges: Map<string, Badge>; onDelete: (id: number) => void; }) {
  const [isHovered, setIsHovered] = useState(false);
  
  // --- LOGIQUE STANDARD (EXTÉRIEUR) ---
  const getDistanceBadge = (distanceKm: number): Badge => {
    if (distanceKm < 50) return { label: 'Courte', color: '#00F5FF', category: 'distance' };
    if (distanceKm < 100) return { label: 'Moyenne', color: '#00FF8F', category: 'distance' };
    if (distanceKm < 250 ) return { label: 'Longue', color: '#F8FF00', category: 'distance' };
    return { label: 'Ultra', color: '#FF00E0', category: 'distance' };
  };

  const getElevationBadge = (elevationM: number, distanceKm: number): Badge => {
    const elevationPerKm = distanceKm > 0 ? elevationM / distanceKm : 0;
    if (elevationPerKm < 10) return { label: 'Plate', color: '#00FFBF', category: 'elevation' };
    if (elevationPerKm < 20) return { label: 'Accidentée', color: '#F7FF00', category: 'elevation' };
    return { label: 'Montagneuse', color: '#FF0066', category: 'elevation' };
  };

  // --- LOGIQUE HOME TRAINER ---
  const getIntensityBadge = (tss: number, durationSeconds: number): Badge => {
    // Sécurité division par zéro
    if (!durationSeconds || durationSeconds === 0) return { label: 'Endurance Z2', color: '#10b981', category: 'special' };
    
    const durationHours = durationSeconds / 3600;
    const tssPerHour = tss / durationHours;

    if (tssPerHour >= 90) {
        return { label: 'Intense', color: '#FF0033', category: 'intensity' }; // Rouge
    } else if (tssPerHour >= 70) {
        return { label: 'SweeSpot ', color: '#ff8400ff', category: 'intensity' }; // Orange   
    } 
     else if (tssPerHour >= 55) {
        return { label: 'Tempo', color: '#FFB800', category: 'intensity' }; // Orange
    } else if (tssPerHour >= 40){
        return { label: 'Z2', color: '#00FF88', category: 'intensity' }; // Vert
    } else {
        return { label: 'Récup', color: '#00fff7ff', category: 'intensity' }; // Vert
    }

  };

  // --- CONSTRUCTION DES BADGES ---
  const isVirtual = activity.type === 'VirtualRide';
  let displayedBadges: Badge[] = [];

  if (isVirtual) {
    // 1. Badge Home Trainer (Unique)
    displayedBadges.push({ 
        label: 'Home Trainer', 
        color: '#C900FF', // Violet Néon style Zwift
        icon: '', 
        category: 'HT' 
    });

    // 2. Badge Intensité (Basé sur TSS/h)
    const intensityBadge = getIntensityBadge(activity.tss ?? 0, activity.duration_s ?? 0);
    displayedBadges.push(intensityBadge);

  } else {
    // Logique Classique (Extérieur)
    displayedBadges.push(getDistanceBadge(activity.distance_km ?? 0));
    displayedBadges.push(getElevationBadge(activity.elevation_gain_m ?? 0, activity.distance_km ?? 1));
    const intensityBadge = getIntensityBadge(activity.tss ?? 0, activity.duration_s ?? 0);
    displayedBadges.push(intensityBadge);
  }

  // 3. Badge Global Spécial (Watt Max, Fusée, etc.) - On le garde toujours car c'est une distinction
  const specialBadge = specialBadges.get(String(activity.id)); 
  if (specialBadge) {
    displayedBadges.push(specialBadge);
  }

  // --- DELETE HANDLER ---
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(activity.id);
  };

  return (
    <div 
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
        <Link href={`/activities/${activity.id}`} style={cardLinkStyle}>
            <div style={{
                ...cardStyle,
                transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
                boxShadow: isHovered 
                  ? '0 20px 40px rgba(208, 79, 215, 0.3), 0 0 0 2px rgba(208, 79, 215, 0.2)' 
                  : '0 4px 15px rgba(0, 0, 0, 0.2)',
            }}>
                <div style={{ position: 'relative' }}>
                {activity.polyline?.polyline ? (
                    <MiniMap 
                        key={`map-${activity.id}`} 
                        encodedPolyline={activity.polyline.polyline} 
                    />
                ) : (
                    <div style={miniMapPlaceholderStyle}>Pas de tracé</div>
                )}
                </div>

                <div style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <h3 style={cardTitleStyle}>{activity.name}</h3>
                        <p style={cardDateStyle}>
                        {new Date(activity.start_time).toLocaleDateString('fr-FR', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}
                        </p>
                    </div>
                    
                    {/* BADGES SECTION */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem', minHeight: '32px' }}>
                        {displayedBadges.map((badge, index) => (
                        <span 
                            key={index} 
                            style={{
                            ...activityBadgeStyle,
                            ...(badge.category === 'special' ? specialBadgeStyle : {}), 
                            background: badge.color,
                            }}
                        >
                            {badge.icon && `${badge.icon} `}{badge.label}
                        </span>
                        ))}
                    </div>
                    
                    <div style={cardStatsLineStyle}>
                        <div style={statBoxInlineStyle}>
                        <div style={statLabelStyle}>Distance</div>
                        <div style={{...statValueInlineStyle, color: '#10b981'}}>{activity.distance_km} km</div>
                        </div>
                        <div style={statBoxInlineStyle}>
                        <div style={statLabelStyle}>Dénivelé</div>
                        <div style={{...statValueInlineStyle, color: '#f59e0b'}}>{Math.round(activity.elevation_gain_m ?? 0)} m</div>
                        </div>
                        <div style={statBoxInlineStyle}>
                        <div style={statLabelStyle}>Puissance</div>
                        <div style={{...statValueInlineStyle, color: '#8b5cf6'}}>{activity.avg_power_w ?? '-'} W</div>
                        </div>
                        <div style={statBoxInlineStyle}>
                        <div style={statLabelStyle}>TSS</div>
                        <div style={{...statValueInlineStyle, color: '#d04fd7'}}>{activity.tss ?? '-'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>

        {isHovered && (
            <button 
                onClick={handleDeleteClick}
                style={deleteButtonStyle}
                title="Supprimer l'activité"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        )}
    </div>
  );
}

type ActivityClientProps = {
  initialActivities: ActivityCardData[];
  session: Session;
  currentPage: number;
  totalPages: number;
};

export default function ActivityClient({
  initialActivities,
  session,
  currentPage,
  totalPages,
}: ActivityClientProps) {
  
  const [allActivities, setAllActivities] = useState<ActivityCardData[]>(initialActivities);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('date_desc');
  const [displayedPage, setDisplayedPage] = useState(1);
  
  const [filters, setFilters] = useState<FilterOptions>({
    distances: new Set(),
    terrains: new Set(),
    Home_trainer: new Set(),
    IntensityHT: new Set(),
    specialBadge: 'all',
  });
  
  const itemsPerPage = 21;

  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes pulse {
        0%, 100% { box-shadow: 0 0 10px rgba(255, 255, 255, 0.2), 0 0 15px currentColor; }
        50% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.5), 0 0 30px currentColor; }
      }
    `;
    document.head.appendChild(styleElement);

    const fetchAllActivities = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/activities/');
        if (response.ok) {
          const data = await response.json();
          setAllActivities(data.activities);
        }
      } catch (error) {
        console.error('Error fetching all activities:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllActivities();
  }, []);

  const specialBadges = useMemo(() => {
    const badges = new Map<string, Badge>();
    
    if (allActivities.length === 0) return badges;

    const maxPower = Math.max(...allActivities.map(a => a.avg_power_w ?? 0));
    const maxSpeed = Math.max(...allActivities.map(a => a.avg_speed_kmh ?? 0)); 
    const maxDistance = Math.max(...allActivities.map(a => a.distance_km ?? 0));
    const maxElevation = Math.max(...allActivities.map(a => a.elevation_gain_m ?? 0));
    const maxTSS = Math.max(...allActivities.map(a => a.tss ?? 0));

    allActivities.forEach(activity => {
      if (activity.avg_power_w && activity.avg_power_w === maxPower && maxPower > 0) {
        badges.set(String(activity.id), { label: 'Watt Max', color: '#FF3C00', icon: '⚡', category: 'special' });
      }
      else if (activity.avg_speed_kmh && activity.avg_speed_kmh === maxSpeed && maxSpeed > 0) {
        badges.set(String(activity.id), { label: 'Fusée', color: '#00FF87', icon: '🚀', category: 'special' });
      }
      else if (activity.distance_km && activity.distance_km === maxDistance && maxDistance > 0) {
        badges.set(String(activity.id), { label: 'ULTRAA', color: '#00B4D8', icon: '🏆', category: 'special' });
      }
      else if (activity.elevation_gain_m && activity.elevation_gain_m === maxElevation && maxElevation > 0) {
        badges.set(String(activity.id), { label: 'Grimpette', color: '#F77F00', icon: '⛰️', category: 'special' });
      }
      else if (activity.tss && activity.tss === maxTSS && maxTSS > 0) {
        badges.set(String(activity.id), { label: 'Tu stresses ?', color: '#7c3aed', icon: '💪', category: 'special' });
      }
    });

    return badges;
  }, [allActivities]);

  const processedActivities = useMemo(() => {
    let filtered = allActivities.filter(act => 
      act.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filtre par distance (multiple)
    if (filters.distances.size > 0) {
      filtered = filtered.filter(act => {
        const distanceKm = act.distance_km ?? 0;
        if (filters.distances.has('short') && distanceKm < 50 && act.type == "Ride") return true;
        if (filters.distances.has('medium') && distanceKm >= 50 && distanceKm < 100 && act.type == "Ride") return true;
        if (filters.distances.has('long') && distanceKm >= 100 && distanceKm < 250 && act.type == "Ride") return true;
        if (filters.distances.has('ultra') && distanceKm >= 250 && act.type == "Ride") return true;
        return false;
      });
    }

    if (filters.Home_trainer.has('HT')) {
       filtered = filtered.filter(act => act.type === 'VirtualRide');
    }

    // 3. 🔥 Filtre Intensité (Calculé via TSS/h)
    if (filters.IntensityHT.size > 0) {
      filtered = filtered.filter(act => {
        // Sécurité division
        if (!act.duration_s || act.duration_s === 0) return false; 
        const durationHours = act.duration_s / 3600;
        // Si durée < 3 min, calcul peu pertinent
        if (durationHours < 0.05) return false; 

        const tssPerHour = (act.tss ?? 0) / durationHours;
        
        if (filters.IntensityHT.has('Intense') && tssPerHour >= 85) return true;
        if (filters.IntensityHT.has('SS') && tssPerHour >= 70 && tssPerHour < 90) return true;
        if (filters.IntensityHT.has('Tempo') && tssPerHour >= 55 && tssPerHour < 70) return true;
        if (filters.IntensityHT.has('Z2') && tssPerHour >= 40 && tssPerHour < 55) return true;
        if (filters.IntensityHT.has('Recup') && tssPerHour < 40) return true;
        return false;
      });
    }

    // Filtre par terrain (multiple)
    if (filters.terrains.size > 0) {
      filtered = filtered.filter(act => {
        const elevationPerKm = (act.elevation_gain_m ?? 0) / (act.distance_km ?? 1);
        if (filters.terrains.has('flat') && elevationPerKm < 10 && act.type == "Ride") return true;
        if (filters.terrains.has('hilly') && elevationPerKm >= 10 && elevationPerKm < 20 && act.type == "Ride") return true;
        if (filters.terrains.has('mountain') && elevationPerKm >= 20 && act.type == "Ride") return true;
        return false;
      });
    }

    // Filtre par badge spécial (unique)
    if (filters.specialBadge !== 'all') {
      filtered = filtered.filter(act => {
        const badge = specialBadges.get(String(act.id)); 
        if (!badge) return false;
        
        switch (filters.specialBadge) {
          case 'power':
            return badge.label === 'Watt Max';
          case 'speed':
            return badge.label === 'Fusée';
          case 'distance':
            return badge.label === 'ULTRAA';
          case 'elevation':
            return badge.label === 'Grimpette';
          case 'tss':
            return badge.label === 'Tu stresses ?';
          default:
            return true;
        }
      });
    }
    
    // Tri
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.start_time).getTime();
      const dateB = new Date(b.start_time).getTime();

      switch (sortOrder) {
        case 'dist_desc':
          return (b.distance_km ?? 0) - (a.distance_km ?? 0);
        case 'dist_asc':
          return (a.distance_km ?? 0) - (b.distance_km ?? 0);
        case 'elev_desc':
          return (b.elevation_gain_m ?? 0) - (a.elevation_gain_m ?? 0);
        case 'elev_asc':
          return (a.elevation_gain_m ?? 0) - (b.elevation_gain_m ?? 0);
        
        case 'pmoy_desc':
          return (b.avg_power_w ?? 0) - (a.avg_power_w ?? 0);
        case 'pmoy_asc':
          return (a.avg_power_w ?? 0) - (b.avg_power_w ?? 0);
        
        case 'npmoy_desc':
          return ((b as any).np_w ?? 0) - ((a as any).np_w ?? 0);
        case 'npmoy_asc':
          return ((a as any).np_w ?? 0) - ((b as any).np_w ?? 0);
        
        case 'date_asc': // 🔥 CORRECTION ICI
          return dateA - dateB; // Du plus petit (ancien) au plus grand (récent)
        
        case 'date_desc':
        default:
          return dateB - dateA; // Du plus grand (récent) au plus petit (ancien)
      }
    });

    return filtered;
  }, [allActivities, searchQuery, sortOrder, filters, specialBadges]);

  const totalFilteredPages = Math.ceil(processedActivities.length / itemsPerPage);
  const paginatedActivities = processedActivities.slice(
    (displayedPage - 1) * itemsPerPage,
    displayedPage * itemsPerPage
  );

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalFilteredPages) {
      setDisplayedPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const totalStats = useMemo(() => {
    const total = processedActivities.reduce((acc, act) => ({
      distance: acc.distance + (act.distance_km ?? 0),
      elevation: acc.elevation + (act.elevation_gain_m ?? 0),
      count: acc.count + 1,
    }), { distance: 0, elevation: 0, count: 0 });

    return {
      distance: Math.round(total.distance),
      elevation: Math.round(total.elevation),
      count: total.count,
    };
  }, [processedActivities]);

  const specialBadgeCount = useMemo(() => {
    const counts = {
      power: 0,
      speed: 0,
      distance: 0,
      elevation: 0,
      tss: 0,
    };

    specialBadges.forEach(badge => {
      if (badge.label === 'Watt Max') counts.power++;
      if (badge.label === 'Fusée') counts.speed++;
      if (badge.label === 'ULTRAA') counts.distance++;
      if (badge.label === 'Grimpette') counts.elevation++;
      if (badge.label === 'Tu stresses ?') counts.tss++;
    });

    return counts;
  }, [specialBadges]);

  const toggleDistanceFilter = (type: 'short' | 'medium' | 'long' | 'ultra') => {
    setFilters(prev => {
      const newDistances = new Set(prev.distances);
      if (newDistances.has(type)) {
        newDistances.delete(type);
      } else {
        newDistances.add(type);
      }
      return { ...prev, distances: newDistances };
    });
    setDisplayedPage(1);
  };

  const toggleHTFilter = () => {
    setFilters(prev => {
      const newHT = new Set(prev.Home_trainer);
      if (newHT.has('HT')) newHT.delete('HT');
      else newHT.add('HT');
      return { ...prev, Home_trainer: newHT };
    });
    setDisplayedPage(1);
  };

  // 🔥 Logique Toggle Intensité
  const toggleIntensityFilter = (type: 'Z2' | 'SS' | 'Intense' | 'Tempo' | 'Recup') => {
    setFilters(prev => {
      const newIntensity = new Set(prev.IntensityHT);
      if (newIntensity.has(type)) newIntensity.delete(type);
      else newIntensity.add(type);
      return { ...prev, IntensityHT: newIntensity };
    });
    setDisplayedPage(1);
  };

  const toggleTerrainFilter = (type: 'flat' | 'hilly' | 'mountain') => {
    setFilters(prev => {
      const newTerrains = new Set(prev.terrains);
      if (newTerrains.has(type)) {
        newTerrains.delete(type);
      } else {
        newTerrains.add(type);
      }
      return { ...prev, terrains: newTerrains };
    });
    setDisplayedPage(1);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [activityToDelete, setActivityToDelete] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    // On reset le message précédent
    setStatusMessage(null); 
    
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    
    // Pour afficher les erreurs spécifiques si besoin (optionnel)
    // let errorDetails: string[] = []; 

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/activities/upload', {
          method: 'POST',
          body: formData,
        });

        // Cas 1 : Succès
        if (res.ok) {
            successCount++;
        } 
        // Cas 2 : Erreur gérée (ex: Doublon 409, ou GPX invalide 400)
        else {
            // On essaie de lire le message JSON envoyé par l'API
            const data = await res.json().catch(() => ({})); 
            
            if (res.status === 409) {
                // C'est un doublon, on ne compte pas ça comme une "erreur critique"
                console.warn(`Doublon ignoré : ${file.name}`);
                duplicateCount++;
            } else {
                // Vraie erreur (fichier corrompu, serveur HS...)
                console.error(`Erreur sur ${file.name}: ${data.error || res.statusText}`);
                errorCount++;
            }
        }

      } catch (err: any) {
        console.error(`Erreur réseau/script sur ${file.name}:`, err);
        errorCount++;
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    // --- CONSTRUCTION DU MESSAGE DE FIN ---
    let message = "";
    let type: 'success' | 'error' = 'success';

    if (successCount > 0) message += `${successCount} importé(s). `;
    if (duplicateCount > 0) message += `${duplicateCount} doublon(s) ignoré(s). `;
    if (errorCount > 0) {
        message += `${errorCount} erreur(s).`;
        type = 'error'; // On passe en rouge s'il y a des vraies erreurs
    }

    // Si on a rien fait du tout (que des erreurs ou 0 fichier valide)
    if (successCount === 0 && duplicateCount === 0 && errorCount > 0) {
         message = "Échec de l'import. Vérifiez vos fichiers.";
    } else if (successCount === 0 && duplicateCount > 0 && errorCount === 0) {
         message = "Tous les fichiers sont déjà présents (doublons).";
         type = 'success'; // C'est "vert" car rien n'a cassé, juste rien à faire
    }

    setStatusMessage({ type, message });

    // On ne recharge la page que s'il y a eu au moins un nouvel import
    if (successCount > 0) {
        setTimeout(() => window.location.reload(), 2000);
    }
  };

  // --- Logique Delete ---
  const requestDelete = (id: number) => {
      setActivityToDelete(id); // Ouvre le modal
  };

  const confirmDelete = async () => {
    if (!activityToDelete) return;
    
    try {
        const res = await fetch('/api/activities/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: activityToDelete }),
        });
        
        if (!res.ok) throw new Error('Erreur suppression');
        
        setAllActivities(prev => prev.filter(a => a.id !== activityToDelete));
        setStatusMessage({ type: 'success', message: 'Activité supprimée.' });
        
    } catch (err) {
        setStatusMessage({ type: 'error', message: "Impossible de supprimer l'activité." });
    } finally {
        setActivityToDelete(null); // Ferme le modal
        setTimeout(() => setStatusMessage(null), 3000);
    }
  };

 


  return (
    <div style={containerStyle}>
        <GlobalSelectStyles />
      <div style={headerBannerStyle}>
        
        


        <div style={headerBannerContentStyle}>
          <h1 style={headerTitleStyle}>Toutes mes sorties</h1>
          <p style={headerSubtitleStyle}>Explorez votre historique complet d'entraînement</p>
        </div>
        
        <div style={statsHeaderGridStyle}>
          <div style={statHeaderCardStyle}>
            <div style={{flex: 1}}>
              <div style={statHeaderLabelStyle}>TOTAL SORTIES</div>
              <div style={{...statHeaderValueStyle, color: '#d04fd7'}}>{totalStats.count}</div>
            </div>
          </div>
          <div style={statHeaderCardStyle}>
            <div style={{flex: 1}}>
              <div style={statHeaderLabelStyle}>DISTANCE TOTALE</div>
              <div style={{...statHeaderValueStyle, color: '#10b981'}}>{totalStats.distance} km</div>
            </div>
          </div>
          <div style={statHeaderCardStyle}>
            <div style={{flex: 1}}>
              <div style={statHeaderLabelStyle}>DÉNIVELÉ CUMULÉ</div>
              <div style={{...statHeaderValueStyle, color: '#f59e0b'}}>{totalStats.elevation} m</div>
            </div>
          </div>
        </div>
      </div>

      <div style={filtersContainerStyle}>
        <div style={searchAndSortRowStyle}>

<input 
            type="file" 
            accept=".gpx"
            multiple // <-- AJOUTÉ
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
            ref={fileInputRef}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Importer un fichier GPX"
            style={importButtonStyle}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--secondary)';
                e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {isUploading ? (
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                   <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                 </svg>
            ) : (
                // Icône Fichier +
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {/* Contour du fichier */}
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    
                    {/* Petite trace GPX au milieu */}
                    <path d="M8 13c.5-1 1.5-1 2-1s1.5 1 2 2 1.5 2 2 2" opacity="0.5"></path>
                    
                    {/* Le Plus (+) en bas à droite */}
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                    <line x1="10" y1="19" x2="14" y2="19"></line>
                </svg>
            )}
          </button>





          <div style={searchWrapperStyle}>
            <input 
              type="text"
              placeholder="Rechercher une activité..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDisplayedPage(1);
              }}
              style={searchBarStyle}
            />
          </div>

          {statusMessage && (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 1000,
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            background: 'rgba(30, 30, 46, 0.95)',
            border: `1px solid ${statusMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            animation: 'slideIn 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem'
        }}>
                {statusMessage.message}
            </div>
        )}
          
          <div style={sortWrapperStyle}>
            <select 
              value={sortOrder} 
              onChange={(e) => {
                setSortOrder(e.target.value);
                setDisplayedPage(1);
              }}
              style={sortSelectStyle}
            >
              <option value="date_desc">📅 Plus récent</option>
            <option value="date_asc">📅 Plus ancien</option>

            <option value="dist_desc">📏 Distance ↓</option>
            <option value="dist_asc">📏 Distance ↑</option>

            <option value="elev_desc">⛰️ Dénivelé ↓</option>
            <option value="elev_asc">⛰️ Dénivelé ↑</option>

            <option value="pmoy_desc">⚡ Puissance moy. ↓</option>
            <option value="pmoy_asc">⚡ Puissance moy. ↑</option>

            </select>
          </div>
        </div>

        <div style={multiFiltersRowStyle}>
          <div style={filterGroupStyle}>
            <div style={filterGroupLabelStyle}>Distance</div>
            <div style={filterButtonsStyle}>
              <button
                onClick={() => toggleDistanceFilter('short')}
                style={{
                  ...filterButtonStyle,
                  ...(filters.distances.has('short') ? filterButtonActiveStyle : {})
                }}
              >
                Courte
              </button>
              <button
                onClick={() => toggleDistanceFilter('medium')}
                style={{
                  ...filterButtonStyle,
                  ...(filters.distances.has('medium') ? filterButtonActiveStyle : {})
                }}
              >
                Moyenne
              </button>
              <button
                onClick={() => toggleDistanceFilter('long')}
                style={{
                  ...filterButtonStyle,
                  ...(filters.distances.has('long') ? filterButtonActiveStyle : {})
                }}
              >
                Longue
              </button>
              <button
                onClick={() => toggleDistanceFilter('ultra')}
                style={{
                  ...filterButtonStyle,
                  ...(filters.distances.has('ultra') ? filterButtonActiveStyle : {})
                }}
              >
                Ultra
              </button>
            </div>
          </div>

          <div style={filterGroupStyle}>
            <div style={filterGroupLabelStyle}>Terrain</div>
            <div style={filterButtonsStyle}>
              <button
                onClick={() => toggleTerrainFilter('flat')}
                style={{
                  ...filterButtonStyle,
                  ...(filters.terrains.has('flat') ? filterButtonActiveStyle : {})
                }}
              >
                Plate
              </button>
              <button
                onClick={() => toggleTerrainFilter('hilly')}
                style={{
                  ...filterButtonStyle,
                  ...(filters.terrains.has('hilly') ? filterButtonActiveStyle : {})
                }}
              >
                Accidentée
              </button>
              <button
                onClick={() => toggleTerrainFilter('mountain')}
                style={{
                  ...filterButtonStyle,
                  ...(filters.terrains.has('mountain') ? filterButtonActiveStyle : {})
                }}
              >
                Montagne
              </button>
            </div>
          </div>

          <div style={filterGroupStyle}>
             <div style={filterGroupLabelStyle}>Type & Intensité</div>
             <div style={filterButtonsStyle}>
                {/* Bouton HT */}
                <button
                    onClick={toggleHTFilter}
                    style={{
                        ...filterButtonStyle,
                        ...(filters.Home_trainer.has('HT') ? { ...filterButtonActiveStyle, borderColor: '#cc13d6', boxShadow: '0 4px 15px rgba(204, 19, 214, 0.4)', background: 'linear-gradient(135deg, #cc13d6 0%, #a855f7 100%)' } : {})
                    }}
                >
                    Home Trainer
                </button>

                {/* Boutons Intensité */}
                <button onClick={() => toggleIntensityFilter('Recup')} style={{...filterButtonStyle, ...(filters.IntensityHT.has('Recup') ? { ...filterButtonActiveStyle, background: '#00fff7ff', borderColor: '#00fff7ff' } : {})}}>Recup</button>
                <button onClick={() => toggleIntensityFilter('Z2')} style={{...filterButtonStyle, ...(filters.IntensityHT.has('Z2') ? { ...filterButtonActiveStyle, background: '#00FF88', borderColor: '#00FF88' } : {})}}>Z2</button>
                <button onClick={() => toggleIntensityFilter('Tempo')} style={{...filterButtonStyle, ...(filters.IntensityHT.has('Tempo') ? { ...filterButtonActiveStyle, background: '#FFB800', borderColor: '#FFB800' } : {})}}>Tempo</button>
                <button onClick={() => toggleIntensityFilter('SS')} style={{...filterButtonStyle, ...(filters.IntensityHT.has('SS') ? { ...filterButtonActiveStyle, background: '#ff8400ff', borderColor: '#ff8400ff' } : {})}}>SweetSpot</button>
                <button onClick={() => toggleIntensityFilter('Intense')} style={{...filterButtonStyle, ...(filters.IntensityHT.has('Intense') ? { ...filterButtonActiveStyle, background: '#FF0033', borderColor: '#FF0033' } : {})}}>Intense</button>

             </div>
          </div>

          <div style={filterGroupStyle}>
            <div style={filterGroupLabelStyle}>Badges spéciaux</div>
            <select 
              value={filters.specialBadge} 
              onChange={(e) => {
                setFilters(prev => ({ ...prev, specialBadge: e.target.value as any }));
                setDisplayedPage(1);
              }}
              style={specialBadgeSelectStyle}
            >
              <option value="all">🎭 Toutes</option>
              <option value="allbadge">🎖️ Tous les badges</option>
              {specialBadgeCount.power > 0 && <option value="power">⚡Watt Max </option>}
              {specialBadgeCount.speed > 0 && <option value="speed">🚀 Fusée </option>}
              {specialBadgeCount.distance > 0 && <option value="distance">🏆 ULTRAA </option>}
              {specialBadgeCount.elevation > 0 && <option value="elevation">⛰️ Grimpette </option>}
              {specialBadgeCount.tss > 0 && <option value="tss">💪 Tu stresses ? </option>}
            </select>
          </div>
        </div>
      </div>

      <div style={resultsInfoStyle}>
        {isLoading ? (
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
            <span>Chargement de toutes les activités...</span>
          </div>
        ) : (
          <div>
            <strong style={{ color: '#d04fd7' }}>{processedActivities.length}</strong> activité{processedActivities.length > 1 ? 's' : ''} trouvée{processedActivities.length > 1 ? 's' : ''}
            {totalFilteredPages > 0 && (
              <>
                {' • '}Page <strong style={{ color: '#10b981' }}>{displayedPage}</strong> sur <strong style={{ color: '#10b981' }}>{totalFilteredPages}</strong>
              </>
            )}
          </div>
        )}
      </div>

     {paginatedActivities.length > 0 ? (
  <div style={{
    ...activityGridStyle,
    ...(paginatedActivities.length === 1 && { 
      gridTemplateColumns: 'minmax(450px, 400px)', // 🔥 Une seule colonne centrée
      justifyContent: 'center',
      gap: '0' // 🔥 Pas d'espacement pour une seule carte
    })
  }}>
    {paginatedActivities.map(activity => (
      <ActivityCard key={activity.id} activity={activity} specialBadges={specialBadges} onDelete={requestDelete} />
    ))}
  </div>
      ) : (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚴</div>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f1f1f1' }}>
            Aucune activité trouvée
          </p>
          <p style={{ fontSize: '1rem', color: '#a0a0a0' }}>
            Essayez de modifier vos critères de recherche
          </p>
        </div>
      )}

      {totalFilteredPages > 1 && (
        <div style={paginationContainerStyle}>
          <button 
            style={{
              ...paginationButtonStyle,
              opacity: displayedPage <= 1 ? 0.4 : 1,
              cursor: displayedPage <= 1 ? 'not-allowed' : 'pointer',
            }}
            onClick={() => goToPage(displayedPage - 1)}
            disabled={displayedPage <= 1}
          >
            Précédent
          </button>
          
          <div style={pageNumbersStyle}>
            {displayedPage > 2 && (
              <>
                <button 
                  style={pageNumberButtonStyle} 
                  onClick={() => goToPage(1)}
                >
                  1
                </button>
                {displayedPage > 3 && <span style={dotsStyle}>...</span>}
              </>
            )}
            
            {displayedPage > 1 && (
              <button 
                style={pageNumberButtonStyle} 
                onClick={() => goToPage(displayedPage - 1)}
              >
                {displayedPage - 1}
              </button>
            )}
            
            <button style={{...pageNumberButtonStyle, ...activePageStyle}}>
              {displayedPage}
            </button>
            
            {displayedPage < totalFilteredPages && (
              <button 
                style={pageNumberButtonStyle} 
                onClick={() => goToPage(displayedPage + 1)}
              >
                {displayedPage + 1}
              </button>
            )}
            
            {displayedPage < totalFilteredPages - 1 && (
              <>
                {displayedPage < totalFilteredPages - 2 && <span style={dotsStyle}>...</span>}
                <button 
                  style={pageNumberButtonStyle} 
                  onClick={() => goToPage(totalFilteredPages)}
                >
                  {totalFilteredPages}
                </button>
              </>
            )}
          </div>
          
          <button 
            style={{
              ...paginationButtonStyle,
              opacity: displayedPage >= totalFilteredPages ? 0.4 : 1,
              cursor: displayedPage >= totalFilteredPages ? 'not-allowed' : 'pointer',
            }}
            onClick={() => goToPage(displayedPage + 1)}
            disabled={displayedPage >= totalFilteredPages}
          >
            Suivant
          </button>
        </div>
      )}

      <Modal 
        isOpen={!!activityToDelete} 
        onClose={() => setActivityToDelete(null)}
        title="Confirmation"
      >
        <div style={{ color: 'var(--text)' }}>
            <p>Êtes-vous sûr de vouloir supprimer cette activité ?</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Cette action est irréversible et supprimera toutes les données associées.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button onClick={() => setActivityToDelete(null)} style={cancelButtonStyle}>Annuler</button>
                <button onClick={confirmDelete} style={deleteConfirmButtonStyle}>Supprimer</button>
            </div>
        </div>
      </Modal>
    </div>
  );
}



const deleteConfirmButtonStyle: React.CSSProperties = {
    padding: '0.6rem 1.2rem',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
};

const cancelButtonStyle: React.CSSProperties = {
    padding: '0.6rem 1.2rem',
    background: 'transparent',
    border: '1px solid var(--text-secondary)',
    color: 'var(--text)',
    borderRadius: '8px',
    cursor: 'pointer',
};

const deleteButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'rgba(239, 68, 68, 0.9)', // Rouge vif
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
    zIndex: 10,
    transition: 'transform 0.2s, background 0.2s',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '1400px',
  margin: '0 auto',
  padding: '0 1.5rem 2rem',
  minHeight: '100vh',
  width: '100%',
  overflowX: 'hidden',
  
  // 🔥 Responsive pour les cartes
  
};

const headerBannerStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255, 107, 157, 0.15) 0%, rgba(208, 79, 215, 0.15) 50%, rgba(139, 92, 246, 0.15) 100%)',
  borderRadius: '24px',
  padding: '3rem 2rem',
  marginBottom: '2.5rem',
  border: '2px solid rgba(208, 79, 215, 0.2)',
  boxShadow: '0 8px 32px rgba(208, 79, 215, 0.1)',
};

const headerBannerContentStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '2.5rem',
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: '3.5rem',
  fontWeight: 900,
  margin: '0 0 0.75rem 0',
  background: 'linear-gradient(135deg, #ff6b9d 0%, #d04fd7 50%, #8b5cf6 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  letterSpacing: '-0.03em',
  lineHeight: 1.1,
};

const headerSubtitleStyle: React.CSSProperties = {
  fontSize: '1.2rem',
  color: '#c0c0c0',
  margin: 0,
  fontWeight: 500,
};

const statsHeaderGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1.5rem',
  maxWidth: '900px',
  margin: '0 auto',
};

const statHeaderCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
  background: 'rgba(14, 14, 20, 0.6)',
  padding: '1.75rem',
  borderRadius: '16px',
  border: '2px solid rgba(255, 255, 255, 0.08)',
  transition: 'all 0.3s ease',
  backdropFilter: 'blur(10px)',
};

const statHeaderLabelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: '#a0a0a0',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '0.5rem',
  fontWeight: 700,
};

const statHeaderValueStyle: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 800,
  lineHeight: 1,
};

const filtersContainerStyle: React.CSSProperties = {
  marginBottom: '2rem',
  padding: '1.75rem',
  background: 'rgba(43, 43, 58, 0.4)',
  borderRadius: '20px',
  border: '2px solid rgba(255, 255, 255, 0.06)',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
};

const searchAndSortRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
};

const searchWrapperStyle: React.CSSProperties = {
  flex: '1 1 300px',
};

const searchBarStyle: React.CSSProperties = {
  width: '97%',
  padding: '1rem 1.25rem',
  fontSize: '1rem',
  background: 'rgba(14, 14, 20, 0.7)',
  border: '2px solid rgba(208, 79, 215, 0.2)',
  borderRadius: '14px',
  color: '#f1f1f1',
  transition: 'all 0.3s ease',
  outline: 'none',
};

const sortWrapperStyle: React.CSSProperties = {
  flex: '0 1 250px',
};

const sortSelectStyle: React.CSSProperties = {
  width: '100%',
  padding: '1rem 1.25rem',
  fontSize: '1rem',
  background: 'rgba(14, 14, 20, 0.9)',
  border: '2px solid rgba(208, 79, 215, 0.4)',
  borderRadius: '14px',
  color: '#f1f1f1',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  outline: 'none',
  backdropFilter: 'blur(10px)',
  fontWeight: 600,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23d04fd7' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 1rem center',
  backgroundSize: '18px',
  paddingRight: '3.5rem',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
};


const multiFiltersRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
};

const filterGroupStyle: React.CSSProperties = {
  flex: '1 1 250px',
};

const filterGroupLabelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#a0a0a0',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  marginBottom: '0.75rem',
  fontWeight: 700,
};

const filterButtonsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
};

const filterButtonStyle: React.CSSProperties = {
  padding: '0.625rem 1.25rem',
  fontSize: '0.9rem',
  background: 'rgba(14, 14, 20, 0.6)',
  borderWidth: '2px',
  borderStyle: 'solid',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  color: '#c0c0c0',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontWeight: 600,
};

const filterButtonActiveStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #d04fd7 0%, #8b5cf6 100%)',
  color: 'white',
  borderColor: 'transparent',
  boxShadow: '0 4px 15px rgba(208, 79, 215, 0.4)',
  transform: 'scale(1.02)',
};

const specialBadgeSelectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.875rem 1rem',
  fontSize: '0.95rem',
  background: 'rgba(14, 14, 20, 0.9)',
  border: '2px solid rgba(208, 79, 215, 0.4)',
  borderRadius: '12px',
  color: '#f1f1f1',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  outline: 'none',
  backdropFilter: 'blur(10px)',
  fontWeight: 600,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23d04fd7' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 1rem center',
  backgroundSize: '16px',
  paddingRight: '2.8rem',
  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
};

const resultsInfoStyle: React.CSSProperties = {
  textAlign: 'center',
  color: '#a0a0a0',
  marginBottom: '2rem',
  fontSize: '1rem',
  fontWeight: 500,
};

const activityGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', // 🔥 3 colonnes strictes
  gap: '1rem', // 🔥 Espacement serré
  marginBottom: '3rem',
  width: '100%',
  maxWidth: '100%',
  overflow: 'hidden',
};

const cardContainerStyle: React.CSSProperties = {
  width: '100%',
};

const cardLinkStyle: React.CSSProperties = {
  textDecoration: 'none',
  display: 'block',
};

const cardStyle: React.CSSProperties = {
  marginTop:'10px',
  background: 'rgba(43, 43, 58, 0.5)',
  border: '2px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '16px',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: 'pointer',
  height: '97%',
  width: '98%', // 🔥 Prend toute la largeur de la colonne
};




const miniMapLoadingStyle: React.CSSProperties = {
  height: '200px',
  width: '100%',
  background: 'rgba(14, 14, 20, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#a0a0a0',
  fontSize: '0.9rem',
};

const miniMapPlaceholderStyle: React.CSSProperties = {
  ...miniMapLoadingStyle,
};

const activityBadgeStyle: React.CSSProperties = {
  padding: '0.4rem 0.95rem',
  borderRadius: '20px',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'white',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
};

const specialBadgeStyle: React.CSSProperties = {
  boxShadow: '0 0 15px rgba(255, 255, 255, 0.3), 0 0 25px currentColor',
  animation: 'pulse 2s ease-in-out infinite',
  fontWeight: 800,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 700,
  color: '#f1f1f1',
  margin: '0 0 0.5rem 0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const cardDateStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#a0a0a0',
  margin: 0,
};

const cardStatsLineStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'space-between',
};

const statBoxInlineStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.5rem 0.25rem',
  textAlign: 'center',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  color: '#888',
  textTransform: 'uppercase',
  marginBottom: '0.25rem',
  letterSpacing: '0.5px',
  fontWeight: 600,
};

const statValueInlineStyle: React.CSSProperties = {
  fontSize: '1.09rem',
  fontWeight: 700,
};

const emptyStateStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '5rem 2rem',
};

const paginationContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1.5rem',
  background: 'rgba(43, 43, 58, 0.3)',
  borderRadius: '16px',
  border: '2px solid rgba(255, 255, 255, 0.05)',
  gap: '1rem',
  flexWrap: 'wrap',
};

const paginationButtonStyle: React.CSSProperties = {
  padding: '0.875rem 1.75rem',
  background: 'linear-gradient(135deg, #d04fd7 0%, #8b5cf6 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '1rem',
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 15px rgba(208, 79, 215, 0.3)',
};

const pageNumbersStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  flexWrap: 'wrap',
  justifyContent: 'center',
};

const pageNumberButtonStyle: React.CSSProperties = {
  padding: '0.625rem 1rem',
  background: 'rgba(14, 14, 20, 0.5)',
  color: '#f1f1f1',
  borderWidth: '2px',
  borderStyle: 'solid',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '10px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.95rem',
  transition: 'all 0.2s ease',
  minWidth: '45px',
};

const activePageStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #d04fd7 0%, #8b5cf6 100%)',
  color: 'white',
  fontWeight: 700,
  border: '2px solid transparent',
  boxShadow: '0 4px 20px rgba(208, 79, 215, 0.4)',
  transform: 'scale(1.05)',
};

const dotsStyle: React.CSSProperties = {
  color: '#a0a0a0',
  padding: '0 0.25rem',
  fontSize: '1.2rem',
};

const selectHoverStyle = `
  select:hover {
    border-color: rgba(208, 79, 215, 0.5) !important;
    box-shadow: 0 0 0 3px rgba(208, 79, 215, 0.1) !important;
  }
  
  select:focus {
    border-color: #d04fd7 !important;
    box-shadow: 0 0 0 3px rgba(208, 79, 215, 0.2) !important;
    background: rgba(14, 14, 20, 0.9) !important;
  }
  
  /* 🔥 STYLES POUR LES OPTIONS */
  option {
    background: rgba(14, 14, 20, 0.95) !important;
    color: #f1f1f1 !important;
    padding: 0.75rem 1rem !important;
    font-size: 0.95rem !important;
    font-weight: 500 !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    transition: all 0.2s ease !important;
  }
  
  option:hover {
    background: linear-gradient(135deg, rgba(208, 79, 215, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%) !important;
    color: #ffffff !important;
    cursor: pointer !important;
  }
  
  option:checked {
    background: linear-gradient(135deg, #d04fd7 0%, #8b5cf6 100%) !important;
    color: white !important;
    font-weight: 600 !important;
  }
  
  option:first-child {
    border-radius: 8px 8px 0 0 !important;
  }
  
  option:last-child {
    border-radius: 0 0 8px 8px !important;
    border-bottom: none !important;
  }
  
  /* 🔥 Style pour le dropdown global */
  select {
    border-radius: 14px !important;
  }
  
  /* 🔥 Amélioration du scroll dans les dropdowns */
  select option::-webkit-scrollbar {
    width: 8px;
  }
  
  select option::-webkit-scrollbar-track {
    background: rgba(14, 14, 20, 0.8);
    border-radius: 4px;
  }
  
  select option::-webkit-scrollbar-thumb {
    background: rgba(208, 79, 215, 0.5);
    border-radius: 4px;
  }
  
  select option::-webkit-scrollbar-thumb:hover {
    background: rgba(208, 79, 215, 0.7);
  }
`;

const GlobalSelectStyles = () => (
  <style jsx global>{`
    ${selectHoverStyle}
  `}</style>
);

const uploadButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #d04fd7 0%, #a855f7 100%)', // Dégradé Néon
    color: 'white',
    border: 'none',
    padding: '0.8rem 1.5rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 15px rgba(208, 79, 215, 0.3)', // Ombre lumineuse
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '10px' // Pour aligner visuellement si le titre est gros
};

const importButtonStyle: React.CSSProperties = {
    height: '55px', // Hauteur fixe pour matcher l'input de recherche
    width: '55px',  // Carré parfait
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.03)', // Fond très sombre/subtil
    border: '1px solid var(--secondary)', // Bordure discrète
    borderRadius: '12px', // Même arrondi que la search bar
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    flexShrink: 0, // Empêche l'écrasement
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
};






