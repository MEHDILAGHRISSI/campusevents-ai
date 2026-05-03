import { getWebState, updateWebState } from './web-store';

export function getSetting(key: string) {
  return getWebState().settings[key] ?? '';
}

export function setSetting(key: string, value: string) {
  updateWebState((state) => {
    state.settings[key] = value;
  });
}

export function getLlmConfig() {
  return {
    provider: getSetting('llm_provider') || 'openai-compatible',
    baseUrl: getSetting('llm_base_url') || 'https://api.openai.com/v1',
    model: getSetting('llm_model') || 'gpt-4o-mini',
    apiKey: getSetting('llm_api_key'),
  };
}
