import { database } from './init';

export function getSetting(key: string) {
  const row = database.getFirstSync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?;', [key]);
  return row?.value ?? '';
}

export function setSetting(key: string, value: string) {
  database.runSync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [key, value]
  );
}

export function getLlmConfig() {
  return {
    provider: getSetting('llm_provider') || 'openai-compatible',
    baseUrl: getSetting('llm_base_url') || 'https://api.openai.com/v1',
    model: getSetting('llm_model') || 'gpt-4o-mini',
    apiKey: getSetting('llm_api_key'),
  };
}
