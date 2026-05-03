import * as Crypto from 'expo-crypto';

import { database } from './init';
import type { LlmResultRecord } from './types';

export function getCachedLlmResult(type: LlmResultRecord['type'], userId: string, inputText: string) {
  return database.getFirstSync<{ outputText: string }>(
    'SELECT outputText FROM llm_results WHERE type = ? AND userId = ? AND inputText = ? ORDER BY createdAt DESC LIMIT 1;',
    [type, userId, inputText]
  )?.outputText;
}

export function saveLlmResult(result: Omit<LlmResultRecord, 'id' | 'createdAt'>) {
  database.runSync(
    'INSERT INTO llm_results (id, eventId, userId, type, inputText, outputText, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?);',
    [Crypto.randomUUID(), result.eventId ?? null, result.userId, result.type, result.inputText, result.outputText, new Date().toISOString()]
  );
}

export function listRecentLlmResults(userId: string, type?: LlmResultRecord['type']) {
  const rows = type
    ? database.getAllSync('SELECT * FROM llm_results WHERE userId = ? AND type = ? ORDER BY createdAt DESC;', [userId, type])
    : database.getAllSync('SELECT * FROM llm_results WHERE userId = ? ORDER BY createdAt DESC;', [userId]);

  return rows as LlmResultRecord[];
}
