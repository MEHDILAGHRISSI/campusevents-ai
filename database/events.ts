import * as Crypto from 'expo-crypto';

import { database, mapRowToEvent } from './init';
import type { EventCategory } from './types';

export type EventInput = {
  title: string;
  description: string;
  category: EventCategory;
  startDateTime: string;
  endDateTime?: string;
  locationName: string;
  locationAddress?: string;
  organizerName?: string;
  capacity?: number;
  imageUrl?: string;
  tags?: string[];
};

function parseEvents(rows: Record<string, unknown>[]) {
  return rows.map((row) => mapRowToEvent(row));
}

export function listEvents() {
  return parseEvents(database.getAllSync('SELECT * FROM events ORDER BY startDateTime ASC;'));
}

export function listUpcomingEvents() {
  return parseEvents(database.getAllSync('SELECT * FROM events WHERE startDateTime >= ? ORDER BY startDateTime ASC;', [new Date().toISOString()]));
}

export function listPastEvents() {
  return parseEvents(database.getAllSync('SELECT * FROM events WHERE startDateTime < ? ORDER BY startDateTime DESC;', [new Date().toISOString()]));
}

export function listEventsInRange(startIso: string, endIso: string) {
  return parseEvents(
    database.getAllSync(
      'SELECT * FROM events WHERE startDateTime >= ? AND startDateTime < ? ORDER BY startDateTime ASC;',
      [startIso, endIso]
    )
  );
}

export function getEventById(id: string) {
  const row = database.getFirstSync<Record<string, unknown>>('SELECT * FROM events WHERE id = ?;', [id]);
  return row ? mapRowToEvent(row) : null;
}

export function searchEventsByExactTitle(query: string) {
  const normalized = query.trim().toLowerCase();
  return listEvents().filter((event) => event.title.toLowerCase().includes(normalized));
}

export function createEvent(input: EventInput) {
  const id = Crypto.randomUUID();
  const createdAt = new Date().toISOString();
  database.runSync(
    `INSERT INTO events (
      id, title, description, category, startDateTime, endDateTime,
      locationName, locationAddress, organizerName, capacity,
      registeredCount, imageUrl, tags, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?);`,
    [
      id,
      input.title,
      input.description,
      input.category,
      input.startDateTime,
      input.endDateTime ?? null,
      input.locationName,
      input.locationAddress ?? null,
      input.organizerName ?? 'CampusEvents',
      input.capacity ?? null,
      input.imageUrl ?? null,
      JSON.stringify(input.tags ?? []),
      createdAt,
    ]
  );
  return id;
}

export function updateEvent(id: string, input: EventInput) {
  database.runSync(
    `UPDATE events SET
      title = ?, description = ?, category = ?, startDateTime = ?, endDateTime = ?,
      locationName = ?, locationAddress = ?, organizerName = ?, capacity = ?, imageUrl = ?, tags = ?
     WHERE id = ?;`,
    [
      input.title,
      input.description,
      input.category,
      input.startDateTime,
      input.endDateTime ?? null,
      input.locationName,
      input.locationAddress ?? null,
      input.organizerName ?? 'CampusEvents',
      input.capacity ?? null,
      input.imageUrl ?? null,
      JSON.stringify(input.tags ?? []),
      id,
    ]
  );
}

export function deleteEvent(id: string) {
  database.runSync('DELETE FROM events WHERE id = ?;', [id]);
}

export function listEventsByIds(ids: string[]) {
  if (ids.length === 0) {
    return [] as EventRecord[];
  }

  const placeholders = ids.map(() => '?').join(', ');
  return parseEvents(database.getAllSync(`SELECT * FROM events WHERE id IN (${placeholders});`, ids));
}

export function updateRegisteredCount(eventId: string) {
  const event = getEventById(eventId);
  if (!event) {
    return;
  }

  const registrations = database.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM registrations WHERE eventId = ? AND status = ?;',
    [eventId, 'confirmed']
  );
  database.runSync('UPDATE events SET registeredCount = ? WHERE id = ?;', [registrations?.count ?? 0, eventId]);
}
