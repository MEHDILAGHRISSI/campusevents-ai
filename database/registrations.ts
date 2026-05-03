import * as Crypto from 'expo-crypto';

import { getEventById, updateRegisteredCount } from './events';
import { database } from './init';
import type { RegistrationRecord } from './types';

function mapRegistration(row: Record<string, unknown>): RegistrationRecord {
  return {
    id: String(row.id),
    eventId: String(row.eventId),
    userId: String(row.userId),
    createdAt: String(row.createdAt),
    status: row.status === 'cancelled' ? 'cancelled' : 'confirmed',
  };
}

export function listRegistrationsByUser(userId: string) {
  return database
    .getAllSync('SELECT * FROM registrations WHERE userId = ? AND status = ? ORDER BY createdAt DESC;', [userId, 'confirmed'])
    .map((row) => mapRegistration(row));
}

export function isRegistered(eventId: string, userId: string) {
  const row = database.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM registrations WHERE eventId = ? AND userId = ? AND status = ?;',
    [eventId, userId, 'confirmed']
  );
  return (row?.count ?? 0) > 0;
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

  const existing = database.getFirstSync<{ id: string }>('SELECT id FROM registrations WHERE eventId = ? AND userId = ?;', [
    eventId,
    userId,
  ]);

  if (existing) {
    database.runSync('UPDATE registrations SET status = ?, createdAt = ? WHERE eventId = ? AND userId = ?;', [
      'confirmed',
      new Date().toISOString(),
      eventId,
      userId,
    ]);
  } else {
    database.runSync(
      'INSERT INTO registrations (id, eventId, userId, createdAt, status) VALUES (?, ?, ?, ?, ?);',
      [Crypto.randomUUID(), eventId, userId, new Date().toISOString(), 'confirmed']
    );
  }

  updateRegisteredCount(eventId);
}

export function cancelRegistration(eventId: string, userId: string) {
  database.runSync('UPDATE registrations SET status = ? WHERE eventId = ? AND userId = ?;', [
    'cancelled',
    eventId,
    userId,
  ]);
  updateRegisteredCount(eventId);
}
