// Fichier : app/events/admin/new/page.tsx
import React from 'react';
import EventCreatorForm from '../EventCreatorForm'; 
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; // Ajustez le chemin de authOptions si nécessaire

// Ce composant est exécuté sur le serveur (Server Component)
export default async function CreateEventPage() {
    
    // 1. Contrôle d'Accès de Sécurité Supplémentaire
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id; 
    const isAdmin = userId === '1' || userId === '2';

    if (!isAdmin) {
        // Redirection ou affichage d'un message d'accès refusé
        return (
            <div style={{ minHeight: '100vh', background: '#050505', color: '#ef4444', padding: '4rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>ACCÈS REFUSÉ (Code 403)</h1>
                <p style={{ color: '#aaa' }}>Vous n'avez pas les autorisations PULSARV2 pour créer ou modifier des événements.</p>
            </div>
        );
    }
    
    // 2. Rendu du Formulaire Client
    return (
        <div style={{ background: '#050505', minHeight: '100vh', paddingTop: '2rem' }}>
            {/* Le composant EventCreatorForm gère l'état et l'interface Admin */}
            <EventCreatorForm />
        </div>
    );
}