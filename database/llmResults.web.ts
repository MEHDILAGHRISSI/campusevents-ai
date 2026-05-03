import * as Crypto from 'expo-crypto';

import type { LlmResultRecord } from './types';
import { getWebState, updateWebState } from './web-store';

export function getCachedLlmResult(type: LlmResultRecord['type'], userId: string, inputText: string) {
  const result = [...getWebState().llmResults]
    .filter((item) => item.type === type && item.userId === userId && item.inputText === inputText)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

  return result?.outputText;
}

export function saveLlmResult(result: Omit<LlmResultRecord, 'id' | 'createdAt'>) {
  updateWebState((state) => {
    state.llmResults.push({
      id: Crypto.randomUUID(),
      eventId: result.eventId,
      userId: result.userId,
      type: result.type,
      inputText: result.inputText,
      outputText: result.outputText,
      createdAt: new Date().toISOString(),
    });
  });
}

export function listRecentLlmResults(userId: string, type?: LlmResultRecord['type']) {
  return getWebState().llmResults
    .filter((result) => result.userId === userId && (type ? result.type === type : true))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
