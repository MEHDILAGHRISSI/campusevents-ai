import type { EventRecord } from '@/database/types';
// Notifications locales desactivees en Expo Go (SDK 53+)
// Pour activer, utiliser un development build.

export async function scheduleEventReminder(_event: EventRecord): Promise<void> {
  // no-op en Expo Go
}

export async function cancelEventReminder(_eventId: string): Promise<void> {
  // no-op en Expo Go
}

export async function requestNotificationPermissions(): Promise<boolean> {
  return false;
}