export const categories = ['Talk', 'Workshop', 'Club', 'Exam', 'Other'] as const;

export type EventCategory = (typeof categories)[number];

export type EventRecord = {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  startDateTime: string;
  endDateTime?: string;
  locationName: string;
  locationAddress?: string;
  organizerName: string;
  capacity?: number;
  registeredCount: number;
  imageUrl?: string;
  tags: string[];
  createdAt: string;
};

export type RegistrationRecord = {
  id: string;
  eventId: string;
  userId: string;
  createdAt: string;
  status: 'confirmed' | 'cancelled';
};

export type FavoriteRecord = {
  eventId: string;
  userId: string;
  createdAt: string;
};

export type LlmResultRecord = {
  id: string;
  eventId?: string;
  userId: string;
  type: 'search' | 'recommendation' | 'planning' | 'qa';
  inputText: string;
  outputText: string;
  createdAt: string;
};

export type SessionRecord = {
  userId: string | null;
  role: 'admin' | 'student' | null;
  createdAt: string | null;
};

export type UserProfile = {
  userId: string;
  role: 'admin' | 'student';
  displayName: string;
};