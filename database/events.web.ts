import * as Crypto from 'expo-crypto';

import { mapRowToEvent } from './init';
import type { EventCategory } from './types';
import { getWebState, updateWebState } from './web-store';

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
  return parseEvents(
    getWebState().events
      .map((event) => ({ ...event, tags: [...event.tags] }))
      .sort((left, right) => left.startDateTime.localeCompare(right.startDateTime))
  );
}

export function listUpcomingEvents() {
  const now = Date.now();
  return listEvents().filter((event) => new Date(event.startDateTime).getTime() >= now);
}

export function listPastEvents() {
  const now = Date.now();
  return listEvents()
    .filter((event) => new Date(event.startDateTime).getTime() < now)
    .sort((left, right) => right.startDateTime.localeCompare(left.startDateTime));
}

export function listEventsInRange(startIso: string, endIso: string) {
  return listEvents().filter((event) => event.startDateTime >= startIso && event.startDateTime < endIso);
}

export function getEventById(id: string) {
  const row = getWebState().events.find((event) => event.id === id);
  return row ? mapRowToEvent(row as unknown as Record<string, unknown>) : null;
}

export function searchEventsByExactTitle(query: string) {
  const normalized = query.trim().toLowerCase();
  return listEvents().filter((event) => event.title.toLowerCase().includes(normalized));
}

export function createEvent(input: EventInput) {
  const id = Crypto.randomUUID();
  const createdAt = new Date().toISOString();

  updateWebState((state) => {
    state.events.push({
      id,
      title: input.title,
      description: input.description,
      category: input.category,
      startDateTime: input.startDateTime,
      endDateTime: input.endDateTime,
      locationName: input.locationName,
      locationAddress: input.locationAddress,
      organizerName: input.organizerName ?? 'CampusEvents',
      capacity: input.capacity,
      registeredCount: 0,
      imageUrl: input.imageUrl,
      tags: [...(input.tags ?? [])],
      createdAt,
    });
  });

  return id;
}

export function updateEvent(id: string, input: EventInput) {
  updateWebState((state) => {
    const event = state.events.find((item) => item.id === id);
    if (!event) {
      return;
    }

    event.title = input.title;
    event.description = input.description;
    event.category = input.category;
    event.startDateTime = input.startDateTime;
    event.endDateTime = input.endDateTime;
    event.locationName = input.locationName;
    event.locationAddress = input.locationAddress;
    event.organizerName = input.organizerName ?? 'CampusEvents';
    event.capacity = input.capacity;
    event.imageUrl = input.imageUrl;
    event.tags = [...(input.tags ?? [])];
  });
}

export function deleteEvent(id: string) {
  updateWebState((state) => {
    state.events = state.events.filter((event) => event.id !== id);
    state.registrations = state.registrations.filter((registration) => registration.eventId !== id);
    state.favorites = state.favorites.filter((favorite) => favorite.eventId !== id);
  });
}

export function listEventsByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const idSet = new Set(ids);
  return listEvents().filter((event) => idSet.has(event.id));
}

export function updateRegisteredCount(eventId: string) {
  updateWebState((state) => {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) {
      return;
    }

    event.registeredCount = state.registrations.filter(
      (registration) => registration.eventId === eventId && registration.status === 'confirmed'
    ).length;
  });
}
