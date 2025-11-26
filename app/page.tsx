// Fichier : app/page.tsx
import { redirect } from 'next/navigation';

// Simplification: le middleware gère si on doit aller au dashboard.
// Cette page redirige simplement les utilisateurs vers la page d'accueil de l'auth.
export default function Home() {
    redirect('/auth/signin');
}