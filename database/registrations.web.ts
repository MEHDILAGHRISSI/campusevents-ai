import * as Crypto from 'expo-crypto';

import { getEventById, updateRegisteredCount } from './events';
import type { RegistrationRecord } from './types';
import { getWebState, updateWebState } from './web-store';

function mapRegistration(row: RegistrationRecord): RegistrationRecord {
  return { ...row };
}

export function listRegistrationsByUser(userId: string) {
  return getWebState().registrations
    .filter((registration) => registration.userId === userId && registration.status === 'confirmed')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((row) => mapRegistration(row));
}

export function isRegistered(eventId: string, userId: string) {
  return getWebState().registrations.some(
    (registration) => registration.eventId === eventId && registration.userId === userId && registration.status === 'confirmed'
  );
}

export function registerForEvent(eventId: string, userId: string) {
  const event = getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  if (isRegistered(eventId, userId)) {
    throw new Error('Already registered');
  }

  if (new Date(event.startDateTime).getTime() < Date.now()) {
    throw new Error('Event already passed');
  }

  if (event.capacity && event.registeredCount >= event.capacity) {
    throw new Error('Event is full');
  }

  updateWebState((state) => {
    const existing = state.registrations.find((registration) => registration.eventId === eventId && registration.userId === userId);

    if (existing) {
      existing.status = 'confirmed';
      existing.createdAt = new Date().toISOString();
    } else {
      state.registrations.push({
        id: Crypto.randomUUID(),
        eventId,
        userId,
        createdAt: new Date().toISOString(),
        status: 'confirmed',
      });
    }
  });

  updateRegisteredCount(eventId);
}

export function cancelRegistration(eventId: string, userId: string) {
  updateWebState((state) => {
    const registration = state.registrations.find((item) => item.eventId === eventId && item.userId === userId);
    if (registration) {
      registration.status = 'cancelled';
    }
  });

  updateRegisteredCount(eventId);
}
