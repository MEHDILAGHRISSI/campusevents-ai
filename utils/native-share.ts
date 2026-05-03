import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { EventRecord } from '@/database/types';
import { formatDateTime } from '@/utils/date';

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

async function shareTextAsFile(content: string, fileName: string, mimeType: string, dialogTitle: string) {
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error('Le partage natif n\'est pas disponible sur cet appareil.');
  }

  const baseDir = FileSystem.cacheDirectory;
  if (!baseDir) {
    throw new Error('Impossible de créer un fichier temporaire pour le partage.');
  }

  const fileUri = `${baseDir}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(fileUri, { mimeType, dialogTitle });
}

export async function shareEventInvite(event: EventRecord) {
  const formattedDate = formatDateTime(event.startDateTime);
  const message = [
    `Rejoins-moi à ${event.title} le ${formattedDate} au campus !`,
    `Lieu: ${event.locationName}`,
    '',
    'Envoyé depuis CampusEvents AI',
  ].join('\n');

  const fileName = `invite-${sanitizeFileName(event.title)}-${Date.now()}.txt`;
  await shareTextAsFile(message, fileName, 'text/plain', 'Partager l\'invitation');
}

export async function shareEventsCatalogAsJson(events: EventRecord[]) {
  const payload = {
    exportedAt: new Date().toISOString(),
    total: events.length,
    events,
  };

  const fileName = `campusevents-catalog-${Date.now()}.json`;
  await shareTextAsFile(JSON.stringify(payload, null, 2), fileName, 'application/json', 'Exporter le catalogue');
}