// Fichier : app/components/ui/tabs.tsx
'use client';

import React, { useState } from 'react'; // 1. 'useState' est déjà là

type TabProps = {
  label: string;
  children: React.ReactNode;
};

export const Tab: React.FC<TabProps> = ({ children }) => <>{children}</>;

type TabsProps = {
  children: React.ReactNode;
};

export const Tabs: React.FC<TabsProps> = ({ children }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  // 2. Ajout d'un état pour le survol
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const tabs = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<TabProps> =>
      React.isValidElement(child) && child.type === Tab
  );

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--secondary)', marginBottom: '1rem' }}>
        
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          const isHovered = index === hoveredIndex;
          const activeColor = '#d04fd7'; // Ton rose

          // 3. Logique de style plus complexe
          
          // Style de base pour tous les onglets
          const style: React.CSSProperties = {
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            border: 'none',
            borderBottom: '3px solid transparent', // Bordure transparente par défaut
            backgroundColor: 'transparent', // Fond transparent par défaut
            fontSize: '1rem',
            fontWeight: 'normal',
            color: 'var(--text-secondary)', // Couleur par défaut (gris)
            transition: 'color 0.2s, border-bottom-color 0.2s, background-color 0.2s',
          };

          // Appliquer le style de SURVOL (s'il n'est PAS actif)
          if (isHovered && !isActive) {
            style.backgroundColor = 'var(--surface)'; // Fond "plus clair"
            style.color = 'var(--text)'; // Texte principal
          }

          // Appliquer le style ACTIF (écrase le survol)
          if (isActive) {
            style.borderBottom = `3px solid ${activeColor}`;
            style.fontWeight = 'bold';
            style.color = activeColor;
            style.backgroundColor = 'transparent'; // S'assure que le fond n'est pas celui du hover
          }

          return (
            <button
              key={tab.props.label}
              onClick={() => setActiveIndex(index)}
              // 4. Ajout des gestionnaires d'événements
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={style} // Appliquer le style final
            >
              {tab.props.label}
            </button>
          );
        })}
      </div>
      
      <div>
        {tabs[activeIndex]}
      </div>
    </div>
  );
};