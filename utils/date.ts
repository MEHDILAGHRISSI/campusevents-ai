export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function isPastDate(value: string) {
  return new Date(value).getTime() < Date.now();
}

export function isUpcomingDate(value: string) {
  return !isPastDate(value);
}

export function formatDayRange(startIso: string, endIso?: string) {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(start);
  const time = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(start);

  if (!end) {
    return `${date} à ${time}`;
  }

  return `${date} • ${time} - ${new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(end)}`;
}

export function getWeekBounds(reference = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
