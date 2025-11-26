// Fichier : app/components/ui/modal.tsx
'use client';

import React from 'react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
};

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) {
    return null;
  }

  // Empêche le clic de se propager du contenu au fond
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    // Le fond sombre (overlay)
    <div style={overlayStyle} onClick={onClose}>
      {/* Le conteneur du modal */}
      <div style={modalStyle} onClick={stopPropagation}>
        
        {/* En-tête avec titre et bouton fermer */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0, color: 'var(--text)' }}>{title}</h2>
          <button style={closeButtonStyle} onClick={onClose}>
            &times;
          </button>
        </div>
        
        {/* Contenu (notre graphique) */}
        <div style={{ padding: '1.5rem' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Styles ---
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: 'var(--surface)',
  borderRadius: '10px',
  border: '1px solid var(--secondary)',
  width: '90%',
  maxWidth: '1200px', // Largeur max du pop-up
  maxHeight: '100vh',
  overflowY: 'auto',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 1.5rem',
  borderBottom: '1px solid var(--secondary)',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  fontSize: '2rem',
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
};