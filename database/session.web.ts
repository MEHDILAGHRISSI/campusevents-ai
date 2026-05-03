import { getWebState, updateWebState } from './web-store';
import type { SessionRecord } from './types';

// ==========================================
// 1. GESTION DE LA SESSION (Ce qui manquait !)
// ==========================================

export function getSession(): SessionRecord {
  const state = getWebState();
  // On récupère la session du web-store, ou on renvoie une session vide
  return state.session ?? { userId: null, role: null, createdAt: null };
}

export function setSession(userId: string, role: 'admin' | 'student') {
  updateWebState((state) => {
    state.session = {
      userId,
      role,
      createdAt: new Date().toISOString()
    };
  });
}

export function clearSession() {
  updateWebState((state) => {
    state.session = { userId: null, role: null, createdAt: null };
  });
}

export function logoutUser() {
  clearSession();
}

// ==========================================
// 2. GESTION DES PARAMÈTRES (Ton code existant)
// ==========================================

export function getSetting(key: string) {
  return getWebState().settings?.[key] ?? '';
}

export function setSetting(key: string, value: string) {
  updateWebState((state) => {
    if (!state.settings) state.settings = {};
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