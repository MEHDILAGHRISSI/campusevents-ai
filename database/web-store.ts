import { demoUsers } from '@/constants/users';
import { seedEvents } from './seed-events';
import type { EventRecord, FavoriteRecord, LlmResultRecord, RegistrationRecord, SessionRecord } from './types';

type WebDatabaseState = {
  events: EventRecord[];
  registrations: RegistrationRecord[];
  favorites: FavoriteRecord[];
  llmResults: LlmResultRecord[];
  session: SessionRecord;
  settings: Record<string, string>;
};

const STORAGE_KEY = 'campusevents-ai.webdb';

const defaultSession: SessionRecord = {
  userId: null,
  role: null,
  createdAt: null,
};

// ✅ FIXED: Consolidated demo users from single source (constants/users.ts)
// Build tuples (email, role, displayName) from the imported demoUsers object array
const demoUsersTuples = demoUsers.map((user) => [user.email, user.role, user.displayName] as const);

let memoryState: WebDatabaseState | null = null;

function getStorage() {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage;
}

function cloneState(state: WebDatabaseState): WebDatabaseState {
  return {
    events: state.events.map((event) => ({ ...event, tags: [...event.tags] })),
    registrations: state.registrations.map((registration) => ({ ...registration })),
    favorites: state.favorites.map((favorite) => ({ ...favorite })),
    llmResults: state.llmResults.map((result) => ({ ...result })),
    session: { ...state.session },
    settings: { ...state.settings },
  };
}

function buildInitialState(): WebDatabaseState {
  const settings: Record<string, string> = {
    llm_provider: 'openai-compatible',
    llm_base_url: 'https://api.openai.com/v1',
    llm_model: 'gpt-4o-mini',
    llm_api_key: '',
  };

  for (const [userId, role, displayName] of demoUsersTuples) {
    settings[`user_${userId}`] = JSON.stringify({ userId, role, displayName });
  }

  return {
    events: seedEvents.map((event) => ({ ...event, tags: [...event.tags] })),
    registrations: [],
    favorites: [],
    llmResults: [],
    session: { ...defaultSession },
    settings,
  };
}

function readState(): WebDatabaseState {
  if (memoryState) {
    return cloneState(memoryState);
  }

  const storage = getStorage();

  if (!storage) {
    memoryState = buildInitialState();
    return cloneState(memoryState);
  }

  const raw = storage.getItem(STORAGE_KEY);

  if (!raw) {
    memoryState = buildInitialState();
    storage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
    return cloneState(memoryState);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WebDatabaseState>;
    memoryState = {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      registrations: Array.isArray(parsed.registrations) ? parsed.registrations : [],
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      llmResults: Array.isArray(parsed.llmResults) ? parsed.llmResults : [],
      session: parsed.session ?? { ...defaultSession },
      settings: parsed.settings ?? {},
    };
  } catch {
    memoryState = buildInitialState();
    storage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
  }

  return cloneState(memoryState);
}

function writeState(state: WebDatabaseState) {
  memoryState = cloneState(state);

  const storage = getStorage();
  if (storage) {
    storage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
  }
}

export function ensureWebState() {
  readState();
}

export function getWebState() {
  return readState();
}

export function updateWebState(updater: (state: WebDatabaseState) => void) {
  const state = readState();
  updater(state);
  writeState(state);
}

export function resetWebState() {
  memoryState = buildInitialState();
  writeState(memoryState);
}
