import * as SQLite from 'expo-sqlite';

import { seedEvents } from './seed-events';
import { categories, type EventCategory, type EventRecord } from './types';

export const database = SQLite.openDatabaseSync('campusevents.db');

const demoUsers = [
  ['admin@campus.ma', 'admin', 'Admin'],
  ['etudiant@campus.ma', 'student', 'Etudiant'],
] as const;

export function initDatabase() {
  database.execSync('PRAGMA foreign_keys = ON;');

  database.execSync(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      startDateTime TEXT NOT NULL,
      endDateTime TEXT,
      locationName TEXT NOT NULL,
      locationAddress TEXT,
      organizerName TEXT NOT NULL,
      capacity INTEGER,
      registeredCount INTEGER DEFAULT 0,
      imageUrl TEXT,
      tags TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
      UNIQUE(eventId, userId)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      eventId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (eventId, userId),
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS llm_results (
      id TEXT PRIMARY KEY,
      eventId TEXT,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      inputText TEXT NOT NULL,
      outputText TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      userId TEXT,
      role TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const eventCount = database.getFirstSync<{ count: number }>('SELECT COUNT(*) AS count FROM events;');

  if (!eventCount || eventCount.count === 0) {
    const now = new Date().toISOString();

    for (const event of seedEvents) {
      database.runSync(
        `INSERT INTO events (
          id, title, description, category, startDateTime, endDateTime,
          locationName, locationAddress, organizerName, capacity, registeredCount,
          imageUrl, tags, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          event.id,
          event.title,
          event.description,
          event.category,
          event.startDateTime,
          event.endDateTime ?? null,
          event.locationName,
          event.locationAddress ?? null,
          event.organizerName,
          event.capacity ?? null,
          event.registeredCount,
          event.imageUrl ?? null,
          JSON.stringify(event.tags ?? []),
          event.createdAt ?? now,
        ]
      );
    }
  }

  const settingsCount = database.getFirstSync<{ count: number }>('SELECT COUNT(*) AS count FROM app_settings;');

  if (!settingsCount || settingsCount.count === 0) {
    database.runSync('INSERT INTO app_settings (key, value) VALUES (?, ?);', [
      'llm_provider',
      'openai-compatible',
    ]);
    database.runSync('INSERT INTO app_settings (key, value) VALUES (?, ?);', [
      'llm_base_url',
      'https://api.openai.com/v1',
    ]);
    database.runSync('INSERT INTO app_settings (key, value) VALUES (?, ?);', ['llm_model', 'gpt-4o-mini']);
    database.runSync('INSERT INTO app_settings (key, value) VALUES (?, ?);', ['llm_api_key', '']);
  }

  for (const [userId, role, displayName] of demoUsers) {
    database.runSync(
      `INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?);`,
      [`user_${userId}`, JSON.stringify({ userId, role, displayName })]
    );
  }
}

export function isValidCategory(category: string): category is EventCategory {
  return categories.includes(category as EventCategory);
}

export function mapRowToEvent(row: Record<string, unknown>): EventRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    category: String(row.category) as EventCategory,
    startDateTime: String(row.startDateTime),
    endDateTime: row.endDateTime ? String(row.endDateTime) : undefined,
    locationName: String(row.locationName),
    locationAddress: row.locationAddress ? String(row.locationAddress) : undefined,
    organizerName: String(row.organizerName),
    capacity: row.capacity === null || row.capacity === undefined ? undefined : Number(row.capacity),
    registeredCount: Number(row.registeredCount ?? 0),
    imageUrl: row.imageUrl ? String(row.imageUrl) : undefined,
    tags: typeof row.tags === 'string' ? JSON.parse(String(row.tags)) : [],
    createdAt: String(row.createdAt),
  };
}
