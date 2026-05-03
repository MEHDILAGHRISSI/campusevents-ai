import { database } from './init';
import type { SessionRecord } from './types';

export function getSession(): SessionRecord {
  const row = database.getFirstSync<SessionRecord>('SELECT userId, role, createdAt FROM sessions WHERE id = 1;');
  return row ?? { userId: null, role: null, createdAt: null };
}

export function setSession(userId: string, role: 'admin' | 'student') {
  database.runSync(
    `INSERT INTO sessions (id, userId, role, createdAt)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET userId = excluded.userId, role = excluded.role, createdAt = excluded.createdAt;`,
    [userId, role, new Date().toISOString()]
  );
}

export function clearSession() {
  database.runSync('DELETE FROM sessions WHERE id = 1;');
}

export function logoutUser() {
  clearSession();
}
