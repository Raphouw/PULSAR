// Fichier : app/LayoutContent.tsx
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

// ON SUPPRIME L'IMPORT DE LA SIDEBAR ICI
// Car elle est déjà dans le layout parent (app/layout.tsx)

export default function LayoutContent({
    children,
}: {
    children: React.ReactNode;
}) {
    // Si tu as besoin de détecter les pages Auth pour cacher la sidebar,
    // on gérera ça différemment, mais pour l'instant on nettoie la structure.
    
    return (
        <>
            {/* PLUS DE SIDEBAR ICI 
               PLUS DE MARGIN-LEFT MANUEL
               Le Flexbox du parent gère tout l'espace maintenant.
            */}
            <div className="w-full h-full">
                {children}
            </div>
        </>
    );
}