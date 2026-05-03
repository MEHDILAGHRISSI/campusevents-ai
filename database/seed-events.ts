import type { EventRecord } from './types';

const baseDate = new Date();

function daysFromNow(days: number, hours = 0) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
}

export const seedEvents: EventRecord[] = [
  {
    id: 'seed-event-1',
    title: 'Atelier Machine Learning avec TensorFlow',
    description: 'Un atelier pratique pour découvrir les bases du machine learning et entraîner un petit modèle.',
    category: 'Workshop',
    startDateTime: daysFromNow(1, 9),
    endDateTime: daysFromNow(1, 12),
    locationName: 'Salle Informatique 3',
    locationAddress: 'Campus Principal - Bâtiment Informatique',
    organizerName: 'Département Informatique',
    capacity: 40,
    registeredCount: 12,
    tags: ['IA', 'data', 'tensorflow', 'pratique'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-event-2',
    title: 'Talk: Préparer sa recherche de stage',
    description: 'Conseils concrets pour structurer un dossier de stage et se démarquer auprès des recruteurs.',
    category: 'Talk',
    startDateTime: daysFromNow(2, 14),
    endDateTime: daysFromNow(2, 15),
    locationName: 'Amphi A',
    locationAddress: 'Faculté des Sciences',
    organizerName: 'Service des stages',
    capacity: 120,
    registeredCount: 75,
    tags: ['stage', 'carrière', 'cv', 'entretien'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-event-3',
    title: 'Club Développement Mobile',
    description: 'Rencontre hebdomadaire du club pour partager des projets React Native et Expo.',
    category: 'Club',
    startDateTime: daysFromNow(3, 18),
    endDateTime: daysFromNow(3, 20),
    locationName: 'Maison des étudiants',
    organizerName: 'Club Dev Mobile',
    capacity: 25,
    registeredCount: 18,
    tags: ['mobile', 'react native', 'expo'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-event-4',
    title: 'Révision guidée: algorithmes et complexité',
    description: 'Séance de préparation aux examens avec exercices corrigés et Q/R.',
    category: 'Exam',
    startDateTime: daysFromNow(4, 10),
    endDateTime: daysFromNow(4, 12),
    locationName: 'Salle 204',
    organizerName: 'Moniteurs pédagogiques',
    capacity: 30,
    registeredCount: 30,
    tags: ['exam', 'algorithmes', 'révision'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-event-5',
    title: 'Forum des métiers data science',
    description: 'Rencontre avec des professionnels autour des métiers de la data et de l IA.',
    category: 'Workshop',
    startDateTime: daysFromNow(6, 9),
    endDateTime: daysFromNow(6, 13),
    locationName: 'Hall central',
    organizerName: 'Insertion professionnelle',
    capacity: 200,
    registeredCount: 94,
    tags: ['data science', 'IA', 'carrière'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-event-6',
    title: 'Hackathon campus durable',
    description: 'Événement d’innovation en équipe autour de projets à impact environnemental.',
    category: 'Other',
    startDateTime: daysFromNow(-2, 10),
    endDateTime: daysFromNow(-1, 18),
    locationName: 'Espace innovation',
    organizerName: 'Bureau des projets',
    capacity: 50,
    registeredCount: 50,
    tags: ['hackathon', 'innovation', 'durable'],
    createdAt: new Date().toISOString(),
  },
];