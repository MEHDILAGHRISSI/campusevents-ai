import { getWebState, updateWebState } from './web-store';

export function listFavoriteEventIds(userId: string) {
  return getWebState().favorites
    .filter((favorite) => favorite.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((favorite) => favorite.eventId);
}

export function isFavorite(eventId: string, userId: string) {
  return getWebState().favorites.some((favorite) => favorite.eventId === eventId && favorite.userId === userId);
}

export function addFavorite(eventId: string, userId: string) {
  updateWebState((state) => {
    const existing = state.favorites.some((favorite) => favorite.eventId === eventId && favorite.userId === userId);
    if (!existing) {
      state.favorites.push({ eventId, userId, createdAt: new Date().toISOString() });
    }
  });
}

export function removeFavorite(eventId: string, userId: string) {
  updateWebState((state) => {
    state.favorites = state.favorites.filter((favorite) => !(favorite.eventId === eventId && favorite.userId === userId));
  });
}
