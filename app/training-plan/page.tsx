// Fichier : app/training-plan/page.tsx
import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { redirect } from 'next/navigation';
import TrainingplanClient from './TrainingplanClient';

export const metadata = {
  title: 'PULSAR | Labo d\'Entraînement',
  description: 'Planification et analyse structurelle des séances.',
};

export default async function TrainingPlanPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  // On récupère l'ID (assuré par le type NextAuth modifié ou le callback de session)
  const userId = session.user.id; 

  return <TrainingplanClient userId={userId} />;
}