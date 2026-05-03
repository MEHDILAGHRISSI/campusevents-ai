import { categories, type EventCategory, type EventRecord } from './types';
import { ensureWebState } from './web-store';

export function initDatabase() {
  ensureWebState();
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
