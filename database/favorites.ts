import { database } from './init';

export function listFavoriteEventIds(userId: string) {
  const rows = database.getAllSync<{ eventId: string }>('SELECT eventId FROM favorites WHERE userId = ? ORDER BY createdAt DESC;', [userId]);
  return rows.map((row) => row.eventId);
}

export function isFavorite(eventId: string, userId: string) {
  const row = database.getFirstSync<{ count: number }>('SELECT COUNT(*) AS count FROM favorites WHERE eventId = ? AND userId = ?;', [eventId, userId]);
  return (row?.count ?? 0) > 0;
}

export function addFavorite(eventId: string, userId: string) {
  database.runSync('INSERT OR IGNORE INTO favorites (eventId, userId, createdAt) VALUES (?, ?, ?);', [
    eventId,
    userId,
    new Date().toISOString(),
  ]);
}

export function removeFavorite(eventId: string, userId: string) {
  database.runSync('DELETE FROM favorites WHERE eventId = ? AND userId = ?;', [eventId, userId]);
}
