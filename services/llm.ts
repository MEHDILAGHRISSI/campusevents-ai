import { listEvents, listEventsInRange, listUpcomingEvents } from '@/database/events';
import { listFavoriteEventIds } from '@/database/favorites';
import { getCachedLlmResult, saveLlmResult } from '@/database/llmResults';
import { listRegistrationsByUser } from '@/database/registrations';
import type { EventRecord } from '@/database/types';

/** Core types */
type AssistantType = 'search' | 'recommendation' | 'planning' | 'qa';

type ChatMessage = {
  role: 'system' | 'user';
  content: string;
};

// Modèles ultra-performants et à jour en 2026
const DEFAULT_MODEL = 'llama-3.3-70b-versatile'; 
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

export type SearchAssistantResult = {
  matches: Array<{
    eventId: string;
    title: string;
    reason: string;
    confidence: number;
  }>;
};

export type RecommendationAssistantResult = {
  suggestions: Array<{
    eventId: string;
    title: string;
    reason: string;
  }>;
};

export type PlanningAssistantResult = {
  plan: Array<{
    day: string;
    eventId: string;
    title: string;
    slot: string;
    reason: string;
  }>;
  conflicts: Array<{
    eventId?: string;
    title: string;
    reason: string;
    type: 'overlap' | 'constraint' | 'capacity' | 'past_event' | 'unknown';
  }>;
};

export type QaAssistantResult = {
  answer: string;
  references: Array<{
    eventId: string;
    title: string;
    reason: string;
  }>;
};

/** Get Groq config from environment variables only */
function getConfig() {
  const apiKey = process.env.EXPO_PUBLIC_LLM_API_KEY || '';
  const rawBaseUrl = process.env.EXPO_PUBLIC_LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const baseUrl = rawBaseUrl.replace(/\/chat\/completions\/?$/i, '').replace(/\/$/, '');

  console.log('[LLM] config', {
    baseUrl,
    model: DEFAULT_MODEL,
    fallbackModel: FALLBACK_MODEL,
    hasApiKey: Boolean(apiKey),
  });

  return { apiKey, baseUrl: baseUrl.replace(/\/$/, '') };
}

/** Safe JSON parse - never crashes the app */
function safeJsonParse<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

/** Extract JSON from response (handles markdown, etc.) */
function extractJson(response: string): string | null {
  const trimmed = response.trim();
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch?.[1]) return codeBlockMatch[1].trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) return trimmed;
  const jsonMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return jsonMatch ? jsonMatch[0] : null;
}

/** Utility functions */
function truncateText(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function summarizeEvent(event: EventRecord) {
  return {
    id: event.id,
    title: event.title,
    description: truncateText(event.description, 180),
    category: event.category,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    locationName: event.locationName,
    organizerName: event.organizerName,
    capacity: event.capacity,
    registeredCount: event.registeredCount,
    tags: event.tags,
    isPast: new Date(event.startDateTime).getTime() < Date.now(),
  };
}

function buildPromptContext(events: EventRecord[], includeTimestamp: boolean = false) {
  const catalog = truncateText(JSON.stringify(events.map(summarizeEvent), null, 2), 7000);
  if (!includeTimestamp) return catalog;
  
  const now = new Date().toISOString();
  return `[CURRENT_TIME: ${now}]\n\n${catalog}`;
}

function stripMarkdown(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1').replace(/`([^`]+)`/g, '$1').trim();
}

type GroqApiError = Error & {
  code?: string;
  status?: number;
};

function isModelDecommissionedError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as GroqApiError).code === 'model_decommissioned');
}

async function parseGroqError(response: Response): Promise<GroqApiError> {
  const body = await response.text().catch(() => '');
  const details = body ? ` - ${body.slice(0, 500)}` : '';
  let code: string | undefined;

  if (body) {
    try {
      const parsed = JSON.parse(body) as { error?: { code?: string; message?: string } };
      code = parsed.error?.code;
      if (parsed.error?.message) {
        console.warn('[LLM] Groq error payload', { status: response.status, code, message: parsed.error.message });
        return Object.assign(new Error(`[LLM] API error: ${response.status}${details}`), { code, status: response.status });
      }
    } catch {
      // Keep the raw response details in the thrown error.
    }
  }

  return Object.assign(new Error(`[LLM] API error: ${response.status}${details}`), { code, status: response.status });
}

async function postGroqChat(messages: ChatMessage[], model: string): Promise<string> {
  const config = getConfig();

  if (!config.apiKey) {
    throw new Error('[LLM] API key not configured (EXPO_PUBLIC_LLM_API_KEY)');
  }

  console.log('[LLM] request start', {
    model,
    baseUrl: config.baseUrl,
    messageCount: messages.length,
  });

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages,
    }),
  });

  if (!response.ok) {
    throw await parseGroqError(response);
  }

  console.log('[LLM] response ok', { model, status: response.status });

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content ?? '';

  if (!content.trim()) {
    throw new Error('[LLM] Empty response received from Groq');
  }

  return content;
}

async function postGroqChatWithFallback(messages: ChatMessage[]): Promise<string> {
  try {
    return await postGroqChat(messages, DEFAULT_MODEL);
  } catch (error) {
    if (isModelDecommissionedError(error)) {
      console.warn(`[LLM] ${DEFAULT_MODEL} decommissioned, retrying with ${FALLBACK_MODEL}`);
      return postGroqChat(messages, FALLBACK_MODEL);
    }

    throw error;
  }
}

/** Core LLM function - simple prompt-to-response */
export async function callLLM(prompt: string): Promise<string> {
  const now = new Date().toISOString();
  const messages: ChatMessage[] = [
    { role: 'system', content: `[CURRENT_TIME: ${now}]\n\nYou are a helpful assistant. Respond clearly and concisely.` },
    { role: 'user', content: prompt },
  ];

  try {
    console.log('[LLM] callLLM start', { promptLength: prompt.length });
    const response = await postGroqChatWithFallback(messages);
    return stripMarkdown(response);
  } catch (error) {
    console.warn('[LLM] Network error:', error instanceof Error ? error.message : String(error));
    return '';
  }
}

/** Parse search result */
function parseSearchResult(rawText: string): SearchAssistantResult {
  const jsonStr = extractJson(rawText);
  if (!jsonStr) return { matches: [] };
  
  const parsed = safeJsonParse<{ matches?: Array<Record<string, unknown>> }>(jsonStr);
  if (!parsed?.matches) return { matches: [] };

  return {
    matches: parsed.matches
      .map((m) => {
        const eventId = stripMarkdown(m.eventId);
        const title = stripMarkdown(m.title);
        const reason = stripMarkdown(m.reason);
        const confidence = Math.min(1, Math.max(0, Number(m.confidence ?? 0)));
        return eventId && title && reason ? { eventId, title, reason, confidence } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x),
  };
}

/** Parse recommendation result */
function parseRecommendationResult(rawText: string): RecommendationAssistantResult {
  const jsonStr = extractJson(rawText);
  if (!jsonStr) return { suggestions: [] };

  const parsed = safeJsonParse<{ suggestions?: Array<Record<string, unknown>> }>(jsonStr);
  if (!parsed?.suggestions) return { suggestions: [] };

  return {
    suggestions: parsed.suggestions
      .map((s) => {
        const eventId = stripMarkdown(s.eventId);
        const title = stripMarkdown(s.title);
        const reason = stripMarkdown(s.reason);
        return eventId && title && reason ? { eventId, title, reason } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x),
  };
}

/** Parse planning result */
function parsePlanningResult(rawText: string): PlanningAssistantResult {
  const jsonStr = extractJson(rawText);
  if (!jsonStr) return { plan: [], conflicts: [] };

  const parsed = safeJsonParse<{ plan?: Array<Record<string, unknown>>; conflicts?: Array<Record<string, unknown>> }>(jsonStr);
  if (!parsed) return { plan: [], conflicts: [] };

  const sourcePlan = Array.isArray(parsed.plan) ? parsed.plan : [];
  const sourceConflicts = Array.isArray(parsed.conflicts) ? parsed.conflicts : [];

  return {
    plan: sourcePlan
      .map((p) => {
        const day = stripMarkdown(p.day);
        const eventId = stripMarkdown(p.eventId);
        const title = stripMarkdown(p.title);
        const slot = stripMarkdown(p.slot);
        const reason = stripMarkdown(p.reason);
        return day && eventId && title && slot && reason ? { day, eventId, title, slot, reason } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x),
    conflicts: sourceConflicts
      .map((c) => {
        const title = stripMarkdown(c.title);
        const reason = stripMarkdown(c.reason);
        const eventId = stripMarkdown(c.eventId) || undefined;
        const type = stripMarkdown(c.type) as any;
        return title && reason ? {
          eventId,
          title,
          reason,
          type: ['overlap', 'constraint', 'capacity', 'past_event'].includes(type) ? type : 'unknown',
        } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x),
  };
}

/** Parse Q&A result */
function parseQaResult(rawText: string): QaAssistantResult {
  const jsonStr = extractJson(rawText);
  if (!jsonStr) return { answer: rawText || '', references: [] };

  const parsed = safeJsonParse<{ answer?: unknown; references?: Array<Record<string, unknown>> }>(jsonStr);
  if (!parsed) return { answer: rawText || '', references: [] };

  const sourceReferences = Array.isArray(parsed.references) ? parsed.references : [];
  return {
    answer: stripMarkdown(parsed.answer),
    references: sourceReferences
      .map((r) => {
        const eventId = stripMarkdown(r.eventId);
        const title = stripMarkdown(r.title);
        const reason = stripMarkdown(r.reason);
        return eventId && title && reason ? { eventId, title, reason } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x),
  };
}

/** Build prompt messages */
function buildSearchMessages(query: string, catalog: string): ChatMessage[] {
  const now = new Date().toISOString();
  return [
    {
      role: 'system',
      content: `[CURRENT_TIME: ${now}]\n\nTu es CampusEvents AI Search. Analyse un catalogue et retourne du JSON avec {"matches":[{"eventId","title","reason","confidence"}]}. Choisis jusqu'à 5 événements pertinents.`,
    },
    {
      role: 'user',
      content: `REQUETE: ${query}\n\nCATALOGUE:\n${catalog}\n\nRetour JSON uniquement`,
    },
  ];
}

function buildRecommendationMessages(profile: string, catalog: string): ChatMessage[] {
  const now = new Date().toISOString();
  return [
    {
      role: 'system',
      content: `[CURRENT_TIME: ${now}]\n\nTu es CampusEvents AI Recommendation. Propose 3 événements pertinents. Retourne {"suggestions":[{"eventId","title","reason"}]}.`,
    },
    {
      role: 'user',
      content: `PROFIL:\n${profile}\n\nCATALOGUE:\n${catalog}\n\nRetour JSON uniquement`,
    },
  ];
}

function buildPlanningMessages(constraints: string, catalog: string): ChatMessage[] {
  const now = new Date().toISOString();
  return [
    {
      role: 'system',
      content: `[CURRENT_TIME: ${now}]\n\nTu es CampusEvents AI Planning. Construis un planning sans conflit. Retourne {"plan":[{"day","eventId","title","slot","reason"}],"conflicts":[{"eventId","title","reason","type"}]}.\n\n⚠️ INSTRUCTION STRICTE : Tu ne dois JAMAIS modifier la date, l'heure ou le lieu d'un événement existant. Si un événement ne rentre pas dans le planning à cause d'une contrainte, liste-le impérativement dans la section \"conflicts\" au lieu de le déplacer.`,
    },
    {
      role: 'user',
      content: `CONTRAINTES:\n${constraints}\n\nEVENEMENTS:\n${catalog}\n\nRetour JSON uniquement`,
    },
  ];
}

function buildQaMessages(question: string, catalog: string): ChatMessage[] {
  const now = new Date().toISOString();
  return [
    {
      role: 'system',
      content: `[CURRENT_TIME: ${now}]\n\nTu es CampusEvents AI QA. Réponds à des questions. Retourne {"answer":"...","references":[{"eventId","title","reason"}]}.`,
    },
    {
      role: 'user',
      content: `QUESTION:\n${question}\n\nCATALOGUE:\n${catalog}\n\nRetour JSON uniquement`,
    },
  ];
}

/** Call assistant model with Groq API */
async function callAssistantModel(messages: ChatMessage[]): Promise<string> {
  try {
    return await postGroqChatWithFallback(messages);
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/** Run assistant with caching */
async function runAssistant<T>(
  type: AssistantType,
  userId: string,
  inputText: string,
  messages: ChatMessage[],
  parser: (raw: string) => T
): Promise<T> {
  const cacheKey = JSON.stringify({ type, inputText, messages });
  const cached = getCachedLlmResult(type, userId, cacheKey);

  if (cached) {
    console.log('[LLM] cache hit', { type, userId, inputLength: inputText.length });
    return parser(cached);
  }

  console.log('[LLM] cache miss', { type, userId, inputLength: inputText.length });

  const result = await callAssistantModel(messages);
  if (result.trim()) {
    saveLlmResult({ userId, type, inputText: cacheKey, outputText: result });
    console.log('[LLM] result saved', { type, userId, outputLength: result.length });
  }

  return parser(result);
}


/** Search events with semantic query */
export async function searchEvents(userId: string, query: string): Promise<SearchAssistantResult> {
  const catalog = buildPromptContext(listEvents());
  const messages = buildSearchMessages(query, catalog);
  return runAssistant('search', userId, query, messages, parseSearchResult);
}

/** Get personalized recommendations */
export async function getRecommendations(userId: string): Promise<RecommendationAssistantResult> {
  const favorites = listFavoriteEventIds(userId);
  const registrations = listRegistrationsByUser(userId);
  const profile = JSON.stringify({ favorites, registrations: registrations.map((r) => r.eventId) }, null, 2);
  const catalog = buildPromptContext(listUpcomingEvents());
  const messages = buildRecommendationMessages(profile, catalog);
  return runAssistant('recommendation', userId, profile, messages, parseRecommendationResult);
}

/** Generate schedule with conflict detection */
export async function generateSchedule(userId: string, constraints: string): Promise<PlanningAssistantResult> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const catalog = buildPromptContext(listEventsInRange(start.toISOString(), end.toISOString()));
  const messages = buildPlanningMessages(constraints, catalog);
  return runAssistant('planning', userId, constraints, messages, parsePlanningResult);
}

/** Ask questions about event catalog */
export async function askAboutEvents(userId: string, question: string): Promise<QaAssistantResult> {
  const catalog = buildPromptContext(listEvents());
  const messages = buildQaMessages(question, catalog);
  return runAssistant('qa', userId, question, messages, parseQaResult);
}

/** Backward compatibility aliases */
export async function runSearchAssistant(userId: string, query: string) {
  return searchEvents(userId, query);
}

export async function runRecommendationAssistant(userId: string) {
  return getRecommendations(userId);
}

export async function runPlanningAssistant(userId: string, constraints: string) {
  return generateSchedule(userId, constraints);
}

export async function runQaAssistant(userId: string, question: string) {
  return askAboutEvents(userId, question);
}
//fin llm.ts
